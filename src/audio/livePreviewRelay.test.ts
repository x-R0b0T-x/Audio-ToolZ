import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createPreviewRelay} from './livePreviewRelay';
test('opening while stopped does not start playback and the latest effect is replayed on normal playback',()=>{
 let playing=false;const heard:number[]=[];
 const relay=createPreviewRelay(()=>playing,(gain:number)=>{if(playing)heard.push(gain);});
 relay.submit(1);relay.submit(2);relay.poll();assert.equal(playing,false);assert.deepEqual(heard,[]);
 playing=true;relay.poll();assert.deepEqual(heard,[2]);relay.poll();assert.deepEqual(heard,[2]);
 relay.submit(3);assert.deepEqual(heard,[2,3]);
 playing=false;relay.poll();playing=true;relay.poll();assert.deepEqual(heard,[2,3,3]);
 relay.clear();playing=false;relay.poll();playing=true;relay.poll();assert.deepEqual(heard,[2,3,3]);
});
test('already running playback receives parameter changes immediately without any BPM or loop input',()=>{
 const heard:number[]=[];const relay=createPreviewRelay(()=>true,(value:number)=>{heard.push(value);});
 relay.submit(4);relay.poll();relay.submit(5);assert.deepEqual(heard,[4,5]);
});
