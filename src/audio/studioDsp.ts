import { clampSelection, cloneChannels, dbToLinear } from './dsp';

export interface EqBandConfig {
  type: 'lowshelf' | 'peaking' | 'highshelf';
  frequency: number;
  gainDb: number;
  q?: number;
}

export interface BiquadCoefficients {
  b0: number;
  b1: number;
  b2: number;
  a1: number;
  a2: number;
}

export interface CompressorAutoGainParams {
  thresholdDb: number;
  ratio: number;
  attackMs: number;
  releaseMs: number;
  makeupGainDb?: number;
  autoGain?: boolean;
  targetPeakDb?: number;
}

export interface NoiseProfile {
  fftSize: number;
  sampleRate: number;
  magnitudes: Float32Array;
}

export interface SpectralNoiseReductionParams {
  reductionDb: number;
  sensitivity?: number;
  smoothing?: number;
}

export interface EchoDelayParams {
  delayMs: number;
  feedback: number;
  mix: number;
}

export interface MixPasteParams {
  baseGainDb?: number;
  mixGainDb?: number;
  crossfadeMs?: number;
}

export function computeBiquadCoefficients(
  kind: 'lowshelf' | 'peaking' | 'highshelf' | 'lowpass' | 'highpass' | 'notch',
  sampleRate: number,
  frequency: number,
  q = 0.707,
  gainDb = 0
): BiquadCoefficients {
  const safeRate = Math.max(8000, sampleRate);
  const clampedFreq = Math.max(10, Math.min(safeRate * 0.45, frequency));
  const safeQ = Math.max(0.1, Math.min(24, q));
  const w0 = (2 * Math.PI * clampedFreq) / safeRate;
  const cosW0 = Math.cos(w0);
  const sinW0 = Math.sin(w0);
  const alpha = sinW0 / (2 * safeQ);
  const A = Math.pow(10, gainDb / 40);

  let b0 = 1;
  let b1 = 0;
  let b2 = 0;
  let a0 = 1;
  let a1 = 0;
  let a2 = 0;

  if (kind === 'lowpass') {
    b0 = (1 - cosW0) / 2;
    b1 = 1 - cosW0;
    b2 = (1 - cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (kind === 'highpass') {
    b0 = (1 + cosW0) / 2;
    b1 = -(1 + cosW0);
    b2 = (1 + cosW0) / 2;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (kind === 'notch') {
    b0 = 1;
    b1 = -2 * cosW0;
    b2 = 1;
    a0 = 1 + alpha;
    a1 = -2 * cosW0;
    a2 = 1 - alpha;
  } else if (kind === 'peaking') {
    b0 = 1 + alpha * A;
    b1 = -2 * cosW0;
    b2 = 1 - alpha * A;
    a0 = 1 + alpha / A;
    a1 = -2 * cosW0;
    a2 = 1 - alpha / A;
  } else if (kind === 'lowshelf') {
    const beta = 2 * Math.sqrt(A) * alpha;
    b0 = A * (A + 1 - (A - 1) * cosW0 + beta);
    b1 = 2 * A * (A - 1 - (A + 1) * cosW0);
    b2 = A * (A + 1 - (A - 1) * cosW0 - beta);
    a0 = A + 1 + (A - 1) * cosW0 + beta;
    a1 = -2 * (A - 1 + (A + 1) * cosW0);
    a2 = A + 1 + (A - 1) * cosW0 - beta;
  } else {
    const beta = 2 * Math.sqrt(A) * alpha;
    b0 = A * (A + 1 + (A - 1) * cosW0 + beta);
    b1 = -2 * A * (A - 1 + (A + 1) * cosW0);
    b2 = A * (A + 1 + (A - 1) * cosW0 - beta);
    a0 = A + 1 - (A - 1) * cosW0 + beta;
    a1 = 2 * (A - 1 - (A + 1) * cosW0);
    a2 = A + 1 - (A - 1) * cosW0 - beta;
  }

  return {
    b0: b0 / a0,
    b1: b1 / a0,
    b2: b2 / a0,
    a1: a1 / a0,
    a2: a2 / a0,
  };
}

function runBiquadOnRange(
  channel: Float32Array,
  start: number,
  end: number,
  c: BiquadCoefficients
): void {
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = start; i < end; i++) {
    const x0 = channel[i];
    const y0 = c.b0 * x0 + c.b1 * x1 + c.b2 * x2 - c.a1 * y1 - c.a2 * y2;
    x2 = x1;
    x1 = x0;
    y2 = y1;
    y1 = y0;
    channel[i] = Math.max(-1.0, Math.min(1.0, y0));
  }
}

export function applyParametricEq(
  channels: Float32Array[],
  sampleRate: number,
  startSample: number,
  endSample: number,
  bands: EqBandConfig[]
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : total;

  for (const band of bands) {
    if (Math.abs(band.gainDb) < 0.05) continue;
    const coeffs = computeBiquadCoefficients(
      band.type,
      sampleRate,
      band.frequency,
      band.q ?? 0.9,
      band.gainDb
    );
    for (let ch = 0; ch < out.length; ch++) {
      runBiquadOnRange(out[ch], rangeStart, rangeEnd, coeffs);
    }
  }
  return out;
}

export function applyFrequencyFilter(
  channels: Float32Array[],
  sampleRate: number,
  startSample: number,
  endSample: number,
  kind: 'lowpass' | 'highpass' | 'notch',
  frequency: number,
  q = 0.707
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : total;
  const coeffs = computeBiquadCoefficients(kind, sampleRate, frequency, q, 0);

  for (let ch = 0; ch < out.length; ch++) {
    runBiquadOnRange(out[ch], rangeStart, rangeEnd, coeffs);
  }
  return out;
}

export function applyCompressorAutoGain(
  channels: Float32Array[],
  sampleRate: number,
  startSample: number,
  endSample: number,
  params: CompressorAutoGainParams
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : total;
  if (rangeEnd <= rangeStart || out.length === 0) return out;

  const thresholdLin = dbToLinear(params.thresholdDb);
  const ratio = Math.max(1, params.ratio);
  const attackCoeff = Math.exp(-1 / Math.max(1, (params.attackMs / 1000) * sampleRate));
  const releaseCoeff = Math.exp(-1 / Math.max(1, (params.releaseMs / 1000) * sampleRate));
  const manualMakeup = dbToLinear(params.makeupGainDb ?? 0);

  let env = 0;
  let postPeak = 0;

  for (let i = rangeStart; i < rangeEnd; i++) {
    let level = 0;
    for (let c = 0; c < out.length; c++) {
      const absVal = Math.abs(out[c][i]);
      if (absVal > level) level = absVal;
    }

    const coeff = level > env ? attackCoeff : releaseCoeff;
    env = coeff * env + (1 - coeff) * level;

    let gain = 1;
    if (env > thresholdLin && env > 1e-9) {
      const envDb = 20 * Math.log10(env);
      const overDb = envDb - params.thresholdDb;
      const compressedDb = params.thresholdDb + overDb / ratio;
      gain = dbToLinear(compressedDb - envDb);
    }

    for (let c = 0; c < out.length; c++) {
      const sample = out[c][i] * gain * manualMakeup;
      out[c][i] = sample;
      const absPost = Math.abs(sample);
      if (absPost > postPeak) postPeak = absPost;
    }
  }

  if (params.autoGain && postPeak > 1e-6) {
    const targetLin = dbToLinear(params.targetPeakDb ?? -1.0);
    const autoScale = Math.min(8, targetLin / postPeak);
    for (let c = 0; c < out.length; c++) {
      for (let i = rangeStart; i < rangeEnd; i++) {
        out[c][i] = Math.max(-1.0, Math.min(1.0, out[c][i] * autoScale));
      }
    }
  } else {
    for (let c = 0; c < out.length; c++) {
      for (let i = rangeStart; i < rangeEnd; i++) {
        out[c][i] = Math.max(-1.0, Math.min(1.0, out[c][i]));
      }
    }
  }

  return out;
}

function fftRadix2(real: Float32Array, imag: Float32Array, inverse: boolean): void {
  const n = real.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) {
      j ^= bit;
    }
    j ^= bit;
    if (i < j) {
      const tr = real[i];
      real[i] = real[j];
      real[j] = tr;
      const ti = imag[i];
      imag[i] = imag[j];
      imag[j] = ti;
    }
  }

  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wLenCos = Math.cos(ang);
    const wLenSin = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wCos = 1;
      let wSin = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const uR = real[i + j];
        const uI = imag[i + j];
        const vR = real[i + j + half] * wCos - imag[i + j + half] * wSin;
        const vI = real[i + j + half] * wSin + imag[i + j + half] * wCos;
        real[i + j] = uR + vR;
        imag[i + j] = uI + vI;
        real[i + j + half] = uR - vR;
        imag[i + j + half] = uI - vI;
        const nextCos = wCos * wLenCos - wSin * wLenSin;
        wSin = wCos * wLenSin + wSin * wLenCos;
        wCos = nextCos;
      }
    }
  }

  if (inverse) {
    for (let i = 0; i < n; i++) {
      real[i] /= n;
      imag[i] /= n;
    }
  }
}

