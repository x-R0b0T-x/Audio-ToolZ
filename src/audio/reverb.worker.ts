import {renderReverb,type ReverbSettings} from './reverb.mjs';
type Request={kind:'init';channels:Float32Array[];sampleRate:number}|{kind:'render';id:number;settings:Partial<ReverbSettings>};
let source:Float32Array[]|null=null,rate=0;
self.onmessage=(event:MessageEvent<Request>)=>{
 const request=event.data;if(request.kind==='init'){source=request.channels;rate=request.sampleRate;return;}const {id,settings}=request,channels=source,sampleRate=rate;
 try{
  if(!channels)throw new Error('Reverb source not initialized');
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
