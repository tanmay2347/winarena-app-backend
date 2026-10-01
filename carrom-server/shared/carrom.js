/* ------------------------------------------------------------------ *
 *  CARROM ENGINE  —  shared between the Node server (authoritative)
 *  and the React client (rendering).  Pure ES module, zero deps.
 * ------------------------------------------------------------------ */

/* ---------- board geometry (units: 0..100 board = 100 x 100) ----- */
export const BOARD = 100;
export const FRAME = 11;                 // wooden frame width
export const PLAY_MIN = FRAME;
export const PLAY_MAX = BOARD - FRAME;
export const PLAY = PLAY_MAX - PLAY_MIN; // 78
export const MID = BOARD / 2;

export const COIN_R = 2.9;                // carrom men
export const STRIKER_R = 3.1;
export const SLUG_R = 1.0;                // carrom men off the board
export const POCKET_R = 3.4;
export const INNER_R = 13.4;              // inner ("queen") circle radius
export const CORNER_INSET = 0.8;

export const CORNER_POCKETS = [
  { id: 'c0', x: PLAY_MIN + CORNER_INSET, y: PLAY_MIN + CORNER_INSET },
  { id: 'c1', x: PLAY_MAX - CORNER_INSET, y: PLAY_MIN + CORNER_INSET },
  { id: 'c2', x: PLAY_MIN + CORNER_INSET, y: PLAY_MAX - CORNER_INSET },
  { id: 'c3', x: PLAY_MAX - CORNER_INSET, y: PLAY_MAX - CORNER_INSET },
];
export const SIDE_POCKETS = [
  { id: 's0', x: MID - INNER_R, y: MID },
  { id: 's1', x: MID + INNER_R, y: MID },
  { id: 's2', x: MID, y: MID - INNER_R },
  { id: 's3', x: MID, y: MID + INNER_R },
];
export const POCKETS = [...CORNER_POCKETS, ...SIDE_POCKETS];

/* ---------- physics tuning --------------------------------------- */
export const PHYS = {
  dt: 1 / 120,           // fixed simulation step
  friction: 27,          // cloth deceleration  (units / s^2)
  stopSpeed: 0.42,       // below this a piece is considered at rest
  restFrames: 14,        // consecutive still frames before the shot ends
  eCoin: 0.88,           // coin <-> coin restitution
  eWall: 0.55,           // cushion restitution
  eStriker: 0.82,
  massCoin: 1,
  massStriker: 1.35,
  massSlug: 0.22,
  maxSpeed: 58,          // hard clamp (anti-tunnelling)
  maxShotPower: 52,      // striker launch speed at full power
  maxStunFrames: 60 * 30 // 30 s of frozen frames, then force settle
};

/* ---------- colours / rules -------------------------------------- */
export const RED = 'RED';
export const BLACK = 'BLACK';
export const QUEEN = 'QUEEN';
export const MEN_PER_PLAYER = 9;

export const FOULS = {
  STRIKER_POCKET: { code: 'STRIKER_POCKET', text: 'Striker fell into a pocket!', tip: 'The opponent scores 1 point.' },
  OPPONENT_COIN: { code: 'OPPONENT_COIN', text: "Opponent's coin pocketed!", tip: 'The opponent scores 1 point.' },
  QUEEN_ALONE: { code: 'QUEEN_ALONE', text: 'Queen pocketed without a cover!', tip: 'Queen is returned to the centre and the opponent scores 1 point.' },
  QUEEN_UNCOVERED: { code: 'QUEEN_UNCOVERED', text: 'Queen not covered before the last coin!', tip: 'The opponent scores 1 point.' },
  OFF_FOUL_LINE: { code: 'OFF_FOUL_LINE', text: 'A coin was moved off the foul line!', tip: 'The opponent scores 1 point.' },
  JUMPED: { code: 'JUMPED', text: 'A coin was jumped over!', tip: 'The opponent scores 1 point.' }
};

export const FOUL_LIMIT = 5;      // fouls a player may commit
export const STALE_TURNS = 6;     // consecutive empty shots -> draw

/* ---------- helpers --------------------------------------------- */
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
export const dist2 = (ax, ay, bx, by) => (ax - bx) ** 2 + (ay - by) ** 2;

/** Deterministic small PRNG so games replay identically. */
export function makeRng(seed = 1) {
  let s = seed >>> 0 || 1;
  return function rng() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5;  s >>>= 0;
    return s / 4294967296;
  };
}

/* ---------- foul lines ------------------------------------------ *
 *  Two diagonals running through opposite corner pockets.  A piece
 *  sitting on a foul line may only be moved along the line.        */
export const FOUL_LINES = [
  { nx: 1, ny: 1, c: 0 },     // y = x
  { nx: 1, ny: -1, c: 0 }     // y = -x
];
/** Signed distance of a point to the nearest foul line. */
export function foulLineDistance(x, y) {
  const d1 = Math.abs(x - y);
  const d2 = Math.abs(x + y - BOARD);
  return Math.min(d1, d2);
}
export const onFoulLine = (x, y, eps = 0.55) => foulLineDistance(x, y) < eps;

