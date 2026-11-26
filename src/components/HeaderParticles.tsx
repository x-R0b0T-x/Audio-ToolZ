import {useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import {waveLevel,waveOffset} from '../utils/headerWaveMath.mjs';
import './headerParticles.css';
const PAD=64,HEIGHT=144,MID=HEIGHT/2,MAX_AMP=21,MAX_SEGMENTS=90;
type Branch={at:number;dir:number;len:number;life:number;violet:boolean;seed:number[]};
type Arc={env:Float32Array;jit:Float32Array;avg:number;cool:number;branches:Branch[]};
const newArc=():Arc=>({env:new Float32Array(MAX_SEGMENTS+2),jit:Float32Array.from({length:MAX_SEGMENTS+2},()=>Math.random()),avg:0,cool:0,branches:[]});
export function HeaderParticles(){
 const host=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  const canvases=Array.from(node.querySelectorAll('canvas')),reduced=matchMedia('(prefers-reduced-motion: reduce)'),arcs=canvases.map(()=>newArc());
  let frame=0,last=0,phase=0,refresh=0;const levels=[0,0];
  const clear=()=>canvases.forEach(c=>c.getContext('2d')?.clearRect(0,0,c.width,c.height));
  const resize=()=>{const r=node.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvases.forEach((c,i)=>{const width=Math.max(0,Math.min(360,i===0?r.left-12:innerWidth-r.right-12));c.style.width=`${width+2*PAD}px`;c.style.height=`${HEIGHT}px`;c.width=Math.round((width+2*PAD)*dpr);c.height=Math.round(HEIGHT*dpr);});};
  const observer=new ResizeObserver(resize);observer.observe(node);window.addEventListener('resize',resize);resize();
  const stroke=(ctx:CanvasRenderingContext2D,pts:number[][],style:string|CanvasGradient,lineWidth:number,blur:number,alpha:number,glow:string)=>{
   if(pts.length<2||alpha<=0)return;
   ctx.beginPath();ctx.moveTo(pts[0][0],pts[0][1]);for(let k=1;k<pts.length;k++)ctx.lineTo(pts[k][0],pts[k][1]);
   ctx.strokeStyle=style;ctx.shadowColor=glow;ctx.shadowBlur=blur;ctx.lineWidth=lineWidth;ctx.globalAlpha=Math.min(1,alpha);ctx.stroke();
  };
  const tick=(now:number)=>{
   const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
   if(!audioEngine.isPlaying||reduced.matches||document.hidden){levels[0]=0;levels[1]=0;clear();arcs.forEach(a=>{a.branches.length=0;a.avg=0;a.env.fill(0);});frame=requestAnimationFrame(tick);return;}
   const m=audioEngine.readLiveMeters(),sides=[[m.leftRms,m.leftPeak],[m.rightRms,m.rightPeak]];
   sides.forEach(([rms,peak],i)=>{const target=rms<.0015?0:waveLevel(true,rms,Math.max(rms,peak*.45));levels[i]+=(target-levels[i])*(1-Math.exp(-dt/(target>levels[i]?.012:.075)));});
   phase+=dt*(14+18*Math.max(levels[0],levels[1]));
   if(Math.max(levels[0],levels[1])<.002){clear();arcs.forEach(a=>{a.branches.length=0;a.avg=0;a.env.fill(0);});frame=requestAnimationFrame(tick);return;}
   const spectrum=audioEngine.readStereoSpectrumSnapshots(),waveforms=audioEngine.readStereoWaveformSnapshots(),up=1-Math.exp(-dt/.025),down=1-Math.exp(-dt/.09);
   refresh+=dt;const flicker=refresh>.045;if(flicker)refresh=0;
   canvases.forEach((c,i)=>{
    const ctx=c.getContext('2d'),arc=arcs[i];if(!ctx||!arc)return;
    ctx.clearRect(0,0,c.width,c.height);
    const level=levels[i];
    if(level<.002){arc.branches.length=0;arc.avg=0;arc.env.fill(0);return;}
    const surface=parseFloat(c.style.width),width=surface-2*PAD;if(!(width>=2))return;
    const n=Math.max(6,Math.min(MAX_SEGMENTS,Math.round(width/14))),step=width/n,bins=i===0?spectrum.left:spectrum.right,wave=i===0?waveforms.left:waveforms.right,top=Math.min(bins.length-1,300);
    for(let k=0;k<=n;k++){
     const a=Math.max(1,Math.round(Math.pow(top,k/(n+1)))),b=Math.max(a+1,Math.round(Math.pow(top,(k+1)/(n+1))));
     let sum=0,count=0;for(let j=a;j<=b&&j<bins.length;j++){sum+=bins[j];count++;}
     const e=Math.min(1,(count?Math.pow(sum/count/255,1.25):0)*(1+1.4*k/n));
     arc.env[k]+=(e-arc.env[k])*(e>arc.env[k]?up:down);
     if(flicker)arc.jit[k]=Math.random();
    }
    let bass=0;for(let j=1;j<=5&&j<bins.length;j++)bass+=bins[j];bass/=5*255;
    arc.cool-=dt;
    if(bass-arc.avg>.13&&arc.cool<=0&&arc.branches.length<6){
     const strong=bass-arc.avg>.2;arc.cool=.12;
     for(let q=0;q<(bass-arc.avg>.28?2:1);q++)arc.branches.push({at:Math.max(1,Math.floor(n*(.1+Math.random()*.5))),dir:Math.random()<.5?-1:1,len:Math.max(3,Math.round(n*(.14+Math.random()*.16))),life:1,violet:strong,seed:Array.from({length:12},()=>Math.random())});
    }
    arc.avg+=(bass-arc.avg)*Math.min(1,dt*3);
    let norm=.35;for(let j=0;j<wave.length;j+=4)norm=Math.max(norm,Math.abs(wave[j]));
    const count=Math.max(2,Math.round(width/3)),pts:number[][]=[],vio:number[][]=[];
    for(let k=0;k<=count;k++){
     const x=k/count*width,t=x/step,k0=Math.min(n-1,Math.floor(t)),frac=t-k0,e=(arc.env[k0]*(1-frac)+arc.env[k0+1]*frac)*(.9+.1*arc.jit[k0]);
     const envelope=Math.min(1,x/10)*Math.pow(1-x/width,.55),w=wave[Math.min(wave.length-1,Math.floor(x/width*(wave.length-1)))]/norm;
     pts.push([x,MID+envelope*MAX_AMP*w*(.35+.65*Math.min(1,level*1.2))*(.5+.5*Math.min(1,e*1.6))+waveOffset(x,width,phase,level)*.08]);
     vio.push([x,MID+envelope*MAX_AMP*.8*Math.min(1,e*1.5+.15*level)*Math.sin(x/(34+26*(1-e))*Math.PI*2-phase*1.2)]);
    }
    ctx.save();ctx.scale(c.width/surface,c.height/HEIGHT);if(i===0){ctx.translate(surface,0);ctx.scale(-1,1);}ctx.translate(PAD,0);
    ctx.lineCap='round';ctx.lineJoin='round';
    const g=ctx.createLinearGradient(0,0,width,0);g.addColorStop(0,'#baffaa');g.addColorStop(.12,'#39ff14');g.addColorStop(.5,'#39ff14a0');g.addColorStop(.85,'#39ff1440');g.addColorStop(1,'#39ff1400');
    const core=ctx.createLinearGradient(0,0,width,0);core.addColorStop(0,'#ffffff');core.addColorStop(.2,'#e2ffd9');core.addColorStop(.6,'#39ff1490');core.addColorStop(1,'#39ff1400');
    const violet=ctx.createLinearGradient(0,0,width,0);violet.addColorStop(0,'#e6c2ff');violet.addColorStop(.15,'#b34dff');violet.addColorStop(.6,'#b34dffb0');violet.addColorStop(1,'#b34dff00');
    stroke(ctx,vio,violet,2.2,16,level*1.1,'#b34dff');
    stroke(ctx,vio,'#f1dcff',.7,0,level*.7,'#b34dff');
    for(let q=arc.branches.length-1;q>=0;q--){
     const br=arc.branches[q];br.life-=dt/.14;
     const anchor=pts[Math.min(count-1,Math.round(br.at/n*count))];
     if(br.life<=0||!anchor){arc.branches.splice(q,1);continue;}
     let px=anchor[0],py=anchor[1];const bp:number[][]=[[px,py]];
     for(let s=1;s<=br.len;s++){px+=step*.9;py+=br.dir*step*(.3+.5*br.seed[s%12])*(s%2?1:-.4);py=Math.max(8,Math.min(HEIGHT-8,py));bp.push([px,py]);}
     const colour=br.violet?'#b34dff':'#39ff14';
     stroke(ctx,bp,colour,1.8,12,br.life*level*1.4,colour);stroke(ctx,bp,'#ffffff',.8,0,br.life*Math.min(1,level*1.6),colour);
    }
    stroke(ctx,pts,g,3.5,20,level*.9,'#39ff14');
    stroke(ctx,pts,g,2,8,level,'#39ff14');
    stroke(ctx,pts,core,.9,0,level*1.6,'#39ff14');
    ctx.restore();
   });
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);clear();};
 },[]);
 return <span ref={host} className="zonyx-header-particles" aria-hidden="true"><canvas data-side="left"/><canvas data-side="right"/></span>;
}
