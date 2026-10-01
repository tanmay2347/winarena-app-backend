/* Offline bench: how often does the bot actually pot a coin? */
import { botPlan } from '../server/bot.js';
import {
  createWorld, initialBoard, stepWorld, isSettled, PHYS
} from '../shared/carrom.js';

const N = Number(process.env.N || 60);
const SKILL = Number(process.env.BOT_SKILL || 0.78);
process.env.BOT_SKILL = String(SKILL);

function newBoard() {
  return createWorld(initialBoard());
}

function shoot(world, plan) {
  const speed = Math.max(0, Math.min(1, plan.power)) * PHYS.maxShotPower;
  world.striker.x = plan.x;
  world.striker.y = plan.y;
  world.striker.vx = plan.dx * speed;
  world.striker.vy = plan.dy * speed;
  const pocketed = [];
  let frames = 0;
  while (!isSettled(world) && frames < 4000) {
    stepWorld(world);
    for (const e of world.events) if (e.type === 'pocket') pocketed.push(e);
    world.events.length = 0;
    frames++;
  }
  world.lastPocketed = pocketed;
  return frames;
}

const g = {
  current: { color: 'RED', isBot: false },
  players: [{ color: 'RED' }, { color: 'BLACK' }],
  isBreak: true,
  queenShowdown: false,
  world: null
};

let shots = 0, breakShots = 0, pots = 0, potEvents = 0, strikerDrops = 0, ownPots = 0, oppPots = 0;
let totalFrames = 0, maxFrames = 0, bestRun = 0;
const t0 = Date.now();

for (let i = 0; i < N; i++) {
  g.world = newBoard();
  // break
  for (let k = 0; k < 6; k++) {
    const plan = botPlan(g);
    if (!plan) break;
    const f = shoot(g.world, plan);
    totalFrames += f; maxFrames = Math.max(maxFrames, f);
    shots++;
    if (k === 0) breakShots++;
    for (const e of g.world.events) {
      if (e.type === 'pocket') {
        if (e.kind === 'striker') strikerDrops++;
        else if (e.kind === 'coin') { potEvents++; if (e.color === 'RED') ownPots++; else oppPots++; }
      }
    }
    g.world.events.length = 0;
    g.isBreak = false;
    g.queenShowdown = g.world.pieces.filter(p => !p.out && p.kind === 'coin').length === 0;
  }
}

const ms = Date.now() - t0;
console.log(`
bench: ${N} boards · skill ${SKILL}
  shots played       ${shots}
  coins pocketed     ${potEvents}   (own ${ownPots} / opponent ${oppPots})
  pot rate           ${(potEvents / Math.max(1, shots - breakShots) * 100).toFixed(1)}% of post-break shots
  striker drops      ${strikerDrops}
  avg shot duration  ${(totalFrames / shots * PHYS.dt).toFixed(2)}s   (max ${(maxFrames * PHYS.dt).toFixed(2)}s)
  wall clock         ${ms}ms
`);
