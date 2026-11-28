export type TransientSettings = { attack: number; sustain: number; sensitivity: number; inputDb: number; outputDb: number; mix: number; autoGain: boolean; linked: boolean; listen: boolean };
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
const MAX_DB = 12, DEAD_ZONE_DB = 1;
export const isTransientNeutral = (s: TransientSettings) => Math.abs(s.attack) < 1e-9 && Math.abs(s.sustain) < 1e-9 && Math.abs(s.inputDb + s.outputDb) < 1e-9;
export function applyTransient(source: Float32Array[], rate: number, s: TransientSettings): Float32Array[] {
  if (!Number.isFinite(rate) || rate <= 0) throw new Error('Fréquence audio invalide.');
  if (![s.attack, s.sustain, s.sensitivity, s.inputDb, s.outputDb, s.mix].every(Number.isFinite)) throw new Error('Paramètre de transitoires invalide.');
  const count = source.length, n = source[0]?.length ?? 0, out = source.map(() => new Float32Array(n));
  if (!n) return out;
  const att = clamp(s.attack, -1, 1), sus = clamp(s.sustain, -1, 1), range = 12 - 9 * clamp(s.sensitivity, 0, 1), mix = clamp(s.mix, 0, 1);
  const gIn = 10 ** (clamp(s.inputDb, -24, 24) / 20), gOut = 10 ** (clamp(s.outputDb, -24, 24) / 20);
  const coef = (tau: number) => Math.exp(-1 / (tau * rate));
  const fastUp = coef(.0005), fastDown = coef(.03), slowUp = coef(.03), slowDown = coef(.3), gainUp = coef(.0005), gainDown = coef(.008), power = coef(.5);
  const K = s.linked ? 1 : count;
  const fast = new Float64Array(K), slow = new Float64Array(K), gdb = new Float64Array(K), gains = new Float64Array(K).fill(1), pin = new Float64Array(count), pout = new Float64Array(count);
  for (let i = 0; i < n; i++) {
    let linkedDet = 0;
    if (s.linked) for (let c = 0; c < count; c++) { const v = Math.abs(source[c][i] * gIn); if (v > linkedDet) linkedDet = v; }
    for (let k = 0; k < K; k++) {
      const det = s.linked ? linkedDet : Math.abs(source[k][i] * gIn);
      fast[k] = det > fast[k] ? det + (fast[k] - det) * fastUp : det + (fast[k] - det) * fastDown;
      slow[k] = det > slow[k] ? det + (slow[k] - det) * slowUp : det + (slow[k] - det) * slowDown;
      const d = 20 * Math.log10((fast[k] + 1e-6) / (slow[k] + 1e-6)), dd = d > DEAD_ZONE_DB ? d - DEAD_ZONE_DB : d < -DEAD_ZONE_DB ? d + DEAD_ZONE_DB : 0;
      const level = clamp((20 * Math.log10(slow[k] + 1e-9) + 66) / 20, 0, 1);
      const target = (dd > 0 ? att * MAX_DB * clamp(dd / range, 0, 1) : sus * MAX_DB * clamp(-dd / range, 0, 1)) * level;
      const c1 = Math.abs(target) > Math.abs(gdb[k]) ? gainUp : gainDown;
      gdb[k] = target + (gdb[k] - target) * c1;
      gains[k] = 10 ** (gdb[k] / 20);
    }
    for (let c = 0; c < count; c++) {
      const x = source[c][i], xi = x * gIn, y = xi * gains[s.linked ? 0 : c];
      pin[c] = xi * xi + (pin[c] - xi * xi) * power; pout[c] = y * y + (pout[c] - y * y) * power;
      const makeup = s.autoGain ? clamp(Math.sqrt((pin[c] + 1e-12) / (pout[c] + 1e-12)), .25, 4) : 1, wet = y * makeup * gOut;
      out[c][i] = clamp(s.listen ? wet - x : x * (1 - mix) + wet * mix, -1, 1);
    }
  }
  return out;
}
export function renderTransientWindow(source: Float32Array[], rate: number, s: TransientSettings, from: number, to: number): Float32Array[] {
  const total = source[0]?.length ?? 0, a = clamp(Math.floor(from), 0, total), b = clamp(Math.ceil(to), a, total);
  const out = source.map(c => s.listen ? new Float32Array(c.length) : new Float32Array(c));
  if (b <= a || (isTransientNeutral(s) && !s.listen)) return out;
  const lead = Math.max(0, a - Math.round(rate * 2));
  const wet = applyTransient(source.map(c => c.subarray(lead, b)), rate, s);
  const fade = Math.max(1, Math.min(Math.round(rate * .02), (b - a) >> 1));
  for (let c = 0; c < out.length; c++) {
    for (let i = a; i < b; i++) {
      let w = 1;
      if (a > 0 && i < a + fade) w = Math.min(w, (i - a) / fade);
      if (b < total && i > b - fade) w = Math.min(w, (b - i) / fade);
      out[c][i] = out[c][i] * (1 - w) + wet[c][i - lead] * w;
    }
  }
  return out;
}
