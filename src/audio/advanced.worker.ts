import { equalize, dynamics, type Band, type Dynamics } from './advancedDsp';
let channels:Float32Array[]=[],rate=44100;
type Request={id:number;kind:'init'|'eq'|'dynamics';channels?:Float32Array[];rate?:number;bands?:Band[];params?:Dynamics};
self.onmessage=(event:MessageEvent<Request>)=>{
 const m=event.data;
 try{
  if(m.kind==='init'){channels=m.channels!;rate=m.rate!;return;}
  const result=m.kind==='eq'?{channels:equalize(channels,rate,m.bands!),trace:null}:dynamics(channels,rate,m.params!);
  const transfer:Transferable[]=result.channels.map(ch=>ch.buffer as ArrayBuffer);
  if(result.trace)transfer.push(result.trace.input.buffer as ArrayBuffer,result.trace.output.buffer as ArrayBuffer,result.trace.reduction.buffer as ArrayBuffer);
  self.postMessage({id:m.id,...result},{transfer});
 }catch(error){self.postMessage({id:m.id,error:String(error)});}
};
