import fs from 'node:fs';

const SR = 44100;
const BPM = 125;
const BEAT = 60 / BPM; // 0.48s

function writeWav(filePath, left, right) {
  const numSamples = left.length;
  const buffer = Buffer.alloc(44 + numSamples * 4);
  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + numSamples * 4, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(2, 22); // Stereo
  buffer.writeUInt32LE(SR, 24);
  buffer.writeUInt32LE(SR * 4, 28);
  buffer.writeUInt16LE(4, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write('data', 36);
  buffer.writeUInt32LE(numSamples * 4, 40);

  for (let i = 0; i < numSamples; i++) {
    const l = Math.max(-0.98, Math.min(0.98, left[i]));
    const r = Math.max(-0.98, Math.min(0.98, right[i]));
    buffer.writeInt16LE(Math.round(l * 32767), 44 + i * 4);
    buffer.writeInt16LE(Math.round(r * 32767), 44 + i * 4 + 2);
  }
  fs.writeFileSync(filePath, buffer);
}

// Deterministic PRNG for crisp hi-hats & claps
let seed = 1337;
function rand() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return (seed / 0xffffffff) * 2 - 1;
}

function addKick(L, R, startSec, gain = 0.85, punchFreq = 175, subFreq = 46) {
  const idx0 = Math.floor(startSec * SR);
  const len = Math.floor(0.36 * SR);
  let phase = 0;
  for (let i = 0; i < len; i++) {
    const idx = idx0 + i;
    if (idx < 0 || idx >= L.length) continue;
    const t = i / SR;
    const freq = subFreq + (punchFreq - subFreq) * Math.exp(-t * 38);
    phase += (2 * Math.PI * freq) / SR;
    const amp = Math.exp(-t * 9.5) * Math.min(1, t / 0.002);
    const click = Math.exp(-t * 280) * 0.45 * Math.sin(2 * Math.PI * 1900 * t);
    const s = Math.tanh((Math.sin(phase) * 1.35 + click) * amp) * gain;
    L[idx] += s;
    R[idx] += s * 0.99;
  }
}

function addClap(L, R, startSec, gain = 0.36) {
  const idx0 = Math.floor(startSec * SR);
  const len = Math.floor(0.22 * SR);
  let lp = 0;
  for (let i = 0; i < len; i++) {
    const idx = idx0 + i;
    if (idx < 0 || idx >= L.length) continue;
    const t = i / SR;
    const n = rand();
    lp = lp * 0.65 + n * 0.35;
    const hp = n - lp;
    const burst =
      (t < 0.012 ? 1.0 : 0) +
      (t >= 0.013 && t < 0.025 ? 0.85 : 0) +
      Math.exp(-Math.max(0, t - 0.02) * 20);
    const body = Math.sin(2 * Math.PI * 210 * t) * Math.exp(-t * 30) * 0.25;
    const sl = (hp * burst * 0.75 + body) * gain;
    const sr = (hp * burst * 0.75 * (i % 2 === 0 ? 1.05 : 0.92) + body) * gain;
    L[idx] += sl;
    R[idx] += sr;
  }
}

function addHat(L, R, startSec, open = false, gain = 0.20, pan = 0.15) {
  const idx0 = Math.floor(startSec * SR);
  const dur = open ? 0.24 : 0.065;
  const len = Math.floor(dur * SR);
  let prev = 0;
  for (let i = 0; i < len; i++) {
    const idx = idx0 + i;
    if (idx < 0 || idx >= L.length) continue;
    const t = i / SR;
    const n = rand();
    const hp = n - prev * 0.82;
    prev = n;
    const metal =
      Math.sin(2 * Math.PI * 6400 * t) * 0.25 +
      Math.sin(2 * Math.PI * 8900 * t) * 0.22;
    const env = Math.exp(-t * (open ? 15 : 58)) * Math.min(1, t / 0.0015);
    const s = (hp * 0.75 + metal * 0.25) * env * gain;
    L[idx] += s * (1 - pan);
    R[idx] += s * (1 + pan);
  }
}

