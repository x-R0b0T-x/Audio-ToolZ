import test from 'node:test';
import assert from 'node:assert/strict';
import {FADE_MAX_POINTS,FADE_PRESETS,defaultFade,tensionShape,fadeGain,addFadePoint,moveFadePoint,removeFadePoint,bendFadePoint,normalizeFade,applyFadeShape,fadeGains} from './fadeCurve.mjs';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
test('fade endpoints and direction mirror',()=>{
 for(const make of Object.values(FADE_PRESETS)){const s=make();near(fadeGain(s,'in',0),0);near(fadeGain(s,'in',1),1);near(fadeGain(s,'out',0),1);near(fadeGain(s,'out',1),0);near(fadeGain(s,'out',.3),fadeGain(s,'in',.7));}
 near(fadeGain(FADE_PRESETS.linear(),'in',.25),.25);near(fadeGain(defaultFade(),'in',.5),.5);near(tensionShape(.5,0),.5);
});
test('points stay ordered and every curve is monotone',()=>{
 let s=FADE_PRESETS.linear();
 s=addFadePoint(s,.3,.6);s=addFadePoint(s,.7,.2);s=addFadePoint(s,.5,.9);s=addFadePoint(s,.31,.5);
 for(let i=0;i<s.points.length;i++)if(i)assert.ok(s.points[i].x>s.points[i-1].x&&s.points[i].y>=s.points[i-1].y);
 s=moveFadePoint(s,1,.1,0);assert.ok(s.points[1].x>=s.points[0].x+.02-1e-9);
 s=bendFadePoint(bendFadePoint(s,0,.9),1,-.9);
 for(const dir of ['in','out']){let last=dir==='in'?-1:2;for(let i=0;i<=500;i++){const g=fadeGain(s,dir,i/500);assert.ok(Number.isFinite(g)&&g>=-1e-9&&g<=1+1e-9);assert.ok(dir==='in'?g>=last-1e-9:g<=last+1e-9);last=g;}}
});
test('add, remove and gap rules',()=>{
 let s=addFadePoint(FADE_PRESETS.linear(),.5,.5);assert.equal(s.points.length,1);assert.equal(s.tensions.length,2);
 assert.equal(addFadePoint(s,.51,.5),s);
 s=removeFadePoint(s,0);assert.equal(s.points.length,0);assert.equal(s.tensions.length,1);
 const n=normalizeFade({points:[{x:.8,y:.2},{x:.2,y:.9},{x:.2,y:.5}],tensions:[5]});
 assert.equal(n.tensions.length,n.points.length+1);for(const t of n.tensions)assert.ok(Math.abs(t)<=1);
});
test('applyFadeShape scales samples without touching the source',()=>{
 const src=[new Float32Array(100).fill(1),new Float32Array(100).fill(.5)],out=applyFadeShape(src,'in',FADE_PRESETS.linear());
 near(out[0][0],0);near(out[0][99],1);near(out[1][99],.5);assert.equal(src[0][0],1);
 const g=fadeGains(FADE_PRESETS.scurve(),'out',2);near(g[0],1);near(g[1],0);
});
test('bulk gains equal the per-sample gain',()=>{
 const s=addFadePoint(addFadePoint(FADE_PRESETS.scurve(),.2,.1),.8,.95);
 for(const dir of ['in','out']){const g=fadeGains(s,dir,1001);for(let i=0;i<1001;i+=37)near(g[i],fadeGain(s,dir,i/1000),1e-5);}
});
test('wheel up lifts the ball with the curve, wheel down lowers it, and the curve stays monotone',()=>{
 const s=addFadePoint(FADE_PRESETS.linear(),.5,.5),up=bendFadePoint(s,0,.3),down=bendFadePoint(s,0,-.3);
 assert.ok(up.points[0].y>.5&&down.points[0].y<.5);near(up.points[0].x,.5);
 assert.ok(fadeGain(up,'in',.25)>.25&&fadeGain(up,'in',.75)>.75);
 assert.ok(fadeGain(down,'in',.25)<.25&&fadeGain(down,'in',.75)<.75);
 assert.ok(fadeGain(up,'out',.75)>.25);
 const top=bendFadePoint(bendFadePoint(s,0,5),0,5);near(top.tensions[0],-1);assert.ok(top.points[0].y<=1);
 assert.equal(bendFadePoint(s,3,.1),s);
 for(const sh of [up,down,top]){let last=-1;for(let i=0;i<=200;i++){const g=fadeGain(sh,'in',i/200);assert.ok(g>=last-1e-9);last=g;}}
});
test('the number of points is limited',()=>{
 let s=FADE_PRESETS.linear();for(let i=1;i<=20;i++)s=addFadePoint(s,i/21,i/21);
 assert.equal(s.points.length,FADE_MAX_POINTS);assert.equal(addFadePoint(s,.015,.01),s);
});
