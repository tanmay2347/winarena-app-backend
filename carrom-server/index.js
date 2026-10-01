import express from 'express';
import http from 'node:http';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { Server } from 'socket.io';

import { CarromGame } from './game.js';
import { botPlan } from './bot.js';
import {
  FEE_TIERS, PLATFORM_PCT, getOrCreate, publicPlayer,
  addBalance, canAfford, settle, recordResult
} from './players.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.PORT || 3001;
const FORFEIT_GRACE_MS = 45_000;
const TICK_MS = 32;

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: true, credentials: true },
  path: '/socket.io'
});

/* ------------------------------------------------------------------ *
 *  state
 * ------------------------------------------------------------------ */
const socketsByPlayer = new Map();   // playerId -> socket
const queues = new Map();            // fee -> [playerId]
const rooms = new Map();             // roomId -> CarromGame
const playerRoom = new Map();        // playerId -> roomId
const forfeitTimers = new Map();     // roomId -> timeout
const botTimers = new Map();         // roomId -> timeout
const rematchVotes = new Map();      // roomId -> Set<playerId>

FEE_TIERS.forEach(f => queues.set(f, []));

const queueCounts = () => {
  const o = {};
  for (const f of FEE_TIERS) o[f] = queues.get(f).length;
  return o;
};

function broadcastQueues() {
  io.emit('queue:update', {
    queues: queueCounts(),
    waiting: FEE_TIERS.reduce((m, f) => {
      queues.get(f).forEach(id => { m[id] = f; });
      return m;
    }, {})
  });
}

function addToQueue(player, fee) {
  removeFromQueue(player.id);
  if (!canAfford(player, fee)) {
    return { ok: false, error: `You need at least ₹${fee} in your wallet.` };
  }
  const q = queues.get(fee);
  let idx = q.findIndex(id => {
    if (id === player.id) return false;
    if (socketsByPlayer.get(id)?.connected !== true) return false;
    if (playerRoom.has(id)) return false;
    return true;
  });
  if (idx >= 0) {
    const oppId = q.splice(idx, 1)[0];
    const opp = io.sockets.sockets.get(socketsByPlayer.get(oppId)?.id)?.data?.player;
    if (opp) {
      broadcastQueues();
      startRoom(opp, player, fee);
      return { ok: true, matched: true };
    }
    q.push(oppId);
  }
  q.push(player.id);
  broadcastQueues();
  return { ok: true, matched: false, position: q.length };
}

function removeFromQueue(playerId) {
  for (const f of FEE_TIERS) {
    const q = queues.get(f);
    const i = q.indexOf(playerId);
    if (i >= 0) q.splice(i, 1);
  }
}

function emitTo(playerId, event, payload) {
  const s = socketsByPlayer.get(playerId);
  if (s) s.emit(event, payload);
}

function emitToRoom(game, event, payload) {
  game.players.forEach(p => emitTo(p.id, event, payload));
}

/* ------------------------------------------------------------------ *
 *  room lifecycle
 * ------------------------------------------------------------------ */
function startRoom(playerA, playerB, fee) {
  const p1 = playerA.id === playerB.id ? null : playerA;
  const p2 = playerB;
  if (!p1) return;

  if (!canAfford(p1, fee) || !canAfford(p2, fee)) {
    emitTo(p1.id, 'error', { msg: 'Insufficient balance to start this match.' });
    emitTo(p2.id, 'error', { msg: 'Insufficient balance to start this match.' });
    addToQueue(p1, fee);
    return;
  }
  addBalance(p1, -fee);
  addBalance(p2, -fee);
  const pot = fee * 2;

  const game = new CarromGame({
    fee,
    players: [
      { id: p1.id, name: p1.name, isBot: !!p1.isBot },
      { id: p2.id, name: p2.name, isBot: !!p2.isBot }
    ],
    onEvent: onGameEvent,
    onFinish: onGameFinish
  });
  game.pot = pot;
  game.breakSide = 0;
  rooms.set(game.id, game);
  playerRoom.set(p1.id, game.id);
  playerRoom.set(p2.id, game.id);
  removeFromQueue(p1.id);
  removeFromQueue(p2.id);
  rematchVotes.delete(game.id);

  for (const p of game.players) {
    const pl = p.id === p1.id ? p1 : p2;
    emitTo(p.id, 'balance', { balance: pl.balance });
    emitTo(p.id, 'room:found', {
      room: {
        id: game.id,
        fee,
        pot,
        platformFee: settle(pot).platformFee,
        players: game.players.map(pp => ({
          id: pp.id, name: pp.name, color: pp.color, isBot: pp.isBot, connected: pp.connected
        })),
        you: p.id,
        yourColor: p.color,
        state: game.state()
      }
    });
  }
  broadcastQueues();
  game.broadcast();
  scheduleBot(game);
  return game;
}

