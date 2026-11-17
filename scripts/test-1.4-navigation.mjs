import assert from 'node:assert/strict';
import { dragFrame } from '../src/utils/waveformNavigation.mjs';
const l = dragFrame(4000, 5000, 10000, 52, 800, 52, 16);
assert.ok(l.viewStart < 4000); assert.equal(l.viewEnd, 5000);
const r = dragFrame(4000, 5000, 10000, 52, 800, 852, 16);
assert.equal(r.viewStart, 4000); assert.ok(r.viewEnd > 5000);
const center = dragFrame(4000, 5000, 10000, 52, 800, 452, 16);
assert.equal(center.viewStart, 4000); assert.equal(center.viewEnd, 5000); assert.equal(center.sample, 4500);
for (const x of [-500, 5000]) {
  let a = 4000, b = 5000;
  for (let i = 0; i < 600; i++) {
    const f = dragFrame(a, b, 10000, 52, 800, x, 16);
    assert.ok(f.viewStart >= 0); assert.ok(f.viewEnd <= 10000);
    assert.ok(f.viewEnd - f.viewStart >= b - a - 1e-8);
    a = f.viewStart; b = f.viewEnd;
  }
  assert.equal(a, 0); assert.equal(b, 10000);
}
const zero = dragFrame(4000, 5000, 10000, 52, 800, 852, 0);
assert.equal(zero.viewEnd, 5000);
console.log('Dezoom : gauche, droite, centre stable, pointeur immobile et limites valides.');
