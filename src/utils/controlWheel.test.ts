import assert from 'node:assert/strict';
import { test } from 'node:test';
import { wheelValue } from './controlWheel';
test('wheel increments and decrements fractional dB steps without drift', () => {
  assert.equal(wheelValue(0, -18, 18, 0.1, 1), 0.1);
  assert.equal(wheelValue(0.1, -18, 18, 0.1, -1), 0);
  let value = 0;
  for (let i = 0; i < 100; i++) value = wheelValue(value, -18, 18, 0.1, 1);
  assert.equal(value, 10);
});
test('wheel respects both endpoints and nonzero step bases', () => {
  assert.equal(wheelValue(18, -18, 18, 0.1, 1), 18);
  assert.equal(wheelValue(-18, -18, 18, 0.1, -1), -18);
  assert.equal(wheelValue(0.1, 0.1, 24, 0.1, 1), 0.2);
  assert.equal(wheelValue(1, 0.5, 2, 0.05, -1), 0.95);
});
test('zero direction and invalid parameters do not change a value', () => {
  assert.equal(wheelValue(1, 0, 2, 0.1, 0), 1);
  assert.equal(wheelValue(1, 0, 2, 0, 1), 1);
  assert.equal(wheelValue(1, 0, 2, NaN, 1), 1);
});
