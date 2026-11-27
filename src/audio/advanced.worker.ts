import { equalize, dynamics, type Band, type Dynamics, type Trace } from './advancedDsp';
let channels:Float32Array[]=[],rate=44100;
type Request={id:number;kind:'init'|'eq'|'dynamics';channels?:Float32Array[];rate?:number;bands?:Band[];params?:Dynamics;from?:number;to?:number};
const HOP=256;
const run=(slice:Float32Array[],m:Request):{channels:Float32Array[];trace:Trace|null}=>m.kind==='eq'?{channels:equalize(slice,rate,m.bands!),trace:null}:dynamics(slice,rate,m.params!);
self.onmessage=(event:MessageEvent<Request>)=>{
 const m=event.data;
 try{
  if(m.kind==='init'){channels=m.channels!;rate=m.rate!;return;}
  const total=channels[0]?.length??0,from=Math.max(0,Math.min(total,Math.floor(m.from??0))),to=Math.max(from,Math.min(total,Math.ceil(m.to??total))),whole=from<=0&&to>=total;
  let result:{channels:Float32Array[];trace:Trace|null};
  if(whole)result=run(channels,m);
  else{
   const lead=Math.floor(Math.max(0,from-Math.round(rate*2.5))/HOP)*HOP,end=Math.min(total,to+Math.round(rate*.02)),part=run(channels.map(c=>c.subarray(lead,end)),m);
   const fade=Math.max(1,Math.min(Math.round(rate*.02),(to-from)>>1));
   const out=channels.map((c,k)=>{const o=new Float32Array(c),p=part.channels[k];for(let i=from;i<to;i++){let w=1;if(from>0&&i<from+fade)w=Math.min(w,(i-from)/fade);if(to<total&&i>to-fade)w=Math.min(w,(to-i)/fade);o[i]=c[i]*(1-w)+p[i-lead]*w;}return o;});
   let trace:Trace|null=null;
   if(part.trace){
    const bins=Math.ceil(total/HOP),offset=lead/HOP;trace={hop:HOP,input:new Float32Array(bins),output:new Float32Array(bins),reduction:new Float32Array(bins)};
    for(let b=0;b<part.trace.input.length;b++){const d=b+offset;if(d>=bins||d*HOP<from||d*HOP>=to)continue;trace.input[d]=part.trace.input[b];trace.output[d]=part.trace.output[b];trace.reduction[d]=part.trace.reduction[b];}
   }
   result={channels:out,trace};
  }
  const transfer:Transferable[]=result.channels.map(ch=>ch.buffer as ArrayBuffer);
  if(result.trace)transfer.push(result.trace.input.buffer as ArrayBuffer,result.trace.output.buffer as ArrayBuffer,result.trace.reduction.buffer as ArrayBuffer);
  self.postMessage({id:m.id,...result,from,to},{transfer});
 }catch(error){self.postMessage({id:m.id,error:String(error)});}
};
