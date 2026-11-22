import {test} from 'node:test';import assert from 'node:assert/strict';import {widthFromWheel,nextSecretClick,canDragBand} from './easterPolicy.mjs';
test('wheel changes width in the requested direction',()=>{assert.ok(widthFromWheel(1,-1)<1);assert.ok(widthFromWheel(1,1)>1);assert.ok(widthFromWheel(1,-1,true)>widthFromWheel(1,-1));});
test('width stays bounded',()=>{assert.equal(widthFromWheel(.1,-1),.1);assert.equal(widthFromWheel(24,1),24);assert.equal(widthFromWheel(1,0),1);});
test('thirtieth deliberate click only',()=>{let n=0;for(let i=0;i<29;i++){n=nextSecretClick(n,true);assert.ok(n<30);}assert.equal(nextSecretClick(n,true),30);assert.equal(nextSecretClick(n,false),0);});
test('released, cancelled or wrong pointer never drags',()=>{assert.equal(canDragBand(7,7,1,true),true);for(const args of [[7,7,0,true],[7,null,1,true],[8,7,1,true],[7,7,1,false]])assert.equal(canDragBand(...args),false);});
