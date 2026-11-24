import React,{useEffect,useRef} from 'react';
import {alphaBounds,fitRobot} from '../utils/robotFit.mjs';
type Bounds={left:number;top:number;width:number;height:number};
const FULL:Bounds={left:0,top:0,width:1,height:1},boundsCache=new Map<string,Bounds>();
function measure(src:string):Promise<Bounds>{
 const known=boundsCache.get(src);if(known)return Promise.resolve(known);
 return new Promise(resolve=>{
  const image=new Image();
  image.onload=()=>{
   let bounds=FULL;
   try{
    const scale=Math.min(1,256/Math.max(image.naturalWidth,image.naturalHeight,1)),w=Math.max(1,Math.round(image.naturalWidth*scale)),h=Math.max(1,Math.round(image.naturalHeight*scale));
    const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});
    if(ctx){ctx.drawImage(image,0,0,w,h);bounds=alphaBounds(ctx.getImageData(0,0,w,h).data,w,h);}
   }catch{bounds=FULL;}
   boundsCache.set(src,bounds);resolve(bounds);
  };
  image.onerror=()=>resolve(FULL);
  image.src=src;
 });
}
export function AboutRobot({src}:{src:string}){
 const slotRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const slot=slotRef.current,hero=slot?.closest<HTMLElement>('.zonyx-about-hero')??null,actions=hero?.querySelector<HTMLElement>('.zonyx-about-actions')??null;
  if(!slot||!hero||!actions)return;
  let bounds=FULL,alive=true;
  const apply=()=>{
   const links=actions.querySelectorAll('a'),first=links[0],last=links[links.length-1];
   const block=first&&last?last.getBoundingClientRect().bottom-first.getBoundingClientRect().top:actions.getBoundingClientRect().height;
   const fit=fitRobot(bounds,block,slot.getBoundingClientRect().width);
   hero.style.setProperty('--zonyx-fit-size',`${fit.size.toFixed(1)}px`);
   hero.style.setProperty('--zonyx-dx',`${fit.dx.toFixed(1)}px`);
   hero.style.setProperty('--zonyx-dy',`${fit.dy.toFixed(1)}px`);
   hero.style.setProperty('--zonyx-ox',`${fit.ox.toFixed(2)}%`);
   hero.style.setProperty('--zonyx-oy',`${fit.oy.toFixed(2)}%`);
   hero.style.setProperty('--zonyx-room',`${fit.room}px`);
  };
  apply();
  void measure(src).then(found=>{if(!alive)return;bounds=found;apply();});
  const observer=new ResizeObserver(apply);observer.observe(slot);observer.observe(actions);
  return()=>{alive=false;observer.disconnect();};
 },[src]);
 return <div ref={slotRef} className="zonyx-about-robot"><img src={src} alt="Robot violet aux yeux verts"/></div>;
}
