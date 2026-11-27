export const MIN_SAMPLES: number;
export const DEFAULTS: Readonly<{ tolerance: number; maxMs: number; passes: number }>;
export interface DeclickOptions { tolerance?: number; maxMs?: number; passes?: number }
export interface ClickRegion { start: number; end: number }
export interface RepairedClick extends ClickRegion { channel: number; pass: number }
export function detectClicks(x: ArrayLike<number>, rate: number, options?: DeclickOptions): ClickRegion[];
export function repairRegion(x: Float64Array, start: number, end: number): void;
export function removeClicks(channels: Float32Array[], rate: number, options?: DeclickOptions): { channels: Float32Array[]; clicks: RepairedClick[] };
