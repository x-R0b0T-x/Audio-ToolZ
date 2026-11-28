import {renderTransientWindow,type TransientSettings} from './transientDsp';
type Request={kind:'init';channels:Float32Array[];sampleRate:number}|{kind:'render';id:number;settings:TransientSettings;from:number;to:number};
let source:Float32Array[]|null=null,rate=0;
self.onmessage=(event:MessageEvent<Request>)=>{
 const request=event.data;
 if(request.kind==='init'){source=request.channels;rate=request.sampleRate;return;}
 const {id,settings,from,to}=request;
 try{
  if(!source)throw new Error('Source de transitoires non initialisée');
  const channels=renderTransientWindow(source,rate,settings,from,to);
  self.postMessage({id,channels,from,to},{transfer:channels.map(ch=>ch.buffer as ArrayBuffer)});
 }catch(error){self.postMessage({id,error:String(error)});}
};
