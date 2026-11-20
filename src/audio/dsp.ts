import type {
  AudioSelection,
  AudioStats,
  BpmDetectionResult,
  FadeCurve,
  FadeDirection,
} from './types';

export function cloneChannels(channels: Float32Array[]): Float32Array[] {
  return channels.map((ch) => new Float32Array(ch));
}

export function clampSelection(
  selection: AudioSelection,
  totalSamples: number
): AudioSelection {
  const start = Math.max(0, Math.min(totalSamples, Math.round(selection.startSample)));
  const end = Math.max(0, Math.min(totalSamples, Math.round(selection.endSample)));
  return start <= end
    ? { startSample: start, endSample: end }
    : { startSample: end, endSample: start };
}

/**
 * Returns the effective sample range to process:
 * if a range is selected (end > start), use it; otherwise process the entire file.
 */
export function resolveTargetRange(
  selection: AudioSelection,
  totalSamples: number
): { start: number; end: number; isWholeFile: boolean } {
  const clamped = clampSelection(selection, totalSamples);
  if (clamped.endSample > clamped.startSample) {
    return { start: clamped.startSample, end: clamped.endSample, isWholeFile: false };
  }
  return { start: 0, end: totalSamples, isWholeFile: true };
}

export function copyRange(
  channels: Float32Array[],
  startSample: number,
  endSample: number
): Float32Array[] {
  const len = Math.max(0, endSample - startSample);
  return channels.map((ch) => {
    const slice = new Float32Array(len);
    if (len > 0) {
      slice.set(ch.subarray(startSample, endSample));
    }
    return slice;
  });
}

export function cutRange(
  channels: Float32Array[],
  startSample: number,
  endSample: number
): { channels: Float32Array[]; copied: Float32Array[]; cursorSample: number } {
  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, startSample));
  const end = Math.max(start, Math.min(total, endSample));
  const copied = copyRange(channels, start, end);
  const removedLen = end - start;
  const nextLen = total - removedLen;

  const nextChannels = channels.map((ch) => {
    const out = new Float32Array(nextLen);
    if (start > 0) {
      out.set(ch.subarray(0, start), 0);
    }
    if (end < total) {
      out.set(ch.subarray(end), start);
    }
    return out;
  });

  return { channels: nextChannels, copied, cursorSample: start };
}

export function pasteAt(
  channels: Float32Array[],
  clipboard: Float32Array[],
  insertSample: number,
  replaceEndSample?: number
): { channels: Float32Array[]; selection: AudioSelection } {
  if (clipboard.length === 0 || (clipboard[0]?.length ?? 0) === 0) {
    return {
      channels: cloneChannels(channels),
      selection: { startSample: insertSample, endSample: insertSample },
    };
  }

  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, insertSample));
  const end =
    replaceEndSample !== undefined
      ? Math.max(start, Math.min(total, replaceEndSample))
      : start;
  const clipLen = clipboard[0].length;
  const nextLen = start + clipLen + (total - end);

  const nextChannels = channels.map((ch, idx) => {
    const clipCh = clipboard[Math.min(idx, clipboard.length - 1)];
    const out = new Float32Array(nextLen);
    if (start > 0) {
      out.set(ch.subarray(0, start), 0);
    }
    out.set(clipCh, start);
    if (end < total) {
      out.set(ch.subarray(end), start + clipLen);
    }
    return out;
  });

  return {
    channels: nextChannels,
    selection: { startSample: start, endSample: start + clipLen },
  };
}

export function silenceRange(
  channels: Float32Array[],
  startSample: number,
  endSample: number
): Float32Array[] {
  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, startSample));
  const end = Math.max(start, Math.min(total, endSample));
  return channels.map((ch) => {
    const out = new Float32Array(ch);
    out.fill(0, start, end);
    return out;
  });
}

export function trimToRange(
  channels: Float32Array[],
  startSample: number,
  endSample: number
): Float32Array[] {
  return copyRange(channels, startSample, endSample);
}

export function dbToLinear(db: number): number {
  if (db <= -96) return 0;
  return Math.pow(10, db / 20);
}

export function linearToDb(linear: number): number {
  if (linear <= 1e-6) return -96;
  return 20 * Math.log10(linear);
}

export function applyVolume(
  channels: Float32Array[],
  startSample: number,
  endSample: number,
  gainDb: number,
  clampOutput = true
): Float32Array[] {
  const gain = dbToLinear(gainDb);
  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, startSample));
  const end = Math.max(start, Math.min(total, endSample));

  return channels.map((ch) => {
    const out = new Float32Array(ch);
    for (let i = start; i < end; i++) {
      let val = out[i] * gain;
      if (clampOutput) {
        if (val > 1) val = 1;
        else if (val < -1) val = -1;
      }
      out[i] = val;
    }
    return out;
  });
}

export function normalizeChannels(
  channels: Float32Array[],
  startSample: number,
  endSample: number,
  targetPeakDb: number
): { channels: Float32Array[]; appliedGainDb: number } {
  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, startSample));
  const end = Math.max(start, Math.min(total, endSample));

  let maxPeak = 0;
  for (const ch of channels) {
    for (let i = start; i < end; i++) {
      const a = Math.abs(ch[i]);
      if (a > maxPeak) maxPeak = a;
    }
  }

  if (maxPeak < 1e-7) {
    return { channels: cloneChannels(channels), appliedGainDb: 0 };
  }

  const targetLinear = Math.min(1, dbToLinear(targetPeakDb));
  const multiplier = targetLinear / maxPeak;
  const appliedGainDb = linearToDb(multiplier);

  const outChannels = channels.map((ch) => {
    const out = new Float32Array(ch);
    for (let i = start; i < end; i++) {
      out[i] = Math.max(-1, Math.min(1, out[i] * multiplier));
    }
    return out;
  });

  return { channels: outChannels, appliedGainDb };
}

export function computeFadeGain(
  progress: number,
  direction: FadeDirection,
  curve: FadeCurve
): number {
  const t = Math.max(0, Math.min(1, progress));
  const x = direction === 'in' ? t : 1 - t;
  switch (curve) {
    case 'linear':
      return x;
    case 'exponential':
      return x * x;
    case 'scurve':
      return 0.5 - 0.5 * Math.cos(Math.PI * x);
  }
}

export function applyFade(
  channels: Float32Array[],
  startSample: number,
  endSample: number,
  direction: FadeDirection,
  curve: FadeCurve
): Float32Array[] {
  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, startSample));
  const end = Math.max(start, Math.min(total, endSample));
  const len = end - start;
  if (len <= 1) return cloneChannels(channels);

  return channels.map((ch) => {
    const out = new Float32Array(ch);
    for (let i = 0; i < len; i++) {
      const g = computeFadeGain(i / (len - 1), direction, curve);
      out[start + i] *= g;
    }
    return out;
  });
}

/**
 * Cubic Hermite interpolation resampling of a single channel.
 * factor > 1.0 speeds up (shorter output), factor < 1.0 slows down (longer output).
 */
export function resampleChannelCubic(
  input: Float32Array,
  speedRatio: number
): Float32Array {
  if (input.length === 0 || Math.abs(speedRatio - 1) < 1e-5) {
    return new Float32Array(input);
  }
  const outLen = Math.max(1, Math.round(input.length / speedRatio));
  const out = new Float32Array(outLen);
  const last = input.length - 1;

  for (let i = 0; i < outLen; i++) {
    const pos = i * speedRatio;
    const idx = Math.floor(pos);
    const frac = pos - idx;

    const y0 = input[Math.max(0, idx - 1)];
    const y1 = input[Math.min(last, idx)];
    const y2 = input[Math.min(last, idx + 1)];
    const y3 = input[Math.min(last, idx + 2)];

    const c0 = y1;
    const c1 = 0.5 * (y2 - y0);
    const c2 = y0 - 2.5 * y1 + 2 * y2 - 0.5 * y3;
    const c3 = 0.5 * (y3 - y0) + 1.5 * (y1 - y2);

    const val = ((c3 * frac + c2) * frac + c1) * frac + c0;
    out[i] = Math.max(-1, Math.min(1, val));
  }
  return out;
}

