import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {PeakTrail,restartAfterLoop} from './peakTrail';
import {targetRange,splicePreview} from '../audio/effectsModel.mjs';
import {equalize,bandsDefault,dynamics,dynamicsDefault} from '../audio/advancedDsp';
test('peak trail preserves transients and independent input and output peaks',()=>{
 const source=new Float32Array(1000),output=new Float32Array(200);source[549]=-1;output[49]=.25;
 const h=new PeakTrail();h.append([source],[output],500,100,1000,500,Float32Array.from([7]),256,500);
 const rows=h.read(1);assert.equal(rows.length,1);assert.equal(rows[0].input,1);assert.equal(rows[0].output,.25);assert.equal(rows[0].reduction,7);
});
test('outside processed selection output remains original',()=>{
 const h=new PeakTrail();h.append([Float32Array.from([.1,.2,.3,.4])],[Float32Array.from([.01])],0,2,1000,3);assert.ok(Math.abs(h.read(1)[0].output-.2)<1e-6);
});
test('click after loop restarts, boundary drag and overview do not',()=>{
 assert.equal(restartAfterLoop(true,90,20,80),true);assert.equal(restartAfterLoop(true,60,20,80),false);assert.equal(restartAfterLoop(true,90,20,80,true),false);assert.equal(restartAfterLoop(false,90,20,80),false);
});
test('processing without a loop targets the whole file or the explicit selection',()=>{
 const source=Float32Array.from({length:4096},(_,i)=>.2*Math.sin(i));
 assert.deepEqual(targetRange({startSample:100,endSample:100},source.length),{start:0,end:source.length});
 const all=equalize([source],48000,bandsDefault(48000));assert.equal(all[0].length,source.length);
 assert.equal(dynamics([source],48000,dynamicsDefault()).channels[0].length,source.length);
 const range=targetRange({startSample:100,endSample:200},source.length),result=splicePreview([source],[new Float32Array(100)],range.start,range.end);
 assert.deepEqual(result[0].subarray(0,100),source.subarray(0,100));assert.deepEqual(result[0].subarray(200),source.subarray(200));
});
test('Delay text and restart callback are integrated',()=>{
 const modal=readFileSync('src/components/EffectModal.tsx','utf8');assert.ok(modal.includes("echo:'Delay'"));assert.ok(!modal.includes('Son original conservé.'));
 assert.ok(readFileSync('src/App.tsx','utf8').includes('onRestartPlayback={(sample)=>'));
 assert.ok(readFileSync('src/components/AdvancedEffects.tsx','utf8').includes('<DynamicsPeakGraph'));
});
