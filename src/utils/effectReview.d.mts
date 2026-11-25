export function normalizeEffectName(name:string):string;
export function formatEqFrequency(value:number|null):string;
type Levels=Record<'direct'|'reflections'|'reverb',number>;
export function clampReverbLevels(settings:Levels):Levels;
export function restoreUnappliedPreview(engine:{readonly isPlaying:boolean;replacePreviewAudio:(channels:Float32Array[],rate:number)=>boolean;stop:(reset?:boolean)=>void},channels:Float32Array[],rate:number):void;
export function createPreviewExit(onDiscard:()=>void):{readonly settled:boolean;reset:()=>void;discard:()=>void;apply:(commit:()=>void)=>void};
