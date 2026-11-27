import test from 'node:test';
import assert from 'node:assert/strict';
import {renderReverb} from './reverb.mjs';
import {NEUTRAL_REVERB} from './reverbNeutral.mjs';
test('Z-Reverbe neutre : la sortie est identique a l entree',()=>{
 const x=new Float32Array(800);x[0]=1;x[10]=0.5;x[400]=-0.25;
 const r=renderReverb([x],8000,NEUTRAL_REVERB);
 assert.deepEqual(r.channels[0],x);
 assert.equal(r.tailSamples,0);
 assert.equal(NEUTRAL_REVERB.reflections,0);
 assert.equal(NEUTRAL_REVERB.reverb,0);
 assert.equal(NEUTRAL_REVERB.direct,100);
});
