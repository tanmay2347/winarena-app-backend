/* Headless end-to-end test: two real socket clients play a full board. */
import { io } from 'socket.io-client';
import { botPlan } from '../server/bot.js';
import { COIN_R, SLUG_R, QUEEN } from '../shared/carrom.js';

const URL = process.env.URL || 'http://localhost:3001';
const FEE = Number(process.env.FEE || 5);
const MAX_SHOTS = Number(process.env.MAX_SHOTS || 90);

function fakeGame(state, me) {
  const players = state.players;
  const idx = players.findIndex(p => p.id === me);
  return {
    current: players[idx],
    players,
    isBreak: state.isBreak,
    queenShowdown: state.queenShowdown,
    world: {
      striker: { x: 0, y: 0 },
      pieces: state.pieces.map(p => ({
        x: p.x, y: p.y, out: false, kind: p.kind,
        color: p.color, r: p.kind === 'slug' ? SLUG_R : COIN_R
      }))
    }
  };
}

function makeClient(name) {
  return new Promise(resolve => {
    const s = io(URL, { transports: ['websocket'] });
    const c = { socket: s, name, id: null, state: null, room: null, over: null, balance: 0, log: [] };
    s.on('connect', () => s.emit('hello', { name }, res => { c.id = res.player.id; c.balance = res.player.balance; resolve(c); }));
    s.on('balance', d => { c.balance = d.balance; });
    s.on('room:found', d => { c.room = d.room; c.state = d.room.state; c.log.push(`room:found ${d.room.id} fee=${d.room.fee} you=${d.room.you}`); });
    s.on('game:state', st => { c.state = st; });
    s.on('game:tick', () => {});
    s.on('game:over', d => { c.over = d; });
    s.on('error', d => console.log(`  ⚠ ${name}: ${d.msg}`));
  });
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitFor(fn, ms = 20000, label = '') {
  const t0 = Date.now();
  while (Date.now() - t0 < ms) {
    if (fn()) return true;
    await sleep(60);
  }
  throw new Error('timeout waiting for ' + label);
}

(async () => {
  console.log(`\n▶ simulating two players on the ₹${FEE} table\n`);
  const A = await makeClient('Alpha');
  const B = await makeClient('Bravo');
  console.log(`  A=${A.id} (₹${A.balance})   B=${B.id} (₹${B.balance})`);

  A.socket.emit('queue:join', { fee: FEE }, r => console.log('  A join:', JSON.stringify(r)));
  await sleep(250);
  B.socket.emit('queue:join', { fee: FEE }, r => console.log('  B join:', JSON.stringify(r)));

  await waitFor(() => A.room && B.room, 15000, 'rooms');
  console.log(`  ✔ matched: room ${A.room.id}  pot ₹${A.room.pot}  A=${A.room.players.find(p => p.id === A.id).color} B=${A.room.players.find(p => p.id === B.id).color}`);
  console.log(`  ✔ balances after entry: A=₹${A.balance} B=₹${B.balance}`);
  await sleep(300);

  let shots = 0;
  const winner = { id: null };
  while (shots < MAX_SHOTS && !A.over) {
    const st = A.state;
    if (!st) { await sleep(80); continue; }
    if (st.status === 'over' || A.over) break;
    if (st.phase !== 'place') { await sleep(80); continue; }
    const me = st.turn;
    const client = me === A.id ? A : B;
    const plan = botPlan(fakeGame(st, me));
    if (!plan) { await sleep(100); continue; }
    const res = await new Promise(r => client.socket.emit('room:place', { x: plan.x, y: plan.y }, r));
    if (res && !res.ok && res.code !== 'BREAK_ZONE') {
      // fall back to the same side the server suggested
      await sleep(30);
    }
    await sleep(90);
    const before = st.shotNo;
    client.socket.emit('room:shoot', { dx: plan.dx, dy: plan.dy, power: plan.power });
    await waitFor(() => (A.state?.shotNo ?? 0) > before || A.state?.status === 'over', 25000, 'shot');
    shots++;
    const s2 = A.state;
    const o = s2.lastOutcome;
    if (o && o.text) console.log(`  · shot ${shots}: ${o.text}${o.foul ? ' [FOUL: ' + o.foul.code + ']' : ''}`);
    if (s2.status === 'over') break;
  }

  await waitFor(() => A.over && B.over, 20000, 'game over');
  await sleep(400);
  const r = A.over;
  console.log(`\n  🏁 RESULT  winner=${r.winnerId === A.id ? 'Alpha' : r.winnerId === B.id ? 'Bravo' : 'draw'}`);
  console.log(`     reason: ${r.reason}`);
  console.log(`     pot ₹${r.pot}  platform ₹${r.platformFee}`);
  console.log(`     Alpha: ${r.players.find(p => p.id === A.id).pocketed}/9 pocketed, ${r.players.find(p => p.id === A.id).score} pts, ${r.players.find(p => p.id === A.id).fouls} fouls`);
  console.log(`     Bravo: ${r.players.find(p => p.id === B.id).pocketed}/9 pocketed, ${r.players.find(p => p.id === B.id).score} pts, ${r.players.find(p => p.id === B.id).fouls} fouls`);
  console.log(`     payouts: A +₹${r.a.amount} (bal ₹${r.a.balance})  B +₹${r.b.amount} (bal ₹${r.b.balance})`);
  console.log(`     total shots played: ${shots}\n`);
  A.socket.close(); B.socket.close();
  process.exit(0);
})().catch(e => { console.error('❌', e); process.exit(1); });
