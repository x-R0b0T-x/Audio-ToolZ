import React,{useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import {addFadePoint,fadeGainIn,fadeNodes,moveFadePoint,removeFadePoint,setFadeTension,tensionFromMid,tensionShape,type FadeShape} from '../audio/fadeCurve.mjs';
import type {FadeDirection} from '../audio/types';
import './fadeEditor.css';
type Props={direction:FadeDirection|null;shape:FadeShape;onChange:(shape:FadeShape)=>void;start:number;length:number};
type Drag={kind:'point'|'tension';index:number;pointer:number;cx:number;cy:number;sx:number;sy:number;fx:number;fy:number;axis:null|'x'|'y'};
const W=440,H=232,L=44,T=14,PW=360,PH=180,COLS=8,ROWS=4;
const clamp=(v:number,a:number,b:number)=>Math.min(b,Math.max(a,v));
export function FadeEditor(p:Props){
 const svg=useRef<SVGSVGElement>(null),head=useRef<SVGLineElement>(null),drag=useRef<Drag|null>(null),latest=useRef(p);latest.current=p;
 const out=p.direction==='out',active=p.direction!==null,nodes=fadeNodes(p.shape);
 const px=(x:number)=>L+PW*(out?1-x:x),py=(g:number)=>T+PH*(1-g);
 const metrics=()=>{const r=svg.current!.getBoundingClientRect();return {left:r.left,top:r.top,k:W/Math.max(1,r.width)};};
 const down=(e:React.PointerEvent<SVGSVGElement>)=>{
  if(!active||e.button!==2)return;
  e.preventDefault();
  const m=metrics(),fx=clamp(((e.clientX-m.left)*m.k-L)/PW,0,1),gy=clamp(1-((e.clientY-m.top)*m.k-T)/PH,0,1);
  latest.current.onChange(addFadePoint(latest.current.shape,out?1-fx:fx,gy));
 };
 const grab=(e:React.PointerEvent<SVGElement>,kind:Drag['kind'],index:number,fx:number,fy:number)=>{
  e.stopPropagation();
  if(!active)return;
  if(e.button===2){e.preventDefault();if(kind==='point')latest.current.onChange(removeFadePoint(latest.current.shape,index));return;}
  if(e.button!==0)return;
  e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);
  drag.current={kind,index,pointer:e.pointerId,cx:e.clientX,cy:e.clientY,sx:e.clientX,sy:e.clientY,fx,fy,axis:null};
 };
 const move=(e:React.PointerEvent<SVGSVGElement>)=>{
  const d=drag.current;if(!d||e.pointerId!==d.pointer)return;
  if(e.buttons===0){drag.current=null;return;}
  const k=metrics().k;let mx=(e.clientX-d.cx)*k,my=(e.clientY-d.cy)*k;d.cx=e.clientX;d.cy=e.clientY;
  if(e.altKey&&d.kind==='point'){
   if(d.axis===null){const ax=Math.abs(e.clientX-d.sx),ay=Math.abs(e.clientY-d.sy);if(ax+ay>=4)d.axis=ax>=ay?'x':'y';}
   if(d.axis==='x')my=0;else if(d.axis==='y')mx=0;else{mx=0;my=0;}
  }else d.axis=null;
  const fine=e.shiftKey?.1:1,s=latest.current.shape,flip=latest.current.direction==='out'?-1:1;
  d.fx=clamp(d.fx+flip*mx*fine/PW,0,1);d.fy=clamp(d.fy-my*fine/PH,0,1);
  if(d.kind==='point'){
   let x=d.fx,y=d.fy;if(e.ctrlKey){x=Math.round(x*COLS)/COLS;y=Math.round(y*ROWS)/ROWS;}
   latest.current.onChange(moveFadePoint(s,d.index,x,y));
  }else{
   const all=fadeNodes(s),a=all[d.index],b=all[d.index+1],span=b.y-a.y;if(span<.02)return;
   let t=tensionFromMid((d.fy-a.y)/span);if(e.ctrlKey)t=Math.round(t*4)/4;
   latest.current.onChange(setFadeTension(s,d.index,t));
  }
 };
 const release=()=>{drag.current=null;};
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
  <svg ref={svg} className="zonyx-fade-editor" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Courbe de fondu : clic droit pour ajouter ou supprimer un point" style={{opacity:active?1:.45,cursor:active?'crosshair':'not-allowed'}} onPointerDown={down} onPointerMove={move} onPointerUp={release} onPointerCancel={release} onLostPointerCapture={release} onContextMenu={e=>e.preventDefault()}>
   <rect x={L} y={T} width={PW} height={PH} fill="var(--wave-bg)" stroke="#bd93f9"/>
   <path d={grid} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/>
   {[0,1,2,3,4].map(j=><text key={j} x={L-7} y={T+PH*j/ROWS+4} textAnchor="end">{100-j*25} %</text>)}
   <text x={L} y={T+PH+20}>Début</text><text x={L+PW} y={T+PH+20} textAnchor="end">Fin</text>
   <path d={`${path} L${L+PW} ${T+PH} L${L} ${T+PH} Z`} fill="#39ff1422"/>
   <path d={path} fill="none" stroke="#39ff14" strokeWidth="2.8" strokeLinejoin="round"/>
   <line ref={head} x1={L} x2={L} y1={T} y2={T+PH} stroke="#39ff14" strokeWidth="2" style={{visibility:'hidden',filter:'drop-shadow(0 0 3px #39ff14)'}}/>
   {nodes.slice(0,-1).map((a,i)=>{
    const b=nodes[i+1],span=b.y-a.y;if(span<.02)return null;
    const x=(a.x+b.x)/2,y=a.y+span*tensionShape(.5,p.shape.tensions[i]??0),cx=px(x),cy=py(y);
    return <g key={`t${i}`} className="zonyx-fade-handle" onPointerDown={e=>grab(e,'tension',i,x,y)} onDoubleClick={e=>{e.stopPropagation();if(active)latest.current.onChange(setFadeTension(latest.current.shape,i,0));}}><circle cx={cx} cy={cy} r="13" fill="transparent"/><path d={`M${cx} ${cy-6}L${cx+6} ${cy}L${cx} ${cy+6}L${cx-6} ${cy}Z`}/></g>;
   })}
   {p.shape.points.map((pt,i)=><g key={`p${i}`} className="zonyx-fade-point-hit" onPointerDown={e=>grab(e,'point',i,pt.x,pt.y)}><circle cx={px(pt.x)} cy={py(pt.y)} r="14" fill="transparent"/><circle className="zonyx-fade-point" cx={px(pt.x)} cy={py(pt.y)} r="6.5"/></g>)}
  </svg>
  <p className="zonyx-hint">Clic droit : ajouter ou supprimer un point · Glisser : déplacer · Losange : courbure (double-clic : droite) · Maj : précision · Ctrl : grille · Alt : un seul axe</p>
 </div>;
}
