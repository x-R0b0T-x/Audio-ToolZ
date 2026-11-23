export type ParameterSpec = { min: number; max: number; step: number; fine: number; digits: number; logarithmic?: boolean };
export function parameterValue(value: number, s: ParameterSpec): number {
  return Number(Math.max(s.min, Math.min(s.max, Number.isFinite(value) ? value : s.min)).toFixed(s.digits));
}
export function stepParameter(value: number, direction: number, fine: boolean, s: ParameterSpec): number {
  if (!direction) return parameterValue(value, s);
  const next = s.logarithmic ? value * (fine ? 1.015 : 1.12) ** Math.sign(direction) : value + Math.sign(direction) * (fine ? s.fine : s.step);
  const rounded = parameterValue(next, s);
  return rounded === value ? parameterValue(value + Math.sign(direction) * 10 ** -s.digits, s) : rounded;
}
export type PanelBox = { left: number; top: number; width: number; height: number };
export function constrainPanel(b: PanelBox, vw: number, vh: number, minWidth: number, minHeight: number): PanelBox {
  const maxW = Math.max(1, vw - 32), maxH = Math.max(1, vh - 32);
  const width = Math.max(Math.min(minWidth, maxW), Math.min(maxW, b.width));
  const height = Math.max(Math.min(minHeight, maxH), Math.min(maxH, b.height));
  return { width, height, left: Math.max(16, Math.min(vw - 16 - width, b.left)), top: Math.max(16, Math.min(vh - 16 - height, b.top)) };
}
export class SourceSpectrum {
  readonly size = 8192;
  private real = new Float64Array(this.size);
  private imag = new Float64Array(this.size);
  private window = Float64Array.from({ length: this.size }, (_, i) => .5 - .5 * Math.cos(2 * Math.PI * i / (this.size - 1)));
  private power = new Float64Array(this.size / 2);
  read(channels: Float32Array[], position: number): Float64Array {
    const n = this.size, re = this.real, im = this.imag, count = Math.min(2, channels.length);
    this.power.fill(0);
    for (const channel of channels.slice(0, count)) {
      im.fill(0);
      for (let i = 0; i < n; i++) re[i] = (channel[Math.floor(position) - n + i] ?? 0) * this.window[i];
      for (let i = 1, j = 0; i < n; i++) {
        let bit = n >> 1; for (; j & bit; bit >>= 1) j ^= bit; j ^= bit;
        if (i < j) { const v = re[i]; re[i] = re[j]; re[j] = v; }
      }
      for (let len = 2; len <= n; len *= 2) {
        const a = -2 * Math.PI / len, wr = Math.cos(a), wi = Math.sin(a);
        for (let base = 0; base < n; base += len) {
          let r = 1, t = 0;
          for (let j = 0; j < len / 2; j++) {
            const k = base + j, l = k + len / 2, vr = re[l] * r - im[l] * t, vi = re[l] * t + im[l] * r;
            re[l] = re[k] - vr; im[l] = im[k] - vi; re[k] += vr; im[k] += vi;
            const next = r * wr - t * wi; t = r * wi + t * wr; r = next;
          }
        }
      }
      for (let k = 0; k < this.power.length; k++) this.power[k] += (re[k] ** 2 + im[k] ** 2) / count;
    }
    for (let k = 0; k < this.power.length; k++) this.power[k] = Math.sqrt(this.power[k]) * 4 / (n - 1);
    return this.power;
  }
}
export function samplePeak(channels: Float32Array[], start: number, end: number): number {
  let peak = 0;
  for (let c = 0; c < Math.min(2, channels.length); c++) {
    const channel = channels[c];
    for (let i = Math.max(0, Math.floor(start)); i < Math.min(channel.length, Math.ceil(end)); i++) peak = Math.max(peak, Math.abs(channel[i]));
  }
  return peak;
}
