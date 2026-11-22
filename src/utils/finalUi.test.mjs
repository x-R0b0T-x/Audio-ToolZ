import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {beatPulse,loopSelection,robotBeatPulse} from './finalUiMath.mjs';
test('beat pulse follows sample position and beat origin',()=>{assert.equal(beatPulse(0,120,48000),1);assert.ok(beatPulse(12000,120,48000)<1e-10);assert.equal(beatPulse(24000,120,48000),1);assert.equal(beatPulse(25000,120,48000,1000),1);assert.equal(beatPulse(-24000,120,48000),1);assert.equal(beatPulse(0,0,48000),0);});
test('loop click retains current end or starts a pending new region',()=>{assert.deepEqual(loopSelection(30,80),{startSample:30,endSample:80});assert.deepEqual(loopSelection(90,80),{startSample:90,endSample:90});assert.deepEqual(loopSelection(80,80),{startSample:80,endSample:80});});
test('stopped preview guard precedes audio replacement and fallback playback',()=>{const app=readFileSync('src/App.tsx','utf8'),start=app.indexOf('onStartPreview='),body=app.slice(start,start+2400),guard=body.indexOf('if(!audioEngine.isPlaying){setIsPreviewPlaying(false);return;}');assert.ok(start>=0&&guard>=0);assert.ok(guard<body.indexOf('audioEngine.replacePreviewAudio'));assert.ok(guard<body.indexOf('audioEngine.play('));});
test('About links are precisely allowed by the native opener',()=>{const info=readFileSync('src/components/InfoModal.tsx','utf8'),rust=readFileSync('src-tauri/src/main.rs','utf8');for(const url of ['https://github.com/x-R0b0T-x/Audio-ToolZ','https://www.paypal.com/ncp/payment/GAUJE54VM28T8']){assert.ok(info.includes(url));assert.ok(rust.includes('target != "'+url+'"'));}});
test('changelog main heading is white and bold',()=>{const css=readFileSync('src/textReadability.css','utf8');assert.ok(css.includes('#root #about-changelog-title{color:#fff!important;font-weight:700!important}'));});
test('robot uses only the tempo clock and expands to 170 percent',()=>{
 const code=readFileSync('src/utils/finalUi.ts','utf8');
 const formula=code.match(/const robotPulse=([^;]+);/)?.[1];assert.ok(formula);
 assert.ok(formula.includes('robotBeatPulse(sample,robotTempo.bpm,rate,robotTempo.origin)'));
 for(const input of ['spectrum','desired','level','kickPulseAt'])assert.ok(!formula.includes(input));
 assert.ok(code.includes('scale(${1+.70*robotPulse})'));assert.ok(formula.includes('playing&&!reduced.matches&&robotTempo'));
});
test('About detects unknown tempo only while open and cancels workers',()=>{
 const code=readFileSync('src/utils/finalUi.ts','utf8'),worker=readFileSync('src/audio/aboutTempo.worker.ts','utf8');
 assert.ok(code.includes('if(image)detectRobotTempo()'));assert.ok(code.includes('aboutTempo.worker.ts'));
 assert.ok(code.includes('robotTempoCache.get(doc.channels)'));assert.ok(code.includes('robotTempoCache.set(doc.channels,robotTempo)'));
 assert.ok(code.includes('stopDetection();attempted=false'));assert.ok(code.includes('disposed=true;stopDetection()'));
 assert.ok(worker.includes('detectBpmAndBeats(channels,sampleRate)'));assert.ok(worker.includes('result.beatSamples[0]??0'));
});
test('boom pulses have a fast attack, gradual return and bounded scale on every beat',()=>{
 const rate=48000,origin=1000;
 for(const bpm of [60,90,120,150]){
  const period=rate*60/bpm;
  for(let beat=0;beat<8;beat++)assert.ok(Math.abs(robotBeatPulse(origin+beat*period,bpm,rate,origin)-1)<1e-10);
  assert.ok(Math.abs(robotBeatPulse(origin+.97*period,bpm,rate,origin)-.5)<1e-10);
  assert.ok(Math.abs(robotBeatPulse(origin+.35*period,bpm,rate,origin)-.125)<1e-10);
  assert.equal(robotBeatPulse(origin+.8*period,bpm,rate,origin),0);
  for(let i=-100;i<=1000;i++){const pulse=robotBeatPulse(origin+i*period/1000,bpm,rate,origin);assert.ok(pulse>=0&&pulse<=1);assert.ok(1+.70*pulse<=1.7);}
 }
 for(const args of [[0,0,rate],[NaN,120,rate],[0,120,0],[0,Infinity,rate]])assert.equal(robotBeatPulse(...args),0);
});
test('About reserves the maximum artwork size and keeps small windows scrollable',()=>{
 const css=readFileSync('src/components/aboutLayout.css','utf8');
 assert.ok(css.includes('width:calc(var(--atz-art-size)*1.7 + 16px)'));
 assert.ok(css.includes('height:calc(var(--atz-art-size)*1.7 + 16px)'));
 assert.ok(css.includes('@container (max-width:620px)'));assert.ok(css.includes('overflow-y:auto'));
});
