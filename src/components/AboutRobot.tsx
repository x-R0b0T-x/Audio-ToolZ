import React,{useEffect,useId,useRef} from 'react';
import {ringMaskUrl,ringCenter} from './about-ring.generated';
export function AboutRobot({src}:{src:string}){
 const id=useId().replace(/:/g,''),front=useRef<SVGLinearGradientElement|null>(null),back=useRef<SVGLinearGradientElement|null>(null);
 useEffect(()=>{
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let frame=0;
  const draw=(angle:number)=>{for(const ref of [front,back])ref.current?.setAttribute('gradientTransform',`rotate(${angle} ${ringCenter[0]} ${ringCenter[1]})`);};
  const tick=(time:number)=>{draw((time%5000)*360/5000);frame=requestAnimationFrame(tick);};
  const restart=()=>{cancelAnimationFrame(frame);draw(45);if(!reduced.matches)frame=requestAnimationFrame(tick);};
  reduced.addEventListener('change',restart);restart();
  return()=>{cancelAnimationFrame(frame);reduced.removeEventListener('change',restart);};
 },[]);
 const light=(side:string,ref:React.RefObject<SVGLinearGradientElement|null>)=>{
  const maskId=`${id}-${side}-mask`,gradientId=`${id}-${side}-light`;
  return <svg className="atz-about-ring" viewBox="0 0 320 320" width="100%" height="100%" aria-hidden="true" focusable="false" style={{maskImage:'none',WebkitMaskImage:'none'}}>
   <defs>
    <mask id={maskId} maskUnits="userSpaceOnUse" x="0" y="0" width="320" height="320" style={{maskType:'alpha'}}><image href={ringMaskUrl} x="0" y="0" width="320" height="320"/></mask>
    <linearGradient ref={ref} id={gradientId} gradientUnits="userSpaceOnUse" x1="0" y1={ringCenter[1]} x2="320" y2={ringCenter[1]}>
     <stop offset="0" stopColor="#39ff14"/><stop offset="0.25" stopColor="#bdffac"/><stop offset="0.45" stopColor="#39ff14" stopOpacity="0"/><stop offset="0.55" stopColor="#b34dff" stopOpacity="0"/><stop offset="0.75" stopColor="#e4bdff"/><stop offset="1" stopColor="#b34dff"/>
    </linearGradient>
   </defs>
   <rect x="0" y="0" width="320" height="320" fill={`url(#${gradientId})`} mask={`url(#${maskId})`}/>
  </svg>;
 };
 return <div className="atz-about-robot"><span className="atz-about-glow" aria-hidden="true">{light('back',back)}</span><img src={src} alt="Robot violet aux yeux verts"/>{light('front',front)}</div>;
}