/**
 * WSOLA (Waveform Similarity Overlap-Add) time-stretching for a single channel.
 * timeScale > 1.0 = faster (shorter output); timeScale < 1.0 = slower (longer output),
 * while preserving original pitch.
 */
export function timeStretchWSOLA(
  input: Float32Array,
  sampleRate: number,
  timeScale: number
): Float32Array {
  if (input.length < 256 || Math.abs(timeScale - 1) < 1e-4) {
    return new Float32Array(input);
  }

  const winSize = Math.max(256, Math.round(sampleRate * 0.045) & ~1); // ~45ms Hann window
  const halfWin = winSize >> 1;
  const searchRadius = Math.max(32, Math.round(sampleRate * 0.012)); // +/-12ms similarity search
  const targetLen = Math.max(1, Math.round(input.length / timeScale));
  const output = new Float32Array(targetLen);
  const norm = new Float32Array(targetLen);

  // Precompute Hann window
  const hann = new Float32Array(winSize);
  for (let i = 0; i < winSize; i++) {
    hann[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (winSize - 1)));
  }

  // Copy initial half-window
  const initCopy = Math.min(winSize, input.length, targetLen);
  for (let i = 0; i < initCopy; i++) {
    output[i] += input[i] * hann[i];
    norm[i] += hann[i];
  }

  const synHop = halfWin;
  let synPos = synHop;

  while (synPos < targetLen) {
    const idealAnaPos = Math.round(synPos * timeScale);
    let bestAnaPos = Math.max(0, Math.min(input.length - 1, idealAnaPos));

    // Find best cross-correlation alignment against already-written tail in output
    const overlapCheck = Math.min(halfWin, targetLen - synPos);
    if (overlapCheck > 16 && idealAnaPos > searchRadius && idealAnaPos + winSize + searchRadius < input.length) {
      let bestCorr = -Infinity;
      const minOffset = Math.max(0, idealAnaPos - searchRadius);
      const maxOffset = Math.min(input.length - winSize, idealAnaPos + searchRadius);

      for (let cand = minOffset; cand <= maxOffset; cand += 2) {
        let corr = 0;
        let energyA = 0;
        let energyB = 0;
        for (let k = 0; k < overlapCheck; k += 2) {
          const a = output[synPos + k] / Math.max(1e-4, norm[synPos + k]);
          const b = input[cand + k];
          corr += a * b;
          energyA += a * a;
          energyB += b * b;
        }
        const denom = Math.sqrt(energyA * energyB) + 1e-8;
        const score = corr / denom;
        if (score > bestCorr) {
          bestCorr = score;
          bestAnaPos = cand;
        }
      }
    }

    const availIn = Math.min(winSize, input.length - bestAnaPos);
    const availOut = Math.min(winSize, targetLen - synPos);
    const count = Math.min(availIn, availOut);

    for (let i = 0; i < count; i++) {
      const w = hann[i];
      output[synPos + i] += input[bestAnaPos + i] * w;
      norm[synPos + i] += w;
    }

    synPos += synHop;
  }

  for (let i = 0; i < targetLen; i++) {
    if (norm[i] > 1e-4) {
      output[i] = Math.max(-1, Math.min(1, output[i] / norm[i]));
    }
  }

  return output;
}

/**
 * Applies speed and pitch changes to a selected range (or whole file).
 * - speedRatio: 0.25 to 4.0 (2.0 = twice as fast / half duration)
 * - pitchSemitones: -12 to +12
 * - preservePitch: when true, speed changes keep pitch constant via WSOLA
 */
export function applySpeedAndPitch(
  channels: Float32Array[],
  sampleRate: number,
  startSample: number,
  endSample: number,
  speedRatio: number,
  pitchSemitones: number,
  preservePitch: boolean
): { channels: Float32Array[]; selection: AudioSelection } {
  const total = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(total, startSample));
  const end = Math.max(start, Math.min(total, endSample));
  const segmentLen = end - start;
  if (segmentLen <= 0) {
    return {
      channels: cloneChannels(channels),
      selection: { startSample: start, endSample: end },
    };
  }

  const pitchFactor = Math.pow(2, pitchSemitones / 12);

  const processedSegments = channels.map((ch) => {
    const seg = ch.subarray(start, end);
    if (!preservePitch && Math.abs(pitchSemitones) < 1e-4) {
      // Classic tape speed: resampling changes both speed and pitch together
      return resampleChannelCubic(seg, speedRatio);
    }

    // Independent control:
    // 1. Resample by pitchFactor (shifts pitch by pitchSemitones, alters duration by 1/pitchFactor)
    // 2. Time-stretch so final duration matches segmentLen / speedRatio
    let working = Math.abs(pitchFactor - 1) > 1e-4 ? resampleChannelCubic(seg, pitchFactor) : new Float32Array(seg);
    const stretchNeeded = preservePitch
      ? speedRatio / pitchFactor
      : 1 / pitchFactor;

    if (Math.abs(stretchNeeded - 1) > 1e-4) {
      working = timeStretchWSOLA(working, sampleRate, stretchNeeded);
    }
    return working;
  });

  const newSegLen = processedSegments[0].length;
  const nextTotal = start + newSegLen + (total - end);

  const nextChannels = channels.map((ch, idx) => {
    const out = new Float32Array(nextTotal);
    if (start > 0) out.set(ch.subarray(0, start), 0);
    out.set(processedSegments[idx], start);
    if (end < total) out.set(ch.subarray(end), start + newSegLen);
    return out;
  });

  return {
    channels: nextChannels,
    selection: { startSample: start, endSample: start + newSegLen },
  };
}

export interface PeakPair {
  min: number;
  max: number;
  rms: number;
}

export function computeWaveformPeaks(
  channelData: Float32Array,
  startSample: number,
  endSample: number,
  buckets: number
): PeakPair[] {
  const len = Math.max(0, endSample - startSample);
  if (len === 0 || buckets <= 0) return [];

  const result: PeakPair[] = new Array(buckets);
  const samplesPerBucket = len / buckets;

  for (let b = 0; b < buckets; b++) {
    const s0 = startSample + Math.floor(b * samplesPerBucket);
    const s1 = Math.min(
      channelData.length,
      Math.max(s0 + 1, startSample + Math.floor((b + 1) * samplesPerBucket))
    );
    let min = 1;
    let max = -1;
    let sumSq = 0;
    const step = Math.max(1, Math.floor((s1 - s0) / 128));
    let count = 0;

    for (let i = s0; i < s1; i += step) {
      const v = channelData[i];
      if (v < min) min = v;
      if (v > max) max = v;
      sumSq += v * v;
      count++;
    }
    if (count === 0) {
      result[b] = { min: 0, max: 0, rms: 0 };
    } else {
      result[b] = { min, max, rms: Math.sqrt(sumSq / count) };
    }
  }
  return result;
}

export function analyzeAudioStats(
  channels: Float32Array[],
  sampleRate: number,
  startSample?: number,
  endSample?: number
): AudioStats {
  const total = channels[0]?.length ?? 0;
  const start = startSample ?? 0;
  const end = endSample ?? total;
  const len = Math.max(0, end - start);

  let peakLinear = 0;
  let sumSq = 0;
  let sum = 0;
  let clippedSamples = 0;
  let count = 0;

  for (const ch of channels) {
    for (let i = start; i < end; i++) {
      const v = ch[i];
      const a = Math.abs(v);
      if (a > peakLinear) peakLinear = a;
      if (a >= 0.9999) clippedSamples++;
      sumSq += v * v;
      sum += v;
      count++;
    }
  }

  const rms = count > 0 ? Math.sqrt(sumSq / count) : 0;
  const dcOffset = count > 0 ? sum / count : 0;

  return {
    durationSeconds: sampleRate > 0 ? len / sampleRate : 0,
    totalSamples: len,
    sampleRate,
    channelCount: channels.length,
    peakLinear,
    peakDb: linearToDb(peakLinear),
    rmsDb: linearToDb(rms),
    dcOffset,
    clippedSamples,
  };
}

