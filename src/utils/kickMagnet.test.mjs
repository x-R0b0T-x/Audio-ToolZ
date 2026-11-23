import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createKickMagnet,kickTargets} from './kickMagnet.mjs';
test('global and deep zoom acquire the exact kick from either side',()=>{
 for(const length of [180*44100,44100,1000])for(const sign of [-1,1]){
  const m=createKickMagnet(),target=400000,width=1000;
  assert.equal(m.snap(target+sign*6*length/width,[target],width,length,9000000),target);
 }
});
test('hysteresis holds gently then releases beyond twelve pixels',()=>{
 const m=createKickMagnet();assert.equal(m.snap(106,[100],1000,1000,10000),100);
 assert.equal(m.snap(111,[100],1000,1000,10000),100);
 assert.equal(m.snap(113,[100],1000,1000,10000),113);
});
test('Alt, disabled snap, empty targets and reset do not retain a kick',()=>{
 const m=createKickMagnet();m.snap(106,[100],1000,1000,10000);
 assert.equal(m.snap(106,[100],1000,1000,10000,true,true),106);
 assert.equal(m.snap(106,[100],1000,1000,10000,false),106);
 assert.equal(m.snap(106,[],1000,1000,10000),106);
 m.snap(106,[100],1000,1000,10000);m.reset();assert.equal(m.snap(111,[100],1000,1000,10000),111);
});
test('targets match the markers actually drawn including missing kicks',()=>{
 assert.deepEqual(kickTargets({beatSamples:[100,200,300],kickSamples:[103]}),[103,200,300]);
 assert.deepEqual(kickTargets({beatSamples:[],kickSamples:[103]}),[103]);
});
test('nearest valid target wins and sample is constrained to document',()=>{
 const m=createKickMagnet();assert.equal(m.snap(106,[NaN,-1,100,108,99999],1000,1000,10000),108);
 m.reset();assert.equal(m.snap(-20,[],1000,1000,10000),0);assert.equal(m.snap(20000,[],1000,1000,10000),10000);
});
