/* ------------------------------------------------------------------ *
 *  Bot opponent — picks a placement + aim + power for the current turn
 * ------------------------------------------------------------------ */
import {
  POCKETS, PLAY_MIN, PLAY_MAX, MID, STRIKER_R, COIN_R, PHYS, QUEEN,
  foulLineDistance, dist, dist2, isLegalPlacement, pocketAt, clamp
} from './shared/carrom.js';

const SKILL = Number(process.env.BOT_SKILL || 0.78);

/** perpendicular distance from point p to segment ab */
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + dx * t, ay + dy * t);
}

function overlaps(x, y, r, game, ignore) {
  if (!isLegalPlacement(x, y, r + 0.05)) return true;
  if (pocketAt(x, y)) return true;
  for (const p of game.world.pieces) {
    if (p.out || p === ignore) continue;
    if (dist2(x, y, p.x, p.y) < (p.r + r + 0.12) ** 2) return true;
  }
  return false;
}

function pathClear(ax, ay, bx, by, game, ignore, skip) {
  for (const p of game.world.pieces) {
    if (p.out || p === ignore || p === skip) continue;
    if (segDist(p.x, p.y, ax, ay, bx, by) < p.r + COIN_R * 0.35) return false;
  }
  return true;
}

/**
 * @returns {{x:number,y:number,dx:number,dy:number,power:number,why:string}|null}
 */
