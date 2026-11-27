export interface ReverbSettings {
  size:number; decay:number; preDelay:number; diffusion:number; damping:number;
  lowCut:number; modulation:number; rate:number; width:number;
  direct:number; reflections:number; reverb:number;
}
export const DEFAULT_REVERB: Readonly<ReverbSettings>;
export function reverbSettings(values?:Partial<ReverbSettings>):ReverbSettings;
export function renderReverb(channels:Float32Array[],sampleRate:number,values?:Partial<ReverbSettings>,options?:{maxTailSamples?:number}):{channels:Float32Array[];wet:Float32Array[];tailSamples:number};
export function applyReverbRange(channels:Float32Array[],sampleRate:number,start:number,end:number,values?:Partial<ReverbSettings>):{channels:Float32Array[];tailSamples:number};
