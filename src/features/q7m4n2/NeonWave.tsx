import React,{useEffect,useRef} from 'react';
import type {RefObject} from 'react';
export function NeonWave({samples,pulse}:{samples:RefObject<Float32Array|null>;pulse:RefObject<number>}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)'),smooth=new Float32Array(256);
  let frame=0,last=0;
  const draw=(now:number)=>{
   const node=canvas.current,ctx=node?.getContext('2d');
   if(node&&ctx&&now-last>=1000/45){
    last=now;const r=node.getBoundingClientRect(),dpr=Math.min(1.5,window.devicePixelRatio||1),w=Math.max(1,r.width),h=Math.max(1,r.height);
    if(node.width!==Math.round(w*dpr)||node.height!==Math.round(h*dpr)){node.width=Math.round(w*dpr);node.height=Math.round(h*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
    const source=samples.current,beat=reduced.matches?0:Math.max(0,Math.min(1,pulse.current));
    ctx.beginPath();
    for(let i=0;i<smooth.length;i++){
     const value=reduced.matches?0:source?.[Math.min((source?.length??1)-1,Math.floor(i*(source?.length??1)/smooth.length))]??0;
     smooth[i]+=(value-smooth[i])*.35;
     const x=i*w/(smooth.length-1),edge=Math.sin(Math.PI*i/(smooth.length-1)),y=h/2-smooth[i]*h*(.28+.14*beat)*edge;
     if(i)ctx.lineTo(x,y);else ctx.moveTo(x,y);
    }
    ctx.lineJoin='round';ctx.lineCap='round';
    ctx.strokeStyle='rgba(57,255,20,.12)';ctx.lineWidth=18+6*beat;ctx.stroke();
    ctx.strokeStyle='rgba(57,255,20,.28)';ctx.lineWidth=8+4*beat;ctx.stroke();
    ctx.strokeStyle='#39ff14';ctx.lineWidth=3;ctx.stroke();
    ctx.strokeStyle='#eaffdf';ctx.lineWidth=1.2;ctx.stroke();
   }
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[samples,pulse]);
 return <canvas ref={canvas} className="zonyx-party-wave" aria-hidden="true"/>;
}
