const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');

const express = require('express');
const http = require('http');
const { WebSocketServer, WebSocket } = require('ws');
const M = require('matter-js');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const cors = require('cors');
const axios = require('axios');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server, maxPayload: 4096 });

app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

// MongoDB Connection
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB Atlas successfully!');
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server is running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err);
  });

// ==========================================
// 0. CARROM CONFIG & STATE MANAGEMENT
// ==========================================
const TIERS = [2, 5, 10, 25];
const DB = process.env.CARROM_DB || path.join(__dirname, 'data/profiles.json');
try {
  fs.mkdirSync(path.dirname(DB), { recursive: true });
} catch {}

let profiles = {};
try { 
  profiles = JSON.parse(fs.readFileSync(DB, 'utf8')); 
} catch {}

for (const p of Object.values(profiles)) { 
  if (p.held) { 
    p.balance += p.held; 
    p.held = 0; 
    p.history.unshift({ kind: 'Refund', amount: p.refundStake || 0, at: Date.now(), note: 'Unfinished match restored after restart' }); 
  } 
}

function save() { 
  try {
    fs.writeFileSync(DB + '.tmp', JSON.stringify(profiles)); 
    fs.renameSync(DB + '.tmp', DB); 
  } catch(e) {
    console.error("Carrom profile save error:", e);
  }
}
save();

const sockets = new Map(), queue = new Map(), games = new Map(), playerGame = new Map();

function cookie(req) { 
  return (req.headers.cookie || '').split(';').map(s => s.trim()).find(s => s.startsWith('carrom_session='))?.slice(15); 
}
function publicProfile(p) { 
  return { id: p.id, name: p.name, balance: p.balance, wins: p.wins, played: p.played, history: (p.history || []).slice(0, 25) }; 
}
function validToken(token) { 
  return typeof token === 'string' && /^[a-f0-9]{64}$/.test(token) && Object.hasOwn(profiles, token); 
}

// Carrom API Session Middleware
app.use('/api/carrom-session', (req, res, next) => {
  res.setHeader('Cache-Control', 'no-store');
  let token = req.headers.authorization?.replace(/^Bearer /, '') || cookie(req);
  if (!validToken(token)) {
    token = crypto.randomBytes(32).toString('hex');
    profiles[token] = {
      id: crypto.randomUUID(), 
      name: 'Player ' + Math.floor(1000 + Math.random() * 9000), 
      balance: 250, 
      held: 0, 
      wins: 0, 
      played: 0, 
      history: [{ kind: 'Welcome credits', amount: 250, at: Date.now(), note: 'Demo credits · no cash value' }]
    };
    res.setHeader('Set-Cookie', `carrom_session=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`);
    save();
  }
  req.token = token; 
  req.profile = profiles[token]; 
  next();
});

app.get('/api/carrom-session/me', (req, res) => res.json({ ...publicProfile(req.profile), sessionToken: req.token }));
app.get('/api/carrom-session/status', (req, res) => res.json({ online: sockets.size, queued: queue.size, matches: games.size, tiers: TIERS, mode: 'demo' }));

function sendWs(ws, data) { 
  if (ws.readyState === WebSocket.OPEN) ws.send(JSON.stringify(data)); 
}
function emitWs(token, data) { 
  for (const ws of sockets.get(token) || []) sendWs(ws, data); 
}
function profileUpdate(token) { 
  emitWs(token, { type: 'profile', profile: publicProfile(profiles[token]) }); 
}
function stats() { 
  const counts = {}; 
  TIERS.forEach(t => counts[t] = [...queue.values()].filter(q => q.stake === t).length); 
  for (const t of sockets.keys()) emitWs(t, { type: 'stats', online: sockets.size, queued: queue.size, matches: games.size, counts }); 
}
function addHistory(t, kind, amount, note) {
  const p = profiles[t];
  if(!p.history) p.history = [];
  p.history.unshift({ kind, amount, at: Date.now(), note });
  p.history = p.history.slice(0, 50);
}

