export type DelayMode = 'mono' | 'stereo' | 'ping-pong';
export const DELAY_DIVISIONS = [32, 16, 8, 4, 2, 1].flatMap((denominator) => [
  { label: `1/${denominator} triolet`, beats: 4 / denominator * 2 / 3 },
  { label: `1/${denominator} droite`, beats: 4 / denominator },
  { label: `1/${denominator} pointée`, beats: 4 / denominator * 1.5 },
]).sort((a, b) => a.beats - b.beats);
export const DEFAULT_DIVISION = DELAY_DIVISIONS.findIndex((d) => d.label === '1/8 droite');

// Finite taps: N means exactly N delayed copies, never an infinite feedback tail.
// Keep the channel count, dry signal, selection boundaries and document length unchanged.
export function applyMusicalDelay(channels: Float32Array[], sampleRate: number, bpm: number,
  division: number, mode: DelayMode, repetitions: number): Float32Array[] {
  const out = channels.map((c) => new Float32Array(c));
  const count = Math.max(0, Math.min(16, Math.round(repetitions)));
  if (!count) return out;
  if (!Number.isFinite(bpm) || bpm <= 0) throw new Error('Détectez le BPM avant de régler le délai.');
  const step = DELAY_DIVISIONS[division];
  if (!step) throw new Error('Division musicale invalide.');
  const delay = Math.max(1, Math.round(sampleRate * 60 / bpm * step.beats));
  const length = channels[0]?.length ?? 0;
  const stereo = channels.length >= 2;
  for (let repeat = 1; repeat <= count; repeat++) {
    const offset = delay * repeat;
    if (offset >= length) break;
    const gain = 0.35 * Math.pow(0.5, repeat - 1);
    for (let c = 0; c < channels.length; c++) {
      if (mode === 'ping-pong' && stereo && c < 2 && c !== (repeat - 1) % 2) continue;
      for (let i = offset; i < length; i++) {
        const j = i - offset;
        const source = mode !== 'stereo' && stereo && c < 2
          ? (channels[0][j] + channels[1][j]) * 0.5 : channels[c][j];
        out[c][i] += source * gain;
      }
    }
  }
  for (const channel of out) for (let i = 0; i < channel.length; i++) channel[i] = Math.max(-1, Math.min(1, channel[i]));
  return out;
}
