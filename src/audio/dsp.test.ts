import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyFade,
  applySpeedAndPitch,
  applyVolume,
  analyzeAudioStats,
  computeChannelMuteGains,
  computePlaybackSamplePosition,
  copyRange,
  cutRange,
  detectBpmAndBeats,
  generateDemoTrack,
  normalizeChannels,
  pasteAt,
  reverseChannelsRange,
  silenceRange,
  trimToRange,
} from './dsp';

test('cut, copy, paste, and silence preserve sample integrity', () => {
  const chL = new Float32Array([0.1, 0.2, 0.3, 0.4, 0.5, 0.6]);
  const chR = new Float32Array([-0.1, -0.2, -0.3, -0.4, -0.5, -0.6]);

  const copied = copyRange([chL, chR], 1, 3);
  assert.equal(copied[0].length, 2);
  assert.ok(Math.abs(copied[0][0] - 0.2) < 1e-6);
  assert.ok(Math.abs(copied[1][1] + 0.3) < 1e-6);

  const cut = cutRange([chL, chR], 2, 4);
  assert.equal(cut.channels[0].length, 4);
  assert.equal(cut.cursorSample, 2);
  assert.ok(Math.abs(cut.channels[0][2] - 0.5) < 1e-6);

  const pasted = pasteAt(cut.channels, cut.copied, 2);
  assert.equal(pasted.channels[0].length, 6);
  assert.ok(Math.abs(pasted.channels[0][2] - 0.3) < 1e-6);
  assert.ok(Math.abs(pasted.channels[0][3] - 0.4) < 1e-6);

  const silenced = silenceRange(pasted.channels, 1, 4);
  assert.equal(silenced[0][0], pasted.channels[0][0]);
  assert.equal(silenced[0][1], 0);
  assert.equal(silenced[0][2], 0);
  assert.equal(silenced[0][3], 0);
  assert.equal(silenced[0][4], pasted.channels[0][4]);

  const trimmed = trimToRange(pasted.channels, 1, 4);
  assert.equal(trimmed[0].length, 3);
});

test('volume gain and normalize reach expected peak amplitudes', () => {
  const ch = new Float32Array([0.25, -0.25, 0.1, -0.1]);
  const boosted = applyVolume([ch], 0, 4, 6.0206); // ~2x gain
  assert.ok(Math.abs(boosted[0][0] - 0.5) < 0.01);

  const norm = normalizeChannels([ch], 0, 4, -1); // -1 dBFS (~0.89125)
  const stats = analyzeAudioStats(norm.channels, 44100);
  assert.ok(Math.abs(stats.peakDb - -1) < 0.05);
});

test('fade-in and fade-out taper endpoints cleanly', () => {
  const ch = new Float32Array([1, 1, 1, 1, 1]);
  const fadedIn = applyFade([ch], 0, 5, 'in', 'linear');
  assert.equal(fadedIn[0][0], 0);
  assert.ok(Math.abs(fadedIn[0][2] - 0.5) < 1e-6);
  assert.equal(fadedIn[0][4], 1);

  const fadedOut = applyFade([ch], 0, 5, 'out', 'scurve');
  assert.equal(fadedOut[0][0], 1);
  assert.ok(Math.abs(fadedOut[0][2] - 0.5) < 1e-6);
  assert.ok(Math.abs(fadedOut[0][4]) < 1e-6);
});

