import * as m from '../shared/carrom.js';

const ring = m.medallion();
let minGap = 1e9;
for (let i = 0; i < ring.length; i++) {
  for (let j = i + 1; j < ring.length; j++) {
    const d = Math.hypot(ring[i].x - ring[j].x, ring[i].y - ring[j].y);
    if (d < minGap) minGap = d;
  }
}
const minPocket = Math.min(...ring.map(c =>
  Math.min(...m.POCKETS.map(p => Math.hypot(c.x - p.x, c.y - p.y) - p.r))));
const q = m.initialBoard().find(c => c.id === 'queen');
const qGap = Math.min(...ring.map(c => Math.hypot(c.x - q.x, c.y - q.y)));

console.log('min coin gap          ', minGap.toFixed(2), ' need >=', (2 * m.COIN_R).toFixed(2));
console.log('min coin->pocket edge ', minPocket.toFixed(2), ' need > 0');
console.log('queen->ring gap       ', qGap.toFixed(2), ' need >=', (2 * m.COIN_R).toFixed(2));
console.log('medallion outer edge  ', (m.RING_R + m.COIN_R).toFixed(2), ' inner circle', m.INNER_R);
console.log('ok:', minGap >= 2 * m.COIN_R - 0.01 && minPocket > 0 && qGap >= 2 * m.COIN_R && m.RING_R + m.COIN_R < m.INNER_R);
