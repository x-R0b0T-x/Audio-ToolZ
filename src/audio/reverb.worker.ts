import {renderReverb,type ReverbSettings} from './reverb.mjs';
type Request={id:number;channels:Float32Array[];sampleRate:number;settings:Partial<ReverbSettings>};
self.onmessage=(event:MessageEvent<Request>)=>{
 const {id,channels,sampleRate,settings}=event.data;
 try{
  const rendered=renderReverb(channels,sampleRate,settings),hop=Math.max(1,Math.round(sampleRate*.01));
  const length=rendered.channels[0]?.length??0,meter=new Float32Array(Math.ceil(length/hop));let peak=0;
  for(let block=0;block<meter.length;block++){
   const from=block*hop,to=Math.min(length,from+hop);let maximum=0;
   for(let c=0;c<rendered.channels.length;c++){
    let energy=0;for(let i=from;i<to;i++){const wet=rendered.wet[c][i];energy+=wet*wet;peak=Math.max(peak,Math.abs(rendered.channels[c][i]));}
    maximum=Math.max(maximum,Math.sqrt(energy/Math.max(1,to-from)));
   }meter[block]=maximum;
  }
  self.postMessage({id,channels:rendered.channels,meter,hop,tailSamples:rendered.tailSamples,peak},{transfer:[...rendered.channels.map(ch=>ch.buffer as ArrayBuffer),meter.buffer as ArrayBuffer]});
 }catch(error){self.postMessage({id,error:String(error)});}
};
