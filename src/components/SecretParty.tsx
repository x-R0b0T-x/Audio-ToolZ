import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {desktop} from '../utils/desktop';
import {nextSecretClick} from './easterPolicy.mjs';
import './secretParty.css';
const CHANNEL='https://www.youtube.com/@AldenMagiX';
export function SecretHost(p:{enabled:boolean;children:React.ReactNode;audioUrl?:string}){
 const clicks=useRef(0),[open,setOpen]=useState(false);
 useEffect(()=>{if(!p.enabled){clicks.current=0;setOpen(false);}},[p.enabled]);
 return <div className="atz-grid-readable" onClickCapture={e=>{if(!p.enabled||open||e.button!==0||e.detail===0||!(e.target instanceof Element)||!e.target.closest('.atz-brand-logo'))return;clicks.current=nextSecretClick(clicks.current,true);if(clicks.current===30){clicks.current=0;setOpen(true);}}}>{p.children}{open&&p.enabled&&<SecretParty audioUrl={p.audioUrl} onClose={()=>{clicks.current=0;setOpen(false);}}/>}</div>;
}
function SecretParty(p:{onClose:()=>void;audioUrl?:string}){
 const canvas=useRef<HTMLCanvasElement>(null),close=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null),callback=useRef(p.onClose);callback.current=p.onClose;
 const [error,setError]=useState('');
 useEffect(()=>{
  const previous=document.activeElement,root=document.getElementById('root'),wasInert=root?.inert??false;
  if(root)root.inert=true;close.current?.focus();
  const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();callback.current();}else if(e.key==='Tab'){e.preventDefault();(document.activeElement===close.current?link.current:close.current)?.focus();}};
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(root)root.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[]);
 useEffect(()=>{if(!p.audioUrl)return;const audio=new Audio(p.audioUrl);audio.loop=true;audio.volume=.4;void audio.play().catch(()=>console.warn('Easter egg: lecture OGG indisponible'));return()=>{audio.pause();audio.removeAttribute('src');audio.load();};},[p.audioUrl]);
 useEffect(()=>{
  const node=canvas.current,ctx=node?.getContext('2d');if(!node||!ctx)return;
  type Spark={x:number;y:number;vx:number;vy:number;life:number;total:number;color:string};
  const colors=['#b34dff','#ff50d8','#4dbeff','#39ff14'];let sparks:Spark[]=[],w=1,h=1,frame=0,last=0,burstAt=0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const size=()=>{w=window.innerWidth;h=window.innerHeight;const d=Math.min(2,window.devicePixelRatio||1);node.width=Math.round(w*d);node.height=Math.round(h*d);ctx.setTransform(d,0,0,d,0,0);};
  const burst=(x:number,y:number)=>{for(let i=0;i<48;i++){const angle=Math.random()*Math.PI*2,speed=100+Math.random()*340,life=1.1+Math.random()*1.4;sparks.push({x,y,vx:Math.cos(angle)*speed,vy:Math.sin(angle)*speed-60,life,total:life,color:colors[i%4]});}if(sparks.length>384)sparks=sparks.slice(-384);};
  const paint=(now:number)=>{
   frame=requestAnimationFrame(paint);if(now-last<30)return;const dt=last?Math.min(.04,(now-last)/1000):.03;last=now;ctx.clearRect(0,0,w,h);ctx.globalCompositeOperation='lighter';
   if(now>=burstAt){burst(w*.5,h*.53);burst(Math.random()*w,Math.random()*h);burstAt=now+620;}
   sparks=sparks.filter(s=>s.life>0);
   for(const s of sparks){s.life-=dt;s.vy+=70*dt;s.x+=s.vx*dt;s.y+=s.vy*dt;ctx.globalAlpha=Math.max(0,s.life/s.total);ctx.strokeStyle=s.color;ctx.fillStyle=s.color;ctx.shadowColor=s.color;ctx.shadowBlur=12;ctx.lineWidth=2.5;ctx.beginPath();ctx.moveTo(s.x-s.vx*.09,s.y-s.vy*.09);ctx.lineTo(s.x,s.y);ctx.stroke();ctx.beginPath();ctx.arc(s.x,s.y,2.4,0,Math.PI*2);ctx.fill();}
   ctx.globalAlpha=1;ctx.shadowBlur=0;
  };
  size();window.addEventListener('resize',size);
  if(reduced){ctx.fillStyle='#b34dff';for(let i=0;i<65;i++){ctx.beginPath();ctx.arc(Math.random()*w,Math.random()*h,2,0,Math.PI*2);ctx.fill();}}else frame=requestAnimationFrame(paint);
  return()=>{cancelAnimationFrame(frame);window.removeEventListener('resize',size);sparks=[];};
 },[]);
 return createPortal(<div className="atz-party" role="dialog" aria-modal="true" aria-labelledby="atz-party-title">
  <canvas ref={canvas} aria-hidden="true"/>
  <svg className="atz-party-wave" viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120H90L110 105L125 140L140 65L160 190L180 80L200 155L220 110L250 120H390L420 80L440 165L460 30L485 220L510 65L535 160L560 110L590 120H760L790 80L810 170L830 40L850 195L875 70L900 155L930 120H1200"/></svg>
  <button ref={close} className="atz-party-close" type="button" aria-label="Fermer" onClick={()=>callback.current()}>×</button>
  <div className="atz-party-content"><h1 id="atz-party-title">Bravo !!!<br/><span>Tu as découvert un Easter egg !</span></h1>
   <svg className="atz-party-robot" viewBox="0 0 300 320" role="img" aria-label="Robot violet joyeux entouré de vert fluo">
    <defs><linearGradient id="party-metal" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#d58aff"/><stop offset=".45" stopColor="#8c32df"/><stop offset="1" stopColor="#37135e"/></linearGradient></defs>
    <g fill="url(#party-metal)" stroke="#39ff14" strokeWidth="3" strokeLinejoin="round">
     <path d="M102 226Q53 216 33 151L18 127Q12 111 22 109L40 129L38 99Q42 89 48 102L55 129L61 108Q69 99 73 112L67 149Q73 185 116 198Z"/>
     <path d="M198 226Q247 216 267 151L282 127Q288 111 278 109L260 129L262 99Q258 89 252 102L245 129L239 108Q231 99 227 112L233 149Q227 185 184 198Z"/>
     <rect x="91" y="199" width="118" height="85" rx="27"/><rect x="88" y="280" width="55" height="30" rx="13"/><rect x="157" y="280" width="55" height="30" rx="13"/>
     <path d="M150 81V44" strokeWidth="7"/><circle cx="150" cy="32" r="12" fill="#39ff14"/>
     <rect x="40" y="74" width="220" height="132" rx="43"/><rect x="59" y="92" width="182" height="95" rx="29" fill="#160c29" stroke="#ad67f5"/>
    </g>
    <g fill="none" stroke="#39ff14" strokeWidth="9" strokeLinecap="round"><path d="M82 133Q101 105 121 133M179 133Q199 105 218 133"/><path d="M111 153Q150 204 189 153" strokeWidth="6"/></g>
    <path d="M122 163Q150 184 178 163" fill="#fff"/><ellipse cx="81" cy="153" rx="10" ry="5" fill="#ff59d5"/><ellipse cx="219" cy="153" rx="10" ry="5" fill="#ff59d5"/>
    <rect x="112" y="219" width="76" height="41" rx="12" fill="#221035" stroke="#bd7dff" strokeWidth="2"/><path d="M123 241H134L141 227L151 252L161 235L168 241H179" fill="none" stroke="#39ff14" strokeWidth="4"/>
   </svg>
   <div className="atz-party-channel"><svg viewBox="0 0 90 40" aria-hidden="true"><defs><linearGradient id="party-arrow"><stop stopColor="#b34dff"/><stop offset="1" stopColor="#39ff14"/></linearGradient></defs><path d="M5 30Q35 0 75 20M62 7L78 20L62 32" fill="none" stroke="url(#party-arrow)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg><a ref={link} href={CHANNEL} target="_blank" rel="noopener noreferrer" onClick={e=>{const api=desktop();if(api?.openExternalUrl){e.preventDefault();void api.openExternalUrl(CHANNEL).catch(()=>setError('Impossible d’ouvrir le navigateur.'));}}}>Alden MagiX</a></div>
   {error&&<p role="alert">{error}</p>}
  </div>
 </div>,document.body);
}
