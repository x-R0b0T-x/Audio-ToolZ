import React,{useEffect,useRef} from 'react';
export const ParticleField:React.FC=()=>{
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const node=canvas.current,ctx=node?.getContext('2d');if(!node||!ctx)return;
  type Spark={x:number;y:number;vx:number;vy:number;life:number;total:number;color:string};
  const colors=['#b34dff','#ff50d8','#4dbeff','#39ff14'];let sparks:Spark[]=[],w=1,h=1,frame=0,last=0,burstAt=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const size=()=>{w=window.innerWidth;h=window.innerHeight;const d=Math.min(1.5,window.devicePixelRatio||1);node.width=Math.round(w*d);node.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);};
  const burst=(x:number,y:number)=>{for(let i=0;i<48;i++){const angle=Math.random()*Math.PI*2,speed=100+Math.random()*340,life=1.1+Math.random()*1.4;sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-60,life,total:life,color:colors[i%4]});}if(sparks.length>300)sparks=sparks.slice(-300);};
  const paint=(now:number)=>{
   frame=requestAnimationFrame(paint);if(now-last<30)return;const dt=last?Math.min(.04,(now-last)/1000):.03;last=now;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
   if(now>=burstAt){burst(w*.5,h*.53);burst(Math.random()*w,Math.random()*h);burstAt=now+620;}
   sparks=sparks.filter(s=>s.life>0);
   for(const s of sparks){s.life-=dt;s.vy+=70*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;const alpha=Math.max(0,s.life/s.total);ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.globalAlpha=alpha*.28;ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(s.x-s.vx*.09,s.y-s.vy*.09);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.globalAlpha=alpha;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(s.x-s.vx*.09,s.y-s.vy*.09);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.beginPath();ctx.arc(s.x,s.y,2.4,0,Math.PI*2);ctx.fill();}
   ctx.globalAlpha=1;
  };
  size();window.addEventListener('resize',size);
  if(reduced){ctx.fillStyle='#b34dff';for(let i=0;i<65;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,2,0,Math.PI*2);ctx.fill();}}else frame=requestAnimationFrame(paint);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',size);sparks=[];};
 },[]);
 return <canvas ref={canvas} aria-hidden="true"/>;
};
