import {test} from 'node:test';import assert from 'node:assert/strict';
import {dynamics,dynamicsDefault} from './advancedDsp';
import {EffectWaveHistory} from '../components/effectWaveHistory';
test('ceiling after makeup in both modes',()=>{for(const mode of ['limiter','compressor'] as const){const r=dynamics([new Float32Array(4096).fill(4)],48000,{...dynamicsDefault(mode),input:24,makeup:24,ceiling:0});assert.ok(r.channels[0].every(v=>Number.isFinite(v)&&Math.abs(v)<=1));}});
test('reduction attacks and releases',()=>{const r=dynamics([Float32Array.from({length:24000},(_,i)=>i<1000?1:.01)],48000,{...dynamicsDefault(),ceiling:-6,attack:0,release:120});assert.ok(r.trace.reduction[0]>5.9);assert.ok(r.trace.reduction[r.trace.reduction.length-1]<r.trace.reduction[0]);});
test('reduction history offset and full precision',()=>{const h=new EffectWaveHistory(10,1);h.append([new Float32Array(8)],1,4,Float32Array.from([10,40,80]),1,2);assert.deepEqual([...h.read(1,4).reductions],[0,10,40,80]);});
