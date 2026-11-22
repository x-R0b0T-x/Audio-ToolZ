import './livePreviewRelay.test';
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {applyMusicalDelay} from './musicalDelay';
import {AudioEngine} from './engine';
test('free delay works without BPM or musical division',()=>{
 const source=new Float32Array(1000);source[0]=.2;
 const out=applyMusicalDelay([source],1000,0,-1,'ping-pong',2,100,-100,100);
 assert.ok(Math.abs(out[0][100]-.2)<1e-6);assert.ok(Math.abs(out[1][200]-.17)<1e-6);
 assert.equal(source[100],0);
});
test('free delay validates its duration',()=>{for(const ms of [0,-1,Infinity,4001])assert.throws(()=>applyMusicalDelay([new Float32Array(1000)],1000,0,0,'mono',1,100,0,ms));});
test('normal playback accepts a live buffer replacement without enabling a loop',()=>{
 const nodes:any[]=[];
 const param=()=>({value:0,setValueAtTime(){},setTargetAtTime(){},linearRampToValueAtTime(){}});
 const node=()=>({gain:param(),pan:param(),playbackRate:param(),connect(){},disconnect(){},start(...args:any[]){(this as any).started=args;},stop(){},loop:false,onended:null as any});
 class Context{
  state='running';currentTime=0;sampleRate=1000;destination={};
  createGain(){return node();}createStereoPanner(){return node();}createChannelSplitter(){return node();}createChannelMerger(){return node();}createAnalyser(){return node();}
  createBuffer(ch:number,n:number,rate:number){const data=Array.from({length:ch},()=>new Float32Array(n));return {getChannelData:(i:number)=>data[i],length:n,sampleRate:rate,duration:n/rate};}
  createBufferSource(){const n=node();nodes.push(n);return n;}
 }
 const prior=(globalThis as any).window;(globalThis as any).window={AudioContext:Context,setTimeout:(callback:()=>void)=>{callback();return 0;}};
 try{
  const engine=new AudioEngine(),source=new Float32Array(4000);engine.play([source],1000,0,4000,{loop:false});
  const ctx=(engine as any).ctx as Context;ctx.currentTime=.5;const before=engine.getCurrentSample();
  assert.equal(engine.replacePreviewAudio([new Float32Array(4000)],1000,{loop:false}),true);
  assert.equal(nodes[nodes.length-1].loop,false);assert.ok(Math.abs(engine.getCurrentSample()-before)<1);
  ctx.currentTime=.7;assert.ok(engine.getCurrentSample()>before);engine.stop();assert.equal(engine.replacePreviewAudio([source],1000),false);
 }finally{(globalThis as any).window=prior;}
});
test('Delay restores the compact row, vertical mode switch and in-panel BPM detection',()=>{
 const modal=readFileSync('src/components/EffectModal.tsx','utf8');
 for(const label of ['Temps','Répétitions','Volume de l’effet','Panoramique de départ'])assert.ok(modal.includes(`label="${label}"`));
 assert.ok(modal.includes('wet:0,pan:0'));assert.ok(modal.includes('<DelayModeSwitch'));
 assert.ok(modal.includes('Détection BPM'));assert.ok(modal.includes('delayBpm.worker.ts'));assert.ok(modal.includes('blocked,bpm]'));
 assert.ok(!modal.includes('Ctrl+B'));assert.ok(!modal.includes('delayMs'));assert.ok(!modal.includes('c.sync'));
 assert.ok(modal.includes('bpm,c.division,c.mode,c.repetitions,c.wet,c.pan)'));
 const detection=modal.slice(modal.indexOf('const detectBpm='),modal.indexOf('const change='));
 assert.ok(!detection.includes('change('));assert.ok(!detection.includes('set(c'));assert.ok(!detection.includes('audioEngine.stop'));
 const app=readFileSync('src/App.tsx','utf8');assert.ok(app.includes('if(!audioEngine.isPlaying){setIsPreviewPlaying(false);return;}'));
});
test('Delay reuses Audio ToolZ knob states with scoped violet and green styles',()=>{
 const controls=readFileSync('src/components/EffectControls.tsx','utf8'),states=readFileSync('src/components/knobStates.css','utf8'),css=readFileSync('src/components/delayPanel.css','utf8');
 assert.ok(controls.includes("import './knobStates.css'"));assert.ok(states.includes('.atz-knob:hover'));assert.ok(states.includes('.atz-knob.is-adjusting'));
 assert.ok(css.includes('background:#3d2466'));assert.ok(css.includes('color:#39ff14'));assert.ok(css.includes('.atz-delay-panel .atz-knob output'));
 assert.ok(css.includes('.atz-delay-row{display:flex'));assert.ok(!css.includes('grid-template-columns'));
});