const pockets = [{ x: 96, y: 96 }, { x: 704, y: 96 }, { x: 96, y: 704 }, { x: 704, y: 704 }];
function makeBody(x, y, r, label, id) { 
  return M.Bodies.circle(x, y, r, { label, plugin: { id }, restitution: 0.88, friction: 0, frictionAir: 0.012, density: label === 'striker' ? 0.0022 : 0.001 }); 
}
function newGame(a, b, stake) {
  const id = crypto.randomUUID(), engine = M.Engine.create({ gravity: { x: 0, y: 0 } });
  const walls = [
    M.Bodies.rectangle(400, 53, 710, 30, { isStatic: true, restitution: 0.9, friction: 0 }),
    M.Bodies.rectangle(400, 747, 710, 30, { isStatic: true, restitution: 0.9, friction: 0 }),
    M.Bodies.rectangle(53, 400, 30, 710, { isStatic: true, restitution: 0.9, friction: 0 }),
    M.Bodies.rectangle(747, 400, 30, 710, { isStatic: true, restitution: 0.9, friction: 0 })
  ];
  M.Composite.add(engine.world, walls);
  const g = { id, engine, players: [a, b], stake, scores: [0, 0], turn: Math.random() < .5 ? 0 : 1, shot: false, striker: null, coins: [], last: 'Match on. First to 5 points wins.', deadline: Date.now() + 45000, offline: {}, sunk: [], foul: false, quiet: 0, ticks: 0, shotNumber: 0 };
  let n = 0, color = 0;
  for (let q = -2; q <= 2; q++) {
    for (let r = -2; r <= 2; r++) {
      if (Math.abs(q + r) <= 2) {
        const x = 400 + q * 29 + r * 14.5, y = 400 + r * 25.115;
        const label = (q === 0 && r === 0) ? 'queen' : (++color % 2 ? 'black' : 'white');
        const c = makeBody(x, y, 13.8, label, 'c' + n++);
        g.coins.push(c); 
        M.Composite.add(engine.world, c);
      }
    }
  }
  for (const t of [a, b]) { 
    profiles[t].balance -= stake; 
    profiles[t].held = stake; 
    profiles[t].refundStake = stake; 
    addHistory(t, 'Match entry', -stake, 'Quick match · simulated entry'); 
    queue.delete(t); 
    playerGame.set(t, id); 
  }
  games.set(id, g); 
  placeStriker(g, 400); 
  save(); 
  for (const t of [a, b]) profileUpdate(t); 
  broadcastGame(g); 
  stats();
}

