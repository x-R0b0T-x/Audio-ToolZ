import assert from 'node:assert/strict';
import { dragFrame } from '../src/utils/waveformNavigation.mjs';
let start = 1000, end = 2000;
for (let i = 0; i < 60; i++) {
  const f = dragFrame(start, end, 10000, 52, 800, 852, 1000/60);
  assert.ok(f.viewStart > start); assert.ok(Math.abs(f.viewEnd - f.viewStart - 1000) < 1e-8);
  start = f.viewStart; end = f.viewEnd;
}
assert.ok(Math.abs(start - 2000) < 1e-7);
const left = dragFrame(1000, 2000, 10000, 52, 800, 52, 16);
assert.ok(left.viewStart < 1000);
assert.equal(dragFrame(0, 1000, 10000, 52, 800, -500, 16).viewStart, 0);
assert.equal(dragFrame(9000, 10000, 10000, 52, 800, 5000, 16).viewEnd, 10000);
assert.equal(dragFrame(1000, 2000, 10000, 52, 800, 452, 16).viewStart, 1000);
assert.equal(dragFrame(1000, 2000, 10000, 52, 800, 452, 16).sample, 1500);
console.log('Navigation : defilement gauche/droite, zoom constant, pointeur immobile et limites valides.');
