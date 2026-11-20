import { applyMusicalDelay, DELAY_DIVISIONS, DEFAULT_DIVISION } from './musicalDelay';
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  applyCompressorAutoGain,
  applyEchoDelay,
  applyFrequencyFilter,
  applyParametricEq,
  applySpectralNoiseReduction,
  captureNoiseProfile,
  invertPhase,
  mixPasteAt,
  removeDcOffset,
  swapStereoChannels,
} from './studioDsp';
import {
  DEFAULT_STUDIO_PRESETS,
  parsePresetBank,
  serializePresetBank,
} from './presets';
import { detectSilenceCuePoints, splitChannelsByCues } from './autoCueSplit';
import { applyEffectChain, runBatchProcessing } from './batchProcessor';

function sineWave(freq: number, sampleRate: number, seconds: number, amp = 0.5): Float32Array {
  const len = Math.round(sampleRate * seconds);
  const out = new Float32Array(len);
  for (let i = 0; i < len; i++) {
    out[i] = amp * Math.sin((2 * Math.PI * freq * i) / sampleRate);
  }
  return out;
}

function rms(buf: Float32Array, start = 0, end = buf.length): number {
  let sum = 0;
  for (let i = start; i < end; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / Math.max(1, end - start));
}

test('Parametric EQ and High-Pass Biquad filters attenuate/boost expected frequency bands', () => {
  const sr = 44100;
  const lowTone = sineWave(50, sr, 0.25, 0.5);
  const highPassed = applyFrequencyFilter([lowTone], sr, 0, lowTone.length, 'highpass', 300, 0.707);
  assert.ok(rms(highPassed[0], 2000) < rms(lowTone, 2000) * 0.15);

  const midTone = sineWave(1000, sr, 0.25, 0.25);
  const eqBoosted = applyParametricEq([midTone], sr, 0, midTone.length, [
    { type: 'peaking', frequency: 1000, gainDb: 6, q: 1.0 },
  ]);
  assert.ok(rms(eqBoosted[0], 1000) > rms(midTone, 1000) * 1.6);
});

test('Compressor with Auto-Gain levels dynamic signal toward target peak', () => {
  const sr = 44100;
  const quiet = sineWave(440, sr, 0.2, 0.15);
  const out = applyCompressorAutoGain([quiet], sr, 0, quiet.length, {
    thresholdDb: -20,
    ratio: 3,
    attackMs: 10,
    releaseMs: 100,
    autoGain: true,
    targetPeakDb: -1.0,
  });
  let maxAbs = 0;
  for (let i = 0; i < out[0].length; i++) maxAbs = Math.max(maxAbs, Math.abs(out[0][i]));
  assert.ok(Math.abs(maxAbs - Math.pow(10, -1 / 20)) < 0.05);
});

test('Spectral noise reduction reduces stationary hiss while keeping tone intact', () => {
  const sr = 44100;
  const noiseOnly = new Float32Array(8192);
  for (let i = 0; i < noiseOnly.length; i++) {
    noiseOnly[i] = 0.04 * Math.sin(i * 1.37) * Math.cos(i * 0.73);
  }
  const profile = captureNoiseProfile([noiseOnly], sr, 0, noiseOnly.length, 1024);

  const tone = sineWave(440, sr, 0.4, 0.6);
  const combined = new Float32Array(tone.length);
  for (let i = 0; i < combined.length; i++) {
    combined[i] = Math.max(-1, Math.min(1, tone[i] + 0.04 * Math.sin(i * 1.37) * Math.cos(i * 0.73)));
  }

  const denoised = applySpectralNoiseReduction([combined], 0, combined.length, profile, {
    reductionDb: 18,
    sensitivity: 1.2,
    smoothing: 0.3,
  });
  assert.equal(denoised[0].length, combined.length);
  assert.ok(rms(denoised[0], 2048, 8192) > 0.25);
});

test('Echo, MixPaste crossfade, Phase Invert, Stereo Swap, and DC Offset removal', () => {
  const sr = 44100;
  const impulse = new Float32Array(sr * 0.3);
  impulse[100] = 0.8;
  const echoed = applyEchoDelay([impulse], sr, 0, impulse.length, {
    delayMs: 50,
    feedback: 0.4,
    mix: 0.5,
  });
  const expectedTap = 100 + Math.round(0.05 * sr);
  assert.ok(Math.abs(echoed[0][expectedTap]) > 0.15);

  const base = [new Float32Array(1000).fill(0.1)];
  const clip = [new Float32Array(200).fill(0.3)];
  const mixed = mixPasteAt(base, clip, sr, 100, { crossfadeMs: 1 });
  assert.ok(Math.abs(mixed.channels[0][100] - 0.1) < 1e-5);
  assert.ok(Math.abs(mixed.channels[0][200] - 0.4) < 1e-5);

  const inverted = invertPhase([new Float32Array([0.5, -0.25])], 0, 2);
  assert.equal(inverted[0][0], -0.5);
  assert.equal(inverted[0][1], 0.25);

  const swapped = swapStereoChannels([new Float32Array([1]), new Float32Array([-1])]);
  assert.equal(swapped[0][0], -1);
  assert.equal(swapped[1][0], 1);

  const biased = [new Float32Array(500).fill(0.25)];
  const clean = removeDcOffset(biased);
  assert.ok(Math.abs(clean[0][100]) < 1e-6);
});

