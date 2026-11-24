import {useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import {waveLevel,waveOffset} from '../utils/headerWaveMath.mjs';
import './headerParticles.css';
export function HeaderParticles(){
 const host=useRef<HTMLSpanElement>(null);
 useEffect(()=>{
  const node=host.current;if(!node)return;
  const canvases=Array.from(node.querySelectorAll('canvas')),reduced=matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0,level=0,phase=0;
  const clear=()=>canvases.forEach(c=>c.getContext('2d')?.clearRect(0,0,c.width,c.height));
  const resize=()=>{const r=node.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);canvases.forEach((c,i)=>{const width=Math.max(0,Math.min(360,i===0?r.left-12:innerWidth-r.right-12));c.style.width=`${width}px`;c.style.height='56px';c.width=Math.round(width*dpr);c.height=Math.round(56*dpr);});};
  const observer=new ResizeObserver(resize);observer.observe(node);window.addEventListener('resize',resize);resize();
  const tick=(now:number)=>{
   const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
   if(!audioEngine.isPlaying||reduced.matches||document.hidden){level=0;clear();frame=requestAnimationFrame(tick);return;}
   const m=audioEngine.readLiveMeters(),rms=Math.max(m.leftRms,m.rightRms),peak=Math.max(m.leftPeak,m.rightPeak);
   const target=waveLevel(true,rms,Math.max(rms,peak*.45));
   level+=(target-level)*(1-Math.exp(-dt/(target>level?.012:.075)));phase+=dt*(14+18*level);
   if(level<.002){clear();frame=requestAnimationFrame(tick);return;}
   canvases.forEach((c,i)=>{
    const ctx=c.getContext('2d');if(!ctx)return;ctx.clearRect(0,0,c.width,c.height);const width=parseFloat(c.style.width);if(width<2)return;
    ctx.save();ctx.scale(c.width/width,c.height/56);if(i===0){ctx.translate(width,0);ctx.scale(-1,1);}
    const path=new Path2D();path.moveTo(0,28);for(let x=2;x<width;x+=2)path.lineTo(x,28+waveOffset(x,width,phase,level));path.lineTo(width,28);ctx.lineCap='round';ctx.lineJoin='round';
    const gradient=ctx.createLinearGradient(0,0,width,0);gradient.addColorStop(0,'#baffaa');gradient.addColorStop(.12,'#39ff14');gradient.addColorStop(.4,'#39ff1490');gradient.addColorStop(.75,'#39ff1420');gradient.addColorStop(1,'#39ff1400');
    ctx.strokeStyle=gradient;ctx.shadowColor='#39ff14';ctx.globalAlpha=level;
    ctx.save();ctx.beginPath();ctx.rect(0,0,Math.min(115,width),56);ctx.clip();ctx.shadowBlur=18;ctx.lineWidth=4;ctx.stroke(path);ctx.restore();
    ctx.shadowBlur=7;ctx.lineWidth=2;ctx.stroke(path);ctx.shadowBlur=0;ctx.lineWidth=.65;ctx.globalAlpha=Math.min(1,level*1.5);ctx.stroke(path);ctx.restore();
   });
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);clear();};
 },[]);
 return <span ref={host} className="atz-header-particles" aria-hidden="true"><canvas data-side="left"/><canvas data-side="right"/></span>;
}
