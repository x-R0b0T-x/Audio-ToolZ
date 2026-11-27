import React,{useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import {addFadePoint,bendFadePoint,fadeGainIn,moveFadePoint,removeFadePoint,type FadeShape} from '../audio/fadeCurve.mjs';
import type {FadeDirection} from '../audio/types';
import './fadeEditor.css';
type Props={direction:FadeDirection|null;shape:FadeShape;onChange:(shape:FadeShape)=>void;start:number;length:number};
type Drag={index:number;pointer:number;cx:number;cy:number;sx:number;sy:number;fx:number;fy:number;axis:null|'x'|'y'};
const W=440,H=232,L=44,T=14,PW=360,PH=180,COLS=8,ROWS=4;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export function FadeEditor(p:Props){
 const svg=useRef<SVGSVGElement>(null),head=useRef<SVGLineElement>(null),drag=useRef<Drag|null>(null),latest=useRef(p);latest.current=p;
 const out=p.direction==='out',active=p.direction!==null;
 const px=(x:number)=>L+PW*(out?1-x:x),py=(g:number)=>T+PH*(1-g);
 const metrics=()=>{const r=svg.current!.getBoundingClientRect();return {left:r.left,top:r.top,k:W/Math.max(1,r.width)};};
 const down=(e:React.PointerEvent<SVGSVGElement>)=>{
  if(!active||e.button!==0)return;
  e.preventDefault();
  const m=metrics(),fx=clamp(((e.clientX-m.left)*m.k-L)/PW,0,1),gy=clamp(1-((e.clientY-m.top)*m.k-T)/PH,0,1),sx=out?1-fx:fx,before=latest.current.shape,next=addFadePoint(before,sx,gy);
  if(next===before)return;
  let index=0;next.points.forEach((pt,i)=>{if(Math.abs(pt.x-sx)<Math.abs(next.points[index].x-sx))index=i;});
  const pt=next.points[index];
  latest.current.onChange(next);
  e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={index,pointer:e.pointerId,cx:e.clientX,cy:e.clientY,sx:e.clientX,sy:e.clientY,fx:pt.x,fy:pt.y,axis:null};
 };
 const grab=(e:React.PointerEvent<SVGElement>,index:number,fx:number,fy:number)=>{
  e.stopPropagation();
  if(!active)return;
  if(e.button===2){e.preventDefault();latest.current.onChange(removeFadePoint(latest.current.shape,index));return;}
  if(e.button!==0)return;
  e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={index,pointer:e.pointerId,cx:e.clientX,cy:e.clientY,sx:e.clientX,sy:e.clientY,fx,fy,axis:null};
 };
 const move=(e:React.PointerEvent<SVGSVGElement>)=>{
  const d=drag.current;if(!d||e.pointerId!==d.pointer)return;
  if(e.buttons===0){drag.current=null;return;}
  const k=metrics().k;let mx=(e.clientX-d.cx)*k,my=(e.clientY-d.cy)*k;d.cx=e.clientX;d.cy=e.clientY;
  if(e.altKey){
   if(d.axis===null){const ax=Math.abs(e.clientX-d.sx),ay=Math.abs(e.clientY-d.sy);if(ax+ay>=4)d.axis=ax>=ay?'x':'y';}
   if(d.axis==='x')my=0;else if(d.axis==='y')mx=0;else{mx=0;my=0;}
  }else d.axis=null;
  const fine=e.shiftKey?.1:1,flip=latest.current.direction==='out'?-1:1;
  d.fx=clamp(d.fx+flip*mx*fine/PW,0,1);d.fy=clamp(d.fy-my*fine/PH,0,1);
  let x=d.fx,y=d.fy;if(e.ctrlKey){x=Math.round(x*COLS)/COLS;y=Math.round(y*ROWS)/ROWS;}
  latest.current.onChange(moveFadePoint(latest.current.shape,d.index,x,y));
 };
 const release=()=>{drag.current=null;};
 useEffect(()=>{
  const node=svg.current;if(!node)return;
  const wheel=(e:WheelEvent)=>{
   const target=e.target instanceof Element?e.target.closest('[data-fade-point]'):null,current=latest.current,amount=e.deltaY||e.deltaX;
   if(!target||current.direction===null||!amount)return;
   e.preventDefault();e.stopPropagation();
   const index=Number(target.getAttribute('data-fade-point')),step=e.shiftKey?.01:.05;
   current.onChange(bendFadePoint(current.shape,index,amount<0?step:-step));
  };
  node.addEventListener('wheel',wheel,{passive:false,capture:true});
  return()=>node.removeEventListener('wheel',wheel,true);
 },[]);
 useEffect(()=>{
  let frame=0;
  const tick=()=>{
   const line=head.current;
   if(line){
    const {start,length}=latest.current,session=(audioEngine as typeof audioEngine&{effectPreviewSession?:{start:number;segmentLength:number}}).effectPreviewSession;
    const from=session?.start??start,size=session?.segmentLength??length,fraction=size>0?(audioEngine.getCurrentSample()-from)/size:-1;
    if(audioEngine.isPlaying&&fraction>=0&&fraction<=1){const x=(L+fraction*PW).toFixed(1);line.setAttribute('x1',x);line.setAttribute('x2',x);line.style.visibility='visible';}else line.style.visibility='hidden';
   }
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[]);
 const path=Array.from({length:181},(_,i)=>{const u=i/180;return `${i?'L':'M'}${(L+PW*u).toFixed(1)} ${py(fadeGainIn(p.shape,out?1-u:u)).toFixed(1)}`;}).join(' ');
 const grid=Array.from({length:COLS-1},(_,i)=>`M${L+PW*(i+1)/COLS} ${T}V${T+PH}`).concat(Array.from({length:ROWS-1},(_,j)=>`M${L} ${T+PH*(j+1)/ROWS}H${L+PW}`)).join(' ');
 return <div className="zonyx-fade-wrap">
  <svg ref={svg} className="zonyx-fade-editor" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Courbe de fondu : clic gauche pour créer ou déplacer une boule, clic droit pour l’effacer, molette pour arrondir" style={{opacity:active?1:.45,cursor:active?'crosshair':'not-allowed'}} onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={e=>e.preventDefault()}>
   <rect x={L} y={T} width={PW} height={PH} fill="var(--wave-bg)" stroke="#bd93f9"/>
   <path d={grid} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/>
   {[0,1,2,3,4].map(j=><text key={j} x={L-7} y={T+PH*j/ROWS+4} textAnchor="end">{100-j*25} %</text>)}
   <text x={L} y={T+PH+20}>Début</text><text x={L+PW} y={T+PH+20} textAnchor="end">Fin</text>
   <path d={`${path} L${L+PW} ${T+PH} L${L} ${T+PH} Z`} fill="#39ff1422"/>
   <path d={path} fill="none" stroke="#39ff14" strokeWidth="2.8" strokeLinejoin="round"/>
   <line ref={head} x1={L} x2={L} y1={T} y2={T+PH} stroke="#39ff14" strokeWidth="2" style={{visibility:'hidden',filter:'drop-shadow(0 0 3px #39ff14)'}}/>
   {p.shape.points.map((pt,i)=><g key={`p${i}`} className="zonyx-fade-point-hit" data-fade-point={i} onPointerDown={e=>grab(e,i,pt.x,pt.y)}><circle cx={px(pt.x)} cy={py(pt.y)} r="17" fill="transparent"/><circle className="zonyx-fade-glow" cx={px(pt.x)} cy={py(pt.y)} r="12"/><circle className="zonyx-fade-point" cx={px(pt.x)} cy={py(pt.y)} r="6.5"/></g>)}
  </svg>
  <p className="zonyx-hint">Clic gauche : créer ou déplacer une boule · Clic droit sur une boule : l’effacer · Molette sur une boule : arrondir la courbe · Maj : précision · Ctrl : grille · Alt : un seul axe</p>
 </div>;
}
