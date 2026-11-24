import {test} from 'node:test';
import assert from 'node:assert/strict';
import {waveLevel,waveOffset} from './headerWaveMath.mjs';
test('header wave is absent when stopped, paused or silent',()=>{
 for(const v of [0,.001,.1,1])assert.equal(waveLevel(false,v,v),0);
 assert.equal(waveLevel(true,0,0),0);assert.equal(waveLevel(true,.00001,.00001),0);
 assert.equal(waveLevel(true,NaN,1),0);assert.equal(waveLevel(true,1,Infinity),0);
});
test('header wave follows stereo loudness on a dB scale, without tempo',()=>{
 assert.ok(Math.abs(waveLevel(true,.1,.1)-34/54)<1e-12);
 assert.equal(waveLevel(true,.1,0),waveLevel(true,0,.1));
 assert.ok(waveLevel(true,.2,.2)>waveLevel(true,.1,.1));assert.equal(waveLevel(true,1,1),1);
 assert.ok(waveLevel(true,.01,.01)>0);assert.ok(waveLevel(true,.01,.01)<waveLevel(true,.1,.1));
});
test('header wave stays attached, tapers at its tip and scales with volume',()=>{
 for(const phase of [0,.5,2,8])for(const width of [50,200,360]){
  assert.equal(waveOffset(0,width,phase,1),0);assert.equal(waveOffset(width,width,phase,1),0);
  assert.ok(Math.abs(waveOffset(width-.001,width,phase,1))<.02);
  for(let x=1;x<width;x+=3){const full=waveOffset(x,width,phase,1);assert.ok(Math.abs(full)<=14);assert.ok(Math.abs(waveOffset(x,width,phase,.5)-full*.5)<1e-12);assert.equal(waveOffset(x,width,phase,0),0);}
 }
 assert.equal(waveOffset(2,0,0,1),0);assert.equal(waveOffset(2,20,NaN,1),0);
});
