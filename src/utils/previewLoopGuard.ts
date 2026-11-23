import {audioEngine} from '../audio/engine';
type PreviewOptions={position?:number;loop?:boolean;loopStart?:number;loopEnd?:number;volumeDb?:number};
type ReplaceFn=(channels:Float32Array[],sampleRate:number,options?:PreviewOptions)=>boolean;
export function installPreviewLoopGuard():()=>void{
 const target=audioEngine as unknown as {replacePreviewAudio:ReplaceFn;isLooping?:boolean};
 const original=target.replacePreviewAudio;
 target.replacePreviewAudio=function(this:unknown,channels,sampleRate,options={}){
  const keep=Boolean(target.isLooping)&&options.loop===false;
  const next=keep?{...options,loop:true,loopStart:undefined,loopEnd:undefined}:options;
  return original.call(audioEngine,channels,sampleRate,next);
 };
 return()=>{target.replacePreviewAudio=original;};
}