function placeStriker(g, x) { 
  if (g.striker) M.Composite.remove(g.engine.world, g.striker); 
  g.striker = makeBody(x, g.turn === 0 ? 626 : 174, 19, 'striker', 's'); 
  M.Composite.add(engine.world, g.striker); 
}
function bodyData(b) { 
  return { id: b.plugin.id, x: b.position.x, y: b.position.y, kind: b.label, r: b.circleRadius }; 
}
function gameState(g, t) {
  return { 
    type: 'game', 
    id: g.id, 
    you: g.players.indexOf(t), 
    players: g.players.map(k => ({ id: profiles[k].id, name: profiles[k].name, online: !!sockets.get(k)?.size })), 
    stake: g.stake, 
    scores: g.scores, 
    turn: g.turn, 
    shot: g.shot, 
    deadline: g.deadline, 
    last: g.last, 
    shotNumber: g.shotNumber, 
    coins: g.coins.map(bodyData), 
    striker: g.striker ? bodyData(g.striker) : null 
  };
}
function broadcastGame(g) { 
  for (const t of g.players) emitWs(t, gameState(g, t)); 
}
function finish(g, winner, reason) {
  if (!games.has(g.id)) return;
  const prize = g.stake * 2;
  for (let i = 0; i < 2; i++) {
    const t = g.players[i];
    profiles[t].held = 0; 
    profiles[t].played++; 
    if (i === winner) { 
      profiles[t].balance += prize; 
      profiles[t].wins++; 
      addHistory(t, 'Match won', prize, 'Quick match · demo prize'); 
    }
    playerGame.delete(t);
  }
  save();
  for (const t of g.players) { 
    emitWs(t, { type: 'result', you: g.players.indexOf(t), winner, prize, stake: g.stake, scores: g.scores, reason, players: g.players.map(k => profiles[k].name) }); 
    profileUpdate(t); 
  }
  games.delete(g.id); 
  M.Engine.clear(g.engine); 
  stats();
}
function endShot(g) {
  g.shot = false; 
  const earned = g.sunk.reduce((s, c) => s + (c.label === 'queen' ? 2 : 1), 0);
  if (g.foul) {
    g.scores[g.turn] = Math.max(0, g.scores[g.turn] - 1);
    for (const c of g.sunk) {
      let x = 400, y = 400;
      for (let j = 0; j < 200; j++) {
        const angle = j * 2.4, rad = 18 * Math.sqrt(j);
        x = 400 + Math.cos(angle) * rad; 
        y = 400 + Math.sin(angle) * rad;
        if (g.coins.every(b => Math.hypot(b.position.x - x, b.position.y - y) > 31)) break;
      }
      M.Body.setPosition(c, { x, y }); 
      M.Body.setVelocity(c, { x: 0, y: 0 }); 
      M.Body.setAngularVelocity(c, 0); 
      g.coins.push(c); 
      M.Composite.add(g.engine.world, c);
    }
    g.last = 'Striker foul. −1 point and the turn passes.';
  } else {
    g.scores[g.turn] += earned;
    g.last = earned ? `${profiles[g.players[g.turn]].name} pocketed ${earned} point${earned > 1 ? 's' : ''}. Go again!` : 'No pocket. The turn passes.';
  }
  if (g.scores[g.turn] >= 5) { finish(g, g.turn, 'First to 5 points'); return; }
  if (!g.coins.length) { finish(g, g.scores[0] === g.scores[1] ? g.turn : (g.scores[0] > g.scores[1] ? 0 : 1), 'Board cleared'); return; }
  if (!earned || g.foul) g.turn = 1 - g.turn;
  g.sunk = []; 
  g.foul = false; 
  g.deadline = Date.now() + 45000; 
  placeStriker(g, 400); 
  broadcastGame(g);
}

function tick() {
  for (const g of games.values()) {
    for (let i = 0; i < 2; i++) {
      if (g.offline[g.players[i]] && Date.now() - g.offline[g.players[i]] > 60000) { 
        finish(g, 1 - i, 'Opponent disconnected for 60 seconds'); 
        break; 
      }
    }
    if (!games.has(g.id)) continue;
    if (!g.shot) {
      if (Date.now() > g.deadline) { 
        g.turn = 1 - g.turn; 
        g.deadline = Date.now() + 45000; 
        g.last = 'Time is up. The turn passes.'; 
        placeStriker(g, 400); 
        broadcastGame(g); 
      }
      continue;
    }
    for (let i = 0; i < 2; i++) {
      M.Engine.update(g.engine, 1000 / 120);
      for (const c of [...g.coins]) {
        if (pockets.some(p => Math.hypot(c.position.x - p.x, c.position.y - p.y) < 25)) {
          M.Composite.remove(g.engine.world, c);
          g.coins = g.coins.filter(b => b !== c);
          g.sunk.push(c);
        }
      }
      if (g.striker && pockets.some(p => Math.hypot(g.striker.position.x - p.x, g.striker.position.y - p.y) < 27)) {
        M.Composite.remove(g.engine.world, g.striker);
        g.striker = null;
        g.foul = true;
      }
    }
    const moving = [...g.coins, ...(g.striker ? [g.striker] : [])].some(b => b.speed > 0.10);
    g.quiet = moving ? 0 : g.quiet + 1; 
    g.ticks++;
    if (g.quiet > 18 || g.ticks > 1100) {
      for (const b of [...g.coins, ...(g.striker ? [g.striker] : [])]) {
        M.Body.setVelocity(b, { x: 0, y: 0 });
        M.Body.setAngularVelocity(b, 0);
      }
      endShot(g);
    } else if (g.ticks % 2 === 0) {
      broadcastGame(g);
    }
  }
}

