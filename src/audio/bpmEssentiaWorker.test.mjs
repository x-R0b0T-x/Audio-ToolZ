import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {readFileSync} from 'node:fs';
const source=readFileSync(new URL('../../public/third_party/bpm/worker.js',import.meta.url),'utf8');
function fixture({prior,missingExport=false,failImport=false}={}){
 const loaded=[],messages=[],freed=[],backend={tag:'initialized-module'};
 const context={Float32Array,URL,exports:prior,location:{href:'http://127.0.0.1:4178/third_party/bpm/worker.js'},postMessage:message=>messages.push(message)};
 context.self=context;
 context.importScripts=(...paths)=>{for(const file of paths){loaded.push(file);if(file.endsWith('essentia-wasm.umd.js')){if(failImport)throw Error('UMD load failed');if(!missingExport)context.exports.EssentiaWASM=backend;}else if(file.endsWith('essentia.js-core.js')){context.Essentia=class{
  constructor(value){assert.equal(value,backend);this.version='fixture';}
  arrayToVector(){return {delete:()=>freed.push('input')};}
  RhythmExtractor2013(){return {bpm:120,confidence:3,ticks:{delete:()=>freed.push('ticks')}};}
  vectorToArray(){return new Float32Array([0.5,1,1.5]);}
  shutdown(){freed.push('shutdown');}
  delete(){freed.push('instance');}
 };}else throw Error('Unexpected script '+file);}};
 vm.runInNewContext(source,context);
 return {context,loaded,messages,freed,run:()=>context.onmessage({data:{engine:'essentia',mono:new Float32Array(64),sampleRate:44100}})};
}
test('Essentia adapter uses initialized UMD object without document or factory call',async()=>{
 const f=fixture();assert.equal('document' in f.context,false);await f.run();
 assert.deepEqual(f.loaded,['./essentia/essentia-wasm.umd.js','./essentia/essentia.js-core.js']);
 assert.equal(f.messages.length,1);assert.equal(f.messages[0].error,undefined);assert.equal(f.messages[0].bpm,120);
 assert.deepEqual(Array.from(f.messages[0].beatsSeconds),[0.5,1,1.5]);
 assert.deepEqual(f.freed,['ticks','input','shutdown','instance']);assert.equal('exports' in f.context,false);
});
test('temporary UMD exports do not replace an existing global export object',async()=>{
 const prior={keep:true},f=fixture({prior});await f.run();assert.equal(f.context.exports,prior);assert.deepEqual(prior,{keep:true});assert.equal(f.messages[0].error,undefined);
});
test('missing UMD export is reported without another engine or web fallback',async()=>{
 const f=fixture({missingExport:true});await f.run();assert.match(f.messages[0].error,/UMD EssentiaWASM/);assert.deepEqual(f.loaded,['./essentia/essentia-wasm.umd.js']);assert.equal('exports' in f.context,false);
});
test('failed UMD import restores exports and reports failure',async()=>{
 const prior={keep:true},f=fixture({prior,failImport:true});await f.run();assert.match(f.messages[0].error,/UMD load failed/);assert.equal(f.context.exports,prior);assert.deepEqual(f.loaded,['./essentia/essentia-wasm.umd.js']);
});
test('vendor selects the UMD runtime rather than the document-dependent web build',()=>{
 const vendor=readFileSync(new URL('../../.github/maintenance/vendor_bpm.py',import.meta.url),'utf8');assert.match(vendor,/dist\/essentia-wasm\.umd\.js/);assert.doesNotMatch(vendor,/essentia-wasm\.web/);
});
