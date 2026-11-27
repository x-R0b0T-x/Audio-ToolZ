export const IMAGER_BAND_COUNT = 4;
export const IMAGER_MAX_STEREOIZE_GAIN = 0.5;
export const DEFAULT_IMAGER = { widths: [0, 0, 0, 0], crossovers: [120, 1000, 5000], stereoize: 0, mode: 'I', delayMs: 6 };
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ALLPASS_MS = [0.9, 1.7, 2.9, 4.3];
const ALLPASS_G = 0.6;

export function normalizeImager(s) {
  const widths = Array.from({ length: IMAGER_BAND_COUNT }, (_, i) => clamp(Number(s?.widths?.[i] ?? 0), -100, 100));
  const crossovers = Array.from({ length: IMAGER_BAND_COUNT - 1 }, (_, i) => clamp(Number(s?.crossovers?.[i] ?? DEFAULT_IMAGER.crossovers[i]), 20, 20000));
  for (let i = 1; i < crossovers.length; i++) crossovers[i] = Math.max(crossovers[i], crossovers[i - 1] * 1.25);
  return {
    widths, crossovers,
    stereoize: clamp(Number(s?.stereoize ?? 0), 0, 100),
    mode: s?.mode === 'II' ? 'II' : 'I',
    delayMs: clamp(Number(s?.delayMs ?? 6), 0.5, 30),
  };
}

export function isImagerNeutral(s) {
  const n = normalizeImager(s);
  return n.stereoize <= 0 && n.widths.every((w) => w === 0);
}

export function imagerOutputChannels(inputChannels, s) {
  const n = normalizeImager(s);
  return inputChannels === 1 && n.stereoize > 0 ? 2 : inputChannels;
}

function lowpassCoefficients(freq, sampleRate) {
  const f = clamp(freq, 10, sampleRate * 0.45);
  const w0 = 2 * Math.PI * f / sampleRate, cos = Math.cos(w0), alpha = Math.sin(w0) / (2 * Math.SQRT1_2);
  const a0 = 1 + alpha;
  return { b0: (1 - cos) / 2 / a0, b1: (1 - cos) / a0, b2: (1 - cos) / 2 / a0, a1: -2 * cos / a0, a2: (1 - alpha) / a0 };
}

function biquadPass(input, c) {
  const out = new Float64Array(input.length);
  let a1 = 0, a2 = 0;
  for (let i = 0; i < input.length; i++) {
    const x = input[i], y = c.b0 * x + a1;
    a1 = c.b1 * x - c.a1 * y + a2; a2 = c.b2 * x - c.a2 * y;
    out[i] = y;
  }
  return out;
}

function lowpassZeroPhase(input, freq, sampleRate) {
  const c = lowpassCoefficients(freq, sampleRate);
  const forward = biquadPass(input, c), reversed = forward.reverse(), back = biquadPass(reversed, c);
  return back.reverse();
}

export function splitBands(input, sampleRate, crossovers) {
  const bands = [];
  let rest = Float64Array.from(input);
  for (const f of crossovers) {
    const low = lowpassZeroPhase(rest, f, sampleRate), next = new Float64Array(rest.length);
    for (let i = 0; i < rest.length; i++) next[i] = rest[i] - low[i];
    bands.push(low); rest = next;
  }
  bands.push(rest);
  return bands;
}

function delayed(input, samples) {
  const out = new Float64Array(input.length), d = Math.max(0, Math.round(samples));
  for (let i = d; i < input.length; i++) out[i] = input[i - d];
  return out;
}

function decorrelated(input, sampleRate) {
  let signal = input;
  for (const ms of ALLPASS_MS) {
    const d = Math.max(1, Math.round(ms * sampleRate / 1000)), out = new Float64Array(signal.length);
    for (let i = 0; i < signal.length; i++) {
      const xd = i >= d ? signal[i - d] : 0, yd = i >= d ? out[i - d] : 0;
      out[i] = -ALLPASS_G * signal[i] + xd + ALLPASS_G * yd;
    }
    signal = out;
  }
  return signal;
}

export function applyImager(source, sampleRate, settings) {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Fréquence audio invalide.');
  const s = normalizeImager(settings);
  const outChannels = imagerOutputChannels(source.length, s);
  if (isImagerNeutral(s) || source.length === 0 || (source.length === 1 && outChannels === 1)) return source.map((c) => new Float32Array(c));
  const length = source[0].length;
  const left = source[0], right = source[1] ?? source[0];
  const bandsL = splitBands(left, sampleRate, s.crossovers), bandsR = splitBands(right, sampleRate, s.crossovers);
  const outL = new Float64Array(length), outR = new Float64Array(length), highMid = new Float64Array(length);
  for (let b = 0; b < IMAGER_BAND_COUNT; b++) {
    const gain = 1 + s.widths[b] / 100;
    for (let i = 0; i < length; i++) {
      const m = (bandsL[b][i] + bandsR[b][i]) / 2, side = (bandsL[b][i] - bandsR[b][i]) / 2;
      outL[i] += m + gain * side; outR[i] += m - gain * side;
      if (b > 0) highMid[i] += m;
    }
  }
  if (s.stereoize > 0) {
    const amount = s.stereoize / 100 * IMAGER_MAX_STEREOIZE_GAIN;
    const injected = s.mode === 'II' ? decorrelated(highMid, sampleRate) : delayed(highMid, s.delayMs * sampleRate / 1000);
    for (let i = 0; i < length; i++) { outL[i] += amount * injected[i]; outR[i] -= amount * injected[i]; }
  }
  return [outL, outR].slice(0, outChannels).map((channel) => {
    const out = new Float32Array(length);
    for (let i = 0; i < length; i++) out[i] = clamp(channel[i], -1, 1);
    return out;
  });
}

export function renderImagerWindow(source, sampleRate, settings, from, to) {
  const total = source[0]?.length ?? 0;
  const s = normalizeImager(settings);
  const a = clamp(Math.floor(from), 0, total), b = clamp(Math.ceil(to), a, total);
  const channels = imagerOutputChannels(source.length, s);
  const out = Array.from({ length: channels }, (_, c) => new Float32Array(source[Math.min(c, source.length - 1)]));
  if (b <= a || isImagerNeutral(s)) return out;
  const lead = Math.max(0, a - Math.round(sampleRate * 2)), tail = Math.min(total, b + Math.round(sampleRate * 1));
  const wet = applyImager(source.map((c) => c.subarray(lead, tail)), sampleRate, s);
  const fade = Math.max(1, Math.min(Math.round(sampleRate * 0.02), (b - a) >> 1));
  for (let c = 0; c < out.length; c++) {
    const dry = source[Math.min(c, source.length - 1)];
    for (let i = a; i < b; i++) {
      let w = 1;
      if (a > 0 && i < a + fade) w = Math.min(w, (i - a) / fade);
      if (b < total && i > b - fade) w = Math.min(w, (b - i) / fade);
      out[c][i] = dry[i] * (1 - w) + wet[c][i - lead] * w;
    }
  }
  return out;
}

export function stereoCorrelation(left, right, from = 0, to = left.length) {
  let ll = 0, rr = 0, lr = 0;
  for (let i = Math.max(0, from); i < Math.min(to, left.length); i++) { ll += left[i] * left[i]; rr += right[i] * right[i]; lr += left[i] * right[i]; }
  const d = Math.sqrt(ll * rr);
  return d > 1e-12 ? clamp(lr / d, -1, 1) : 1;
}
