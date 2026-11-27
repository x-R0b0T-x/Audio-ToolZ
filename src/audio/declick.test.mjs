import test from 'node:test';
import assert from 'node:assert/strict';
import {removeClicks,detectClicks,MIN_SAMPLES} from './declick.mjs';

const RATE=44100;
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function music(seconds,seed=1){
 const n=Math.round(RATE*seconds),r=rng(seed),x=new Float32Array(n);
 for(let i=0;i<n;i++){const t=i/RATE,env=.6+.4*Math.sin(2*Math.PI*.7*t);
  x[i]=env*(.25*Math.sin(2*Math.PI*220*t)+.18*Math.sin(2*Math.PI*330*t+1)+.12*Math.sin(2*Math.PI*440*t+2)+.08*Math.sin(2*Math.PI*1320*t)+.05*Math.sin(2*Math.PI*3100*t))+.002*(r()-.5);}
 return x;
}
const WIDTHS=[1,1,2,3,4,6,8,12,20,40,80,150];
function dirty(clean){
 const x=Float32Array.from(clean),r=rng(7),positions=[];
 WIDTHS.forEach((w,k)=>{
  const p0=Math.floor((k+1)*clean.length/(WIDTHS.length+1)),sign=r()<.5?-1:1;positions.push([p0,w]);
  if(k%2===0)for(let i=0;i<w;i++)x[p0+i]+=.8*(r()-.5)*2*.6+sign*.2;
  else for(let i=0;i<w;i++)x[p0+i]+=sign*(.35+.4*r())*Math.exp(-i/(w*.25+.5));
 });
 return {x,positions};
}
const peak=(a,b,from,to)=>{let m=0;for(let i=from;i<to;i++)m=Math.max(m,Math.abs(a[i]-b[i]));return m;};

test('every injected click is repaired, from 1 sample up to 3.4 ms',()=>{
 const clean=music(6),{x,positions}=dirty(clean),result=removeClicks([x],RATE,{tolerance:1000}),y=result.channels[0];
 for(const [p0,w] of positions){
  const before=peak(x,clean,p0-5,p0+w+25),after=peak(y,clean,p0-5,p0+w+25);
  assert.ok(before>.15,`width ${w}: the injected click must be audible`);
  assert.ok(w>=80?after<before*.25:after<.08,`width ${w}: error ${after.toFixed(4)} after repair, ${before.toFixed(3)} before`);
 }
});

test('samples away from the clicks are never modified',()=>{
 const clean=music(6),{x,positions}=dirty(clean),y=removeClicks([x],RATE,{tolerance:1000}).channels[0],near=new Uint8Array(x.length);
 for(const [p0,w] of positions)for(let i=Math.max(0,p0-60);i<Math.min(x.length,p0+w+120);i++)near[i]=1;
 for(let i=0;i<x.length;i++)if(!near[i])assert.equal(y[i],x[i],`sample ${i}`);
});

test('a clean recording is returned unchanged at the default tolerance',()=>{
 const clean=music(6),result=removeClicks([clean],RATE);
 assert.equal(result.clicks.length,0);
 assert.deepEqual(result.channels[0],clean);
});

test('steady hiss does not trigger repairs',()=>{
 const r=rng(9),y=new Float32Array(RATE*6);
 for(let i=0;i<y.length;i++){const t=i/RATE;y[i]=.25*Math.sin(2*Math.PI*220*t)+.15*Math.sin(2*Math.PI*880*t)+.03*(r()+r()+r()-1.5);}
 assert.equal(removeClicks([y],RATE).clicks.length,0);
});

test('drum hits with abrupt attacks are preserved',()=>{
 const n=RATE*6,r=rng(3),x=new Float32Array(n);
 for(let i=0;i<n;i++){const t=i/RATE;x[i]=.2*Math.sin(2*Math.PI*220*t)+.1*Math.sin(2*Math.PI*660*t)+.02*(r()-.5);}
 for(let h=0;h<10;h++){const p0=Math.floor((h+1)*n/11),snare=h%2;for(let i=0;i<RATE*.25&&p0+i<n;i++){const env=Math.exp(-i/(RATE*(snare?.04:.08)));x[p0+i]+=snare?.7*(r()-.5)*2*env:.8*Math.sin(2*Math.PI*60*i/RATE)*env;}}
 const y=removeClicks([x],RATE).channels[0];let diff=0,energy=0;
 for(let i=0;i<n;i++){diff+=(y[i]-x[i])**2;energy+=x[i]**2;}
 assert.ok(diff/energy<.01,`changed energy ratio ${diff/energy}`);
});

test('each channel is processed independently',()=>{
 const clean=music(6),{x}=dirty(clean),right=Float32Array.from(clean),result=removeClicks([x,right],RATE);
 assert.deepEqual(result.channels[1],right);
 assert.ok(result.clicks.length>0&&result.clicks.every(c=>c.channel===0));
});

test('recordings shorter than 4000 samples are left alone',()=>{
 const short=new Float32Array(MIN_SAMPLES-1).fill(.1);short[1000]=.9;
 const result=removeClicks([short],RATE);
 assert.equal(result.clicks.length,0);assert.deepEqual(result.channels[0],short);
});

test('a lower tolerance never finds fewer clicks',()=>{
 const {x}=dirty(music(6));
 const count=tolerance=>detectClicks(Float64Array.from(x),RATE,{tolerance}).length;
 assert.ok(count(300)>=count(1000),'300 vs 1000');
 assert.ok(count(1000)>=count(5000),'1000 vs 5000');
 assert.ok(count(5000)>0,'5000 still finds the loudest clicks');
});

test('the input is not modified and the output stays finite and within full scale',()=>{
 const {x}=dirty(music(6)),copy=Float32Array.from(x),y=removeClicks([x],RATE).channels[0];
 assert.deepEqual(x,copy);
 for(let i=0;i<y.length;i++)assert.ok(Number.isFinite(y[i])&&Math.abs(y[i])<=1.0001,`sample ${i}`);
});