function startBotRoom(player, fee) {
  if (!canAfford(player, fee)) {
    emitTo(player.id, 'error', { msg: `You need at least ₹${fee} in your wallet.` });
    return;
  }
  addBalance(player, -fee);
  const pot = fee * 2;
  const names = ['Raja', 'Meena', 'Suresh', 'Anita', 'Vikram', 'Priya'];
  const bot = {
    id: 'bot_' + Math.random().toString(36).slice(2, 8),
    name: names[Math.floor(Math.random() * names.length)] + ' (Bot)',
    balance: 0,
    isBot: true
  };
  const game = new CarromGame({
    fee,
    players: [
      { id: player.id, name: player.name, isBot: false },
      { id: bot.id, name: bot.name, isBot: true }
    ],
    onEvent: onGameEvent,
    onFinish: onGameFinish
  });
  game.pot = pot;
  game.breakSide = 0;           // the human (players[0]) always breaks
  rooms.set(game.id, game);
  playerRoom.set(player.id, game.id);
  rematchVotes.delete(game.id);

  emitTo(player.id, 'balance', { balance: player.balance });
  emitTo(player.id, 'room:found', {
    room: {
      id: game.id, fee, pot,
      platformFee: settle(pot).platformFee,
      players: game.players.map(pp => ({ id: pp.id, name: pp.name, color: pp.color, isBot: pp.isBot, connected: true })),
      you: player.id,
      yourColor: game.players[0].color,
      state: game.state()
    }
  });
  game.broadcast();
  scheduleBot(game);
  return game;
}

function cleanupRoom(gameId) {
  const game = rooms.get(gameId);
  if (!game) return;
  game.destroy();
  for (const p of game.players) playerRoom.delete(p.id);
  const t = forfeitTimers.get(gameId); if (t) { clearTimeout(t); forfeitTimers.delete(gameId); }
  const b = botTimers.get(gameId); if (b) { clearTimeout(b); botTimers.delete(gameId); }
  rooms.delete(gameId);
  rematchVotes.delete(gameId);
}

function forfeitIfNeeded(game, playerId) {
  game.forfeit(playerId, `${game.byId(playerId)?.name || 'A player'} left the game.`);
}

/* ------------------------------------------------------------------ *
 *  game event plumbing
 * ------------------------------------------------------------------ */
let lastTickSent = 0;

function onGameEvent(game, evt) {
  switch (evt.type) {
    case 'tick': {
      const now = Date.now();
      if (now - lastTickSent < TICK_MS) return;
      lastTickSent = now;
      emitToRoom(game, 'game:tick', {
        roomId: game.id,
        p: game.tickSnapshot(),
        s: game.world.striker.out ? null : [+game.world.striker.x.toFixed(2), +game.world.striker.y.toFixed(2)]
      });
      break;
    }
    case 'state':
      emitToRoom(game, 'game:state', evt.state);
      scheduleBot(game);
      break;
    case 'striker':
      emitToRoom(game, 'game:striker', { roomId: game.id, x: evt.x, y: evt.y });
      break;
    case 'shot-start':
      emitToRoom(game, 'game:shot', { roomId: game.id, player: evt.player });
      break;
  }
}

function onGameFinish(game, result) {
  const fee = game.fee;
  const pot = game.pot || fee * 2;
  const [a, b] = game.players;
  const board = {
    roomId: game.id,
    ...result,
    pot,
    fee,
    platformFee: settle(pot).platformFee,
    nextTiers: FEE_TIERS
  };

  for (const p of game.players) {
    const pl = socketsByPlayer.get(p.id)?.data?.player;
    if (!pl) continue;
    const win = result.winnerId === p.id;
    let amount = 0;
    if (!result.winnerId) {
      amount = fee;                        // draw → entry back
      addBalance(pl, fee);
    } else if (win) {
      const forfeitWin = /left the game|reached the foul limit/.test(result.reason || '');
      amount = forfeitWin ? pot - fee : settle(pot).payout;
      addBalance(pl, amount);
    }
    board[game.players.indexOf(p) === 0 ? 'a' : 'b'] = {
      id: p.id, name: p.name, isBot: p.isBot, won: win, amount, balance: pl.balance
    };
    recordResult(pl, {
      won: win,
      payout: amount,
      pocketed: p.pocketed,
      fouls: p.fouls,
      isBot: p.isBot
    });
    emitTo(p.id, 'balance', { balance: pl.balance });
  }

  emitToRoom(game, 'game:over', board);
  game.broadcast();
  const t = setTimeout(() => cleanupRoom(game.id), 5 * 60_000);
  t.unref?.();
  broadcastQueues();
}

