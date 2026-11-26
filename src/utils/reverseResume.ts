import {audioEngine} from '../audio/engine';
type Internals={isPlayingState:boolean;isReverse:boolean};
type PlayOptions=NonNullable<Parameters<typeof audioEngine.play>[4]>;
/* Play pendant une lecture a l'envers : la lecture repart a l'endroit depuis la position courante, sans revenir au debut. */
export function installReverseResume():void{
 const original=audioEngine.play.bind(audioEngine);
 audioEngine.play=((channels:Float32Array[],sampleRate:number,startSample:number,endSample:number,options:PlayOptions={})=>{
  const state=audioEngine as unknown as Internals;
  if(state.isPlayingState&&state.isReverse&&!options.reverse&&!options.loop){
   const resume=audioEngine.getCurrentSample(),total=channels[0]?.length??0;
   if(Number.isFinite(resume)&&resume>=0&&resume<total-1){
    original(channels,sampleRate,Math.floor(resume),endSample>resume?endSample:total,{...options,offsetSamples:0});
    return;
   }
  }
  original(channels,sampleRate,startSample,endSample,options);
 }) as typeof audioEngine.play;
}
