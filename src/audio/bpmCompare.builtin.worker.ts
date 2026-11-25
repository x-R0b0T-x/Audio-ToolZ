import {detectBpmAndBeats} from './dsp';
self.onmessage=(event:MessageEvent<{channels:Float32Array[];sampleRate:number}>)=>{try{self.postMessage({result:detectBpmAndBeats(event.data.channels,event.data.sampleRate),version:'Audio ToolZ v1.7-dev'});}catch(error){self.postMessage({error:error instanceof Error?error.message:String(error)});}};
