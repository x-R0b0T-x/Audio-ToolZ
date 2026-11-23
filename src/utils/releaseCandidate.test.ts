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
test('control artwork replaces only the VU display and keeps analyzer and controls',()=>{
  const source=readFileSync('src/components/ControlWindow.tsx','utf8');
  assert.ok(source.includes("../medias/mix.png?url"));
  assert.equal((source.match(/data-atz-control-art/g)||[]).length,1);
  assert.ok(source.includes('objectFit:"contain"'));
  assert.ok(!source.includes('vuCanvasRef'));
  assert.ok(source.includes('ref={visCanvasRef}'));
  for(const control of ['onVolumeChange','onBalanceChange','onSpeedChange'])assert.ok(source.includes(control));
});
test('tutorial has precisely the three short community labels',()=>{
  const source=readFileSync('src/components/Tutorial.tsx','utf8');
  const labels=Array.from(source.matchAll(/\{label:"([^"]*)",href:"[^"]*"\}/g),m=>m[1]);
  assert.deepEqual(labels,['Telegram','Github','Paypal']);
  const css=readFileSync('src/components/tutorial.css','utf8');
  for(const token of ['width:100px','height:32px','background:#7928b5','background:#166b21'])assert.ok(css.includes(token));
});
