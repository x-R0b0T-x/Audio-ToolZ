export type DelayMode = 'mono' | 'stereo' | 'ping-pong' | 'off';
export const DELAY_DIVISIONS = [32, 16, 8, 4, 2, 1].flatMap((denominator) => [
  { label: `1/${denominator} triolet`, beats: 4 / denominator * 2 / 3 },
  { label: `1/${denominator} droite`, beats: 4 / denominator },
  { label: `1/${denominator} pointée`, beats: 4 / denominator * 1.5 },
]).sort((a, b) => a.beats - b.beats);
export const DEFAULT_DIVISION = DELAY_DIVISIONS.findIndex((d) => d.label === '1/8 droite');

export function applyMusicalDelay(channels: Float32Array[], sampleRate: number, bpm: number,
  division: number, mode: DelayMode, repetitions: number, wetPercent = 35,
  startChannel: 0 | 1 = 0): Float32Array[] {
  const out = channels.map((c) => new Float32Array(c));
  const count = Math.max(0, Math.min(16, Math.round(repetitions)));
  const wet = Math.max(0, Math.min(100, wetPercent)) / 100;
  if (!count || !wet || mode === 'off' || !channels.length) return out;
  if (!Number.isFinite(bpm) || bpm <= 0 || !Number.isFinite(sampleRate) || sampleRate <= 0) {
    throw new Error('Un BPM détecté et une fréquence audio valides sont nécessaires.');
  }
  const step = DELAY_DIVISIONS[division];
  if (!step) throw new Error('Division musicale invalide.');
  const delay = Math.max(1, Math.round(sampleRate * 60 / bpm * step.beats));
  const length = channels[0].length;
  if (channels.some((c) => c.length !== length)) throw new Error('Canaux de longueurs différentes.');
  // A mono source needs two output channels for a genuine left/right ping-pong.
  if (mode === 'ping-pong' && out.length === 1) out.push(new Float32Array(channels[0]));
  const stereo = channels.length >= 2;
  for (let repeat = 1; repeat <= count; repeat++) {
    const offset = delay * repeat;
    if (offset >= length) break;
    const gain = wet * Math.pow(0.5, repeat - 1);
    const destination = (startChannel + repeat - 1) % 2;
    for (let c = 0; c < out.length; c++) {
      if (mode === 'ping-pong' && c !== destination) continue;
      for (let i = offset; i < length; i++) {
        const j = i - offset;
        const source = mode !== 'stereo' && c < 2
          ? stereo ? (channels[0][j] + channels[1][j]) * 0.5 : channels[0][j]
          : (channels[c] ?? channels[0])[j];
        out[c][i] += source * gain;
      }
    }
  }
  for (const channel of out) for (let i = 0; i < channel.length; i++) channel[i] = Math.max(-1, Math.min(1, channel[i]));
  return out;
}