test('Preset bank serialization round-trip preserves studio presets', () => {
  const json = serializePresetBank(DEFAULT_STUDIO_PRESETS);
  const parsed = parsePresetBank(json);
  assert.equal(parsed.length, DEFAULT_STUDIO_PRESETS.length);
  assert.equal(parsed[0].id, 'studio-autogain-voice');
});

test('Auto-Cue detects silence boundaries and splits channels into exportable segments', () => {
  const sr = 10000;
  const track = new Float32Array(sr * 4.5);
  for (let i = 0; i < sr * 1.4; i++) track[i] = 0.5 * Math.sin((2 * Math.PI * 300 * i) / sr);
  for (let i = Math.round(sr * 2.2); i < track.length; i++) {
    track[i] = 0.5 * Math.sin((2 * Math.PI * 500 * i) / sr);
  }

  const cues = detectSilenceCuePoints([track], sr, {
    thresholdDb: -40,
    minSilenceMs: 400,
    minSegmentMs: 1000,
    prefix: 'Piste',
  });
  assert.equal(cues.length, 2);
  assert.equal(cues[0].startSample, 0);
  assert.ok(cues[1].startSample >= sr * 2.0 && cues[1].startSample <= sr * 2.3);

  const segments = splitChannelsByCues([track], sr, cues, 'concert.wav');
  assert.equal(segments.length, 2);
  assert.equal(segments[0].fileName, 'concert_01_Piste 01');
  assert.ok(segments[0].channels[0].length > sr);
});

test('Batch processor executes effect chain and encodes WAV outputs', async () => {
  const sr = 44100;
  const sig = sineWave(440, sr, 0.15, 0.2);
  const chained = applyEffectChain([sig], sr, DEFAULT_STUDIO_PRESETS[0].steps);
  assert.equal(chained[0].length, sig.length);

  const outputs = await runBatchProcessing(
    [{ id: '1', name: 'take1.wav', sampleRate: sr, channels: [sig] }],
    DEFAULT_STUDIO_PRESETS[0].steps,
    { format: 'wav', wavBitDepth: 16, mp3Bitrate: 192, flacCompression: 2, oggQuality: 6 }
  );
  assert.equal(outputs.length, 1);
  assert.equal(outputs[0].outputFileName, 'take1_v15.wav');
  assert.equal(String.fromCharCode(...outputs[0].encoded.bytes.subarray(0, 4)), 'RIFF');
});

test('applyMusicalDelay supports smooth L/R pan and Center default', () => {
  assert.equal(DELAY_DIVISIONS[DEFAULT_DIVISION].label, '1/1 pointée');
  const sr = 48000;
  const len = sr * 2;
  const sigL = new Float32Array(len);
  const sigR = new Float32Array(len);
  sigL[0] = 0.5;
  sigR[0] = 0.5;
  const divIdx = DELAY_DIVISIONS.findIndex((d) => d.label === '1/4 droite');
  const delaySample = Math.round(sr * 60 / 120);
  // Center (pan=0): equal stereo repeats
  const centered = applyMusicalDelay([sigL, sigR], sr, 120, divIdx, 'stereo', 1, 50, 0);
  assert.ok(Math.abs(centered[0][delaySample] - 0.25) < 1e-4);
  assert.ok(Math.abs(centered[1][delaySample] - 0.25) < 1e-4);
  // Smooth intermediate Left (-40%): Left=100% of wet, Right=60% of wet
  const panLeft40 = applyMusicalDelay([sigL, sigR], sr, 120, divIdx, 'stereo', 1, 50, -40);
  assert.ok(Math.abs(panLeft40[0][delaySample] - 0.25) < 1e-4);
  assert.ok(Math.abs(panLeft40[1][delaySample] - 0.15) < 1e-4);
  // Smooth intermediate Right (+60%): Left=40% of wet, Right=100% of wet
  const panRight60 = applyMusicalDelay([sigL, sigR], sr, 120, divIdx, 'stereo', 1, 50, 60);
  assert.ok(Math.abs(panRight60[0][delaySample] - 0.10) < 1e-4);
  assert.ok(Math.abs(panRight60[1][delaySample] - 0.25) < 1e-4);
});
