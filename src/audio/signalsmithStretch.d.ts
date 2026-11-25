declare module 'signalsmith-stretch' {
 export interface StretchNode extends AudioWorkletNode {
  addBuffers(channels:Float32Array[]):Promise<number>;
  latency():number|Promise<number>;
  schedule(options:{output?:number;input?:number;active?:boolean;rate?:number;semitones?:number}):void;
 }
 export default function SignalsmithStretch(context:BaseAudioContext,options?:AudioWorkletNodeOptions):Promise<StretchNode>;
}
