import './headerWaveMath.test.mjs';
import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import './robotFit.test.mjs';import './spaceTransport.test.mjs';
import './aboutTransport.test.mjs';import './kickMagnet.test.mjs';
import {beatPulse,loopSelection,robotBeatPulse} from './finalUiMath.mjs';
test('beat pulse follows sample position and beat origin',()=>{assert.equal(beatPulse(0,120,48000),1);assert.ok(beatPulse(12000,120,48000)<1e-10);assert.equal(beatPulse(24000,120,48000),1);assert.equal(beatPulse(25000,120,48000,1000),1);assert.equal(beatPulse(-24000,120,48000),1);assert.equal(beatPulse(0,0,48000),0);});
test('loop click retains current end or starts a pending new region',()=>{assert.deepEqual(loopSelection(30,80),{startSample:30,endSample:80});assert.deepEqual(loopSelection(90,80),{startSample:90,endSample:90});assert.deepEqual(loopSelection(80,80),{startSample:80,endSample:80});});
test('stopped preview guard precedes audio replacement and fallback playback',()=>{const app=readFileSync('src/App.tsx','utf8'),start=app.indexOf('onStartPreview='),body=app.slice(start,start+2400),guard=body.indexOf('if(!audioEngine.isPlaying){setIsPreviewPlaying(false);return;}');assert.ok(start>=0&&guard>=0);assert.ok(guard<body.indexOf('audioEngine.replacePreviewAudio'));assert.ok(guard<body.indexOf('audioEngine.play('));});
test('About links are precisely allowed by the native opener',()=>{const info=readFileSync('src/components/InfoModal.tsx','utf8'),rust=readFileSync('src-tauri/src/main.rs','utf8');for(const url of ['https://github.com/x-R0b0T-x/Audio-ToolZ','https://www.paypal.com/ncp/payment/GAUJE54VM28T8']){assert.ok(info.includes(url));assert.ok(rust.includes('target != "'+url+'"'));}});
test('changelog main heading has the exact requested caption and an explicit green override',()=>{
 const info=readFileSync('src/components/InfoModal.tsx','utf8'),css=readFileSync('src/components/headerParticles.css','utf8'),base=readFileSync('src/textReadability.css','utf8');
 assert.ok(info.includes('id="about-changelog-title" className="text-sm font-bold">Changlog depuis la v1.5</h3>'));
 assert.ok(css.includes('#root .atz-about-dialog #about-changelog-title{color:#39ff14!important}'));
 assert.ok(base.includes('font-weight:700!important'));
});
test('robot uses only the tempo clock and expands to 170 percent',()=>{
 const code=readFileSync('src/utils/finalUi.ts','utf8');
 const formula=code.match(/const robotPulse=([^;]+);/)?.[1];assert.ok(formula);
 assert.ok(formula.includes('robotBeatPulse(sample,robotTempo.bpm,rate,robotTempo.origin)'));
 for(const input of ['spectrum','desired','level','kickPulseAt'])assert.ok(!formula.includes(input));
 assert.ok(code.includes('scale(${1+.70*robotPulse})'));assert.ok(formula.includes('playing&&!reduced.matches&&robotTempo'));
});
test('shared tempo detection serves About or active animated playback and retains worker guards',()=>{
 const code=readFileSync('src/utils/finalUi.ts','utf8'),worker=readFileSync('src/audio/aboutTempo.worker.ts','utf8'),particles=readFileSync('src/components/HeaderParticles.tsx','utf8');
 const condition=code.match(/if\((image\|\|[^\n]+)\)detectRobotTempo\(\);/)?.[1];assert.ok(condition,'Shared tempo detection must have an explicit activation gate');
 const enabled=new Function('image','audioEngine','reduced',`return Boolean(${condition});`);
 for(const image of [false,true])for(const playing of [false,true])for(const reduced of [false,true]){
  assert.equal(enabled(image?{}:null,{isPlaying:playing},{matches:reduced}),image||(playing&&!reduced));
 }
 assert.ok(code.includes('if(!doc||!doc.channels[0]?.length||worker||attempted||robotTempo)return;'));
 assert.ok(code.includes('aboutTempo.worker.ts'));
 assert.ok(code.includes('robotTempoCache.get(doc.channels)'));assert.ok(code.includes('robotTempoCache.set(doc.channels,robotTempo)'));
 assert.ok(code.includes('stopDetection();attempted=false'));assert.ok(code.includes('disposed=true;stopDetection()'));
 assert.ok(code.includes('if(disposed||worker!==current)return;'));assert.ok(code.includes('worker?.terminate()'));
 assert.ok(code.includes('export function readHeaderTempo()'));assert.ok(code.includes('headerTempo=robotTempo'));
 assert.ok(particles.includes('audioEngine.readLiveMeters()'));assert.ok(particles.includes('meters.leftRms,meters.rightRms'));assert.ok(!particles.includes('readHeaderTempo'));assert.ok(!particles.includes('getCurrentSample'));assert.ok(!particles.includes('kick'));
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
test('About keeps two columns, the robot on the left, and reserves room for its pulse',()=>{
 const css=readFileSync('src/components/aboutLayout.css','utf8');
 assert.ok(css.includes('grid-template-columns:minmax(0,1.1fr) minmax(150px,1fr)'));
 assert.ok(!css.includes('@container'));assert.ok(!/grid-template-columns:minmax\(0,1fr\)[;}]/.test(css));
 assert.ok(css.includes('padding:var(--atz-room,24px) 12px var(--atz-room,24px) 40px'));
 assert.ok(css.includes('--atz-art-size:var(--atz-fit-size,150px)'));
 assert.ok(css.includes('transform-origin:var(--atz-ox,50%) var(--atz-oy,50%)'));
 assert.ok(css.includes('left:calc(50% + var(--atz-dx,0px))'));assert.ok(css.includes('top:calc(50% + var(--atz-dy,50%))')||css.includes('top:calc(50% + var(--atz-dy,0px))'));
 assert.ok(css.includes('.atz-about-robot{--atz-art-size'));assert.ok(css.includes('z-index:0'));assert.ok(css.includes('.atz-about-actions{position:relative;z-index:1'));
 assert.ok(css.includes('overflow-x:hidden;overflow-y:auto'));
});
test('robot is fitted to its visible drawing and to the block of three links',()=>{
 const code=readFileSync('src/components/AboutRobot.tsx','utf8');
 assert.ok(code.includes('alphaBounds(ctx.getImageData'));assert.ok(code.includes('fitRobot(bounds,block,'));
 assert.ok(code.includes('last.getBoundingClientRect().bottom-first.getBoundingClientRect().top'));
 assert.ok(code.includes('.atz-about-actions'));assert.ok(code.includes('ResizeObserver'));assert.ok(code.includes('--atz-fit-size'));assert.ok(code.includes('--atz-room'));
 assert.ok(code.includes('<img src={src}'));
});
test('About link halos are thinner, sharper and faster',()=>{
 const css=readFileSync('src/components/aboutLayout.css','utf8');
 assert.ok(css.includes('animation:atz-about-ring 1.6s linear infinite'));
 const seconds=Number(css.match(/atz-about-ring ([0-9.]+)s linear/)?.[1]);assert.ok(seconds>0&&seconds<=2);
 assert.ok(css.includes('conic-gradient(from var(--atz-halo-angle)'));assert.ok(css.includes('mask-composite:exclude'));assert.ok(css.includes('inset:-2px;padding:2px'));
 assert.ok(!css.includes('atz-about-bright-halo'));assert.ok(!css.includes('drop-shadow(0 0 18px'));assert.ok(css.includes('drop-shadow(0 0 2px rgba(57,255,20,.75))'));
 assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));assert.ok(css.includes('.atz-about-actions>a::before{animation:none}'));
});
test('Space transport is installed once with the global descriptions and only uses existing controls',()=>{
 const code=readFileSync('src/utils/finalUi.ts','utf8'),space=readFileSync('src/utils/spaceTransport.mjs','utf8');
 assert.ok(code.includes('installSpaceTransport({isPlaying:()=>audioEngine.isPlaying,isRecording:()=>audioEngine.isRecording})'));assert.ok(code.includes('removeSpaceTransport();hide();'));
 assert.ok(space.includes("'.atz-advanced-backdrop'"));assert.ok(space.includes('addEventListener(\'keydown\',down,true)'));assert.ok(space.includes('control.element.click()'));
 assert.ok(!space.includes('audioEngine'));
});