export function formatTimecode(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00.000';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds - Math.floor(seconds)) * 1000);
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
}

/**
 * Generates a musical 10-second stereo demo track so Audio Toolz is immediately
 * playable and testable on first load with zero network requests.
 */
export function generateDemoTrack(sampleRate = 44100): Float32Array[] {
  const durationSec = 10;
  const total = sampleRate * durationSec;
  const left = new Float32Array(total);
  const right = new Float32Array(total);

  // Warm minor7/add9 arpeggio chord progression
  const chords = [
    [220.0, 261.63, 329.63, 392.0], // Am7
    [174.61, 220.0, 261.63, 329.63], // Fmaj7
    [196.0, 246.94, 293.66, 392.0], // G6
    [164.81, 196.0, 246.94, 329.63], // Em7
  ];

  const chordDur = 2.5;
  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;
    const chordIdx = Math.min(3, Math.floor(t / chordDur));
    const localT = t - chordIdx * chordDur;
    const chord = chords[chordIdx];

    // Pad envelope
    const padEnv =
      Math.min(1, localT / 0.12) * Math.exp(-localT * 0.45);

    let padL = 0;
    let padR = 0;
    for (let n = 0; n < chord.length; n++) {
      const freq = chord[n];
      const detune = n % 2 === 0 ? 1.002 : 0.998;
      const oscL = Math.sin(2 * Math.PI * freq * t) + 0.18 * Math.sin(4 * Math.PI * freq * t);
      const oscR = Math.sin(2 * Math.PI * freq * detune * t + 0.4) + 0.18 * Math.sin(4 * Math.PI * freq * detune * t);
      padL += oscL * 0.11;
      padR += oscR * 0.11;
    }

    // Subtle rhythmic pluck every 0.3125s (16th/8th feel at ~96 BPM)
    const beatPeriod = 0.3125;
    const beatIdx = Math.floor(t / beatPeriod);
    const beatT = t - beatIdx * beatPeriod;
    const pluckFreq = chord[beatIdx % chord.length] * 2;
    const pluckEnv = Math.exp(-beatT * 14);
    const pluck = Math.sin(2 * Math.PI * pluckFreq * t) * pluckEnv * 0.18;
    const pan = (beatIdx % 2 === 0) ? 0.65 : 0.35;

    // Gentle soft kick pulse every 0.625s
    const kickPeriod = 0.625;
    const kickT = t % kickPeriod;
    const kickFreq = 55 + 95 * Math.exp(-kickT * 28);
    const kick = Math.sin(2 * Math.PI * kickFreq * kickT) * Math.exp(-kickT * 12) * 0.25;

    // Overall intro/outro smoothing
    const masterEnv =
      Math.min(1, t / 0.05) * Math.min(1, (durationSec - t) / 0.15);

    left[i] = Math.max(-0.95, Math.min(0.95, (padL * padEnv + pluck * pan + kick) * masterEnv));
    right[i] = Math.max(-0.95, Math.min(0.95, (padR * padEnv + pluck * (1 - pan) + kick) * masterEnv));
  }

  return [left, right];
}

/**
 * Surgical Kick-Attack & Beat BPM Detector (65..300 BPM):
 * 1. Computes 1 ms zero-lag transient + sub/punch attack-edge envelopes so kick attacks form
 *    razor-sharp impulses while rejecting sustained distortion, synths, and hi-hats.
 * 2. Evaluates top active 16s windows across 65..300 BPM using ACF + discrete IOI histogram +
 *    Gaussian-kernel comb & offbeat/half-tempo disambiguation, refining to 0.01 BPM.
 * 3. Locks every kick marker strictly to the BEGINNING OF ITS ATTACK ("démarrer à l'attaque")
 *    by walking backward from the initial transient crest to the rising onset foot above local
 *    pre-kick floor, then refines grid + phase across the whole track with 3-pass MAD regression.
 */
