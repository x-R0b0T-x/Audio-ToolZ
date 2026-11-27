import test from 'node:test';
import assert from 'node:assert/strict';
import {FADE_MAX_POINTS,FADE_PRESETS,defaultFade,fadeGain,addFadePoint,moveFadePoint,removeFadePoint,bendFadePoint,normalizeFade,applyFadeShape,fadeGains} from './fadeCurve.mjs';
const near=(a,b,e=1e-6)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
const monotone=(s,dir)=>{let last=dir==='in'?-1:2;for(let i=0;i<=600;i++){const g=fadeGain(s,dir,i/600);assert.ok(Number.isFinite(g)&&g>=-1e-9&&g<=1+1e-9,`range ${g}`);assert.ok(dir==='in'?g>=last-1e-9:g<=last+1e-9,`order ${last} ${g}`);last=g;}};
test('fade endpoints and direction mirror',()=>{
 for(const make of Object.values(FADE_PRESETS)){const s=make();near(fadeGain(s,'in',0),0);near(fadeGain(s,'in',1),1);near(fadeGain(s,'out',0),1);near(fadeGain(s,'out',1),0);near(fadeGain(s,'out',.3),fadeGain(s,'in',.7));monotone(s,'in');monotone(s,'out');}
 near(fadeGain(FADE_PRESETS.linear(),'in',.25),.25);near(fadeGain(defaultFade(),'in',.5),.5);
});
test('a ball is the apex of the rounding and the curve passes exactly through it',()=>{
 for(const y of [.1,.3,.5,.8,.95]){const s={points:[{x:.5,y}]};near(fadeGain(s,'in',.5),y,1e-9);monotone(s,'in');monotone(s,'out');}
 const up={points:[{x:.5,y:.8}]},down={points:[{x:.5,y:.2}]};
 assert.ok(fadeGain(up,'in',.25)>.25&&fadeGain(up,'in',.75)>.75);
 assert.ok(fadeGain(down,'in',.25)<.25&&fadeGain(down,'in',.75)<.75);
});
test('the curve is smooth around a ball (no corner)',()=>{
 for(const y of [.2,.5,.8]){const s={points:[{x:.5,y}]},e=.002,left=(fadeGain(s,'in',.5)-fadeGain(s,'in',.5-e))/e,right=(fadeGain(s,'in',.5+e)-fadeGain(s,'in',.5))/e;assert.ok(Math.abs(left-right)<.08,`${left} ${right}`);}
});
test('points stay ordered and every curve stays monotone',()=>{
 let s=FADE_PRESETS.linear();
 s=addFadePoint(s,.3,.6);s=addFadePoint(s,.7,.2);s=addFadePoint(s,.5,.9);s=addFadePoint(s,.31,.5);
 for(let i=1;i<s.points.length;i++)assert.ok(s.points[i].x>s.points[i-1].x&&s.points[i].y>=s.points[i-1].y);
 s=moveFadePoint(s,1,.1,0);assert.ok(s.points[1].x>=s.points[0].x+.02-1e-9);
 monotone(s,'in');monotone(s,'out');
 let seed=7;const rnd=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
 for(let k=0;k<200;k++){let r={points:[]};for(let i=0;i<6;i++)r=addFadePoint(r,rnd(),rnd());for(let i=0;i<4;i++)r=moveFadePoint(r,Math.floor(rnd()*r.points.length),rnd(),rnd());monotone(r,'in');}
});
test('add, remove and gap rules',()=>{
 let s=addFadePoint(FADE_PRESETS.linear(),.5,.5);assert.equal(s.points.length,1);
 assert.equal(addFadePoint(s,.51,.5),s);
 s=removeFadePoint(s,0);assert.equal(s.points.length,0);
 const n=normalizeFade({points:[{x:.8,y:.2},{x:.2,y:.9},{x:.2,y:.5}]});
 for(let i=1;i<n.points.length;i++)assert.ok(n.points[i].y>=n.points[i-1].y&&n.points[i].x>n.points[i-1].x);
});
test('applyFadeShape scales samples without touching the source',()=>{
 const src=[new Float32Array(100).fill(1),new Float32Array(100).fill(.5)],out=applyFadeShape(src,'in',FADE_PRESETS.linear());
 near(out[0][0],0);near(out[0][99],1);near(out[1][99],.5);assert.equal(src[0][0],1);
 const g=fadeGains(FADE_PRESETS.scurve(),'out',2);near(g[0],1);near(g[1],0);
});
test('bulk gains equal the per-sample gain',()=>{
 const s=addFadePoint(addFadePoint(FADE_PRESETS.scurve(),.1,.01),.9,.99);
 for(const dir of ['in','out']){const g=fadeGains(s,dir,1001);for(let i=0;i<1001;i+=37)near(g[i],fadeGain(s,dir,i/1000),1e-5);}
});
test('wheel up raises the ball and rounds the curve upward, wheel down lowers it',()=>{
 const s=addFadePoint(FADE_PRESETS.linear(),.5,.5),up=bendFadePoint(s,0,.1),down=bendFadePoint(s,0,-.1);
 assert.ok(up.points[0].y>.5&&down.points[0].y<.5);near(up.points[0].x,.5);
 assert.ok(fadeGain(up,'in',.25)>.25&&fadeGain(down,'in',.25)<.25);
 assert.ok(fadeGain(up,'out',.75)>.25);
 const top=bendFadePoint(bendFadePoint(s,0,5),0,5);assert.ok(top.points[0].y<=1);
 assert.equal(bendFadePoint(s,3,.1),s);
 monotone(up,'in');monotone(down,'out');monotone(top,'in');
});
test('the number of points is limited',()=>{
 let s=FADE_PRESETS.linear();for(let i=1;i<=20;i++)s=addFadePoint(s,i/21,i/21);
 assert.equal(s.points.length,FADE_MAX_POINTS);assert.equal(addFadePoint(s,.015,.01),s);
});
