import {renderReverb,type ReverbSettings} from './reverb.mjs';
type Request={kind:'init';channels:Float32Array[];sampleRate:number}|{kind:'render';id:number;settings:Partial<ReverbSettings>;from:number;to:number};
let source:Float32Array[]|null=null,rate=0;
self.onmessage=(event:MessageEvent<Request>)=>{
 const request=event.data;if(request.kind==='init'){source=request.channels;rate=request.sampleRate;return;}const {id,settings}=request,channels=source,sampleRate=rate;
 try{
  if(!channels)throw new Error('Reverb source not initialized');
  const total=channels[0]?.length??0,from=Math.max(0,Math.min(total,Math.floor(request.from))),to=Math.max(from,Math.min(total,Math.ceil(request.to))),whole=from<=0&&to>=total;
  const lead=whole?0:Math.max(0,from-Math.round(sampleRate*4));
  const rendered=renderReverb(channels.map(c=>c.subarray(lead,to)),sampleRate,settings),tail=rendered.tailSamples,length=whole?total+tail:total;
  const out=channels.map(c=>{const o=new Float32Array(length);o.set(c);return o;});
  const fade=Math.max(1,Math.min(Math.round(sampleRate*.02),(to-from)>>1));
  for(let c=0;c<out.length;c++){
   for(let i=from;i<to;i++){let w=1;if(from>0&&i<from+fade)w=Math.min(w,(i-from)/fade);if(to<total&&i>to-fade)w=Math.min(w,(to-i)/fade);out[c][i]=channels[c][i]*(1-w)+rendered.channels[c][i-lead]*w;}
   if(whole)for(let i=total;i<length;i++)out[c][i]=rendered.channels[c][i]??0;
   else for(let k=0;k<tail&&to+k<total;k++)out[c][to+k]+=rendered.wet[c][to-lead+k]??0;
  }
  const hop=Math.max(1,Math.round(sampleRate*.01)),meter=new Float32Array(Math.ceil(length/hop));let peak=0;
  const last=whole?length:to;
  for(let block=Math.floor(from/hop);block<meter.length&&block*hop<last;block++){
   const a=block*hop,b=Math.min(length,a+hop);let maximum=0;
   for(let c=0;c<out.length;c++){
    let energy=0;for(let i=a;i<b;i++){const wet=rendered.wet[c][i-lead]??0;energy+=wet*wet;peak=Math.max(peak,Math.abs(out[c][i]));}
    maximum=Math.max(maximum,Math.sqrt(energy/Math.max(1,b-a)));
   }meter[block]=maximum;
  }
  self.postMessage({id,channels:out,meter,hop,tailSamples:tail,peak,from,to},{transfer:[...out.map(ch=>ch.buffer as ArrayBuffer),meter.buffer as ArrayBuffer]});
 }catch(error){self.postMessage({id,error:String(error)});}
};