function addBassNote(L, R, startSec, durSec, freq, gain = 0.34) {
  const idx0 = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  let phase = 0;
  let filt = 0;
  for (let i = 0; i < len; i++) {
    const idx = idx0 + i;
    if (idx < 0 || idx >= L.length) continue;
    const t = i / SR;
    phase = (phase + freq / SR) % 1;
    const saw = phase * 2 - 1;
    const sub = Math.sin(2 * Math.PI * freq * t) * 0.65;
    const cutoff = 0.08 + 0.24 * Math.exp(-t * 11);
    filt += (saw - filt) * cutoff;
    const env = Math.min(1, t / 0.005) * Math.min(1, (durSec - t) / 0.015) * (0.55 + 0.45 * Math.exp(-t * 5));
    const s = (filt * 0.65 + sub) * env * gain;
    L[idx] += s;
    R[idx] += s;
  }
}

function addPadChord(L, R, startSec, durSec, freqs, gain = 0.14, bright = 1.0) {
  const idx0 = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  const phasesL = freqs.map((_, k) => k * 0.19);
  const phasesR = freqs.map((_, k) => k * 0.31);
  for (let i = 0; i < len; i++) {
    const idx = idx0 + i;
    if (idx < 0 || idx >= L.length) continue;
    const t = i / SR;
    const env = Math.min(1, t / 0.14) * Math.min(1, (durSec - t) / 0.25);
    let sl = 0;
    let sr = 0;
    for (let k = 0; k < freqs.length; k++) {
      const f = freqs[k];
      phasesL[k] = (phasesL[k] + (f * 0.997) / SR) % 1;
      phasesR[k] = (phasesR[k] + (f * 1.003) / SR) % 1;
      const wl = Math.sin(phasesL[k] * Math.PI * 2) * 0.72 + (phasesL[k] * 2 - 1) * 0.18 * bright;
      const wr = Math.sin(phasesR[k] * Math.PI * 2) * 0.72 + (phasesR[k] * 2 - 1) * 0.18 * bright;
      sl += wl;
      sr += wr;
    }
    const pulse = 0.72 + 0.28 * Math.sin(2 * Math.PI * (BPM / 60) * 2 * t - Math.PI / 2);
    L[idx] += (sl / freqs.length) * env * pulse * gain;
    R[idx] += (sr / freqs.length) * env * pulse * gain;
  }
}

function addPluck(L, R, startSec, durSec, freq, gain = 0.20, pan = 0) {
  const idx0 = Math.floor(startSec * SR);
  const len = Math.floor(durSec * SR);
  let phase = 0;
  let f = 0;
  for (let i = 0; i < len; i++) {
    const idx = idx0 + i;
    if (idx < 0 || idx >= L.length) continue;
    const t = i / SR;
    phase = (phase + freq / SR) % 1;
    const tri = Math.abs(phase * 4 - 2) - 1;
    const saw = phase * 2 - 1;
    const mix = tri * 0.55 + saw * 0.45;
    f += (mix - f) * (0.06 + 0.35 * Math.exp(-t * 14));
    const env = Math.min(1, t / 0.004) * Math.exp(-t * 8.5);
    const s = f * env * gain;
    L[idx] += s * (1 - pan * 0.5);
    R[idx] += s * (1 + pan * 0.5);
  }
}

// Progression Am9 -> Fmaj7 -> Dm9 -> Em7
const CHORDS = [
  { bass: 55.0, pad: [220.0, 261.63, 329.63, 392.0, 493.88], arp: [440, 523.25, 659.25, 783.99] }, // Am9
  { bass: 43.65, pad: [174.61, 220.0, 261.63, 329.63, 440.0], arp: [349.23, 440, 523.25, 659.25] }, // Fmaj7
  { bass: 73.42, pad: [146.83, 220.0, 261.63, 329.63, 392.0], arp: [293.66, 440, 523.25, 659.25] }, // Dm9
  { bass: 82.41, pad: [164.81, 246.94, 293.66, 392.0, 493.88], arp: [329.63, 493.88, 587.33, 783.99] }, // Em7
];

