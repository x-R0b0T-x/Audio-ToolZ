import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loopBoundaryHit} from './loopBoundaryHit';
import {parsePersistedUiState,loadPersistedUiState,savePersistedUiState} from './uiStateStorage';
const read=(path:string)=>readFileSync(path,'utf8');
const modes=['oscilloscope','spectrum','colored-waveform','vectorscope','spectrogram','vu-meter'] as const;
test('position one is default and all six modes survive save and reload',()=>{
  assert.equal(parsePersistedUiState(null).visualMode,'oscilloscope');
  assert.equal(parsePersistedUiState('{"visualMode":"unknown"}').visualMode,'oscilloscope');
  const previous=Object.getOwnPropertyDescriptor(globalThis,'window'),data=new Map<string,string>();
  Object.defineProperty(globalThis,'window',{configurable:true,value:{innerWidth:1440,innerHeight:900,localStorage:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value)}}});
  try{for(const visualMode of modes){assert.equal(parsePersistedUiState(JSON.stringify({visualMode})).visualMode,visualMode);savePersistedUiState({visualMode});assert.equal(loadPersistedUiState().visualMode,visualMode);}}
  finally{if(previous)Object.defineProperty(globalThis,'window',previous);else Reflect.deleteProperty(globalThis,'window');}
});
test('loop handles remain prior to loop playback actions',()=>{
  for(const delta of [-9,0,9]){assert.equal(loopBoundaryHit(252+delta,52,1052,0,1000,200,800),'resize-start');assert.equal(loopBoundaryHit(852+delta,52,1052,0,1000,200,800),'resize-end');}
  assert.equal(loopBoundaryHit(842,52,1052,0,1000,200,800),null);
  const source=read('src/utils/useWaveformInteractions.ts');
  assert.ok(source.indexOf('const boundary = loopBoundaryHit(')<source.indexOf('if(latest.current.isLooping&&latest.current.onRestartPlayback)'));
  assert.ok(source.includes("onSelectionCommit?.(next, 'cursor')"));
});
test('compact selector exposes six modes without restoring artwork or VU bars',()=>{
  const source=read('src/components/ControlWindow.tsx'),visuals=read('src/components/AnalyzerVisuals.tsx');
  for(const absent of ['data-zonyx-control-art','mixArtworkUrl','vuCanvasRef','Analyseur temps réel'])assert.ok(!source.includes(absent));
  for(const retained of ['<AnalyzerSelect ','ref={visCanvasRef}','w-full h-24','loadPersistedUiState().visualMode','onVolumeChange','onBalanceChange','onSpeedChange'])assert.ok(source.includes(retained));
  for(const mode of modes)assert.ok(visuals.includes("'"+mode+"'"));
  assert.ok(visuals.includes('<select data-zonyx-control="visual-mode"'));
  assert.ok(visuals.includes('onDoubleClick={()=>onChange(\'oscilloscope\')}'));
  assert.ok(visuals.includes('readStereoSpectrumSnapshots()'));
  assert.ok(visuals.includes('readStereoWaveformSnapshots()'));
  for(const color of ['#39ff14','#b34dff'])assert.ok(visuals.includes(color));
});
test('welcome artwork fits visible alpha bounds against the outer button edges',()=>{
  const welcome=read('src/components/WaveformView.tsx'),fit=read('src/components/WelcomeArtwork.tsx');
  assert.equal((welcome.match(/<WelcomeArtwork\/>/g)||[]).length,1);
  for(const token of ['getImageData','>=12','b.right-a.left','ResizeObserver','crop.width','crop.height','translateX'])assert.ok(fit.includes(token));
  assert.ok(fit.includes("../medias/mix.png?url"));
});
test('continuous green header waves follow amplitude only and stay anchored',()=>{
  const code=read('src/components/HeaderParticles.tsx'),css=read('src/components/headerParticles.css');
  for(const token of ['audioEngine.readLiveMeters()','meters.leftRms,meters.rightRms','if(!audioEngine.isPlaying||reduced.matches||document.hidden)','if(target===0)','ctx.moveTo(0,21)','waveOffset(x,width,now*.004,level)','ctx.lineTo(width,21)','createLinearGradient','cancelAnimationFrame(frame)','observer.disconnect()','aria-hidden="true"'])assert.ok(code.includes(token),token);
  assert.equal((code.match(/<canvas /g)||[]).length,2);
  for(const absent of ['readHeaderTempo','getCurrentSample','kick','Math.random','setInterval','stroke-dasharray'])assert.ok(!code.includes(absent),absent);
  assert.ok(css.includes('canvas[data-side="left"]{right:100%}'));assert.ok(css.includes('canvas[data-side="right"]{left:100%}'));
  assert.ok(code.includes("'#39ff1400'"));assert.ok(css.includes('pointer-events:none!important'));assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));
});
test('tutorial retains three equal purple buttons with green contour only',()=>{
  const labels=Array.from(read('src/components/Tutorial.tsx').matchAll(/\{label:"([^"]*)",href:"[^"]*"\}/g),m=>m[1]);
  assert.deepEqual(labels,['Telegram','Github','Paypal']);
  const css=read('src/components/tutorial.css').split('/* v1.6 compact equal community buttons */')[1];
  for(const token of ['width:100px','height:32px','background:#7928b5!important','border-color:#39ff14'])assert.ok(css.includes(token));
  assert.ok(!css.includes('background:#166b21'));
});
