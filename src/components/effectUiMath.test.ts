import assert from 'node:assert/strict';
import { test } from 'node:test';
import { SourceSpectrum, constrainPanel, parameterValue, samplePeak, stepParameter } from './effectUiMath';
test('frequency wheel is proportional and Shift is finer', () => {
  const s = { min: 20, max: 20000, step: 1, fine: 1, digits: 0, logarithmic: true };
  assert.equal(stepParameter(63, 1, false, s), 71);
  assert.equal(stepParameter(63, 1, true, s), 64);
  assert.equal(stepParameter(20, 1, true, s), 21);
  assert.equal(stepParameter(20000, 1, false, s), 20000);
  assert.equal(stepParameter(20, -1, false, s), 20);
});
test('gain wheel has coarse and fine steps without accumulated drift', () => {
  const s = { min: -18, max: 18, step: .5, fine: .1, digits: 1 };
  assert.equal(stepParameter(0, 1, false, s), .5);
  assert.equal(stepParameter(0, 1, true, s), .1);
  let value = 0; for (let i = 0; i < 100; i++) value = stepParameter(value, 1, true, s);
  assert.equal(value, 10); assert.equal(parameterValue(NaN, s), -18);
});
test('panel bounds honor minimums and keep the grip inside the viewport', () => {
  assert.deepEqual(constrainPanel({ left: 100, top: 100, width: 2000, height: 2000 }, 900, 600, 740, 320), { left: 16, top: 16, width: 868, height: 568 });
  const b = constrainPanel({ left: -50, top: -50, width: 10, height: 10 }, 500, 400, 740, 320);
  assert.equal(b.left, 16); assert.equal(b.top, 16); assert.equal(b.width, 468); assert.equal(b.height, 320);
});
test('FFT resolves source detail and combines stereo power without phase cancellation', () => {
  const fft = new SourceSpectrum(), n = fft.size, bin = 80;
  const source = Float32Array.from({ length: n }, (_, i) => .5 * Math.sin(2 * Math.PI * bin * i / n));
  const mono = Array.from(fft.read([source], n));
  assert.ok(Math.abs(mono[bin] - .5) < .001);
  const stereo = fft.read([source, Float32Array.from(source, v => -v)], n);
  assert.ok(Math.abs(stereo[bin] - mono[bin]) < .001);
  assert.ok(stereo[bin] > stereo[bin + 4] * 100);
  assert.ok(fft.read([new Float32Array(n)], n).every(v => v === 0));
});
test('waveform sampling sees signed transients without fixed 256-sample blocks', () => {
  const ch = new Float32Array(1024); ch[17] = -.9; ch[600] = .4;
  assert.ok(Math.abs(samplePeak([ch], 0, 32) - .9) < 1e-6);
  assert.equal(samplePeak([ch], 32, 64), 0);
  assert.ok(Math.abs(samplePeak([ch], 590, 620) - .4) < 1e-6);
  assert.equal(samplePeak([ch], -100, 0), 0);
});
