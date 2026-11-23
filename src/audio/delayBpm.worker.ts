import {detectBpmAndBeats} from './dsp';
self.onmessage=(event:MessageEvent<{channels:Float32Array[];sampleRate:number}>)=>{
 try{
  const {channels,sampleRate}=event.data;
  if(!channels.length||!channels[0]?.length||!Number.isFinite(sampleRate)||sampleRate<=0)throw new Error('Piste audio invalide.');
  const result=detectBpmAndBeats(channels,sampleRate);
  if(!Number.isFinite(result.bpm)||result.bpm<=0)throw new Error('Impossible de détecter un tempo régulier sur cette piste.');
  self.postMessage({bpm:result.bpm});
 }catch(error){self.postMessage({error:error instanceof Error?error.message:'Échec de la détection BPM.'});}
};