test('speed and pitch adjust duration accurately', () => {
  const sr = 44100;
  const sig = new Float32Array(sr);
  for (let i = 0; i < sr; i++) {
    sig[i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.5;
  }

  // 2.0x speed without pitch preservation halves duration
  const fastTape = applySpeedAndPitch([sig], sr, 0, sr, 2.0, 0, false);
  assert.ok(Math.abs(fastTape.channels[0].length - sr / 2) <= 2);

  // 1.5x speed with pitch preservation reduces duration by ~1/1.5
  const fastPreserve = applySpeedAndPitch([sig], sr, 0, sr, 1.5, 0, true);
  assert.ok(Math.abs(fastPreserve.channels[0].length - Math.round(sr / 1.5)) <= 10);

  // +7 semitones pitch shift preserves original duration
  const pitched = applySpeedAndPitch([sig], sr, 0, sr, 1.0, 7, true);
  assert.ok(Math.abs(pitched.channels[0].length - sr) <= 10);
});

test('demo track generator creates non-silent bounded stereo audio', () => {
  const demo = generateDemoTrack(44100);
  assert.equal(demo.length, 2);
  assert.equal(demo[0].length, 441000);
  const stats = analyzeAudioStats(demo, 44100);
  assert.ok(stats.peakLinear > 0.2 && stats.peakLinear <= 1.0);
  assert.equal(stats.clippedSamples, 0);
});

function makeSyntheticKickTrack(bpm: number, sampleRate = 44100, offsetSec = 0.1): Float32Array[] {
  const durationSec = 8;
  const total = sampleRate * durationSec;
  const ch = new Float32Array(total);
  const period = 60 / bpm;

  for (let tKick = offsetSec; tKick < durationSec; tKick += period) {
    const startIdx = Math.round(tKick * sampleRate);
    const kickLen = Math.round(sampleRate * 0.14);
    for (let j = 0; j < kickLen && startIdx + j < total; j++) {
      const kt = j / sampleRate;
      const freq = 52 + 115 * Math.exp(-kt * 32);
      const env = Math.min(1, kt / 0.002) * Math.exp(-kt * 16);
      ch[startIdx + j] += Math.sin(2 * Math.PI * freq * kt) * env * 0.85;
    }
  }
  return [ch, new Float32Array(ch)];
}

function make215HardcoreTrack(sampleRate = 44100): Float32Array[] {
  const bpm = 215;
  const durationSec = 10;
  const total = sampleRate * durationSec;
  const ch = new Float32Array(total);
  const period = 60 / bpm;

  // 2.0-second beatless intro pad before 215 BPM drop, plus distorted bass sustain + alternating downbeat accents
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    ch[i] = Math.sin(2 * Math.PI * 110 * t) * 0.08;
  }

  let beatNum = 0;
  for (let tKick = 2.04; tKick < durationSec; tKick += period, beatNum++) {
    const startIdx = Math.round(tKick * sampleRate);
    const kickLen = Math.round(sampleRate * (period * 0.9));
    const accent = beatNum % 2 === 0 ? 1.0 : 0.78;
    for (let j = 0; j < kickLen && startIdx + j < total; j++) {
      const kt = j / sampleRate;
      const freq = 48 + 160 * Math.exp(-kt * 45);
      const tok = Math.sin(2 * Math.PI * 1400 * kt) * Math.exp(-kt * 180) * 0.55;
      const body = Math.tanh(Math.sin(2 * Math.PI * freq * kt) * 2.6 * Math.exp(-kt * 8)) * 0.72;
      const env = Math.min(1, kt / 0.0015);
      ch[startIdx + j] = Math.max(-0.98, Math.min(0.98, ch[startIdx + j] + (body + tok) * env * accent));
    }
  }
  return [ch, new Float32Array(ch)];
}

