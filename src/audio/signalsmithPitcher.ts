import SignalsmithStretch,{type StretchNode} from 'signalsmith-stretch';
import {validatePitcher} from './pitcherModel.mjs';
export {splicePitcher} from './pitcherModel.mjs';
export async function renderSignalsmith(channels:Float32Array[],sampleRate:number,speed:number,pitch:number,signal?:AbortSignal):Promise<Float32Array[]>{
 const length=validatePitcher(channels,sampleRate,speed,pitch);
 signal?.throwIfAborted();
 if(!length)return channels.map(()=>new Float32Array());
 const setup=new OfflineAudioContext(channels.length,1,sampleRate);
 if(!setup.audioWorklet)throw Error('Signalsmith Stretch : AudioWorklet indisponible dans le moteur audio local');
 let node:StretchNode|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 let abort:()=>void=()=>{};
 const interrupted=new Promise<never>((_,reject)=>{
  abort=()=>reject(new DOMException('Aborted','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>reject(Error('Signalsmith Stretch : délai de traitement dépassé')),120000);
 });
 const wait=<T,>(task:Promise<T>)=>Promise.race([task,interrupted]);
 try{
  const options:AudioWorkletNodeOptions={numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[channels.length],channelCount:channels.length,channelCountMode:'explicit'};
  const probe=await wait(SignalsmithStretch(setup,options));node=probe;
  const latency=await wait(Promise.resolve(probe.latency()));
  if(!Number.isFinite(latency)||latency<0)throw Error('Signalsmith Stretch : latence invalide');
  probe.disconnect();probe.port.close();node=undefined;
  const padding=Math.ceil(Math.max(.25,latency*2+.05)*sampleRate);
  const context=new OfflineAudioContext(channels.length,length+padding,sampleRate);
  node=await wait(SignalsmithStretch(context,options));signal?.throwIfAborted();
  await wait(node.addBuffers(channels.map(c=>c.slice())));signal?.throwIfAborted();
  node.connect(context.destination);
  node.schedule({output:padding/sampleRate,input:0,active:true,rate:speed,semitones:pitch});
  const rendered=await wait(context.startRendering());signal?.throwIfAborted();
  const result=channels.map((_,i)=>rendered.getChannelData(i).slice(padding,padding+length));
  if(result.some(c=>c.length!==length||c.some(v=>!Number.isFinite(v))))throw Error('Signalsmith Stretch : rendu audio invalide');
  return result;
 }finally{
  if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',abort);
  node?.disconnect();node?.port.close();
 }
}
