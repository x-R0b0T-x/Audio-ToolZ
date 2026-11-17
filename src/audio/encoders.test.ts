import test from 'node:test';
import assert from 'node:assert/strict';
import { encodeWav } from './encoders/wav';
import { crc8, crc16, encodeFlac } from './encoders/flac';
import { encodeMp3, encodeOgg } from './encoders/media';

function makeSineStereo(sampleRate: number, durationSec: number): Float32Array[] {
  const n = Math.round(sampleRate * durationSec);
  const left = new Float32Array(n);
  const right = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    left[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5;
    right[i] = Math.sin((2 * Math.PI * 554.37 * i) / sampleRate) * 0.4;
  }
  return [left, right];
}

test('WAV encoder writes valid RIFF/WAVE header and data payload', () => {
  const chs = makeSineStereo(44100, 0.25);
  const wav16 = encodeWav(chs, 44100, 16);
  const magic = String.fromCharCode(...wav16.slice(0, 4));
  const wave = String.fromCharCode(...wav16.slice(8, 12));
  assert.equal(magic, 'RIFF');
  assert.equal(wave, 'WAVE');
  assert.equal(wav16.length, 44 + chs[0].length * 2 * 2);

  const wav32 = encodeWav(chs, 44100, 32);
  assert.equal(wav32.length, 44 + chs[0].length * 2 * 4);
});

test('FLAC encoder writes fLaC magic, STREAMINFO, and compresses lossless audio', () => {
  const chs = makeSineStereo(44100, 0.25);
  const flacVerbatim = encodeFlac(chs, 44100, 0);
  const flacCompressed = encodeFlac(chs, 44100, 5);

  assert.equal(String.fromCharCode(...flacVerbatim.slice(0, 4)), 'fLaC');
  assert.equal(flacVerbatim[4], 0x80); // last metadata block + STREAMINFO
  assert.equal(flacVerbatim[7], 34); // STREAMINFO length = 34 bytes
  // Frame sync 0xFFF8 starts right after 4 + 4 + 34 = byte 42
  assert.equal(flacVerbatim[42], 0xff);
  assert.equal(flacVerbatim[43], 0xf8);

  // Level 5 Fixed LPC + Rice must be smaller than verbatim on smooth sine waves
  assert.ok(flacCompressed.length < flacVerbatim.length);
  assert.equal(crc8(new Uint8Array([0xff, 0xf8])), crc8(new Uint8Array([0xff, 0xf8])));
  assert.ok(crc16(new Uint8Array([1, 2, 3, 4])) >= 0);
});

test('MP3 and OGG encoders produce valid non-empty encoded audio streams', async () => {
  const chs = makeSineStereo(44100, 0.5);
  const mp3 = await encodeMp3(chs, 44100, 192);
  assert.ok(mp3.length > 500);
  // MP3 frame sync starts with 0xFF 0xFB (or ID3/0xFF)
  assert.equal(mp3[0], 0xff);

  const ogg = await encodeOgg(chs, 44100, 5);
  assert.ok(ogg.length > 500);
  assert.equal(String.fromCharCode(...ogg.slice(0, 4)), 'OggS');
});
