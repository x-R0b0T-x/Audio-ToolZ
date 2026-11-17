import assert from 'node:assert/strict';
import { dragFrame } from '../src/utils/waveformNavigation.mjs';
const frame = (start, end, x, dt = 16) => dragFrame(start, end, 10000, 52, 800, x, dt);
assert.deepEqual(frame(4000, 5000, 452), { viewStart: 4000, viewEnd: 5000, sample: 4500 });
assert.equal(frame(4000, 5000, 852, 0).viewStart, 4000);
assert.equal(frame(4000, 5000, 852).viewStart, 4016);
assert.equal(frame(4000, 5000, 52).viewStart, 3984);
assert.equal(frame(4000, 5000, 834).viewStart, 4008);
for (const [x, limit] of [[52, 0], [852, 9000]]) {
  let start = 4000, end = 5000;
  for (let i = 0; i < 400; i++) {
    const next = frame(start, end, x);
    assert.ok(Math.abs(next.viewEnd - next.viewStart - 1000) < 1e-8);
    start = next.viewStart; end = next.viewEnd;
  }
  assert.equal(start, limit);
  assert.equal(frame(start, end, 452).viewStart, limit);
}
assert.equal(frame(0, 10000, 852).viewStart, 0);
console.log('Defilement : zoom constant, deux directions, arret au centre et limites.');