// 1) Generate 60-second soundtrack (exact 125 beats = 60.0s)
{
  const DUR = 60.0;
  const L = new Float32Array(SR * DUR);
  const R = new Float32Array(SR * DUR);

  // Intro 0..5.76s (Beats 0..11): pulse ticks + rising pad
  addPadChord(L, R, 0.2, 5.56, CHORDS[0].pad, 0.11, 0.45);
  for (let b = 0; b < 12; b++) {
    const t = b * BEAT;
    addKick(L, R, t, b >= 8 ? 0.65 : 0.36, 150, 50);
    if (b >= 4) addHat(L, R, t + BEAT * 0.5, false, 0.14, 0.2);
  }

  // Main groove Beats 12..106 (5.76s..50.88s)
  for (let b = 12; b < 106; b++) {
    const t = b * BEAT;
    const bar = Math.floor((b - 12) / 4);
    const beatInBar = (b - 12) % 4;
    const chord = CHORDS[bar % CHORDS.length];

    // Special tight 1-bar loop spotlight around 30.72s..34.56s (beats 64..71)
    const isLoopSolo = b >= 64 && b < 72;

    addKick(L, R, t, 0.84, 185, 46);
    if (beatInBar === 1 || beatInBar === 3) {
      addClap(L, R, t, isLoopSolo ? 0.30 : 0.38);
    }
    // Hats on 8ths & off-beats
    addHat(L, R, t + BEAT * 0.5, !isLoopSolo && beatInBar === 2, 0.19, 0.22);
    addHat(L, R, t + BEAT * 0.25, false, 0.08, -0.25);
    addHat(L, R, t + BEAT * 0.75, false, 0.09, 0.25);

    // Rolling bass 16th/8th bounce (ducked on kick)
    addBassNote(L, R, t + BEAT * 0.25, BEAT * 0.22, chord.bass, 0.30);
    addBassNote(L, R, t + BEAT * 0.50, BEAT * 0.22, chord.bass, 0.38);
    addBassNote(L, R, t + BEAT * 0.75, BEAT * 0.22, chord.bass * (beatInBar === 3 ? 1.5 : 1.0), 0.32);

    // Pad at start of each bar
    if (beatInBar === 0) {
      addPadChord(L, R, t, BEAT * 3.9, chord.pad, isLoopSolo ? 0.08 : 0.15, isLoopSolo ? 0.4 : 1.15);
    }

    // Crisp synth arp plucks
    if (!isLoopSolo) {
      for (let s = 0; s < 4; s++) {
        const note = chord.arp[(beatInBar + s) % chord.arp.length];
        addPluck(L, R, t + s * (BEAT / 4), 0.18, note, 0.15, s % 2 === 0 ? -0.35 : 0.35);
      }
    }
  }

  // Outro Beat 106..125 (50.88s..60.0s): dramatic impact hit + warm fading pad tail
  const tEnd = 106 * BEAT;
  addKick(L, R, tEnd, 0.90, 190, 44);
  addClap(L, R, tEnd, 0.36);
  addPadChord(L, R, tEnd, 8.8, CHORDS[0].pad, 0.18, 0.85);
  addBassNote(L, R, tEnd, 3.2, CHORDS[0].bass, 0.34);

  // Soft master limiter + clean fade out in final 2 seconds
  for (let i = 0; i < L.length; i++) {
    const t = i / SR;
    const fade = t > 57.5 ? Math.max(0, (60.0 - t) / 2.5) : 1.0;
    L[i] = Math.tanh(L[i] * 0.95) * fade;
    R[i] = Math.tanh(R[i] * 0.95) * fade;
  }

  writeWav('.playwright-cli/soundtrack-60s.wav', L, R);
  console.log('Generated .playwright-cli/soundtrack-60s.wav (60.0s @ 125 BPM)');
}

// 2) Generate 7.68s clean demo clip (exact 4 bars @ 125 BPM) to upload into real Audio ToolZ
{
  const DUR = 16 * BEAT; // 7.68s
  const L = new Float32Array(Math.floor(SR * DUR));
  const R = new Float32Array(Math.floor(SR * DUR));
  for (let b = 0; b < 16; b++) {
    const t = b * BEAT;
    const bar = Math.floor(b / 4);
    const beatInBar = b % 4;
    const chord = CHORDS[bar % CHORDS.length];
    addKick(L, R, t, 0.88, 185, 46);
    if (beatInBar === 1 || beatInBar === 3) addClap(L, R, t, 0.36);
    addHat(L, R, t + BEAT * 0.5, beatInBar === 2, 0.18, 0.2);
    addBassNote(L, R, t + BEAT * 0.50, BEAT * 0.24, chord.bass, 0.35);
    if (beatInBar === 0) addPadChord(L, R, t, BEAT * 3.85, chord.pad, 0.14, 1.0);
  }
  for (let i = 0; i < L.length; i++) {
    L[i] = Math.tanh(L[i] * 0.95);
    R[i] = Math.tanh(R[i] * 0.95);
  }
  writeWav('.playwright-cli/demo-track.wav', L, R);
  console.log('Generated .playwright-cli/demo-track.wav (7.68s @ 125 BPM)');
}