// Attach WebSocket Connection Handler
wss.on('connection', (ws, req) => {
  const offered = (req.headers['sec-websocket-protocol'] || '').split(',').map(s => s.trim());
  const token = offered.find(t => validToken(t)) || cookie(req);
  if (!validToken(token)) return ws.close(1008, 'Open the app first');
  
  if (!sockets.has(token)) sockets.set(token, new Set());
  sockets.get(token).add(ws);
  
  sendWs(ws, { type: 'profile', profile: publicProfile(profiles[token]) });
  const active = games.get(playerGame.get(token));
  if (active) { 
    delete active.offline[token]; 
    broadcastGame(active); 
  } else if (queue.has(token)) {
    sendWs(ws, { type: 'queued', stake: queue.get(token).stake, since: queue.get(token).since });
  } else {
    sendWs(ws, { type: 'idle' });
  }
  stats();

  let lastShot = 0, lastMessage = 0, burst = 0;
  ws.on('message', raw => {
    try {
      const now = Date.now();
      if (now - lastMessage < 1000) { if (++burst > 25) return; } else { lastMessage = now; burst = 0; }
      const m = JSON.parse(raw);
      const p = profiles[token];
      if (m.type === 'name') {
        if (playerGame.has(token) || queue.has(token)) return;
        const name = String(m.name || '').trim().replace(/[<>\x00-\x1f]/g, '').slice(0, 20);
        if (name.length < 2) return sendWs(ws, { type: 'error', message: 'Please use a name with at least 2 characters.' });
        p.name = name; 
        save(); 
        profileUpdate(token);
      }
      if (m.type === 'join') {
        if (playerGame.has(token)) return sendWs(ws, { type: 'error', message: 'You already have an active match.' });
        if (!TIERS.includes(m.stake)) return sendWs(ws, { type: 'error', message: 'Choose a valid entry tier.' });
        if (p.balance < m.stake) return sendWs(ws, { type: 'error', message: 'Not enough demo credits. Refill them in your wallet.' });
        if (queue.has(token)) { const q = queue.get(token); return emitWs(token, { type: 'queued', stake: q.stake, since: q.since }); }
        const other = [...queue.entries()].find(([t, q]) => t !== token && q.stake === m.stake && sockets.get(t)?.size && !playerGame.has(t) && profiles[t].balance >= m.stake);
        if (other) newGame(other[0], token, m.stake);
        else { queue.set(token, { stake: m.stake, since: Date.now() }); emitWs(token, { type: 'queued', stake: m.stake, since: Date.now() }); stats(); }
      }
      if (m.type === 'cancel') { queue.delete(token); emitWs(token, { type: 'cancelled' }); stats(); }
      if (m.type === 'refill') {
        if (playerGame.has(token) || queue.has(token)) return sendWs(ws, { type: 'error', message: 'Finish your match or cancel your search before refilling.' });
        if (p.balance >= 250) return sendWs(ws, { type: 'error', message: 'You already have at least 250 demo credits.' });
        const amount = 250 - p.balance; 
        p.balance = 250; 
        addHistory(token, 'Demo refill', amount, 'Free practice credits · no cash value'); 
        save(); 
        profileUpdate(token);
      }
      const g = games.get(playerGame.get(token));
      if (m.type === 'forfeit' && g) finish(g, 1 - g.players.indexOf(token), 'Opponent left the match');
      if (m.type === 'shoot' && g) {
        if (g.shot || g.players[g.turn] !== token || now - lastShot < 800) return;
        if (![m.x, m.dx, m.dy, m.power].every(Number.isFinite)) return;
        const len = Math.hypot(m.dx, m.dy); if (len < .01 || m.power < .05) return;
        const x = Math.max(196, Math.min(604, m.x)); const y = g.turn === 0 ? 626 : 174;
        if (g.coins.some(c => Math.hypot(c.position.x - x, c.position.y - y) < 34)) return sendWs(ws, { type: 'error', message: 'A coin blocks that position. Move the striker along the baseline.' });
        lastShot = now; 
        placeStriker(g, x); 
        const speed = Math.max(2, Math.min(22, m.power * 22)); 
        M.Body.setVelocity(g.striker, { x: m.dx / len * speed, y: m.dy / len * speed }); 
        g.shot = true; 
        g.sunk = []; 
        g.foul = false; 
        g.quiet = 0; 
        g.ticks = 0; 
        g.shotNumber++; 
        g.last = `${p.name} takes the shot.`; 
        broadcastGame(g);
      }
    } catch {
      sendWs(ws, { type: 'error', message: 'That action could not be completed.' });
    }
  });

  ws.on('close', () => {
    sockets.get(token)?.delete(ws);
    if (!sockets.get(token)?.size) {
      sockets.delete(token); 
      queue.delete(token);
      const g = games.get(playerGame.get(token));
      if (g) { 
        g.offline[token] = Date.now(); 
        g.last = 'Opponent disconnected. Waiting up to 60 seconds to reconnect.'; 
        broadcastGame(g); 
      }
      stats();
    }
  });
  ws.isAlive = true;
  ws.on('pong', () => ws.isAlive = true);
});