test('BPM detector identifies 72..290 BPM (65-300 range), 215 BPM hardcore track, demo 96 BPM, silent tracks, and aligns grid onto kick crests', () => {
  const sr = 44100;

  const track72 = makeSyntheticKickTrack(72, sr, 0.08);
  const res72 = detectBpmAndBeats(track72, sr);
  assert.ok(
    Math.abs(res72.bpm - 72) <= 0.6,
    `Expected ~72 BPM, got ${res72.bpm}`
  );

  const track128 = makeSyntheticKickTrack(128, sr, 0.12);
  // Add 8th-note hi-hats between beats to make sure 128 BPM does NOT double to 256 BPM
  const period128 = 60 / 128;
  for (let t = 0.12 + period128 * 0.5; t < 8; t += period128) {
    const start = Math.round(t * sr);
    for (let j = 0; j < 220 && start + j < track128[0].length; j++) {
      const hat = Math.sin(2 * Math.PI * 7500 * (j / sr)) * Math.exp(-(j / sr) * 160) * 0.25;
      track128[0][start + j] += hat;
      track128[1][start + j] += hat;
    }
  }
  const res128 = detectBpmAndBeats(track128, sr);
  assert.ok(
    Math.abs(res128.bpm - 128) <= 0.5,
    `Expected ~128 BPM, got ${res128.bpm}`
  );
  assert.ok(res128.beatSamples.length >= 15);
  // Every beat line and kick marker should align tightly to the beginning of the kick attack
  assert.ok(Math.abs(res128.firstBeatSample / sr - 0.12) < 0.008);
  for (let i = 1; i < res128.beatSamples.length - 1; i++) {
    const diffSamples = Math.abs(res128.beatSamples[i] - res128.kickSamples[i]);
    assert.ok(
      diffSamples <= sr * 0.004,
      `Beat ${i} misaligned by ${diffSamples} samples`
    );
  }

  const track140 = makeSyntheticKickTrack(140, sr, 0.05);
  const res140 = detectBpmAndBeats(track140, sr);
  assert.ok(
    Math.abs(res140.bpm - 140) <= 0.5,
    `Expected ~140 BPM, got ${res140.bpm}`
  );

  const track215 = make215HardcoreTrack(sr);
  const res215 = detectBpmAndBeats(track215, sr);
  assert.ok(
    Math.abs(res215.bpm - 215) <= 0.6,
    `Expected ~215.0 BPM on hardcore track, got ${res215.bpm}`
  );

  const track265 = makeSyntheticKickTrack(265, sr, 0.04);
  const res265 = detectBpmAndBeats(track265, sr);
  assert.ok(
    Math.abs(res265.bpm - 265) <= 1.2,
    `Expected ~265 BPM, got ${res265.bpm}`
  );

  const track290 = makeSyntheticKickTrack(290, sr, 0.03);
  const res290 = detectBpmAndBeats(track290, sr);
  assert.ok(
    Math.abs(res290.bpm - 290) <= 1.5,
    `Expected ~290 BPM, got ${res290.bpm}`
  );

  const demo = generateDemoTrack(sr);
  const resDemo = detectBpmAndBeats(demo, sr);
  assert.ok(
    Math.abs(resDemo.bpm - 96) <= 0.5,
    `Expected demo track ~96.0 BPM, got ${resDemo.bpm}`
  );

  const silent = [new Float32Array(sr * 4), new Float32Array(sr * 4)];
  const resSilent = detectBpmAndBeats(silent, sr);
  assert.equal(resSilent.bpm, 0);
  assert.equal(resSilent.beatSamples.length, 0);
});

