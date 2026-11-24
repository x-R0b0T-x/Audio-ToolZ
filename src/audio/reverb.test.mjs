import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReverb,applyReverbRange,reverbSettings} from './reverb.mjs';
const sr=8000;
function impulse(n=800) {const x=new Float32Array(n);x[0]=1;return x;}
test('silence and dry bypass do not append silence',()=>{
 assert.equal(renderReverb([new Float32Array(80)],sr).tailSamples,0);
 const x=impulse();const r=renderReverb([x],sr,{reflections:0,reverb:0});
 assert.deepEqual(r.channels[0],x);assert.notEqual(r.channels[0],x);
});
test('wet signal is audible, finite, deterministic and decays',()=>{
 const x=impulse(), p={direct:0,decay:0.5};
 const a=renderReverb([x],sr,p),b=renderReverb([x],sr,p);
 assert.deepEqual(a.channels,b.channels);
 assert.ok(a.wet[0].some(x=>Math.abs(x)>0.001));
 assert.ok(a.channels[0].every(Number.isFinite));
 const energy=(v)=>v.reduce((s,x)=>s+x*x,0);
 assert.ok(energy(a.wet[0].slice(-800))<energy(a.wet[0].slice(0,4000))*0.001);
});
test('tail mixes without shifting or modifying the following source',()=>{
 const x=impulse(16000);x[5000]=0.75;const original=x.slice();
 const p={decay:0.2}, r=applyReverbRange([x],sr,0,80,p);
 const isolated=renderReverb([x.subarray(0,80)],sr,p);
 assert.equal(r.channels[0][5000],0.75);assert.deepEqual(x,original);
 for(let i=80;i<isolated.wet[0].length;i++)
   assert.equal(r.channels[0][i],Math.fround(x[i]+isolated.wet[0][i]));
});
test('document end extends; direct is never repeated into tail',()=>{
 const x=impulse(80),r=applyReverbRange([x],sr,0,80,{decay:0.2});
 assert.ok(r.channels[0].length>x.length);
 const d=applyReverbRange([x],sr,0,80,{direct:50,reflections:0,reverb:0});
 assert.equal(d.channels[0].length,80);assert.equal(d.channels[0][0],0.5);
});
test('size and decay independent; predelay moves wet onset',()=>{
 const a=reverbSettings({size:0,decay:4}),b=reverbSettings({size:100,decay:4});
 assert.equal(a.decay,b.decay);
 const first=p=>renderReverb([impulse()],sr,{...p,direct:0}).wet[0].findIndex(x=>Math.abs(x)>1e-8);
 assert.equal(first({preDelay:50})-first({preDelay:0}),400);
});
test('stereo width zero centers wet, does not collapse dry',()=>{
 const a=impulse(),b=new Float32Array(a.length);
 const r=renderReverb([a,b],sr,{width:0,decay:0.2});
 assert.deepEqual(r.wet[0],r.wet[1]);assert.equal(r.channels[0][0],1);
 assert.equal(r.channels[1][0],0);
});
test('reject invalid input and sanitize controls',()=>{
 assert.throws(()=>renderReverb([Float32Array.of(NaN)],sr));
 assert.throws(()=>renderReverb([impulse(),new Float32Array(2)],sr));
 assert.throws(()=>applyReverbRange([impulse()],sr,-1,2));
 assert.equal(reverbSettings({decay:Infinity}).decay,2);
 assert.equal(reverbSettings({decay:-1}).decay,0.1);
});