// Start Carrom Game Loops
setInterval(tick, 1000 / 60);
setInterval(() => {
  for (const ws of wss.clients) {
    if (!ws.isAlive) { ws.terminate(); continue; }
    ws.isAlive = false; 
    ws.ping();
  }
}, 20000);


// ==========================================
// 1. SCHEMAS & MODELS (WINARENA ORIGINAL)
// ==========================================

const userSchema = new mongoose.Schema({
    name: { type: String, default: "Arena Player" },
    email: { type: String, unique: true },
    mobile: { type: String, default: "" },
    walletBalance: { type: Number, default: 0.00 },
    timestamp: { type: Date, default: Date.now }
});
const User = mongoose.model('User', userSchema);

const adminEarningsSchema = new mongoose.Schema({
    userId: String,
    userEmail: String,
    withdrawalAmount: Number,
    commissionAmount: Number,
    finalPayout: Number,
    method: String,
    details: Object,
    status: { type: String, default: "Pending" },
    timestamp: { type: Date, default: Date.now }
});
const AdminEarning = mongoose.model('AdminEarning', adminEarningsSchema);

const withdrawalSchema = new mongoose.Schema({
    userEmail: String,
    withdrawalAmount: Number,
    commissionAmount: Number,
    finalPayout: Number,
    method: String,
    details: Object,
    status: { type: String, default: "Pending" },
    timestamp: { type: Date, default: Date.now }
});
const Withdrawal = mongoose.model('Withdrawal', withdrawalSchema);

const tournamentSchema = new mongoose.Schema({
    game: { type: String, required: true },
    mode: { type: String, required: true },
    entry: { type: Number, required: true },
    prize: { type: Number, required: true },
    slots: { type: Number, required: true },
    startTime: { type: String, required: true },
    roomId: { type: String, default: "" },
    roomPass: { type: String, default: "" },
    registeredUsers: { type: Array, default: [] },
    timestamp: { type: Date, default: Date.now }
});
const Tournament = mongoose.model('Tournament', tournamentSchema);


// ==========================================
// 2. ROUTES (WINARENA ORIGINAL)
// ==========================================

app.get('/', (req, res) => {
  res.send('Win Arena Backend API is active!');
});

// User Balance Get API
app.get('/api/user/balance', async (req, res) => {
    try {
        const userEmail = req.query.email || "user@winarena.com";
        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
            await user.save();
        }
        res.json({ success: true, balance: user.walletBalance });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error fetching balance" });
    }
});

// User Search / Verify API
app.get('/api/user/search', async (req, res) => {
    try {
        const { mobile } = req.query;
        if (!mobile) return res.status(400).json({ success: false, message: "Mobile number required" });

        const user = await User.findOne({ mobile: mobile.trim() });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found with this mobile number!" });
        }

        res.json({
            success: true,
            user: {
                name: user.name,
                mobile: user.mobile,
                email: user.email,
                balance: user.walletBalance
            }
        });
    } catch (err) {
        console.error("Search user error:", err);
        res.status(500).json({ success: false, message: "Server error during user search" });
    }
});