function buildHannWindow(size: number): Float32Array {
  const win = new Float32Array(size);
  for (let i = 0; i < size; i++) {
    win[i] = 0.5 * (1 - Math.cos((2 * Math.PI * i) / (size - 1)));
  }
  return win;
}

export function captureNoiseProfile(
  channels: Float32Array[],
  sampleRate: number,
  startSample: number,
  endSample: number,
  fftSize = 1024
): NoiseProfile {
  const total = channels[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : Math.min(total, fftSize * 4);

  const magnitudes = new Float32Array(fftSize);
  const hann = buildHannWindow(fftSize);
  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const hop = fftSize >> 1;
  let frameCount = 0;

  for (let c = 0; c < channels.length; c++) {
    const ch = channels[c];
    for (let pos = rangeStart; pos + fftSize <= rangeEnd; pos += hop) {
      for (let i = 0; i < fftSize; i++) {
        real[i] = ch[pos + i] * hann[i];
        imag[i] = 0;
      }
      fftRadix2(real, imag, false);
      for (let k = 0; k < fftSize; k++) {
        magnitudes[k] += Math.hypot(real[k], imag[k]);
      }
      frameCount++;
    }
  }

  if (frameCount > 0) {
    for (let k = 0; k < fftSize; k++) {
      magnitudes[k] /= frameCount;
    }
  } else if (rangeEnd > rangeStart && channels[0]) {
    real.fill(0);
    imag.fill(0);
    const len = Math.min(fftSize, rangeEnd - rangeStart);
    for (let i = 0; i < len; i++) {
      real[i] = channels[0][rangeStart + i] * hann[i];
    }
    fftRadix2(real, imag, false);
    for (let k = 0; k < fftSize; k++) {
      magnitudes[k] = Math.hypot(real[k], imag[k]);
    }
  }

  return { fftSize, sampleRate, magnitudes };
}

export function applySpectralNoiseReduction(
  channels: Float32Array[],
  startSample: number,
  endSample: number,
  profile: NoiseProfile,
  params: SpectralNoiseReductionParams
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : total;
  const len = rangeEnd - rangeStart;
  const fftSize = profile.fftSize;
  if (len < fftSize) return out;

  const hop = fftSize >> 1;
  const hann = buildHannWindow(fftSize);
  const floorGain = dbToLinear(-Math.abs(params.reductionDb));
  const sensitivity = Math.max(0.2, Math.min(3.0, params.sensitivity ?? 1.0));
  const smoothing = Math.max(0, Math.min(0.9, params.smoothing ?? 0.35));

  const real = new Float32Array(fftSize);
  const imag = new Float32Array(fftSize);
  const prevGains = new Float32Array(fftSize).fill(1);

  for (let c = 0; c < out.length; c++) {
    const src = out[c].subarray(rangeStart, rangeEnd);
    const accum = new Float32Array(len);
    const norm = new Float32Array(len);

    for (let pos = 0; pos + fftSize <= len; pos += hop) {
      for (let i = 0; i < fftSize; i++) {
        real[i] = src[pos + i] * hann[i];
        imag[i] = 0;
      }
      fftRadix2(real, imag, false);

      for (let k = 0; k < fftSize; k++) {
        const mag = Math.hypot(real[k], imag[k]);
        const noiseMag = profile.magnitudes[k] * sensitivity;
        let targetGain = 1.0;
        if (mag > 1e-9 && noiseMag > 0) {
          const snrRatio = (mag - noiseMag) / mag;
          targetGain = Math.max(floorGain, Math.min(1.0, snrRatio));
        } else if (noiseMag > 0) {
          targetGain = floorGain;
        }
        const gain = smoothing * prevGains[k] + (1 - smoothing) * targetGain;
        prevGains[k] = gain;
        real[k] *= gain;
        imag[k] *= gain;
      }

      fftRadix2(real, imag, true);
      for (let i = 0; i < fftSize; i++) {
        accum[pos + i] += real[i] * hann[i];
        norm[pos + i] += hann[i] * hann[i];
      }
    }

    for (let i = 0; i < len; i++) {
      if (norm[i] > 1e-6) {
        out[c][rangeStart + i] = Math.max(-1.0, Math.min(1.0, accum[i] / norm[i]));
      }
    }
  }

  return out;
}

export function applyEchoDelay(
  channels: Float32Array[],
  sampleRate: number,
  startSample: number,
  endSample: number,
  params: EchoDelayParams
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : total;
  const delaySamples = Math.max(1, Math.round((params.delayMs / 1000) * sampleRate));
  const feedback = Math.max(0, Math.min(0.92, params.feedback));
  const mix = Math.max(0, Math.min(1, params.mix));

  for (let c = 0; c < out.length; c++) {
    const ch = out[c];
    const delayBuf = new Float32Array(delaySamples);
    let writeIdx = 0;

    for (let i = rangeStart; i < rangeEnd; i++) {
      const dry = ch[i];
      const delayed = delayBuf[writeIdx];
      delayBuf[writeIdx] = dry + delayed * feedback;
      writeIdx = (writeIdx + 1) % delaySamples;
      const wet = dry * (1 - mix * 0.5) + delayed * mix;
      ch[i] = Math.max(-1.0, Math.min(1.0, wet));
    }
  }

  return out;
}

export function mixPasteAt(
  channels: Float32Array[],
  clipboard: Float32Array[],
  sampleRate: number,
  targetStartSample: number,
  params: MixPasteParams = {}
): { channels: Float32Array[]; endSample: number } {
  const clipLen = clipboard[0]?.length ?? 0;
  if (clipLen === 0) {
    return { channels: cloneChannels(channels), endSample: targetStartSample };
  }

  const baseGain = dbToLinear(params.baseGainDb ?? 0);
  const mixGain = dbToLinear(params.mixGainDb ?? 0);
  const fadeSamples = Math.min(
    Math.floor(clipLen / 2),
    Math.max(0, Math.round(((params.crossfadeMs ?? 12) / 1000) * sampleRate))
  );

  const channelCount = Math.max(channels.length, clipboard.length);
  const currentLen = channels[0]?.length ?? 0;
  const start = Math.max(0, Math.min(currentLen, targetStartSample));
  const outLen = Math.max(currentLen, start + clipLen);

  const out: Float32Array[] = [];
  for (let c = 0; c < channelCount; c++) {
    const dest = new Float32Array(outLen);
    const srcBase = channels[c] ?? channels[0];
    if (srcBase) dest.set(srcBase, 0);

    const srcClip = clipboard[c] ?? clipboard[0];
    if (srcClip) {
      for (let i = 0; i < clipLen; i++) {
        let env = 1;
        if (fadeSamples > 0) {
          if (i < fadeSamples) env = i / fadeSamples;
          else if (i >= clipLen - fadeSamples) env = (clipLen - 1 - i) / fadeSamples;
        }
        const idx = start + i;
        const mixed = dest[idx] * baseGain + srcClip[i] * mixGain * env;
        dest[idx] = Math.max(-1.0, Math.min(1.0, mixed));
      }
    }
    out.push(dest);
  }

  return { channels: out, endSample: start + clipLen };
}

export function invertPhase(
  channels: Float32Array[],
  startSample: number,
  endSample: number
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const { startSample: s, endSample: e } = clampSelection({ startSample, endSample }, total);
  const rangeStart = e > s ? s : 0;
  const rangeEnd = e > s ? e : total;
  for (let c = 0; c < out.length; c++) {
    for (let i = rangeStart; i < rangeEnd; i++) {
      out[c][i] = -out[c][i];
    }
  }
  return out;
}

export function swapStereoChannels(channels: Float32Array[]): Float32Array[] {
  if (channels.length < 2) return cloneChannels(channels);
  return [
    new Float32Array(channels[1]),
    new Float32Array(channels[0]),
    ...channels.slice(2).map((c) => new Float32Array(c)),
  ];
}

export function removeDcOffset(
  channels: Float32Array[],
  startSample = 0,
  endSample?: number
): Float32Array[] {
  const out = cloneChannels(channels);
  const total = out[0]?.length ?? 0;
  const s = Math.max(0, Math.min(total, startSample));
  const e = endSample !== undefined ? Math.max(s, Math.min(total, endSample)) : total;
  const len = e - s;
  if (len <= 0) return out;

  for (let c = 0; c < out.length; c++) {
    let sum = 0;
    for (let i = s; i < e; i++) sum += out[c][i];
    const mean = sum / len;
    if (Math.abs(mean) < 1e-7) continue;
    for (let i = s; i < e; i++) {
      out[c][i] = Math.max(-1.0, Math.min(1.0, out[c][i] - mean));
    }
  }
  return out;
}