test('BPM detector stays chirurgical on 45s 215 BPM mix and locks markers right onto kick attack start', () => {
  const sr = 44100;
  const durationSec = 45;
  const total = sr * durationSec;
  const chL = new Float32Array(total);
  const chR = new Float32Array(total);
  const bpm = 215;
  const period = 60 / bpm;

  // 8s ambient intro + loud offbeat screech synth & sub rumble throughout drops
  for (let i = 0; i < total; i++) {
    const t = i / sr;
    const pad = Math.sin(2 * Math.PI * 110 * t) * 0.12 + Math.sin(2 * Math.PI * 220 * t) * 0.06;
    // Continuous screechy synth lead after 8s so non-kick frequencies are also loud
    const isBreakdown = t >= 23 && t < 26.5;
    const screech =
      t >= 8 && !isBreakdown
        ? Math.tanh(Math.sin(2 * Math.PI * (680 + 240 * Math.sin(2 * Math.PI * 3.58 * t)) * t) * 2.2) * 0.24
        : 0;
    chL[i] = pad + screech;
    chR[i] = pad - screech * 0.85;
  }

  // Record exact kick ATTACK START sample (startIdx) during Drop 1 and Drop 2
  const expectedKickAttackStarts: number[] = [];
  let beatIdx = 0;
  for (let tBeat = 8.07; tBeat < 44.5; tBeat += period, beatIdx++) {
    if (tBeat >= 23 && tBeat < 26.5) continue; // 3.5s beatless breakdown

    const startIdx = Math.round(tBeat * sr);
    const kickLen = Math.round(sr * (period * 0.82));

    for (let j = 0; j < kickLen && startIdx + j < total; j++) {
      const kt = j / sr;
      const freq = 46 + 175 * Math.exp(-kt * 48);
      const tok = Math.sin(2 * Math.PI * 1550 * kt) * Math.exp(-kt * 190) * 0.55;
      const body = Math.tanh(Math.sin(2 * Math.PI * freq * kt) * 2.8 * Math.exp(-kt * 8.5)) * 0.78;
      // Sharp 107.5 BPM off-beat snare/clap layered on every 2nd beat to try fooling detector into half-tempo
      const snare =
        beatIdx % 2 === 1
          ? Math.sin(2 * Math.PI * 220 * kt) * Math.exp(-kt * 45) * 0.48
          : 0;
      const env = Math.min(1, kt / 0.0012);
      const kickSample = (body + tok + snare) * env;
      chL[startIdx + j] = Math.max(-0.98, Math.min(0.98, chL[startIdx + j] + kickSample));
      chR[startIdx + j] = Math.max(-0.98, Math.min(0.98, chR[startIdx + j] + kickSample));
    }
    expectedKickAttackStarts.push(startIdx);
  }

  const res = detectBpmAndBeats([chL, chR], sr);
  assert.ok(
    Math.abs(res.bpm - 215) <= 0.3,
    `Expected ~215.0 BPM on 45s torture track, got ${res.bpm}`
  );

  // Verify zero drift even late in Drop 2 (t > 38s): every kick marker locks onto the ATTACK START (-2ms..+4ms)
  const lateExpected = expectedKickAttackStarts.filter((s) => s > sr * 38);
  assert.ok(lateExpected.length >= 10);
  let matchedLate = 0;
  for (const expStart of lateExpected) {
    let bestSignedErr = Infinity;
    for (const kSample of res.kickSamples) {
      const signed = kSample - expStart;
      if (Math.abs(signed) < Math.abs(bestSignedErr)) bestSignedErr = signed;
    }
    if (bestSignedErr >= -sr * 0.002 && bestSignedErr <= sr * 0.004) matchedLate++;
  }
  assert.ok(
    matchedLate >= Math.floor(lateExpected.length * 0.9),
    `Expected >=90% late kicks locked onto attack start (-2..+4ms), matched ${matchedLate}/${lateExpected.length}`
  );
});

test('BPM detector keeps true 140 BPM despite loud rolling offbeat bass notes', () => {
  const sr = 44100;
  const durationSec = 16;
  const total = sr * durationSec;
  const ch = new Float32Array(total);
  const period = 60 / 140;

  for (let tKick = 0.25; tKick < durationSec - 0.3; tKick += period) {
    const startIdx = Math.round(tKick * sr);
    const kickLen = Math.round(sr * 0.14);
    for (let j = 0; j < kickLen && startIdx + j < total; j++) {
      const kt = j / sr;
      const freq = 52 + 145 * Math.exp(-kt * 42);
      const env = Math.min(1, kt / 0.001) * Math.exp(-kt * 14);
      ch[startIdx + j] += Math.sin(2 * Math.PI * freq * kt) * env * 0.85;
    }
    // Two rolling 16th/offbeat sub-bass plucks between kicks (soft attack, zero beater punch)
    for (const offFrac of [0.5, 0.75]) {
      const bassIdx = Math.round((tKick + period * offFrac) * sr);
      const bassLen = Math.round(sr * 0.09);
      for (let j = 0; j < bassLen && bassIdx + j < total; j++) {
        const bt = j / sr;
        const env = Math.min(1, bt / 0.014) * Math.exp(-bt * 18);
        ch[bassIdx + j] += Math.sin(2 * Math.PI * 65 * bt) * env * 0.55;
      }
    }
  }

  const res = detectBpmAndBeats([ch, new Float32Array(ch)], sr);
  assert.ok(
    Math.abs(res.bpm - 140) <= 0.5,
    `Expected ~140.0 BPM despite offbeat rolling bass, got ${res.bpm}`
  );
});

