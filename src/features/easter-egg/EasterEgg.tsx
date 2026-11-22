import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {desktop} from '../../utils/desktop';
import {nextSecretClick} from './clickCounter.mjs';
import './easterEgg.css';
import {ParticleField} from './ParticleField';
import {useEasterMedia,EASTER_MEDIA} from './useEasterMedia';
const CHANNEL='https://www.youtube.com/@AldenMagiX';
export function EasterEggHost(p:{enabled:boolean;children:React.ReactNode}){
 const clicks=useRef(0),[open,setOpen]=useState(false);
 useEffect(()=>{if(!p.enabled){clicks.current=0;setOpen(false);}},[p.enabled]);
 return <div className="atz-grid-readable" onClickCapture={e=>{if(!p.enabled||open||e.button!==0||e.detail===0||!(e.target instanceof Element)||!e.target.closest('.atz-brand-logo'))return;clicks.current=nextSecretClick(clicks.current,true);if(clicks.current===30){clicks.current=0;setOpen(true);}}}>{p.children}{open&&p.enabled&&<EasterEgg onClose={()=>{clicks.current=0;setOpen(false);}}/>}</div>;
}
function EasterEgg(p:{onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),audio=useRef<HTMLAudioElement>(null),dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null),callback=useRef(p.onClose);callback.current=p.onClose;
 const [error,setError]=useState('');
 const media=useEasterMedia(video,audio);
 useEffect(()=>{
  const previous=document.activeElement,root=document.getElementById('root'),wasInert=root?.inert??false;
  if(root)root.inert=true;close.current?.focus();
  const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();callback.current();}else if(e.key==='Tab'){e.preventDefault();const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[]);if(items.length){const index=items.indexOf(document.activeElement as HTMLElement);items[(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}}};
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(root)root.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[]);


 return createPortal(<div ref={dialog} className="atz-party" role="dialog" aria-modal="true" aria-labelledby="atz-party-title">
  <ParticleField/>
  <svg className="atz-party-wave" viewBox="0 0 1200 240" preserveAspectRatio="none" aria-hidden="true"><path d="M0 120H90L110 105L125 140L140 65L160 190L180 80L200 155L220 110L250 120H390L420 80L440 165L460 30L485 220L510 65L535 160L560 110L590 120H760L790 80L810 170L830 40L850 195L875 70L900 155L930 120H1200"/></svg>
  <button ref={close} className="atz-party-close" type="button" aria-label="Fermer" onClick={()=>callback.current()}>×</button>
  <div className="atz-party-content"><h1 id="atz-party-title">Bravo !!!<br/><span>Tu as découvert un Easter egg !</span></h1>
   <video ref={video} className="atz-party-media" src={EASTER_MEDIA.video} loop muted playsInline preload="auto" aria-label="Robot animé" onError={()=>media.reportError('La vidéo ne peut pas être lue sur cette machine.')}/>
   <audio ref={audio} src={EASTER_MEDIA.audio} loop preload="auto" onError={()=>media.reportError('Le fichier OGG ne peut pas être lu.')}/>
   <div className="atz-party-channel"><svg viewBox="0 0 90 40" aria-hidden="true"><defs><linearGradient id="party-arrow"><stop stopColor="#b34dff"/><stop offset="1" stopColor="#39ff14"/></linearGradient></defs><path d="M5 30Q35 0 75 20M62 7L78 20L62 32" fill="none" stroke="url(#party-arrow)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg><a ref={link} href={CHANNEL} target="_blank" rel="noopener noreferrer" onClick={e=>{const api=desktop();if(api?.openExternalUrl){e.preventDefault();void api.openExternalUrl(CHANNEL).catch(()=>setError('Impossible d’ouvrir le navigateur.'));}}}>Alden MagiX</a></div>
   {error&&<p role="alert">{error}</p>}{media.problem&&<div role="alert"><p>{media.problem}</p><button type="button" onClick={media.retry}>Réessayer la lecture</button></div>}
  </div>
 </div>,document.body);
}
