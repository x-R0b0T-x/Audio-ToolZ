import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {overviewRange,overviewZoom,overviewPan,balanceGains,kickPulseAt,smoothPulse} from './workspaceMath.mjs';
test('overview pan preserves width and clamps at both ends',()=>{
 assert.deepEqual(overviewRange(1000,350,100),[350,450]);
 assert.deepEqual(overviewRange(1000,-10,100),[0,100]);
 assert.deepEqual(overviewRange(1000,990,100),[900,1000]);
 assert.deepEqual(overviewRange(32,0,64),[0,32]);
 assert.deepEqual(overviewRange(0,0,64),[0,0]);
});
test('wheel up zooms in on a shorter portion and wheel down zooms out around the same centre',()=>{
 const inside=overviewZoom(10000,4000,6000,-120),out=overviewZoom(10000,4000,6000,120);
 assert.ok(inside[1]-inside[0]<2000);assert.ok(out[1]-out[0]>2000);
 assert.ok(Math.abs((inside[0]+inside[1])/2-5000)<=.5);
 assert.ok(Math.abs((out[0]+out[1])/2-5000)<=.5);
 assert.deepEqual(overviewZoom(10000,0,10000,500),[0,10000]);
});
test('a click without movement changes nothing and a drag keeps the zoom level',()=>{
 assert.equal(overviewPan(1000,350,100,0,500),null);
 assert.equal(overviewPan(1000,350,100,2,500),null);
 assert.equal(overviewPan(1000,350,100,-2,500),null);
 assert.deepEqual(overviewPan(1000,350,100,10,500),[370,470]);
 assert.deepEqual(overviewPan(1000,350,100,-10,500),[330,430]);
 assert.deepEqual(overviewPan(1000,350,100,-5000,500),[0,100]);
 assert.deepEqual(overviewPan(1000,350,100,5000,500),[900,1000]);
 assert.deepEqual(overviewPan(1000,350,100,1,500,0),[352,452]);
 for(const dx of [3,17,-9,240]){const panned=overviewPan(100000,20000,6000,dx,800);assert.ok(panned);assert.equal(panned[1]-panned[0],6000);}
 assert.equal(overviewPan(1000,350,100,10,0),null);assert.equal(overviewPan(1000,350,100,NaN,500),null);
});
test('balance only attenuates and isolates original channels at endpoints',()=>{
 assert.deepEqual(balanceGains(0),[1,1]);assert.deepEqual(balanceGains(-1),[1,0]);assert.deepEqual(balanceGains(1),[0,1]);
 for(let n=-200;n<=200;n++){const [left,right]=balanceGains(n/100);assert.ok(left>=0&&left<=1&&right>=0&&right<=1);assert.ok(Math.abs(.99*left)<=.99);assert.ok(Math.abs(-.97*right)<=.97);}
 assert.deepEqual(balanceGains(NaN),[1,1]);
 const engine=readFileSync('src/audio/engine.ts','utf8');assert.ok(engine.includes('setTargetAtTime(gL*bL'));assert.ok(engine.includes('setTargetAtTime(gR*bR'));assert.ok(!engine.includes('pan.setTargetAtTime(this.balance'));assert.ok(!engine.includes('pan.setValueAtTime(this.balance'));
});
test('kick envelope has a continuous rise and release and works again after loop wrap',()=>{
 const kicks=[48000,72000];assert.equal(kickPulseAt(48000,48000,kicks),1);assert.equal(kickPulseAt(60000,48000,kicks),0);
 assert.ok(kickPulseAt(47999,48000,kicks)>.999);assert.ok(kickPulseAt(48001,48000,kicks)>.999);
 assert.equal(kickPulseAt(48000,48000,kicks),1);assert.equal(kickPulseAt(48000,0,kicks),0);
 let level=0;for(let n=0;n<60;n++){const next=smoothPulse(level,1,1/60);assert.ok(next>=level&&next<=1);level=next;}
 assert.ok(level>.99);assert.ok(smoothPulse(level,0,1/60)>0);
});
test('overview handle shows the loop size and navigates the view without touching the loop or playback',()=>{
 const code=readFileSync('src/utils/useOverviewNavigation.ts','utf8');
 assert.ok(code.includes('e.button!==0'));assert.ok(code.includes("'grabbing'"));assert.ok(code.includes("'grab'"));assert.ok(code.includes('setPointerCapture'));
 assert.ok(code.includes('const hasLoop=loopEnd>loopStart'));assert.ok(code.includes('hasLoop?loopStart:viewStart'));assert.ok(code.includes('hasLoop?loopEnd:viewEnd'));
 assert.ok(code.includes('const [start,end]=view.current'));assert.ok(code.includes('setLoopActive(hasLoop)'));assert.ok(code.includes('setLoopActive(false)'));
 assert.ok(code.includes('overviewPan(drag.total,drag.start,drag.length'));assert.ok(code.includes('moved:false'));assert.ok(code.includes('if(drag.moved)move(e);stop();'));
 assert.ok(!code.includes('doc.selection'));assert.ok(!code.includes('options.isLooping,'));assert.ok(!code.includes('audioEngine'));assert.ok(!code.includes('onSelectionChange'));
 const view=readFileSync('src/components/WaveformView.tsx','utf8');
 assert.ok(view.includes('useOverviewNavigation({canvas:overviewCanvasRef'));assert.ok(view.includes('data-testid="snap-kicks-toggle"'));assert.ok(!view.includes('SnapIndicatorPortal'));assert.ok(view.includes('overviewRangeRef.current[0]'));
 const space=readFileSync('src/utils/spaceTransport.mjs','utf8');assert.ok(space.includes('loopActive:()=>isLoopActive()'));assert.ok(!space.includes('data-atz-loop'));
 const sync=readFileSync('src/utils/finalUi.ts','utf8');assert.ok(sync.includes('smoothPulse(level,desired,elapsed)'));assert.ok(sync.includes(':0;'));assert.ok(!sync.includes('now*rate/1000'));
});