export function botPlan(game) {
  /* ---------------- break shot ---------------- */
  if (game.isBreak) {
    for (const t of [22, 20, 24, 18, 26, 16, 28]) {
      for (const [sx, sy] of [[1, 1], [1, -1], [-1, 1], [-1, -1]]) {
        const x = MID + sx * t, y = MID + sy * t;
        if (!isLegalPlacement(x, y, STRIKER_R + 0.05)) continue;
        if (pocketAt(x, y)) continue;
        let clear = true;
        for (const p of game.world.pieces) {
          if (p.out) continue;
          if (dist2(x, y, p.x, p.y) < (p.r + STRIKER_R + 0.1) ** 2) { clear = false; break; }
        }
        if (!clear) continue;
        const dx = MID - x, dy = MID - y;
        const len = Math.hypot(dx, dy) || 1;
        return {
          x, y, dx: dx / len, dy: dy / len,
          power: 0.42 + Math.random() * 0.12,
          why: 'break the medallion'
        };
      }
    }
  }

  const me = game.current;
  const targets = game.world.pieces.filter(p => {
    if (p.out || p.kind === 'slug') return false;
    if (p.kind === 'queen') return game.queenShowdown || Math.random() < 0.12;
    return p.color === me.color || Math.random() < 0.18;   // mostly own coins
  });
  if (!targets.length) return null;

  const candidates = [];

  for (const coin of targets) {
    for (const pk of POCKETS) {
      const d2c = dist(coin.x, coin.y, pk.x, pk.y);
      if (d2c > 46) continue;
      const ux = (pk.x - coin.x) / d2c, uy = (pk.y - coin.y) / d2c;
      const gap = STRIKER_R + COIN_R + 0.14;
      let sx = coin.x - ux * gap, sy = coin.y - uy * gap;

      if (overlaps(sx, sy, STRIKER_R, game, coin)) {
        // nudge sideways to find a legal spot
        let found = null;
        for (let a = 0.5; a <= 3.2 && !found; a += 0.35) {
          for (const s of [1, -1]) {
            const nx = coin.x - (ux * Math.cos(a) - uy * Math.sin(a) * s) * gap;
            const ny = coin.y - (uy * Math.cos(a) + ux * Math.sin(a) * s) * gap;
            if (!overlaps(nx, ny, STRIKER_R, game, coin)) { found = { x: nx, y: ny }; break; }
          }
        }
        if (!found) continue;
        sx = found.x; sy = found.y;
      }

      if (!pathClear(sx, sy, coin.x, coin.y, game, null, coin)) continue;
      if (!pathClear(coin.x, coin.y, pk.x, pk.y, game, coin, null)) continue;

      const d1 = dist(sx, sy, coin.x, coin.y);
      let score = 100;
      score -= d2c * 1.35;                        // prefer near pockets
      score -= d1 * 0.45;                         // prefer close striker spots
      score += (pk.id.startsWith('c') ? 6 : 0);  // corner pockets are easier
      score -= foulLineDistance(sx, sy) > 1.4 ? 0 : 3;
      if (d2c < 5.5) score += 16;                 // easy tap
      if (coin.color === QUEEN) score -= 12;      // risky queen pots
      candidates.push({ sx, sy, coin, pk, score, d1, d2c });
    }
  }

  candidates.sort((a, b) => b.score - a.score);

  if (candidates.length) {
    const c = candidates[0];
    let dx = c.coin.x - c.sx, dy = c.coin.y - c.sy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    // aim error shrinks with skill
    const err = (1 - SKILL) * 0.14;
    const ang = (Math.random() - 0.5) * 2 * err;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const adx = dx * ca - dy * sa, ady = dx * sa + dy * ca;

    const need = Math.sqrt(2 * PHYS.friction * (c.d1 * 0.45 + c.d2c * 1.3 + 3));
    let speed = clamp(need * (0.95 + Math.random() * 0.25), 7, PHYS.maxShotPower * 0.92);
    const power = clamp(speed / PHYS.maxShotPower, 0.08, 0.97);
    return {
      x: c.sx, y: c.sy, dx: adx, dy: ady, power,
      why: c.coin.color === QUEEN ? 'pot the queen' : 'pot a coin'
    };
  }

  /* ---- no pot available: nudge a coin towards a pocket / block --- */
  let best = null;
  for (const pk of POCKETS) {
    let coin = null, bd = 1e9;
    for (const p of game.world.pieces) {
      if (p.out || p.kind !== 'coin') continue;
      const d = dist(p.x, p.y, pk.x, pk.y);
      if (d < bd) { bd = d; coin = p; }
    }
    if (!coin) continue;
    const ux = (coin.x - pk.x) / (bd || 1), uy = (coin.y - pk.y) / (bd || 1);
    const gap = STRIKER_R + COIN_R + 0.14;
    const sx = coin.x + ux * gap, sy = coin.y + uy * gap;
    if (overlaps(sx, sy, STRIKER_R, game, coin)) continue;
    const s = -bd;
    if (!best || s > best.score) best = { sx, sy, coin, score: s, d1: bd, d2c: bd, pk };
  }

  if (best) {
    let dx = best.coin.x - best.sx, dy = best.coin.y - best.sy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len; dy /= len;
    const err = (1 - SKILL) * 0.1;
    const ang = (Math.random() - 0.5) * 2 * err;
    const ca = Math.cos(ang), sa = Math.sin(ang);
    const need = Math.sqrt(2 * PHYS.friction * (best.d1 * 0.4 + best.d2c * 0.9 + 3));
    return {
      x: best.sx, y: best.sy,
      dx: dx * ca - dy * sa, dy: dx * sa + dy * ca,
      power: clamp(need / PHYS.maxShotPower, 0.1, 0.8),
      why: 'make a safe shot'
    };
  }

  /* ---- last resort: legal spot in the middle of the board ------- */
  for (let i = 0; i < 120; i++) {
    const x = PLAY_MIN + 6 + Math.random() * (PLAY_MAX - PLAY_MIN - 12);
    const y = PLAY_MIN + 6 + Math.random() * (PLAY_MAX - PLAY_MIN - 12);
    if (overlaps(x, y, STRIKER_R, game, null)) continue;
    const ang = Math.random() * Math.PI * 2;
    return { x, y, dx: Math.cos(ang), dy: Math.sin(ang), power: 0.4 + Math.random() * 0.3, why: 'hit something' };
  }
  return null;
}