/* ---------- medallion (starting layout) -------------------------- */
export const RING_R = 9.35;   // radius of the 18-coin medallion ring

export function medallion() {
  const coins = [];
  for (let i = 0; i < 18; i++) {
    const a = (i * Math.PI * 2) / 18;
    coins.push({
      id: i < 9 ? `r${i}` : `b${i - 9}`,
      color: i % 2 === 0 ? RED : BLACK,
      x: MID + RING_R * Math.cos(a),
      y: MID + RING_R * Math.sin(a)
    });
  }
  return coins;
}

export function initialBoard() {
  return [
    ...medallion(),
    { id: 'queen', color: QUEEN, x: MID, y: MID }
  ];
}

/* ---------- pocket lookup --------------------------------------- */
export function pocketAt(x, y) {
  for (const p of POCKETS) {
    if (dist2(x, y, p.x, p.y) <= POCKET_R * POCKET_R) return p;
  }
  return null;
}

/** Is a placement legal? (inside play area, not inside a pocket) */
export function isLegalPlacement(x, y, r = STRIKER_R) {
  if (x < PLAY_MIN + r || x > PLAY_MAX - r || y < PLAY_MIN + r || y > PLAY_MAX - r) return false;
  if (pocketAt(x, y)) return false;
  for (const p of [...POCKETS]) {
    if (dist2(x, y, p.x, p.y) < (POCKET_R + r) ** 2) return false;
  }
  return true;
}

/**
 * Legal break zone: the striker must sit on a diagonal, beyond the
 * inner circle, on either side of the board (the "Y" lines).
 */
export function breakZoneFor(side) {
  // side: 0 => left half, 1 => right half, 2 => top, 3 => bottom
  const zones = [
    { ax: PLAY_MIN, bx: MID, vertical: true },
    { ax: MID, bx: PLAY_MAX, vertical: true },
    { ax: PLAY_MIN, bx: MID, vertical: false },
    { ax: MID, bx: PLAY_MAX, vertical: false }
  ];
  return zones[side];
}

export function isLegalBreak(x, y, side) {
  if (!isLegalPlacement(x, y)) return false;
  const z = breakZoneFor(side);
  if (z.vertical) {
    if (x < z.ax + STRIKER_R || x > z.bx - STRIKER_R) return false;
  } else {
    if (y < z.ax + STRIKER_R || y > z.bx - STRIKER_R) return false;
  }
  // must sit on one of the diagonals
  if (foulLineDistance(x, y) > 0.9) return false;
  // and outside the inner circle
  if (dist(x, y, MID, MID) < INNER_R + STRIKER_R * 0.8) return false;
  return true;
}

export const BREAK_SIDES = [0, 1, 2, 3];

/* ---------- world construction & simulation ---------------------- */
let pieceSeq = 0;

export function makeCoin(id, color, x, y) {
  return {
    key: 'c' + id, kind: 'coin', id, color, x, y,
    vx: 0, vy: 0, r: COIN_R, m: PHYS.massCoin, out: false
  };
}

export function makeQueen(x = MID, y = MID) {
  return {
    key: 'q', kind: 'queen', id: 'queen', color: QUEEN, x, y,
    vx: 0, vy: 0, r: COIN_R, m: PHYS.massCoin, out: false
  };
}

export function makeStriker(x, y, owner) {
  return {
    key: 's', kind: 'striker', id: 'striker', color: owner, x, y,
    vx: 0, vy: 0, r: STRIKER_R, m: PHYS.massStriker, out: false
  };
}

export function makeSlug(x, y) {
  return {
    key: 'g' + ++pieceSeq, kind: 'slug', id: 'slug', color: null, x, y,
    vx: 0, vy: 0, r: SLUG_R, m: PHYS.massSlug, out: false
  };
}

export function createWorld(coins) {
  return {
    striker: makeStriker(MID, PLAY_MAX - 6, RED),
    pieces: coins.map(c => makeCoin(c.id, c.color, c.x, c.y)),
    events: []            // {type:'pocket'|'wall'|'hit', ...}
  };
}

function collide(a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const d2 = dx * dx + dy * dy;
  const r = a.r + b.r;
  if (d2 === 0 || d2 >= r * r) return false;
  const d = Math.sqrt(d2);
  const nx = dx / d, ny = dy / d;
  const overlap = r - d;
  // positional correction (split by inverse mass)
  const invA = 1 / a.m, invB = 1 / b.m, inv = invA + invB;
  a.x -= nx * overlap * (invA / inv);
  a.y -= ny * overlap * (invA / inv);
  b.x += nx * overlap * (invB / inv);
  b.y += ny * overlap * (invB / inv);
  const rvx = b.vx - a.vx, rvy = b.vy - a.vy;
  const vn = rvx * nx + rvy * ny;
  if (vn > 0) return false;
  const e = a.kind === 'striker' || b.kind === 'striker'
    ? Math.min(PHYS.eStriker, a.kind === 'slug' || b.kind === 'slug' ? 0.6 : PHYS.eCoin)
    : (a.kind === 'slug' || b.kind === 'slug' ? 0.55 : PHYS.eCoin);
  const j = (-(1 + e) * vn) / inv;
  a.vx -= j * invA * nx; a.vy -= j * invA * ny;
  b.vx += j * invB * nx; b.vy += j * invB * ny;
  return true;
}