// User Register / Sync API
app.post('/api/user/register', async (req, res) => {
    try {
        const { name, email, mobile } = req.body;
        const userEmail = email || "user@winarena.com";

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({
                name: name || "Arena Player",
                email: userEmail,
                mobile: mobile || "",
                walletBalance: 0.00
            });
            await user.save();
        } else {
            if (name) user.name = name;
            if (mobile) user.mobile = mobile;
            await user.save();
        }

        res.json({ success: true, message: "User synced successfully", balance: user.walletBalance });
    } catch (err) {
        console.error("User registration sync error:", err);
        res.status(500).json({ success: false, message: "Server error during user sync" });
    }
});

// Dedicated Add Money / Deposit API Route
app.post('/api/wallet/add', async (req, res) => {
    try {
        const { email, amount } = req.body;
        const addAmount = parseFloat(amount);
        const userEmail = email || "user@winarena.com";

        if (!addAmount || addAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount!" });
        }

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
        }

        user.walletBalance = parseFloat((user.walletBalance + addAmount).toFixed(2));
        await user.save();

        res.json({ 
            success: true, 
            message: "Money added successfully!", 
            newBalance: user.walletBalance 
        });
    } catch (err) {
        console.error("Add money error:", err);
        res.status(500).json({ success: false, message: "Server error during deposit" });
    }
});

// Dedicated Deduct / Spend Money API
app.post('/api/wallet/deduct', async (req, res) => {
    try {
        const { email, amount } = req.body;
        const deductAmount = parseFloat(amount);
        const userEmail = email || "user@winarena.com";

        if (!deductAmount || deductAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount!" });
        }

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
            await user.save();
        }

        if (user.walletBalance < deductAmount) {
            return res.status(400).json({ success: false, message: "Insufficient balance!" });
        }

        user.walletBalance = parseFloat((user.walletBalance - deductAmount).toFixed(2));
        await user.save();

        res.json({ 
            success: true, 
            message: "Amount deducted successfully!", 
            newBalance: user.walletBalance 
        });
    } catch (err) {
        console.error("Deduct money error:", err);
        res.status(500).json({ success: false, message: "Server error during deduction" });
    }
});

// Dedicated Withdrawal API Route
app.post('/api/withdraw', async (req, res) => {
    try {
        const { email, amount, method, details } = req.body;
        const amt = parseFloat(amount);
        const userEmail = email || "user@winarena.com";

        if (!amt || amt <= 0) {
            return res.status(400).json({ success: false, message: "Invalid withdrawal amount!" });
        }

        let user = await User.findOne({ email: userEmail });
        if (!user) {
            user = new User({ email: userEmail, walletBalance: 0.00 });
            await user.save();
        }

        if (user.walletBalance < amt) {
            return res.status(400).json({ success: false, message: "Insufficient balance!" });
        }

        const commission = parseFloat((amt * 0.025).toFixed(2));
        const finalPayout = parseFloat((amt - commission).toFixed(2));

        user.walletBalance = parseFloat((user.walletBalance - amt).toFixed(2));
        await user.save();

        const withdrawal = new Withdrawal({
            userEmail: userEmail,
            withdrawalAmount: amt,
            commissionAmount: commission,
            finalPayout,
            method,
            details
        });
        await withdrawal.save();

        res.json({ 
            success: true, 
            message: "Withdrawal request submitted successfully!", 
            newBalance: user.walletBalance,
            commissionAmount: commission,
            finalPayout: finalPayout
        });
    } catch (err) {
        console.error("Withdrawal error:", err);
        res.status(500).json({ success: false, message: "Server error during withdrawal" });
    }
});

// Admin Get Withdrawals API
app.get('/api/admin/withdrawals', async (req, res) => {
    try {
        const withdrawals = await Withdrawal.find().sort({ timestamp: -1 });
        res.json({ success: true, withdrawals });
    } catch (err) {
        console.error("Fetch withdrawals error:", err);
        res.status(500).json({ success: false, message: "Error fetching withdrawals" });
    }
});

// Admin Approve Withdrawal API
app.post('/api/admin/approve-withdrawal', async (req, res) => {
    try {
        const { id } = req.body;
        const withdrawal = await Withdrawal.findById(id);
        if (!withdrawal) {
            return res.status(404).json({ success: false, message: "Withdrawal request not found" });
        }

        withdrawal.status = "Approved";
        await withdrawal.save();
        res.json({ success: true, message: "Withdrawal approved successfully" });
    } catch (err) {
        console.error("Approve withdrawal error:", err);
        res.status(500).json({ success: false, message: "Error approving withdrawal" });
    }
});

