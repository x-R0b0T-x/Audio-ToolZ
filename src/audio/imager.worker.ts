import {renderImagerWindow} from './imager.mjs';
import type {ImagerSettings} from './imager.mjs';
type Request={kind:'init';channels:Float32Array[];sampleRate:number}|{kind:'render';id:number;settings:ImagerSettings;from:number;to:number};
let source:Float32Array[]|null=null,rate=0;
self.onmessage=(event:MessageEvent<Request>)=>{
 const request=event.data;
 if(request.kind==='init'){source=request.channels;rate=request.sampleRate;return;}
 const {id,settings,from,to}=request;
 try{
  if(!source)throw new Error('Source de l’imageur non initialisée');
  const channels=renderImagerWindow(source,rate,settings,from,to);
  self.postMessage({id,channels,from,to},{transfer:channels.map(ch=>ch.buffer as ArrayBuffer)});
 }catch(error){self.postMessage({id,error:String(error)});}
};
