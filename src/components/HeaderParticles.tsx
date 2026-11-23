import {useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import {waveLevel,waveOffset} from '../utils/headerWaveMath.mjs';
import './headerParticles.css';
export function HeaderParticles(){
  const host=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const node=host.current;if(!node)return;
    const canvases=Array.from(node.querySelectorAll('canvas'));
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let frame=0,last=0,level=0;
    const clear=()=>{for(const canvas of canvases){const ctx=canvas.getContext('2d');ctx?.clearRect(0,0,canvas.width,canvas.height);}};
    const resize=()=>{
      const rect=node.getBoundingClientRect(),dpr=Math.min(2,window.devicePixelRatio||1);
      canvases.forEach((canvas,i)=>{
        const width=Math.max(0,Math.min(360,i===0?rect.left-12:window.innerWidth-rect.right-12));
        canvas.style.width=`${width}px`;canvas.style.height='42px';
        canvas.width=Math.round(width*dpr);canvas.height=Math.round(42*dpr);
      });
    };
    const observer=new ResizeObserver(resize);observer.observe(node);window.addEventListener('resize',resize);resize();
    const tick=(now:number)=>{
      const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
      if(!audioEngine.isPlaying||reduced.matches||document.hidden){level=0;clear();frame=requestAnimationFrame(tick);return;}
      const meters=audioEngine.readLiveMeters(),target=waveLevel(true,meters.leftRms,meters.rightRms);
      if(target===0){level=0;clear();frame=requestAnimationFrame(tick);return;}
      level+=(target-level)*(1-Math.exp(-dt/(target>level?.035:.12)));
      canvases.forEach((canvas,i)=>{
        const ctx=canvas.getContext('2d');if(!ctx)return;
        const width=parseFloat(canvas.style.width);ctx.clearRect(0,0,canvas.width,canvas.height);if(width<2)return;
        ctx.save();ctx.scale(canvas.width/width,canvas.height/42);
        if(i===0){ctx.translate(width,0);ctx.scale(-1,1);}
        ctx.beginPath();ctx.moveTo(0,21);
        for(let x=2;x<width;x+=2)ctx.lineTo(x,21+waveOffset(x,width,now*.004,level));
        ctx.lineTo(width,21);
        const glow=ctx.createLinearGradient(0,0,width,0);
        glow.addColorStop(0,'#39ff14');glow.addColorStop(.5,'#39ff14');glow.addColorStop(.85,'#39ff1450');glow.addColorStop(1,'#39ff1400');
        ctx.globalAlpha=Math.min(1,level*3);ctx.lineCap='round';ctx.lineJoin='round';ctx.strokeStyle=glow;ctx.lineWidth=1.8;ctx.shadowColor='#39ff14';ctx.shadowBlur=7;ctx.stroke();
        const core=ctx.createLinearGradient(0,0,width,0);
        core.addColorStop(0,'#eaffdf');core.addColorStop(.55,'#caffb8');core.addColorStop(1,'#caffb800');
        ctx.strokeStyle=core;ctx.lineWidth=.65;ctx.shadowBlur=2;ctx.stroke();ctx.restore();
      });
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',resize);clear();};
  },[]);
  return <span ref={host} className="atz-header-particles" aria-hidden="true"><canvas data-side="left"/><canvas data-side="right"/></span>;
}
