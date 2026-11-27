export type ModulationSettings = { kind: 'chorus' | 'flanger'; rateHz: number; depth: number; delayMs: number; feedback: number; voices: number; spread: number; mix: number; throughZero: boolean };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export function delayRangeMs(s: ModulationSettings): [number, number] {
  const depth = clamp(s.depth, 0, 1);
  if (s.kind === 'chorus') { const m = s.delayMs * .5 * depth; return [Math.max(.1, s.delayMs - m), s.delayMs + m]; }
  return [Math.max(.02, s.delayMs * (1 - depth)), s.delayMs * (1 + depth)];
}
export function applyModulation(source: Float32Array[], sampleRate: number, s: ModulationSettings): Float32Array[] {
  if (!Number.isFinite(sampleRate) || sampleRate <= 0) throw new Error('Fréquence audio invalide.');
  if (![s.rateHz, s.depth, s.delayMs, s.feedback, s.voices, s.spread, s.mix].every(Number.isFinite)) throw new Error('Paramètre de modulation invalide.');
  const mix = clamp(s.mix, 0, 1);
  if (mix <= 0) return source.map(c => new Float32Array(c));
  const [lo, hi] = delayRangeMs(s), depth = clamp(s.depth, 0, 1);
  const voices = s.kind === 'chorus' ? clamp(Math.round(s.voices), 1, 4) : 1, fb = s.kind === 'flanger' ? clamp(s.feedback, -.95, .95) : 0;
  const samplesPerMs = sampleRate / 1000, size = Math.ceil(hi * samplesPerMs) + 4, center = Math.round(s.delayMs * samplesPerMs);
  const tz = s.kind === 'flanger' && s.throughZero, dryRing = tz ? center + 1 : 1, cycle = clamp(s.rateHz, 0, 40) / sampleRate;
  return source.map((input, channel) => {
    const out = new Float32Array(input.length), line = new Float32Array(size), dry = new Float32Array(dryRing);
    const offset = channel === 0 ? 0 : clamp(s.spread, 0, 1) * .5;
    let write = 0, dryWrite = 0, previousWet = 0;
    for (let i = 0; i < input.length; i++) {
      const x = input[i];
      line[write] = x + fb * previousWet;
      let wet = 0;
      for (let v = 0; v < voices; v++) {
        const phase = (((i * cycle + offset + v / voices) % 1) + 1) % 1, lfo = Math.sin(phase * 2 * Math.PI);
        const ms = s.kind === 'chorus' ? s.delayMs * (1 + .5 * depth * lfo) : s.delayMs * (1 + depth * lfo);
        const pos = write - clamp(ms, lo, hi) * samplesPerMs, i0 = Math.floor(pos), frac = pos - i0;
        const a = ((i0 % size) + size) % size, b = (a + 1) % size;
        wet += line[a] * (1 - frac) + line[b] * frac;
      }
      wet /= voices; previousWet = wet;
      dry[dryWrite] = x;
      const dryOut = tz ? dry[(dryWrite - center + dryRing) % dryRing] : x;
      dryWrite = (dryWrite + 1) % dryRing;
      out[i] = clamp(dryOut * (1 - mix) + wet * mix, -1, 1);
      write = (write + 1) % size;
    }
    return out;
  });
}
