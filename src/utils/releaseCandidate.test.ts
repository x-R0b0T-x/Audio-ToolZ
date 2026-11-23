import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loopBoundaryHit} from './loopBoundaryHit';
import {parsePersistedUiState,loadPersistedUiState,savePersistedUiState} from './uiStateStorage';
const read=(path:string)=>readFileSync(path,'utf8');
test('new users start with oscilloscope and saved analyzer modes survive parsing',()=>{
  assert.equal(parsePersistedUiState(null).visualMode,'oscilloscope');
  for(const visualMode of ['oscilloscope','spectrum','colored-waveform'] as const)assert.equal(parsePersistedUiState(JSON.stringify({visualMode})).visualMode,visualMode);
});
test('analyzer preference survives save and reload',()=>{
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),data=new Map<string,string>();
  Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:1440,innerHeight:900,localStorage:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}}});
  try{for(const visualMode of ['spectrum','colored-waveform','oscilloscope'] as const){savePersistedUiState({visualMode});assert.equal(loadPersistedUiState().visualMode,visualMode);}}
  finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});
test('both loop edges are selectable with pixel tolerance and zoom',()=>{
  for(const offset of [-9,0,9]){
    assert.equal(loopBoundaryHit(252+offset,52,1052,0,1000,200,800),'resize-start');
    assert.equal(loopBoundaryHit(852+offset,52,1052,0,1000,200,800),'resize-end');
  }
  assert.equal(loopBoundaryHit(842,52,1052,0,1000,200,800),null);
  assert.equal(loopBoundaryHit(1052,52,1052,600,800,200,800),'resize-end');
  assert.equal(loopBoundaryHit(52,52,1052,600,800,200,900),null);
  assert.equal(loopBoundaryHit(252,52,1052,0,1000,200,200),null);
  assert.equal(loopBoundaryHit(257,52,1052,0,1000,200,210),'resize-start');
});
test('left boundary handling precedes playback actions and double click still clears selection',()=>{
  const source=read('src/utils/useWaveformInteractions.ts');
  const down=source.slice(source.indexOf('const down ='),source.indexOf('const mousemove ='));
  const hit=down.indexOf('const boundary = loopBoundaryHit(');
  assert.ok(hit>=0&&hit<down.indexOf('if(latest.current.isLooping&&latest.current.onRestartPlayback)'));
  assert.match(down,/if \(boundary\)\s*\{\s*begin\(boundary,\s*0,\s*event,\s*selection\);\s*return;/);
  assert.ok(down.includes("begin('resize-end', 2, event, selection)"));
  const doubleClick=source.slice(source.indexOf('const doubleClick ='),source.indexOf('const blur ='));
  assert.ok(doubleClick.includes('startSample: point, endSample: point'));
  assert.ok(doubleClick.includes("onSelectionCommit?.(next, 'cursor')"));
});
test('control is compact without artwork, keeping visualization and selection controls',()=>{
  const source=read('src/components/ControlWindow.tsx');
  for(const removed of ['data-atz-control-art','mixArtworkUrl','vuCanvasRef','Analyseur temps réel'])assert.ok(!source.includes(removed));
  for(const retained of ['ref={visCanvasRef}','data-atz-control="visual-mode"','loadPersistedUiState().visualMode','onVolumeChange','onBalanceChange','onSpeedChange','w-full h-24','justify-start mb-0.5'])assert.ok(source.includes(retained));
  const welcome=read('src/components/WaveformView.tsx');
  assert.equal((welcome.match(/data-atz-welcome-art/g)||[]).length,1);
  assert.ok(welcome.includes("../medias/mix.png?url"));
  assert.match(welcome,/data-atz-welcome-art[\s\S]*?<img[^>]*welcomeArtworkUrl[\s\S]*?<BrandLogo/);
});
test('header particles respect playback, reduction of motion and cleanup',()=>{
  const code=read('src/components/HeaderParticles.tsx'),css=read('src/components/headerParticles.css');
  assert.ok(read('src/components/TopMenuBar.tsx').includes('<HeaderParticles/>'));
  for(const token of ['audioEngine.isPlaying','reduced.matches','document.hidden','window.clearInterval(timer)','pointer','readSpectrum']){
    if(token==='pointer'||token==='readSpectrum')assert.ok(!code.includes(token));else assert.ok(code.includes(token));
  }
  assert.ok(code.includes('.slice(-24)'));
  assert.ok(code.includes('aria-hidden="true"'));
  assert.ok(css.includes('pointer-events:none!important'));
  assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
test('tutorial has three equal purple buttons and only green contour on hover',()=>{
  const labels=Array.from(read('src/components/Tutorial.tsx').matchAll(/\{label:"([^"]*)",href:"[^"]*"\}/g),m=>m[1]);
  assert.deepEqual(labels,['Telegram','Github','Paypal']);
  const css=read('src/components/tutorial.css').split('/* v1.6 compact equal community buttons */')[1];
  assert.ok(css);
  for(const token of ['width:100px','height:32px','background:#7928b5!important'])assert.ok(css.includes(token));
  const base=css.match(/\.atz-tuto \.atz-tuto-links>a\.atz-tuto-link\{([^}]+)\}/)?.[1];
  const hover=css.match(/\.atz-tuto-link:focus-visible\{([^}]+)\}/)?.[1];
  assert.ok(base&&hover);
  for(const rule of [base,hover]){assert.ok(rule.includes('background:#7928b5!important'));assert.ok(rule.includes('color:#fff!important'));}
  assert.ok(hover.includes('border-color:#39ff14'));
  assert.ok(!css.includes('background:#166b21'));
});
