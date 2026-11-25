export type BpmEngineId='builtin'|'essentia'|'aubio';
export const ENGINES:Readonly<Record<BpmEngineId,string>>;
export function engineId(value:unknown):BpmEngineId;
export function median(values:number[]):number;
export function samplePositions(seconds:ArrayLike<number>,sampleRate:number,length:number):number[];
export function tempoTrace(beats:number[],sampleRate:number):{seconds:number;bpm:number}[];
export function validReport<T>(result:T,length:number):T;