// ---------------- TOURNAMENT APIs ----------------
app.get('/api/tournaments', async (req, res) => {
    try {
        const tournaments = await Tournament.find().sort({ timestamp: -1 });
        res.json({ success: true, tournaments });
    } catch (err) {
        console.error("Fetch tournaments error:", err);
        res.status(500).json({ success: false, message: "Server error while fetching tournaments" });
    }
});

app.post('/api/tournaments', async (req, res) => {
    try {
        const { game, mode, entry, prize, totalSlots, slots, startTime } = req.body;
        const newTournament = new Tournament({
            game,
            mode,
            entry,
            prize,
            slots: totalSlots || slots || 10,
            startTime,
            roomId: "",
            roomPass: ""
        });
        await newTournament.save();
        res.status(201).json({ success: true, message: "Tournament created successfully!", tournament: newTournament });
    } catch (err) {
        console.error("Error creating tournament:", err);
        res.status(500).json({ success: false, message: "Server error while creating tournament" });
    }
});

// Tournament Join API
app.post('/api/tournaments/join', async (req, res) => {
    try {
        const { tournamentId, userEmail, userName, gameId, gameUsername } = req.body;
        const cleanEmail = userEmail || "user@winarena.com";

        const tournament = await Tournament.findById(tournamentId);
        if (!tournament) {
            return res.status(404).json({ success: false, message: "Tournament not found!" });
        }

        const alreadyJoined = tournament.registeredUsers.some(u => u.email === cleanEmail);
        if (alreadyJoined) {
            return res.status(400).json({ success: false, message: "You have already joined this tournament!" });
        }

        if (tournament.registeredUsers.length >= tournament.slots) {
            return res.status(400).json({ success: false, message: "Tournament is full!" });
        }

        tournament.registeredUsers.push({
            email: cleanEmail,
            name: userName || "Player",
            gameId: gameId || "",
            gameUsername: gameUsername || "",
            timestamp: new Date()
        });

        await tournament.save();
        res.json({ success: true, message: "Tournament joined successfully!", tournament });
    } catch (err) {
        console.error("Join tournament error:", err);
        res.status(500).json({ success: false, message: "Server error while joining tournament" });
    }
});

// Admin Pay Winner API
app.post('/api/admin/pay-winner', async (req, res) => {
    try {
        const { userEmail, prizeAmount } = req.body;
        const winAmount = parseFloat(prizeAmount);

        if (!winAmount || winAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid prize amount!" });
        }

        let user = await User.findOne({ email: userEmail || "user@winarena.com" });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found!" });
        }

        user.walletBalance = parseFloat((user.walletBalance + winAmount).toFixed(2));
        await user.save();

        res.json({
            success: true,
            message: `Successfully added ₹${winAmount} to ${user.name}'s wallet!`,
            newBalance: user.walletBalance
        });
    } catch (err) {
        console.error("Pay winner error:", err);
        res.status(500).json({ success: false, message: "Server error while paying winner" });
    }
});

