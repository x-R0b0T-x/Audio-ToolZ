'use strict';
self.onmessage=async function(event){
 const {engine,mono,sampleRate}=event.data;
 try{
  if(!(mono instanceof Float32Array)||sampleRate!==44100)throw Error('Entrée PCM attendue à 44 100 Hz.');
  if(engine==='essentia'){
   importScripts('./essentia/essentia-wasm.web.js','./essentia/essentia.js-core.js');
   const module=await EssentiaWASM({locateFile:path=>new URL('./essentia/'+path,self.location.href).href});
   const instance=new Essentia(module);let input,output;
   try{input=instance.arrayToVector(mono);output=instance.RhythmExtractor2013(input);self.postMessage({bpm:output.bpm,beatsSeconds:Array.from(instance.vectorToArray(output.ticks)),confidenceRaw:output.confidence,version:'essentia.js 0.1.3 / '+instance.version});}
   finally{if(output)for(const value of Object.values(output))if(value&&typeof value.delete==='function')value.delete();if(input)input.delete();instance.shutdown();instance.delete();}
  }else if(engine==='aubio'){
   importScripts('./aubio/aubio.js');const module=await aubio({locateFile:path=>new URL('./aubio/'+path,self.location.href).href});
   const hop=512,tempo=new module.Tempo(2048,hop,sampleRate),frame=new Float32Array(hop),beats=[],bpms=[];let confidenceRaw=0;
   try{for(let offset=0;offset<mono.length;offset+=hop){frame.fill(0);frame.set(mono.subarray(offset,offset+hop));const fraction=tempo.do(frame),bpm=tempo.getBpm();if(fraction>0){const position=(offset+Math.round(fraction*hop))/sampleRate;if(position<mono.length/sampleRate)beats.push(position);if(Number.isFinite(bpm)&&bpm>0)bpms.push(bpm);}confidenceRaw=tempo.getConfidence();}bpms.sort((a,b)=>a-b);const middle=Math.floor(bpms.length/2),bpm=bpms.length?(bpms.length%2?bpms[middle]:(bpms[middle-1]+bpms[middle])/2):0;self.postMessage({bpm,beatsSeconds:beats,confidenceRaw,version:'aubiojs 0.2.1 / Aubio WASM'});}finally{tempo.delete();}
  }else throw Error('Moteur inconnu : aucun remplacement automatique.');
 }catch(error){self.postMessage({error:engine+' : '+(error instanceof Error?error.message:String(error))});}
};