function applyFriction(p, dt) {
  if (p.out) return;
  const sp = Math.hypot(p.vx, p.vy);
  if (sp < 1e-6) { p.vx = p.vy = 0; return; }
  const mu = PHYS.friction * (p.kind === 'slug' ? 1.7 : p.kind === 'striker' ? 0.9 : 1);
  const drop = mu * dt;
  if (drop >= sp) { p.vx = p.vy = 0; return; }
  const k = (sp - drop) / sp;
  p.vx *= k; p.vy *= k;
  const lim = p.kind === 'striker' ? PHYS.maxSpeed : PHYS.maxSpeed * 1.1;
  const sp2 = Math.hypot(p.vx, p.vy);
  if (sp2 > lim) { p.vx = p.vx / sp2 * lim; p.vy = p.vy / sp2 * lim; }
}

function wallsAndPockets(p, world) {
  if (p.out) return;
  const pocket = pocketAt(p.x, p.y);
  if (pocket) {
    p.out = true;
    world.events.push({ type: 'pocket', kind: p.kind, color: p.color, id: p.id, pocket: pocket.id });
    return;
  }
  // skip cushion bounce when the piece is over a pocket mouth
  let guard = 0;
  while (guard++ < 4) {
    let hit = false;
    if (p.x < PLAY_MIN + p.r) { p.x = PLAY_MIN + p.r; if (p.vx < 0) p.vx = -p.vx * PHYS.eWall; hit = true; }
    if (p.x > PLAY_MAX - p.r) { p.x = PLAY_MAX - p.r; if (p.vx > 0) p.vx = -p.vx * PHYS.eWall; hit = true; }
    if (p.y < PLAY_MIN + p.r) { p.y = PLAY_MIN + p.r; if (p.vy < 0) p.vy = -p.vy * PHYS.eWall; hit = true; }
    if (p.y > PLAY_MAX - p.r) { p.y = PLAY_MAX - p.r; if (p.vy > 0) p.vy = -p.vy * PHYS.eWall; hit = true; }
    if (!hit) break;
  }
}

/** One fixed simulation step.  Mutates `world`. */
export function stepWorld(world) {
  const dt = PHYS.dt;
  const all = world.striker.out ? world.pieces : [world.striker, ...world.pieces];
  for (const p of all) {
    if (p.out) continue;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    wallsAndPockets(p, world);
  }
  for (let i = 0; i < all.length; i++) {
    const a = all[i];
    if (a.out) continue;
    for (let j = i + 1; j < all.length; j++) {
      const b = all[j];
      if (b.out) continue;
      if (collide(a, b)) world.events.push({ type: 'hit', a: a.key, b: b.key });
    }
  }
  for (const p of all) applyFriction(p, dt);
  // safety net: never let a NaN escape into the board state
  for (const p of all) {
    if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.vx) || !Number.isFinite(p.vy)) {
      p.x = MID; p.y = MID; p.vx = 0; p.vy = 0;
    }
  }
}

/** True when nothing is moving any more. */
export function isSettled(world) {
  const all = world.striker.out ? world.pieces : [world.striker, ...world.pieces];
  for (const p of all) {
    if (p.out) continue;
    if (Math.hypot(p.vx, p.vy) > PHYS.stopSpeed) return false;
  }
  return true;
}

export function compactSnapshot(world) {
  return {
    s: world.striker.out ? null : [+world.striker.x.toFixed(2), +world.striker.y.toFixed(2)],
    p: world.pieces
      .filter(p => !p.out)
      .map(p => [+p.x.toFixed(2), +p.y.toFixed(2)])
  };
}

/** Finds a free spot for a new slug (carrom man) near a random corner. */
export function findSlugSpot(world, rng) {
  for (let tries = 0; tries < 400; tries++) {
    const corner = POCKETS[Math.floor(rng() * 4)];
    const x = corner.x + (rng() - 0.5) * 34;
    const y = corner.y + (rng() - 0.5) * 34;
    if (!isLegalPlacement(x, y, SLUG_R + 0.2)) continue;
    if (pocketAt(x, y)) continue;
    let clear = true;
    for (const p of world.pieces) {
      if (p.out) continue;
      if (dist2(x, y, p.x, p.y) < (p.r + SLUG_R + 0.3) ** 2) { clear = false; break; }
    }
    if (!clear) continue;
    if (dist(x, y, world.striker.x, world.striker.y) < (STRIKER_R + SLUG_R + 0.3) ** 2) continue;
    return { x, y };
  }
  return null;
}
