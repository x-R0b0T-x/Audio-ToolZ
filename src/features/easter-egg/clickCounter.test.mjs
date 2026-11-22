import {test} from 'node:test';import assert from 'node:assert/strict';import {nextSecretClick} from './clickCounter.mjs';
test('thirtieth deliberate click only',()=>{let n=0;for(let i=0;i<29;i++){n=nextSecretClick(n,true);assert.ok(n<30);}assert.equal(nextSecretClick(n,true),30);assert.equal(nextSecretClick(n,false),0);});