// P2P Wallet Transfer API
app.post('/api/transfer', async (req, res) => {
    try {
        const { senderEmail, recipientMobile, amount } = req.body;
        const trAmount = parseFloat(amount);
        
        if (!trAmount || trAmount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid transfer amount!" });
        }

        const validSenderEmail = senderEmail || "user@winarena.com";
        const cleanRecipientMobile = (recipientMobile || "").trim();

        let sender = await User.findOne({ email: validSenderEmail });
        if (!sender) {
            sender = new User({
                name: validSenderEmail.split('@')[0],
                email: validSenderEmail,
                mobile: "8857824607",
                walletBalance: 100.00
            });
            await sender.save();
        }

        let recipient = await User.findOne({ mobile: cleanRecipientMobile });
        if (!recipient) {
            recipient = new User({
                name: `User_${cleanRecipientMobile.slice(-4) || "Player"}`,
                email: `${cleanRecipientMobile || Date.now()}@winarena.com`,
                mobile: cleanRecipientMobile,
                walletBalance: 0.00
            });
            await recipient.save();
        }

        if (sender.mobile && cleanRecipientMobile && sender.mobile === cleanRecipientMobile) {
            return res.status(400).json({ success: false, message: "Cannot transfer money to your own account!" });
        }

        if (sender.walletBalance < trAmount) {
            return res.status(400).json({ 
                success: false, 
                message: `Insufficient wallet balance! Your balance is ₹${sender.walletBalance.toFixed(2)}` 
            });
        }

        sender.walletBalance = parseFloat((sender.walletBalance - trAmount).toFixed(2));
        recipient.walletBalance = parseFloat((recipient.walletBalance + trAmount).toFixed(2));

        await sender.save();
        await recipient.save();

        res.json({ 
            success: true, 
            message: "Transfer successful!", 
            senderNewBalance: sender.walletBalance,
            recipientNewBalance: recipient.walletBalance 
        });
    } catch (err) {
        console.error("P2P Transfer error:", err);
        res.status(500).json({ success: false, message: "Server error during P2P transfer: " + err.message });
    }
});

// ---------------- CASHFREE ORDER API ----------------
app.post('/api/create-cashfree-order', async (req, res) => {
    try {
        const { amount, customerEmail, customerPhone } = req.body;
        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: "Invalid amount" });
        }

        const orderId = "order_" + Date.now();
        const userEmail = customerEmail || "user@winarena.com";

        const response = await axios.post(
            'https://sandbox.cashfree.com/pg/orders',
            {
                order_id: orderId,
                order_amount: amount,
                order_currency: "INR",
                customer_details: {
                    customer_id: "cust_" + Date.now(),
                    customer_email: userEmail,
                    customer_phone: customerPhone || "9999999999"
                },
                order_meta: {
                    return_url: `https://winarena-backend-1.onrender.com/api/payment-status?order_id=${orderId}&email=${encodeURIComponent(userEmail)}&amount=${amount}`
                }
            },
            {
                headers: {
                    'x-client-id': process.env.CASHFREE_CLIENT_ID,
                    'x-client-secret': process.env.CASHFREE_CLIENT_SECRET,
                    'x-api-version': '2022-09-01',
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({ success: true, payment_session_id: response.data.payment_session_id, order_id: orderId });
    } catch (err) {
        console.error("Cashfree Order Error:", err.response?.data || err.message);
        res.status(500).json({ success: false, message: "Failed to create Cashfree order" });
    }
});

// ---------------- CASHFREE PAYMENT STATUS ROUTE ----------------
app.get('/api/payment-status', async (req, res) => {
    try {
        const { order_id, email, amount } = req.query;

        if (email && amount) {
            const addAmount = parseFloat(amount);
            let user = await User.findOne({ email: email });
            if (user && addAmount > 0) {
                user.walletBalance = parseFloat((user.walletBalance + addAmount).toFixed(2));
                await user.save();
            }
        }

        res.send(`
            <html>
                <head>
                    <title>Payment Successful</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1.0">
                </head>
                <body style="background: #0f172a; color: #fff; text-align: center; padding-top: 80px; font-family: sans-serif;">
                    <div style="background: #1e1b4b; border: 2px solid #22c55e; padding: 30px; border-radius: 20px; max-width: 350px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
                        <h2 style="color: #22c55e; margin-top: 0;">Payment Successful! 🎉</h2>
                        <p style="font-size: 14px; color: #cbd5e1;">Aapka payment safal ho gaya hai. Order ID: <strong>${order_id || ''}</strong></p>
                        <p style="font-size: 13px; color: #22c55e; font-weight: bold; margin-top: 15px;">Aapka wallet balance safaltapurvak update kar diya gaya hai!</p>
                        <p style="font-size: 12px; color: #fbbf24; margin-top: 20px;">Aap ab is page ko band karke apne app par wapas ja sakte hain.</p>
                    </div>
                </body>
            </html>
        `);
    } catch (err) {
        console.error("Payment status error:", err);
        res.status(500).send("Server error during payment status check");
    }
});