export function detectBpmAndBeats(
  channels: Float32Array[],
  sampleRate: number
): BpmDetectionResult {
  const total = channels[0]?.length ?? 0;
  if (total < sampleRate * 1.5 || sampleRate <= 0) {
    return {
      bpm: 0,
      confidence: 0,
      firstBeatSample: 0,
      beatSamples: [],
      kickSamples: [],
    };
  }

  const numCh = channels.length;
  const monoFull = new Float32Array(total);
  let globalMaxAbs = 0;
  for (let i = 0; i < total; i++) {
    let s = 0;
    for (let c = 0; c < numCh; c++) s += channels[c][i];
    const m = s / numCh;
    monoFull[i] = m;
    const a = Math.abs(m);
    if (a > globalMaxAbs) globalMaxAbs = a;
  }

  if (globalMaxAbs < 1e-4) {
    return {
      bpm: 0,
      confidence: 0,
      firstBeatSample: 0,
      beatSamples: [],
      kickSamples: [],
    };
  }

  // Zero-lag 3-band splitting at sample rate:
  // - Sub (< 170 Hz): kick fundamental weight (for groove & tempo confidence)
  // - Punch (170..1400 Hz): immediate beater impact with < 1 ms latency
  // - High (> 2800 Hz): hi-hats / cymbals / air (suppressed so 8th-note hats never double BPM)
  const aSub = 1 - Math.exp((-2 * Math.PI * 170) / sampleRate);
  const aMid = 1 - Math.exp((-2 * Math.PI * 1400) / sampleRate);
  const aHiCut = 1 - Math.exp((-2 * Math.PI * 2800) / sampleRate);

  const hop = Math.max(8, Math.round(sampleRate * 0.001)); // 1 ms surgical frames (1000 Hz)
  const envRate = sampleRate / hop;
  const totalFrames = Math.floor(total / hop);
  if (totalFrames < 180) {
    return {
      bpm: 0,
      confidence: 0,
      firstBeatSample: 0,
      beatSamples: [],
      kickSamples: [],
    };
  }

  const subRmsFull = new Float32Array(totalFrames);
  const punchRmsFull = new Float32Array(totalFrames);
  const highRmsFull = new Float32Array(totalFrames);
  const peakEnvFull = new Float32Array(totalFrames);

  let s1 = 0;
  let s2 = 0;
  let m1 = 0;
  let h1 = 0;

  for (let f = 0; f < totalFrames; f++) {
    const base = f * hop;
    let sumSub = 0;
    let sumPunch = 0;
    let sumHigh = 0;
    let maxFramePeak = 0;
    for (let i = 0; i < hop; i++) {
      const x = monoFull[base + i];
      const ax = Math.abs(x);
      if (ax > maxFramePeak) maxFramePeak = ax;

      s1 += aSub * (x - s1);
      s2 += aSub * (s1 - s2);
      m1 += aMid * (x - m1);
      h1 += aHiCut * (x - h1);

      const sub = s2;
      const punch = m1 - s1;
      const high = x - h1;

      sumSub += sub * sub;
      sumPunch += punch * punch;
      sumHigh += high * high;
    }
    subRmsFull[f] = Math.sqrt(sumSub / hop);
    punchRmsFull[f] = Math.sqrt(sumPunch / hop);
    highRmsFull[f] = Math.sqrt(sumHigh / hop);
    peakEnvFull[f] = maxFramePeak;
  }

  // Dual onset curves at 1 ms resolution:
  // - onsetFull: tempo/kick stability curve (Sub + Punch + Peak)
  // - attackEdgeFull: zero-lag leading attack transient curve [0..+2ms] vs [-14ms..-2ms]
  const preFrames = Math.max(8, Math.round(envRate * 0.016));
  const preEdgeFrames = Math.max(6, Math.round(envRate * 0.012));
  const currFrames = Math.max(2, Math.round(envRate * 0.004));
  const edgeCurrFrames = Math.max(2, Math.round(envRate * 0.002));
  const onsetFull = new Float32Array(totalFrames);
  const attackEdgeFull = new Float32Array(totalFrames);
  const subOnsetFull = new Float32Array(totalFrames);
  const punchOnsetFull = new Float32Array(totalFrames);

  for (let f = preFrames; f < totalFrames - currFrames; f++) {
    let preSub = 0;
    let prePunch = 0;
    let preHigh = 0;
    let prePeak = 0;
    for (let j = f - preFrames; j < f; j++) {
      preSub += subRmsFull[j];
      prePunch += punchRmsFull[j];
      preHigh += highRmsFull[j];
      prePeak += peakEnvFull[j];
    }
    preSub /= preFrames;
    prePunch /= preFrames;
    preHigh /= preFrames;
    prePeak /= preFrames;

    let currSub = 0;
    let currPunch = 0;
    let currHigh = 0;
    let currPeak = 0;
    for (let j = f; j < f + currFrames; j++) {
      currSub += subRmsFull[j];
      currPunch += punchRmsFull[j];
      currHigh += highRmsFull[j];
      if (peakEnvFull[j] > currPeak) currPeak = peakEnvFull[j];
    }
    currSub /= currFrames;
    currPunch /= currFrames;
    currHigh /= currFrames;

    const dSub = Math.max(0, currSub - preSub * 0.9);
    const dPunch = Math.max(0, currPunch - prePunch * 0.92);
    const dPeak = Math.max(0, currPeak - prePeak * 0.88);
    const dHigh = Math.max(0, currHigh - preHigh * 0.95);

    const hatMask = Math.max(0, dHigh * 0.42 - (dSub * 0.65 + dPunch * 0.55));
    subOnsetFull[f] = dSub;
    punchOnsetFull[f] = dPunch;
    onsetFull[f] = Math.max(
      0,
      dSub * 0.44 + dPunch * 0.36 + dPeak * 0.24 - hatMask
    );

    // Tighter zero-lag leading attack edge ([f..f+2ms] vs [f-14ms..f-2ms])
    let edgePrePunch = 0;
    let edgePrePeak = 0;
    let edgePreHigh = 0;
    const eLo = Math.max(0, f - preEdgeFrames - 2);
    const eHi = Math.max(eLo + 1, f - 2);
    for (let j = eLo; j < eHi; j++) {
      edgePrePunch += punchRmsFull[j];
      edgePrePeak += peakEnvFull[j];
      edgePreHigh += highRmsFull[j];
    }
    const eCount = eHi - eLo;
    edgePrePunch /= eCount;
    edgePrePeak /= eCount;
    edgePreHigh /= eCount;

    let edgeCurrPunch = 0;
    let edgeCurrPeak = 0;
    let edgeCurrHigh = 0;
    for (let j = f; j < f + edgeCurrFrames; j++) {
      edgeCurrPunch += punchRmsFull[j];
      edgeCurrHigh += highRmsFull[j];
      if (peakEnvFull[j] > edgeCurrPeak) edgeCurrPeak = peakEnvFull[j];
    }
    edgeCurrPunch /= edgeCurrFrames;
    edgeCurrHigh /= edgeCurrFrames;

    const edPunch = Math.max(0, edgeCurrPunch - edgePrePunch * 1.05);
    const edPeak = Math.max(0, edgeCurrPeak - edgePrePeak * 1.05);
    const edHigh = Math.max(0, edgeCurrHigh - edgePreHigh * 1.02);
    const edHatMask = Math.max(0, edHigh * 0.45 - (dSub * 0.6 + edPunch * 0.65));
    attackEdgeFull[f] = Math.max(
      0,
      edPunch * 0.50 + edPeak * 0.40 + dSub * 0.14 - edHatMask
    );
  }

  // Pick up to 3 active 16-second drop windows with genuine kick energy & rhythmic contrast
  const winFrames = Math.min(totalFrames, Math.round(envRate * 20));
  const selectTopWindows = (): number[] => {
    if (totalFrames <= winFrames * 1.2) return [0];
    const step = Math.max(1, Math.round(envRate * 2.5));
    const scored: Array<{ start: number; score: number }> = [];
    for (let st = 0; st + winFrames <= totalFrames; st += step) {
      let sum = 0;
      let sumSq = 0;
      let sumSub = 0;
      for (let f = st; f < st + winFrames; f++) {
        const v = onsetFull[f];
        sum += v;
        sumSq += v * v;
        sumSub += subRmsFull[f];
      }
      const meanOnset = sum / winFrames;
      const rmsOnset = Math.sqrt(sumSq / winFrames);
      const meanSub = sumSub / winFrames;
      const contrast = Math.min(4.5, rmsOnset / (meanOnset + 1e-12));
      const score = rmsOnset * (0.5 + 0.5 * contrast) * Math.sqrt(meanSub + 1e-5);
      scored.push({ start: st, score });
    }
    scored.sort((a, b) => b.score - a.score);
    const picked: number[] = [];
    for (const item of scored) {
      if (picked.every((p) => Math.abs(p - item.start) >= winFrames * 0.5)) {
        picked.push(item.start);
        if (picked.length >= 3) break;
      }
    }
    return picked.length > 0 ? picked : [0];
  };
  const activeStarts = selectTopWindows();
  const primaryStart = activeStarts[0];
  // Build smoothed curves & discrete peak-picked kick events per window
  const refracFrames = Math.max(24, Math.round(envRate * 0.145)); // >300 BPM bursts merged cleanly
  const buildWindowData = (startFrame: number) => {
    const len = Math.min(winFrames, totalFrames - startFrame);
    const raw = onsetFull.subarray(startFrame, startFrame + len);
    const subRaw = subOnsetFull.subarray(startFrame, startFrame + len);
    const subLevelRaw = subRmsFull.subarray(startFrame, startFrame + len);
    const punchRaw = punchOnsetFull.subarray(startFrame, startFrame + len);
    const highRaw = highRmsFull.subarray(startFrame, startFrame + len);
    const smooth = new Float32Array(len);
    let energy = 0;
    let avg = 0;
    let subAvg = 0;
    let punchAvg = 0;
    for (let f = 0; f < len; f++) {
      avg += raw[f];
      subAvg += subRaw[f];
      punchAvg += punchRaw[f];
      const a2 = f > 1 ? raw[f - 2] : raw[f];
      const a1 = f > 0 ? raw[f - 1] : raw[f];
      const b = raw[f];
      const c1 = f + 1 < len ? raw[f + 1] : raw[f];
      const c2 = f + 2 < len ? raw[f + 2] : raw[f];
      const v = 0.1 * a2 + 0.22 * a1 + 0.36 * b + 0.22 * c1 + 0.1 * c2;
      smooth[f] = v;
      energy += v * v;
    }
    avg /= Math.max(1, len);
    subAvg /= Math.max(1, len);
    punchAvg /= Math.max(1, len);
    // Local adaptive threshold peak-picking of genuine kick attack events
    const halfWin = Math.round(envRate * 0.35);
    const peaks: Array<{ frame: number; amp: number; subAmp: number; punchAmp: number }> = [];
    for (let f = 3; f < len - 3; f++) {
      const val = smooth[f];
      if (val <= avg * 0.85) continue;
      if (
        val >= smooth[f - 1] &&
        val >= smooth[f + 1] &&
        val >= smooth[f - 2] &&
        val >= smooth[f + 2] &&
        val >= smooth[f - 3] &&
        val >= smooth[f + 3]
      ) {
        const l0 = Math.max(0, f - halfWin);
        const l1 = Math.min(len - 1, f + halfWin);
        let lSum = 0;
        for (let k = l0; k <= l1; k++) lSum += smooth[k];
        const lMean = lSum / Math.max(1, l1 - l0 + 1);
        if (val >= lMean * 1.32 + avg * 0.25) {
          const prev = peaks[peaks.length - 1];
          if (prev && f - prev.frame < refracFrames) {
            if (val > prev.amp) {
              peaks[peaks.length - 1] = {
                frame: f,
                amp: val,
                subAmp: subRaw[f],
                punchAmp: punchRaw[f],
              };
            }
          } else {
            peaks.push({
              frame: f,
              amp: val,
              subAmp: subRaw[f],
              punchAmp: punchRaw[f],
            });
          }
        }
      }
    }
    return {
      startFrame,
      len,
      raw,
      subRaw,
      subLevelRaw,
      punchRaw,
      highRaw,
      smooth,
      energy,
      avg,
      subAvg,
      punchAvg,
      peaks,
    };
  };
  const windows = activeStarts.map(buildWindowData);
  const primaryWin = windows[0];
  if (primaryWin.energy < 1e-10 || primaryWin.avg < 1e-7) {
    return {
      bpm: 0,
      confidence: 0,
      firstBeatSample: 0,
      beatSamples: [],
      kickSamples: [],
    };
  }
  const minBpm = 65;
  const maxBpm = 300;
  // Compute ACF on 2 ms downsampled stride (fast + noise-immune) for candidate retrieval
  const ds = 2;
  const dsRate = envRate / ds;
  const dsWindows = windows.map((w) => {
    const dsLen = Math.floor(w.len / ds);
    const arr = new Float32Array(dsLen);
    let e = 0;
    for (let i = 0; i < dsLen; i++) {
      const v = 0.5 * (w.smooth[i * ds] + w.smooth[i * ds + 1]);
      arr[i] = v;
      e += v * v;
    }
    return { arr, len: dsLen, energy: e };
  });
  const minLagDs = Math.max(8, Math.floor((dsRate * 60) / (maxBpm * 1.1)));
  const maxLagDs = Math.min(dsWindows[0].len - 4, Math.ceil(((dsRate * 60) / minBpm) * 3.05));
  const acf = new Float32Array(maxLagDs + 1);
  for (let lag = minLagDs; lag <= maxLagDs; lag++) {
    let totalCorr = 0;
    for (const dw of dsWindows) {
      if (lag >= dw.len - 2) continue;
      let sum = 0;
      const limit = dw.len - lag;
      for (let f = 0; f < limit; f++) {
        sum += dw.arr[f] * dw.arr[f + lag];
      }
      const overlapScale = dw.len / Math.max(1, limit);
      totalCorr += (sum * overlapScale) / (dw.energy + 1e-12);
    }
    acf[lag] = totalCorr / dsWindows.length;
  }
  const sampleAcf = (lagFrames1ms: number): number => {
    const lagFloat = lagFrames1ms / ds;
    const i0 = Math.floor(lagFloat);
    const frac = lagFloat - i0;
    if (i0 < 0 || i0 + 1 >= acf.length) return 0;
    return acf[i0] * (1 - frac) + acf[i0 + 1] * frac;
  };
  // Build Discrete Kick Inter-Onset Interval (IOI) histogram across 65..300 BPM (0.5 BPM bins)
  const ioiBins = Math.round((maxBpm - minBpm) * 2) + 1;
  const ioiHist = new Float32Array(ioiBins);
  for (const w of windows) {
    for (let i = 0; i < w.peaks.length; i++) {
      for (let step = 1; step <= 3 && i + step < w.peaks.length; step++) {
        const dtFrames = w.peaks[i + step].frame - w.peaks[i].frame;
        if (dtFrames <= 0) continue;
        const bpmRaw = (envRate * 60) / dtFrames;
        const stepWeight =
          (step === 1 ? 1.0 : step === 2 ? 0.5 : 0.25) *
          Math.min(w.peaks[i].amp, w.peaks[i + step].amp);
        for (const mult of [1, 2, 0.5]) {
          const b = bpmRaw * mult;
          if (b >= minBpm - 0.5 && b <= maxBpm + 0.5) {
            const centerBin = (b - minBpm) * 2;
            const bLo = Math.max(0, Math.floor(centerBin - 2));
            const bHi = Math.min(ioiBins - 1, Math.ceil(centerBin + 2));
            for (let bin = bLo; bin <= bHi; bin++) {
              const dist = Math.abs(bin - centerBin);
              ioiHist[bin] += stepWeight * Math.exp(-0.5 * dist * dist);
            }
          }
        }
      }
    }
  }
  let maxIoi = 1e-12;
  for (let i = 0; i < ioiBins; i++) {
    if (ioiHist[i] > maxIoi) maxIoi = ioiHist[i];
  }
  // Collect candidate tempos from BOTH ACF peaks and IOI histogram peaks (+ harmonic ratios)
  const candidateBpms = new Set<number>();
  const addWithHarmonics = (baseBpm: number) => {
    const ratios = [1, 2, 0.5, 1.5, 2 / 3, 3, 1 / 3];
    for (const r of ratios) {
      const b = Math.round(baseBpm * r * 2) / 2;
      if (b >= minBpm && b <= maxBpm) candidateBpms.add(b);
    }
  };
  const coarseAcf: Array<{ bpm: number; score: number }> = [];
  for (let bpm = minBpm; bpm <= maxBpm; bpm += 0.5) {
    const lag = (envRate * 60) / bpm;
    const score =
      sampleAcf(lag) + 0.45 * sampleAcf(lag * 2) + 0.2 * sampleAcf(lag * 3);
    coarseAcf.push({ bpm, score });
  }
  const acfPeaks: Array<{ bpm: number; score: number }> = [];
  for (let i = 1; i < coarseAcf.length - 1; i++) {
    if (
      coarseAcf[i].score >= coarseAcf[i - 1].score &&
      coarseAcf[i].score >= coarseAcf[i + 1].score
    ) {
      acfPeaks.push(coarseAcf[i]);
    }
  }
  acfPeaks.sort((a, b) => b.score - a.score);
  for (let i = 0; i < Math.min(7, acfPeaks.length); i++) {
    addWithHarmonics(acfPeaks[i].bpm);
  }
  const ioiPeaks: Array<{ bpm: number; score: number }> = [];
  for (let i = 1; i < ioiBins - 1; i++) {
    if (ioiHist[i] >= ioiHist[i - 1] && ioiHist[i] >= ioiHist[i + 1]) {
      ioiPeaks.push({ bpm: minBpm + i * 0.5, score: ioiHist[i] });
    }
  }
  ioiPeaks.sort((a, b) => b.score - a.score);
  for (let i = 0; i < Math.min(7, ioiPeaks.length); i++) {
    addWithHarmonics(ioiPeaks[i].bpm);
  }
  if (candidateBpms.size === 0) candidateBpms.add(120);
  // Gaussian-Kernel Comb evaluation on 1 ms curves
  const evalWindowTempoFit = (
    w: ReturnType<typeof buildWindowData>,
    bpm: number,
    sigmaMs: number
  ) => {
    const periodFrames = (envRate * 60) / bpm;
    const sigmaFrames = Math.max(2.0, (envRate * sigmaMs) / 1000);
    const tolFrames = Math.ceil(sigmaFrames * 2.2);
    const phaseSteps = Math.max(24, Math.round(periodFrames / 2.2));
    const lutLen = tolFrames * 2 + 1;
    const gaussLut = new Float32Array(lutLen);
    for (let d = -tolFrames; d <= tolFrames; d++) {
      const z = d / sigmaFrames;
      gaussLut[d + tolFrames] = Math.exp(-0.5 * z * z);
    }
    const kernelMatch = (arr: Float32Array, posFloat: number) => {
      const center = Math.round(posFloat);
      const lo = Math.max(0, center - tolFrames);
      const hi = Math.min(w.len - 1, center + tolFrames);
      let best = 0;
      for (let j = lo; j <= hi; j++) {
        const wgt = gaussLut[j - center + tolFrames];
        const weighted = arr[j] * wgt;
        if (weighted > best) best = weighted;
      }
      return best;
    };
    let bestP = 0;
    let bestOnBeatSum = -Infinity;
    let bestCount = 0;
    for (let p = 0; p < phaseSteps; p++) {
      const phase = (p / phaseSteps) * periodFrames;
      let comb = 0;
      let count = 0;
      for (let pos = phase; pos < w.len - 1; pos += periodFrames) {
        comb += kernelMatch(w.smooth, pos);
        count++;
      }
      if (count > 0 && comb / count > bestOnBeatSum) {
        bestOnBeatSum = comb / count;
        bestP = phase;
        bestCount = count;
      }
    }
    let offBeatSum = 0;
    let halfKickSum = 0;
    let halfSubSum = 0;
    let halfHighSum = 0;
    let halfHits = 0;
    let thirdKickSum = 0;
    let thirdHits = 0;
    let onPunchSum = 0;
    let onSubSum = 0;
    let onHighSum = 0;
    let evenKickSum = 0;
    let oddKickSum = 0;
    let evenSubSum = 0;
    let oddSubSum = 0;
    let evenHits = 0;
    let oddHits = 0;
    let evenCount = 0;
    let oddCount = 0;
    let hits = 0;
    let punchHits = 0;
    let offCount = 0;
    const hitThresh = w.avg * 0.9;
    const punchThresh = w.punchAvg * 0.65;
    let beatIdx = 0;
    for (let pos = bestP; pos < w.len - 1; pos += periodFrames, beatIdx++) {
      const val = kernelMatch(w.smooth, pos);
      const pVal = kernelMatch(w.punchRaw, pos);
      const sVal = kernelMatch(w.subRaw, pos);
      const sLvl = kernelMatch(w.subLevelRaw, pos);
      const hVal = kernelMatch(w.highRaw, pos);
      const beatKick = sVal * 0.55 + pVal * 0.45;
      const hit = val >= hitThresh ? 1 : 0;
      if (hit) hits++;
      if (pVal >= punchThresh || sVal >= w.subAvg * 0.85) punchHits++;
      onPunchSum += pVal;
      onSubSum += sVal;
      onHighSum += hVal;
      if (beatIdx % 2 === 0) {
        evenKickSum += beatKick;
        evenSubSum += sLvl;
        evenHits += hit;
        evenCount++;
      } else {
        oddKickSum += beatKick;
        oddSubSum += sLvl;
        oddHits += hit;
        oddCount++;
      }
      if (pos + periodFrames * 0.67 < w.len - 1) {
        const offHalf = kernelMatch(w.smooth, pos + periodFrames * 0.5);
        const offThird = kernelMatch(w.smooth, pos + periodFrames / 3);
        const offTwoThird = kernelMatch(w.smooth, pos + (periodFrames * 2) / 3);
        offBeatSum += Math.max(offHalf, 0.88 * offThird, 0.88 * offTwoThird);
        const halfPunch = kernelMatch(w.punchRaw, pos + periodFrames * 0.5);
        const halfSub = kernelMatch(w.subRaw, pos + periodFrames * 0.5);
        const halfHigh = kernelMatch(w.highRaw, pos + periodFrames * 0.5);
        if (offHalf >= hitThresh) halfHits++;
        halfKickSum += halfSub * 0.55 + halfPunch * 0.45;
        halfSubSum += halfSub;
        halfHighSum += halfHigh;
        const t1Kick = kernelMatch(w.subRaw, pos + periodFrames / 3) * 0.55 + kernelMatch(w.punchRaw, pos + periodFrames / 3) * 0.45;
        const t2Kick = kernelMatch(w.subRaw, pos + (periodFrames * 2) / 3) * 0.55 + kernelMatch(w.punchRaw, pos + (periodFrames * 2) / 3) * 0.45;
        thirdKickSum += Math.min(t1Kick, t2Kick);
        if (offThird >= hitThresh && offTwoThird >= hitThresh) thirdHits++;
        offCount++;
      }
    }
    const hitRate = bestCount > 0 ? hits / bestCount : 0;
    const kickConsist = bestCount > 0 ? punchHits / bestCount : 0;
    const offBeatMean = offCount > 0 ? offBeatSum / offCount : 0;
    const onKickMean = bestCount > 0 ? (onSubSum * 0.55 + onPunchSum * 0.45) / bestCount : 0;
    const onSubMean = bestCount > 0 ? onSubSum / bestCount : 0;
    const onHighMean = bestCount > 0 ? onHighSum / bestCount : 0;
    const halfKickMean = offCount > 0 ? halfKickSum / offCount : 0;
    const halfSubMean = offCount > 0 ? halfSubSum / offCount : 0;
    const halfHighMean = offCount > 0 ? halfHighSum / offCount : 0;
    const halfHitRate = offCount > 0 ? halfHits / offCount : 0;
    const thirdKickMean = offCount > 0 ? thirdKickSum / offCount : 0;
    const thirdHitRate = offCount > 0 ? thirdHits / offCount : 0;
    // Penalize half-tempo or 1/3-tempo ONLY when midpoints truly carry equally strong kicks
    const isTrueDoubleTimeKicks =
      bpm * 2 <= maxBpm &&
      halfKickMean > onKickMean * 0.64 &&
      halfSubMean > onSubMean * 0.64 &&
      halfHitRate >= 0.72 &&
      halfHighMean <= halfSubMean * 1.8 + onHighMean * 1.15;
    const isTrueTripleTimeKicks =
      bpm * 3 <= maxBpm &&
      thirdKickMean > onKickMean * 0.62 &&
      thirdHitRate >= 0.70;
    const halfTempoPenalty = isTrueDoubleTimeKicks
      ? halfKickMean * 0.75
      : isTrueTripleTimeKicks
      ? thirdKickMean * 0.85
      : 0;
    // Penalize octave-doubled high tempos (> 165 BPM) when even vs odd beats are truly asymmetrical (allows 0.78 groove accents)
    let doublingPenalty = 0;
    if (bpm > 165 && bpm / 2 >= minBpm && evenCount >= 3 && oddCount >= 3) {
      const evK = evenKickSum / evenCount;
      const odK = oddKickSum / oddCount;
      const evS = evenSubSum / evenCount;
      const odS = oddSubSum / oddCount;
      const evH = evenHits / evenCount;
      const odH = oddHits / oddCount;
      const kickSym = Math.min(evK, odK) / Math.max(1e-9, Math.max(evK, odK));
      const subSym = Math.min(evS, odS) / Math.max(1e-9, Math.max(evS, odS));
      const hitSym = Math.min(evH, odH) / Math.max(1e-9, Math.max(evH, odH));
      const worstSym = Math.min(kickSym, subSym, hitSym);
      if (kickSym < 0.62 || subSym < 0.64 || hitSym < 0.75) {
        doublingPenalty = bestOnBeatSum * (0.45 + 0.55 * (1 - worstSym));
      }
    }
    const coverageScore =
      bestOnBeatSum * (0.35 + 0.65 * hitRate) * (0.7 + 0.3 * kickConsist) -
      offBeatMean * 0.28 -
      halfTempoPenalty -
      doublingPenalty;
    return { bestP, bestOnBeatSum, coverageScore };
  };
  let chosenBpm = 120;
  let chosenScore = -Infinity;
  const evalWindows = windows;
  for (const cand of candidateBpms) {
    let localBestBpm = cand;
    let localBestCov = -Infinity;
    for (
      let b = Math.max(minBpm, cand - 0.8);
      b <= Math.min(maxBpm, cand + 0.8) + 1e-6;
      b += 0.2
    ) {
      let cov = 0;
      for (const w of evalWindows) {
        cov += evalWindowTempoFit(w, b, 10).coverageScore;
      }
      cov /= evalWindows.length;
      const directAcf = Math.max(0, sampleAcf((envRate * 60) / b));
      const halfAcf = b / 2 >= minBpm ? Math.max(0, sampleAcf((envRate * 60) / (b / 2))) : 0;
      const acfOctavePenalty =
        b > 165 && halfAcf > directAcf * 1.12
          ? Math.max(0.55, directAcf / (halfAcf + 1e-9))
          : 1;
      const binIdx = Math.max(0, Math.min(ioiBins - 1, Math.round((b - minBpm) * 2)));
      const ioiBoost = 0.25 * (ioiHist[binIdx] / maxIoi);
      const totalMetric = cov * (0.6 + 0.35 * directAcf + ioiBoost) * acfOctavePenalty;
      if (totalMetric > localBestCov) {
        localBestCov = totalMetric;
        localBestBpm = b;
      }
    }
    if (localBestCov > chosenScore) {
      chosenScore = localBestCov;
      chosenBpm = localBestBpm;
    }
  }
  // Fine 0.05 BPM + Micro 0.01 BPM sweep across selected windows using tight 4.5 ms kernel
  let bestBpm = chosenBpm;
  let bestPhaseFrames = 0;
  let bestCombScore = -Infinity;
  for (
    let bpm = Math.max(minBpm, chosenBpm - 0.8);
    bpm <= Math.min(maxBpm, chosenBpm + 0.8) + 1e-6;
    bpm += 0.05
  ) {
    let sumComb = 0;
    let primaryPhase = 0;
    for (let wi = 0; wi < evalWindows.length; wi++) {
      const fit = evalWindowTempoFit(evalWindows[wi], bpm, 5);
      sumComb += fit.bestOnBeatSum;
      if (wi === 0) primaryPhase = fit.bestP;
    }
    const meanComb = sumComb / evalWindows.length;
    if (meanComb > bestCombScore) {
      bestCombScore = meanComb;
      bestBpm = bpm;
      bestPhaseFrames = primaryPhase;
    }
  }
  const microCenter = bestBpm;
  for (
    let bpm = Math.max(minBpm, microCenter - 0.08);
    bpm <= Math.min(maxBpm, microCenter + 0.08) + 1e-6;
    bpm += 0.01
  ) {
    let sumComb = 0;
    let primaryPhase = 0;
    for (let wi = 0; wi < evalWindows.length; wi++) {
      const fit = evalWindowTempoFit(evalWindows[wi], bpm, 4.5);
      sumComb += fit.bestOnBeatSum;
      if (wi === 0) primaryPhase = fit.bestP;
    }
    const meanComb = sumComb / evalWindows.length;
    if (meanComb > bestCombScore) {
      bestCombScore = meanComb;
      bestBpm = bpm;
      bestPhaseFrames = primaryPhase;
    }
  }
  // Locate exact START OF KICK ATTACK ("démarrer à l'attaque"):
  // 1. Finds the sharp zero-lag attack edge frame around centerSample.
  // 2. Locates the initial transient peak, estimates local pre-kick ambient floor [-16ms .. -4ms],
  //    and walks BACKWARD until the fast waveform envelope meets the rising attack foot!
  const initialPeriodSamples = (sampleRate * 60) / bestBpm;
  const basePreSamples = Math.min(
    Math.round(initialPeriodSamples * 0.18),
    Math.max(48, Math.round(sampleRate * 0.016))
  );
  const basePostSamples = Math.min(
    Math.round(initialPeriodSamples * 0.22),
    Math.max(64, Math.round(sampleRate * 0.02))
  );
  const crestMinAmp = globalMaxAbs * 0.07;
  const microEnvHalf = Math.max(6, Math.round(sampleRate * 0.00035)); // ~0.7 ms short window
  const maxBackWalk = Math.max(64, Math.round(sampleRate * 0.01));

  // Helper: computes short-window local peak envelope around sample `s` (bridges waveform zero-crossings)
  const localEnvAt = (s: number): number => {
    const e0 = Math.max(0, s - microEnvHalf);
    const e1 = Math.min(total - 1, s + microEnvHalf);
    let mx = 0;
    for (let k = e0; k <= e1; k++) {
      const a = Math.abs(monoFull[k]);
      if (a > mx) mx = a;
    }
    return mx;
  };

  const findKickAttackStart = (
    centerSample: number,
    wideSearch = false,
    tightRadiusSamples?: number
  ): number | null => {
    const pre =
      tightRadiusSamples !== undefined
        ? tightRadiusSamples
        : wideSearch
        ? Math.min(Math.round(initialPeriodSamples * 0.26), Math.round(sampleRate * 0.028))
        : basePreSamples;
    const post =
      tightRadiusSamples !== undefined
        ? tightRadiusSamples
        : wideSearch
        ? Math.min(Math.round(initialPeriodSamples * 0.28), Math.round(sampleRate * 0.032))
        : basePostSamples;

    const lo = Math.max(0, Math.round(centerSample - pre));
    const hi = Math.min(total - 1, Math.round(centerSample + post));
    if (hi <= lo) return null;

    const fLo = Math.max(0, Math.floor(lo / hop));
    const fHi = Math.min(totalFrames - 1, Math.ceil(hi / hop));
    let bestFrame = Math.min(
      totalFrames - 1,
      Math.max(0, Math.round(centerSample / hop))
    );
    let bestScore = -1;
    for (let f = fLo; f <= fHi; f++) {
      // Combine instant attack edge + overall kick onset so transient onset dominates sub delay
      const score = attackEdgeFull[f] * 0.68 + onsetFull[f] * 0.32;
      if (score > bestScore) {
        bestScore = score;
        bestFrame = f;
      }
    }
    if (bestScore < primaryWin.avg * 0.38) return null;

    const approxSample = bestFrame * hop;
    const scanLo = Math.max(lo, approxSample - Math.round(sampleRate * 0.004));
    const scanHi = Math.min(hi, approxSample + Math.round(sampleRate * 0.012));

    let attackPeakAmp = 0;
    let attackPeakSample = approxSample;
    for (let s = scanLo; s <= scanHi; s++) {
      const a = Math.abs(monoFull[s]);
      if (a > attackPeakAmp) {
        attackPeakAmp = a;
        attackPeakSample = s;
      }
    }
    if (attackPeakAmp < crestMinAmp) return null;

    // Pick first strong rising peak (>= 58% of attackPeakAmp) so long low sub swell never pulls us late
    const earlyPeakThresh = attackPeakAmp * 0.58;
    let firstPeakSample = attackPeakSample;
    let firstPeakAmp = attackPeakAmp;
    for (let s = scanLo + 1; s < scanHi; s++) {
      const a = Math.abs(monoFull[s]);
      if (
        a >= earlyPeakThresh &&
        a >= Math.abs(monoFull[s - 1]) &&
        a >= Math.abs(monoFull[s + 1])
      ) {
        firstPeakSample = s;
        firstPeakAmp = a;
        break;
      }
    }

    // Measure local pre-kick ambient floor in [firstPeakSample - 18ms .. firstPeakSample - 5ms]
    const floorStart = Math.max(0, firstPeakSample - Math.round(sampleRate * 0.018));
    const floorEnd = Math.max(floorStart + 1, firstPeakSample - Math.round(sampleRate * 0.005));
    let floorSum = 0;
    let floorCount = 0;
    const floorStep = Math.max(1, Math.floor((floorEnd - floorStart) / 36));
    for (let s = floorStart; s < floorEnd; s += floorStep) {
      floorSum += Math.abs(monoFull[s]);
      floorCount++;
    }
    const meanAbsFloor = floorCount > 0 ? floorSum / floorCount : 0;
    // Envelope floor is slightly higher than mean(|x|) on tonal signals (~1.25x)
    const preFloor = meanAbsFloor * 1.25;
    if (firstPeakAmp <= preFloor * 1.35 + crestMinAmp * 0.3) {
      return null;
    }

    // Walk backward from firstPeakSample along short-window envelope until leaving pre-kick floor
    const onsetFootThresh = preFloor + (firstPeakAmp - preFloor) * 0.14;
    const walkStop = Math.max(0, firstPeakSample - maxBackWalk);
    let onsetStart = firstPeakSample;
    const stepSamples = Math.max(1, Math.round(sampleRate * 0.0002));
    for (let s = firstPeakSample; s >= walkStop; s -= stepSamples) {
      const env = localEnvAt(s);
      if (env <= onsetFootThresh) {
        onsetStart = s;
        break;
      }
      onsetStart = s;
    }

    // Fine-snap forward a few samples right onto the inflection where signal begins ascending cleanly
    const refineHi = Math.min(firstPeakSample, onsetStart + Math.round(sampleRate * 0.001));
    const directFoot = preFloor + (firstPeakAmp - preFloor) * 0.10;
    for (let s = onsetStart; s <= refineHi; s++) {
      if (Math.abs(monoFull[s]) >= directFoot) {
        return Math.max(0, s - 1);
      }
    }

    return onsetStart;
  };

  // Track-wide forward + backward phase-lock walk + 3-pass MAD linear regression on attack starts
  const winAnchorRaw = (primaryStart + bestPhaseFrames) * hop;
  const winMidTarget = winAnchorRaw + Math.round(primaryWin.len * 0.5) * hop;
  let anchorSample = winAnchorRaw;
  let bestCenterScore = -1;

  for (
    let idx = 0;
    winAnchorRaw + idx * initialPeriodSamples < (primaryStart + primaryWin.len) * hop;
    idx++
  ) {
    const exp = winAnchorRaw + idx * initialPeriodSamples;
    const attackStart = findKickAttackStart(exp);
    if (attackStart !== null) {
      const f = Math.min(totalFrames - 1, Math.floor(attackStart / hop));
      const prox = Math.abs(exp - winMidTarget) < initialPeriodSamples * 4 ? 1.15 : 1;
      const sc = onsetFull[f] * prox;
      if (sc > bestCenterScore) {
        bestCenterScore = sc;
        anchorSample = attackStart;
      }
    }
  }

  const matchedStarts = new Map<number, number>();
  matchedStarts.set(0, anchorSample);

  const walkDirection = (dir: 1 | -1) => {
    let cursor = anchorSample;
    let missingStreak = 0;
    for (let step = 1; ; step++) {
      const idx = dir * step;
      cursor += dir * initialPeriodSamples;
      if (dir === 1 && cursor >= total) break;
      if (dir === -1 && cursor < 0) break;

      const attackStart = findKickAttackStart(cursor, missingStreak >= 4);
      if (attackStart !== null) {
        matchedStarts.set(idx, attackStart);
        const pull = missingStreak >= 4 ? 0.65 : 0.35;
        cursor = cursor * (1 - pull) + attackStart * pull;
        missingStreak = 0;
      } else {
        missingStreak++;
      }
    }
  };

  walkDirection(1);
  walkDirection(-1);

  const detectedPairs = Array.from(matchedStarts.entries())
    .map(([idx, sample]) => ({ idx, sample }))
    .sort((a, b) => a.idx - b.idx);

  let refinedPeriodSamples = initialPeriodSamples;
  let refinedOrigin = anchorSample;

  if (detectedPairs.length >= 4) {
    let slope = initialPeriodSamples;
    let intercept = anchorSample;
    for (let pass = 0; pass < 3; pass++) {
      const residuals = detectedPairs.map((p) =>
        Math.abs(p.sample - (intercept + p.idx * slope))
      );
      const sortedRes = [...residuals].sort((a, b) => a - b);
      const mad = sortedRes[Math.floor(sortedRes.length / 2)] || 1;
      const cutoff = Math.max(sampleRate * 0.004, mad * 2.4);

      let sumW = 0;
      let sumX = 0;
      let sumY = 0;
      let sumXX = 0;
      let sumXY = 0;
      for (let i = 0; i < detectedPairs.length; i++) {
        if (pass > 0 && residuals[i] > cutoff) continue;
        const x = detectedPairs[i].idx;
        const y = detectedPairs[i].sample;
        sumW += 1;
        sumX += x;
        sumY += y;
        sumXX += x * x;
        sumXY += x * y;
      }
      const denom = sumW * sumXX - sumX * sumX;
      if (sumW >= 4 && Math.abs(denom) > 1e-6) {
        const nextSlope = (sumW * sumXY - sumX * sumY) / denom;
        const nextIntercept = (sumY - nextSlope * sumX) / sumW;
        if (Math.abs(nextSlope - initialPeriodSamples) <= initialPeriodSamples * 0.015) {
          slope = nextSlope;
          intercept = nextIntercept;
        }
      }
    }
    refinedPeriodSamples = slope;
    refinedOrigin = intercept;
  }

  const finalBpm = Math.max(
    minBpm,
    Math.min(maxBpm, (sampleRate * 60) / refinedPeriodSamples)
  );
  const roundedBpm = Math.round(finalBpm * 10) / 10;

  let minBeatIdx = Math.ceil(-refinedOrigin / refinedPeriodSamples);
  while (refinedOrigin + (minBeatIdx - 1) * refinedPeriodSamples >= 0) {
    minBeatIdx--;
  }
  while (refinedOrigin + minBeatIdx * refinedPeriodSamples < 0) {
    minBeatIdx++;
  }

  // Snap every beat tick right onto the beginning of the kick attack within ±6 ms
  const fineRadius = Math.min(
    Math.round(refinedPeriodSamples * 0.14),
    Math.max(24, Math.round(sampleRate * 0.006))
  );
  const beatSamples: number[] = [];
  const kickSamples: number[] = [];
  for (let idx = minBeatIdx; ; idx++) {
    const pos = refinedOrigin + idx * refinedPeriodSamples;
    const s = Math.round(pos);
    if (s >= total) break;
    beatSamples.push(s);

    const exactAttack = findKickAttackStart(s, false, fineRadius);
    kickSamples.push(exactAttack !== null ? exactAttack : s);
  }

  const ratio = primaryWin.avg > 0 ? bestCombScore / primaryWin.avg : 0;
  const confidence = Math.max(0, Math.min(1, (ratio - 1) / 4));

  return {
    bpm: roundedBpm,
    confidence,
    firstBeatSample: beatSamples[0] ?? 0,
    beatSamples,
    kickSamples,
  };
}