test('effects only mutate samples strictly inside the selected range [start, end)', () => {
  const sr = 44100;
  const total = 2000;
  const src = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    src[i] = 0.25 * Math.sin((2 * Math.PI * 220 * i) / sr);
  }
  const start = 400;
  const end = 1200;

  const vol = applyVolume([src], start, end, 6);
  for (let i = 0; i < start; i++) assert.equal(vol[0][i], src[i]);
  for (let i = end; i < total; i++) assert.equal(vol[0][i], src[i]);

  const norm = normalizeChannels([src], start, end, -1);
  for (let i = 0; i < start; i++) assert.equal(norm.channels[0][i], src[i]);
  for (let i = end; i < total; i++) assert.equal(norm.channels[0][i], src[i]);

  const faded = applyFade([src], start, end, 'out', 'linear');
  for (let i = 0; i < start; i++) assert.equal(faded[0][i], src[i]);
  for (let i = end; i < total; i++) assert.equal(faded[0][i], src[i]);

  const sped = applySpeedAndPitch([src], sr, start, end, 1.5, 0, false);
  for (let i = 0; i < start; i++) assert.equal(sped.channels[0][i], src[i]);
  const suffixLen = total - end;
  const outLen = sped.channels[0].length;
  for (let k = 0; k < suffixLen; k++) {
    assert.equal(sped.channels[0][outLen - suffixLen + k], src[end + k]);
  }
});

test('computeChannelMuteGains isolates Left (G) and Right (D) channels accurately', () => {
  assert.deepEqual(computeChannelMuteGains(2, [true, true]), [1, 1]);
  assert.deepEqual(computeChannelMuteGains(2, [false, true]), [0, 1]);
  assert.deepEqual(computeChannelMuteGains(2, [true, false]), [1, 0]);
  assert.deepEqual(computeChannelMuteGains(2, [false, false]), [0, 0]);
  assert.deepEqual(computeChannelMuteGains(1, [true, false]), [1, 1]);
  assert.deepEqual(computeChannelMuteGains(1, [false, true]), [0, 0]);
});

test('reverseChannelsRange and computePlaybackSamplePosition handle reverse and forward playback', () => {
  const chL = new Float32Array([0.1, 0.2, 0.3, 0.4]);
  const chR = new Float32Array([-0.1, -0.2, -0.3, -0.4]);
  const rev = reverseChannelsRange([chL, chR], 1, 4);
  assert.deepEqual(Array.from(rev[0]).map((v) => Math.round(v * 10) / 10), [0.4, 0.3, 0.2]);
  assert.deepEqual(Array.from(rev[1]).map((v) => Math.round(v * 10) / 10), [-0.4, -0.3, -0.2]);

  assert.equal(
    computePlaybackSamplePosition({
      isReverse: true,
      isLooping: false,
      startSample: 0,
      endSample: 1000,
      playedSamples: 250,
    }),
    750
  );
  assert.equal(
    computePlaybackSamplePosition({
      isReverse: true,
      isLooping: false,
      startSample: 100,
      endSample: 500,
      playedSamples: 999,
    }),
    100
  );
  assert.equal(
    computePlaybackSamplePosition({
      isReverse: false,
      isLooping: true,
      startSample: 100,
      endSample: 500,
      playedSamples: 450,
    }),
    150
  );
});