/* ------------------------------------------------------------------ *
 *  bot driver
 * ------------------------------------------------------------------ */
function scheduleBot(game) {
  if (!game || game.status !== 'playing') return;
  if (botTimers.has(game.id)) return;
  if (!game.isBotTurn()) return;

  const run = () => {
    botTimers.delete(game.id);
    if (game.status !== 'playing' || !game.isBotTurn()) return;
    const plan = botPlan(game);
    if (!plan) { game.shoot(game.current.id, Math.random() - 0.5, Math.random() - 0.5, 0.5); return; }
    game.placeStriker(game.current.id, plan.x, plan.y);
    setTimeout(() => {
      if (game.status === 'playing' && game.isBotTurn()) {
        game.shoot(game.current.id, plan.dx, plan.dy, plan.power);
      }
    }, 550);
  };

  const delay = game.phase === 'place' ? 900 : 1200;
  const t = setTimeout(run, delay);
  botTimers.set(game.id, t);
}

/* ------------------------------------------------------------------ *
 *  socket.io
 * ------------------------------------------------------------------ */
io.on('connection', socket => {
  socket.data.player = null;

  socket.on('hello', (payload = {}, ack) => {
    const player = getOrCreate(payload.playerId, payload.name);
    socket.data.player = player;

    const old = socketsByPlayer.get(player.id);
    if (old && old.id !== socket.id) {
      old.emit('kicked', { msg: 'You opened the game in another tab.' });
      old.disconnect(true);
    }
    socketsByPlayer.set(player.id, socket);
    socket.join('p:' + player.id);

    const roomId = playerRoom.get(player.id);
    const game = roomId ? rooms.get(roomId) : null;
    if (game) {
      const t = forfeitTimers.get(game.id);
      if (t) { clearTimeout(t); forfeitTimers.delete(game.id); }
      game.setConnected(player.id, true);
      socket.emit('room:found', {
        room: {
          id: game.id, fee: game.fee, pot: game.pot,
          platformFee: settle(game.pot || game.fee * 2).platformFee,
          players: game.players.map(pp => ({ id: pp.id, name: pp.name, color: pp.color, isBot: pp.isBot, connected: pp.connected })),
          you: player.id,
          yourColor: game.byId(player.id)?.color,
          state: game.state(),
          reconnected: true
        }
      });
      emitToRoom(game, 'opponent', { id: player.id, connected: true });
      game.broadcast();
    }

    if (typeof ack === 'function') ack({ ok: true, player: publicPlayer(player) });
    emitTo(player.id, 'balance', { balance: player.balance });
    socket.emit('queue:update', {
      queues: queueCounts(),
      waiting: FEE_TIERS.reduce((m, f) => { queues.get(f).forEach(id => { m[id] = f; }); return m; }, {})
    });
    scheduleBot(game);
  });

  socket.on('queue:join', (payload = {}, ack) => {
    const player = socket.data.player;
    if (!player) return ack && ack({ ok: false, error: 'Not signed in' });
    if (playerRoom.has(player.id)) return ack && ack({ ok: false, error: 'You are already in a game.' });
    const fee = Number(payload.fee);
    if (!FEE_TIERS.includes(fee)) return ack && ack({ ok: false, error: 'Invalid entry fee.' });
    const res = addToQueue(player, fee);
    if (res && res.matched) return ack && ack({ ok: true, matched: true });
    ack && ack(res);
  });

  socket.on('queue:leave', (_, ack) => {
    const player = socket.data.player;
    if (!player) return;
    removeFromQueue(player.id);
    broadcastQueues();
    ack && ack({ ok: true });
  });

  socket.on('bot:play', (payload = {}, ack) => {
    const player = socket.data.player;
    if (!player) return ack && ack({ ok: false, error: 'Not signed in' });
    if (playerRoom.has(player.id)) return ack && ack({ ok: false, error: 'You are already in a game.' });
    const fee = Number(payload.fee);
    if (!FEE_TIERS.includes(fee)) return ack && ack({ ok: false, error: 'Invalid entry fee.' });
    removeFromQueue(player.id);
    startBotRoom(player, fee);
    if (typeof ack === 'function') ack({ ok: true });
  });

  // Fallback for 'playBot' as well
  socket.on('playBot', (payload = {}, ack) => {
    const player = socket.data.player;
    if (!player) return ack && ack({ ok: false, error: 'Not signed in' });
    if (playerRoom.has(player.id)) return ack && ack({ ok: false, error: 'You are already in a game.' });
    const fee = Number(payload.fee);
    if (!FEE_TIERS.includes(fee)) return ack && ack({ ok: false, error: 'Invalid entry fee.' });
    removeFromQueue(player.id);
    startBotRoom(player, fee);
    if (typeof ack === 'function') ack({ ok: true });
  });

  socket.on('room:place', (payload = {}, ack) => {
    const player = socket.data.player;
    if (!player) return;
    const game = rooms.get(playerRoom.get(player.id));
    if (!game) return ack && ack({ ok: false, error: 'No game' });
    const res = game.placeStriker(player.id, +payload.x, +payload.y, !!payload.live);
    if (!res.ok && !payload.live) {
      emitTo(player.id, 'error', { msg: res.error, code: res.code });
    }
    if (typeof ack === 'function') ack(res);
  });

  socket.on('room:shoot', (payload = {}, ack) => {
    const player = socket.data.player;
    if (!player) return;
    const game = rooms.get(playerRoom.get(player.id));
    if (!game) return ack && ack({ ok: false, error: 'No game' });
    const res = game.shoot(player.id, +payload.dx, +payload.dy, +payload.power);
    if (!res.ok) emitTo(player.id, 'error', { msg: res.error });
    ack && ack(res);
  });

  socket.on('room:leave', () => {
    const player = socket.data.player;
    if (!player) return;
    removeFromQueue(player.id);
    const game = rooms.get(playerRoom.get(player.id));
    if (!game) { emitTo(player.id, 'room:left', {}); return; }
    if (game.status === 'playing') {
      forfeitIfNeeded(game, player.id);
    }
    emitToRoom(game, 'room:left', {});
    cleanupRoom(game.id);
  });

  socket.on('room:rematch', (payload = {}) => {
    const player = socket.data.player;
    if (!player) return;
    const game = rooms.get(playerRoom.get(player.id));
    if (!game) return;
    const fee = Number(payload.fee) || game.fee;
    if (!FEE_TIERS.includes(fee)) return;
    const humans = game.players.filter(p => !p.isBot);
    if (humans.length < 2) {
      cleanupRoom(game.id);
      startBotRoom(player, fee);
      return;
    }
    let votes = rematchVotes.get(game.id);
    if (!votes) { votes = new Set(); rematchVotes.set(game.id, votes); }
    votes.set(player.id, fee);
    emitToRoom(game, 'rematch:update', { votes: [...votes.keys()], count: votes.size, total: humans.length });
    if (votes.size === humans.length) {
      const [h1, h2] = humans;
      const a = socketsByPlayer.get(h1.id)?.data?.player;
      const b = socketsByPlayer.get(h2.id)?.data?.player;
      cleanupRoom(game.id);
      if (a && b) startRoom(a, b, fee);
    }
  });

  socket.on('chat', (payload = {}) => {
    const player = socket.data.player;
    if (!player) return;
    const game = rooms.get(playerRoom.get(player.id));
    if (!game) return;
    const text = String(payload.text || '').slice(0, 140).trim();
    if (!text) return;
    emitToRoom(game, 'chat', { id: player.id, name: player.name, text, ts: Date.now() });
  });

  socket.on('disconnect', () => {
    const player = socket.data.player;
    if (!player) return;
    if (socketsByPlayer.get(player.id) === socket) socketsByPlayer.delete(player.id);
    removeFromQueue(player.id);
    broadcastQueues();
    const game = rooms.get(playerRoom.get(player.id));
    if (game && game.status === 'playing') {
      game.setConnected(player.id, false);
      emitToRoom(game, 'opponent', { id: player.id, connected: false });
      const t = setTimeout(() => {
        const g = rooms.get(game.id);
        if (!g) return;
        if (!socketsByPlayer.has(player.id)) forfeitIfNeeded(g, player.id);
      }, FORFEIT_GRACE_MS);
      forfeitTimers.set(game.id, t);
    }
  });
});

/* ------------------------------------------------------------------ *
 *  http api
 * ------------------------------------------------------------------ */
app.get('/api/health', (req, res) => {
  res.json({
    ok: true,
    rooms: rooms.size,
    queues: queueCounts(),
    online: socketsByPlayer.size,
    fees: FEE_TIERS,
    platformFeePct: PLATFORM_PCT * 100
  });
});

app.get('/api/leaderboard', (req, res) => {
  import('./players.js').then(({ leaderboard }) => res.json({ top: leaderboard(10) }));
});

const distDir = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(distDir)) {
  app.use(express.static(distDir));
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/socket.io') || req.path.startsWith('/api')) return next();
    res.sendFile(path.join(distDir, 'index.html'));
  });
}

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n    🎯  Carrom server listening on http://localhost:${PORT}`);
  console.log(`        entry fee tiers: ₹${FEE_TIERS.join(' / ₹')}    (platform fee ${PLATFORM_PCT * 100}%)\n`);
});

process.on('uncaughtException', err => {
  console.error('[uncaught]', err);
});
process.on('unhandledRejection', err => {
  console.error('[unhandled]', err);
});