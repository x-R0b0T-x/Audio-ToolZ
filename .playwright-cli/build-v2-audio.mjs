import fs from 'node:fs';
import { detectBpmAndBeats } from '../src/audio/dsp.ts';

const SR = 44100;

function readWav(filePath) {
  const buf = fs.readFileSync(filePath);
  const n = (buf.length - 44) / 4;
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    L[i] = buf.readInt16LE(44 + i * 4) / 32768;
    R[i] = buf.readInt16LE(44 + i * 4 + 2) / 32768;
  }
  return { L, R, n };
}

function writeWav(filePath, L, R) {
  const n = L.length;
  const buf = Buffer.alloc(44 + n * 4);
  buf.write('RIFF', 0);
  buf.writeUInt32LE(36 + n * 4, 4);
  buf.write('WAVE', 8);
  buf.write('fmt ', 12);
  buf.writeUInt32LE(16, 16);
  buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24);
  buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32);
  buf.writeUInt16LE(16, 34);
  buf.write('data', 36);
  buf.writeUInt32LE(n * 4, 40);
  for (let i = 0; i < n; i++) {
    const l = Math.max(-0.98, Math.min(0.98, L[i]));
    const r = Math.max(-0.98, Math.min(0.98, R[i]));
    buf.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buf.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
  }
  fs.writeFileSync(filePath, buf);
}

const src = readWav('.playwright-cli/wake-up.wav');
const res = detectBpmAndBeats([src.L, src.R], SR);
const K = res.kickSamples;

const DUR = 60.0;
const totalOut = Math.round(DUR * SR);
const outL = new Float32Array(totalOut);
const outR = new Float32Array(totalOut);

// Append segment [srcStart .. srcEnd) at writePos with tiny 3ms crossfade at the seam (leaving kick attack sharp!)
function appendSegment(writePos, srcStart, srcEnd, xfadeSamples = 128) {
  const len = srcEnd - srcStart;
  for (let i = 0; i < len; i++) {
    const dst = writePos + i;
    if (dst < 0 || dst >= totalOut) continue;
    const sIdx = srcStart + i;
    if (sIdx < 0 || sIdx >= src.n) continue;
    let w = 1.0;
    if (writePos > 0 && i < xfadeSamples) {
      w = 0.5 - 0.5 * Math.cos((Math.PI * i) / xfadeSamples);
      outL[dst] = outL[dst] * (1 - w) + src.L[sIdx] * w;
      outR[dst] = outR[dst] * (1 - w) + src.R[sIdx] * w;
    } else {
      outL[dst] = src.L[sIdx];
      outR[dst] = src.R[sIdx];
    }
  }
  return writePos + len;
}

let cursor = 0;

// 0.000s -> K[60] (~27.550s): Continuous real track intro, vocal hook, groove & drop
cursor = appendSegment(cursor, 0, K[60], 0);
const tLoopStart = cursor / SR;

// 27.550s -> ~36.727s: 5x seamless isolated 4-beat loop (K[44] .. K[48], exact 4 temps @ 130.8 BPM)
for (let rep = 0; rep < 5; rep++) {
  cursor = appendSegment(cursor, K[44], K[48], 96);
}
const tLoopEnd = cursor / SR;

// ~36.727s -> ~51.404s: 8 bars from main drop (K[32] .. K[64])
cursor = appendSegment(cursor, K[32], K[64], 128);
const tOutroStart = cursor / SR;

// ~51.404s -> ~53.6s: Real track final hits (K[64] .. ~31.6s) + smooth stereo dub-delay echo tail to 60.0s
const tailEndSample = Math.min(src.n, Math.round(31.6 * SR));
const tailWriteStart = cursor;
cursor = appendSegment(cursor, K[64], tailEndSample, 128);

// Add subtle stereo dub-delay tail on the last 1.5s of the track so the ending breathes naturally until 60.0s
const delayL = Math.round(0.229 * SR); // 1/8th note @ 130.8 BPM
const delayR = Math.round(0.344 * SR); // dotted 1/8th note
const decayStart = tailWriteStart + Math.round(0.45 * SR);
for (let i = decayStart; i < totalOut; i++) {
  const tapL = i - delayL >= tailWriteStart ? outR[i - delayL] * 0.56 : 0;
  const tapR = i - delayR >= tailWriteStart ? outL[i - delayR] * 0.52 : 0;
  outL[i] += tapL;
  outR[i] += tapR;
}

// Smooth final fade out over 57.5s .. 60.0s
for (let i = 0; i < totalOut; i++) {
  const t = i / SR;
  if (t > 57.2) {
    const fade = Math.max(0, (60.0 - t) / 2.8);
    const sCurve = fade * fade * (3 - 2 * fade);
    outL[i] *= sCurve;
    outR[i] *= sCurve;
  }
  outL[i] = Math.tanh(outL[i] * 0.96);
  outR[i] = Math.tanh(outR[i] * 0.96);
}

writeWav('.playwright-cli/soundtrack-v2.wav', outL, outR);

console.log(JSON.stringify({
  bpm: res.bpm,
  tScene2: +(K[12] / SR).toFixed(4),
  tScene3: +(K[32] / SR).toFixed(4),
  tScene4Select: +(K[48] / SR).toFixed(4),
  tLoopStart: +tLoopStart.toFixed(4),
  tLoopEnd: +tLoopEnd.toFixed(4),
  loopBarDur: +((K[48] - K[44]) / SR).toFixed(4),
  tScene5: +tLoopEnd.toFixed(4),
  tScene6: +((tLoopEnd + (K[48] - K[32]) / SR)).toFixed(4),
  tOutro: +tOutroStart.toFixed(4),
  totalDur: DUR
}, null, 2));
