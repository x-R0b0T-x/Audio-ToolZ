import React,{useEffect,useRef} from 'react';
import {isolateGreenRing} from './ringMask.mjs';
export function AboutRobot({src}:{src:string}){
 const canvas=useRef<HTMLCanvasElement>(null);
 useEffect(()=>{
  const node=canvas.current,ctx=node?.getContext('2d');if(!node||!ctx||typeof ctx.createConicGradient!=='function')return;
  const image=new Image();let alive=true,frame=0,detach=()=>{};
  image.onload=()=>{if(!alive)return;try{
   const size=Math.round(160*Math.min(2,window.devicePixelRatio||1));node.width=size;node.height=size;
   const source=document.createElement('canvas');source.width=source.height=size;const sourceCtx=source.getContext('2d');if(!sourceCtx)return;
   const scale=Math.min(size/image.naturalWidth,size/image.naturalHeight),w=image.naturalWidth*scale,h=image.naturalHeight*scale;
   sourceCtx.drawImage(image,(size-w)/2,(size-h)/2,w,h);
   const model=isolateGreenRing(sourceCtx.getImageData(0,0,size,size).data,size,size);if(!model)return;
   const mask=document.createElement('canvas');mask.width=mask.height=size;const maskCtx=mask.getContext('2d');if(!maskCtx)return;
   const pixels=maskCtx.createImageData(size,size);for(let i=0;i<model.alpha.length;i++){pixels.data[i*4]=pixels.data[i*4+1]=pixels.data[i*4+2]=255;pixels.data[i*4+3]=model.alpha[i];}maskCtx.putImageData(pixels,0,0);
   const tint=document.createElement('canvas');tint.width=tint.height=size;const tintCtx=tint.getContext('2d');if(!tintCtx)return;
   const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let last=-1;
   const draw=(time:number)=>{
    tintCtx.clearRect(0,0,size,size);tintCtx.globalCompositeOperation='source-over';
    const gradient=tintCtx.createConicGradient(time*2*Math.PI/5000,model.cx,model.cy);
    gradient.addColorStop(0,'#39ff14');gradient.addColorStop(.22,'#39ff1400');gradient.addColorStop(.48,'#b34dff');gradient.addColorStop(.72,'#b34dff00');gradient.addColorStop(1,'#39ff14');
    tintCtx.fillStyle=gradient;tintCtx.fillRect(0,0,size,size);tintCtx.globalCompositeOperation='destination-in';tintCtx.drawImage(mask,0,0);
    ctx.clearRect(0,0,size,size);ctx.globalCompositeOperation='source-over';ctx.filter=`blur(${size/160*3}px)`;ctx.drawImage(tint,0,0);ctx.filter='none';
    ctx.globalCompositeOperation='destination-out';ctx.drawImage(source,0,0);ctx.globalCompositeOperation='source-over';
   };
   const tick=(time:number)=>{if(!alive)return;if(time-last>=32){draw(time);last=time;}frame=requestAnimationFrame(tick);};
   const restart=()=>{cancelAnimationFrame(frame);draw(0);if(!reduced.matches)frame=requestAnimationFrame(tick);};
   reduced.addEventListener('change',restart);detach=()=>reduced.removeEventListener('change',restart);restart();
  }catch{ctx.clearRect(0,0,node.width,node.height);}};
  image.src=src;
  return()=>{alive=false;cancelAnimationFrame(frame);detach();image.onload=null;};
 },[src]);
 return <div className="atz-about-robot"><canvas ref={canvas} aria-hidden="true"/><img src={src} alt="Robot violet aux yeux verts"/></div>;
}
