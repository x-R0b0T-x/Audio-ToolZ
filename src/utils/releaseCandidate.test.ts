import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {parsePersistedUiState,loadPersistedUiState,savePersistedUiState} from './uiStateStorage';
test('new users start with analyzer one and every saved mode survives parsing',()=>{
  assert.equal(parsePersistedUiState(null).visualMode,'oscilloscope');
  for(const visualMode of ['oscilloscope','spectrum','colored-waveform'] as const){
    assert.equal(parsePersistedUiState(JSON.stringify({visualMode})).visualMode,visualMode);
  }
});
test('analyzer selection survives saving and a subsequent load',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window');
  const data=new Map<string,string>();
  Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:1440,innerHeight:900,localStorage:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}}});
  try{
    for(const visualMode of ['spectrum','colored-waveform','oscilloscope'] as const){
      savePersistedUiState({visualMode});
      assert.equal(loadPersistedUiState().visualMode,visualMode);
    }
  }finally{
    if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');
  }
});
test('robot is below transport in left column beside audio controls and above analyzer',()=>{
  const source=readFileSync('src/components/ControlWindow.tsx','utf8');
  assert.ok(source.includes("../medias/mix.png?url"));
  assert.equal((source.match(/data-atz-control-art/g)||[]).length,1);
  assert.ok(source.includes('objectFit:"contain"'));
  assert.ok(!source.includes('vuCanvasRef'));
  assert.ok(source.includes('ref={visCanvasRef}'));
  const left=source.indexOf('<div className="col-span-5 space-y-1.5">');
  const robot=source.indexOf('<img data-atz-control-art');
  const right=source.indexOf('<div className="col-span-7 space-y-2">');
  assert.ok(left>=0&&left<source.indexOf('onClick={onStop}',left));
  assert.ok(source.indexOf('onClick={onStop}',left)<robot&&robot<right);
  assert.ok(right<source.indexOf('Analyseur temps réel'));
  for(const control of ['onVolumeChange','onBalanceChange','onSpeedChange'])assert.ok(source.indexOf(control,right)>right);
});
test('tutorial has three equal purple buttons with green border-only hover',()=>{
  const source=readFileSync('src/components/Tutorial.tsx','utf8');
  const labels=Array.from(source.matchAll(/\{label:"([^"]*)",href:"[^"]*"\}/g),m=>m[1]);
  assert.deepEqual(labels,['Telegram','Github','Paypal']);
  const css=readFileSync('src/components/tutorial.css','utf8').split('/* v1.6 compact equal community buttons */')[1];
  assert.ok(css);
  for(const token of ['width:100px','height:32px','background:#7928b5!important'])assert.ok(css.includes(token));
  const base=css.match(/\.atz-tuto \.atz-tuto-links>a\.atz-tuto-link\{([^}]+)\}/)?.[1];
  const hover=css.match(/\.atz-tuto-link:focus-visible\{([^}]+)\}/)?.[1];
  assert.ok(base&&hover);
  for(const rule of [base,hover]){
    assert.ok(rule.includes('background:#7928b5!important'));
    assert.ok(rule.includes('color:#fff!important'));
  }
  assert.ok(hover.includes('border-color:#39ff14'));
  assert.ok(hover.includes('box-shadow:0 0 0 1px #39ff14,0 0 8px #39ff1488'));
  assert.ok(!css.includes('background:#166b21'));
});
