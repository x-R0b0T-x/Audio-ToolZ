import { computeWaveformPeaks } from '../audio/dsp';
export class EffectWaveHistory {
  readonly capacity: number;
  total = 0;
  private raw: Float32Array[];
  private scratch: Float32Array[];
  private tones: Uint8Array;
  private reductions: Float32Array;
  private reductionScratch: Float32Array;
  private toneScratch: Uint8Array;
  private low = [0, 0];
  private highCut = [0, 0];
  private energy = [0, 0, 0];
  constructor(readonly rate: number, readonly channels: number) {
    this.capacity = Math.ceil(rate * 50);
    this.raw = Array.from({ length: channels }, () => new Float32Array(this.capacity));
    this.scratch = this.raw.map(() => new Float32Array(this.capacity));
    this.reductions = new Float32Array(this.capacity); this.reductionScratch = new Float32Array(this.capacity);
    this.tones = new Uint8Array(this.capacity); this.toneScratch = new Uint8Array(this.capacity);
  }
  append(source: Float32Array[], start: number, count: number, reduction?: Float32Array, hop = 256, reductionOffset = 0) {
    const length = source[0]?.length ?? 0; if (!length) return;
    const a = 1 - Math.exp(-2 * Math.PI * 250 / this.rate), b = 1 - Math.exp(-2 * Math.PI * 4000 / this.rate), smooth = 1 - Math.exp(-1 / (.005 * this.rate));
    count = Math.min(this.capacity, Math.max(0, Math.floor(count)));
    const power = [0,0,0];
    for (let i = 0; i < count; i++) {
      const pos = ((Math.floor(start) + i) % length + length) % length, slot = this.total % this.capacity; power.fill(0);
      for (let c = 0; c < this.channels; c++) {
        const x = source[c]?.[pos] ?? 0; this.raw[c][slot] = x;
        this.low[c] += a * (x - this.low[c]); this.highCut[c] += b * (x - this.highCut[c]);
        power[0] += this.low[c] ** 2; power[1] += (this.highCut[c] - this.low[c]) ** 2; power[2] += (x - this.highCut[c]) ** 2;
      }
      for (let k = 0; k < 3; k++) this.energy[k] += smooth * (power[k] - this.energy[k]);
      const l = this.energy[0] ** 1.5, m = this.energy[1] ** 1.5, h = this.energy[2] ** 1.5, sum = l + m + h;
      this.tones[slot] = sum > 1e-18 ? Math.round((l * 24 + m * 60 + h * 94) / sum) : 60;
      this.reductions[slot] = Math.max(0,reduction?.[Math.floor((pos-reductionOffset) / hop)]??0);
      this.total++;
    }
  }
  read(span: number, buckets: number) {
    const count = Math.min(this.total, this.capacity, Math.max(1, Math.round(span * this.rate)));
    const start = (this.total - count) % this.capacity, first = Math.min(count, this.capacity - start);
    for (let c = 0; c < this.channels; c++) {
      this.scratch[c].set(this.raw[c].subarray(start, start + first));
      this.scratch[c].set(this.raw[c].subarray(0, count - first), first);
    }
    this.toneScratch.set(this.tones.subarray(start, start + first)); this.toneScratch.set(this.tones.subarray(0, count - first), first);
    this.reductionScratch.set(this.reductions.subarray(start, start + first)); this.reductionScratch.set(this.reductions.subarray(0, count - first), first);
    const samples = this.scratch.map(ch => ch.subarray(0, count));
    return { count, samples, reductions: this.reductionScratch.subarray(0, count), tones: this.toneScratch.subarray(0, count), peaks: samples.map(ch => computeWaveformPeaks(ch, 0, count, buckets)) };
  }
}
