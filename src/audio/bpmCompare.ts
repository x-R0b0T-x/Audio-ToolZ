import {detectBpmAndBeats} from './dsp';
import type {BpmDetectionResult} from './types';
import {engineId,ENGINES,samplePositions,tempoTrace,validReport,type BpmEngineId} from './bpmCompareMath.mjs';
export {ENGINES};export type {BpmEngineId};
export interface BpmReport extends BpmDetectionResult {engineId:BpmEngineId;engineVersion:string;analysisMs:number;confidenceRaw:number|null;trace:{seconds:number;bpm:number}[];}
let selected:BpmEngineId='builtin';try{selected=engineId(localStorage.getItem('audio-toolz.bpm-engine'));}catch{}
export function getBpmEngine(){return selected;}
export function setBpmEngine(value:BpmEngineId){selected=engineId(value);try{localStorage.setItem('audio-toolz.bpm-engine',selected);}catch{}window.dispatchEvent(new Event('audio-toolz:bpm-engine-changed'));}
export function requestBpmAnalysis(docId:string,force=false){window.dispatchEvent(new CustomEvent('audio-toolz:bpm-request',{detail:{docId,force}}));}
export function recomputeBpmForSelectedEngine(channels:Float32Array[],sampleRate:number):BpmDetectionResult{if(selected==='builtin')return {...detectBpmAndBeats(channels,sampleRate),engineId:'builtin'} as BpmDetectionResult;return {bpm:0,confidence:0,firstBeatSample:0,beatSamples:[],kickSamples:[]};}
export function reportEngine(result:BpmDetectionResult|null|undefined):BpmEngineId|undefined{return (result as BpmReport|undefined)?.engineId;}
export async function analyzeBpm(channels:Float32Array[],sampleRate:number,engine:BpmEngineId,signal?:AbortSignal):Promise<BpmReport>{
 const started=performance.now(),length=channels[0]?.length??0;if(!Number.isFinite(sampleRate)||sampleRate<=0||!length||!channels.length||channels.some(c=>c.length!==length))throw Error('Piste audio invalide.');
 if(length/sampleRate<4)throw Error('Choisissez au moins quatre secondes de musique.');if(signal?.aborted)throw new DOMException('Analyse annulée','AbortError');
 let peak=0;for(const c of channels)for(let i=0;i<c.length;i++){if(!Number.isFinite(c[i]))throw Error('Échantillon audio invalide.');peak=Math.max(peak,Math.abs(c[i]));}if(peak<1e-7)throw Error('Piste silencieuse : aucun tempo à comparer.');
 let mono:Float32Array|undefined;
 if(engine!=='builtin'){
  const source=new Float32Array(length);for(const c of channels)for(let i=0;i<length;i++)source[i]+=c[i]/channels.length;
  if(sampleRate===44100)mono=source;else{const context=new OfflineAudioContext(1,Math.ceil(length*44100/sampleRate),44100);const buffer=context.createBuffer(1,length,sampleRate);buffer.copyToChannel(source,0);const node=context.createBufferSource();node.buffer=buffer;node.connect(context.destination);node.start();mono=(await context.startRendering()).getChannelData(0).slice();}
 }
 if(signal?.aborted)throw new DOMException('Analyse annulée','AbortError');
 return await new Promise<BpmReport>((resolve,reject)=>{
  const worker=engine==='builtin'?new Worker(new URL('./bpmCompare.builtin.worker.ts',import.meta.url),{type:'module'}):new Worker(new URL('/third_party/bpm/worker.js',location.href));
  let done=false;const finish=(error:unknown,result?:BpmReport)=>{if(done)return;done=true;clearTimeout(timer);signal?.removeEventListener('abort',abort);worker.terminate();if(error)reject(error);else resolve(result!);};
  const abort=()=>finish(new DOMException('Analyse annulée','AbortError'));const timer=setTimeout(()=>finish(Error('Analyse trop longue : arrêt après cinq minutes.')),300000);signal?.addEventListener('abort',abort,{once:true});
  worker.onerror=event=>finish(Error(`${ENGINES[engine]} : ${event.message||'échec du chargement local du moteur'}`));
  worker.onmessage=event=>{try{const data=event.data;if(data.error)throw Error(data.error);let raw:BpmDetectionResult;if(engine==='builtin')raw=data.result;else{const beats=samplePositions(data.beatsSeconds,sampleRate,length);raw={bpm:data.bpm,confidence:0,firstBeatSample:beats[0]??0,beatSamples:beats,kickSamples:[]};}validReport(raw,length);finish(null,{...raw,engineId:engine,engineVersion:data.version,analysisMs:performance.now()-started,confidenceRaw:Number.isFinite(data.confidenceRaw)?data.confidenceRaw:engine==='builtin'?raw.confidence:null,trace:tempoTrace(raw.beatSamples,sampleRate)});}catch(error){finish(error);}};
  try{if(engine==='builtin')worker.postMessage({channels,sampleRate});else worker.postMessage({engine,mono,sampleRate:44100},[mono!.buffer as ArrayBuffer]);}catch(error){finish(error);}
 });
}
if(location.hostname==='127.0.0.1'&&new URLSearchParams(location.search).get('bpm-smoke')==='1')(window as unknown as {__audioToolzBpmSmoke:typeof analyzeBpm}).__audioToolzBpmSmoke=analyzeBpm;