/**
 * Computes left/right playback mute gains from channel count and G/D checkbox flags.
 */
export function computeChannelMuteGains(
  channelCount: number,
  enabledChannels: [boolean, boolean]
): [number, number] {
  if (channelCount <= 1) {
    const g = enabledChannels[0] ? 1 : 0;
    return [g, g];
  }
  return [enabledChannels[0] ? 1 : 0, enabledChannels[1] ? 1 : 0];
}

/**
 * Reverses audio samples in [startSample, endSample) for reverse playback.
 */
export function reverseChannelsRange(
  channels: Float32Array[],
  startSample: number,
  endSample: number
): Float32Array[] {
  const total = channels[0]?.length ?? 0;
  const safeStart = Math.max(0, Math.min(total, Math.floor(startSample)));
  const safeEnd = Math.max(safeStart, Math.min(total, Math.floor(endSample)));
  const len = safeEnd - safeStart;
  return channels.map((ch) => {
    const out = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      out[i] = ch[safeEnd - 1 - i];
    }
    return out;
  });
}

/**
 * Computes playhead sample position for forward, looped, or reverse playback.
 */
export function computePlaybackSamplePosition(params: {
  isReverse: boolean;
  isLooping: boolean;
  startSample: number;
  endSample: number;
  playedSamples: number;
}): number {
  const { isReverse, isLooping, startSample, endSample, playedSamples } = params;
  const segLen = Math.max(1, endSample - startSample);
  if (isReverse) {
    if (isLooping) {
      return endSample - (playedSamples % segLen);
    }
    return Math.max(startSample, endSample - playedSamples);
  }
  if (isLooping) {
    return startSample + (playedSamples % segLen);
  }
  return Math.min(endSample, startSample + playedSamples);
}

