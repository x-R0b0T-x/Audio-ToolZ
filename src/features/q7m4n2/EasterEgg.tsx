import {NeonWave} from './NeonWave';
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
 return <div className="zonyx-grid-readable" onClickCapture={e=>{if(!p.enabled||open||e.button!==0||e.detail===0||!(e.target instanceof Element)||!e.target.closest('.zonyx-brand-logo'))return;clicks.current=nextSecretClick(clicks.current,true);if(clicks.current===30){clicks.current=0;setOpen(true);}}}>{p.children}{open&&p.enabled&&<EasterEgg onClose={()=>{clicks.current=0;setOpen(false);}}/>}</div>;
}
function EasterEgg(p:{onClose:()=>void}){
 const dialog=useRef<HTMLDivElement>(null),close=useRef<HTMLButtonElement>(null),link=useRef<HTMLAnchorElement>(null),callback=useRef(p.onClose);callback.current=p.onClose;
 const [error,setError]=useState('');
 const media=useEasterMedia();
 useEffect(()=>{
  const previous=document.activeElement,root=document.getElementById('root'),wasInert=root?.inert??false;
  if(root)root.inert=true;dialog.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{e.stopPropagation();if(e.key==='Escape'){e.preventDefault();callback.current();}else if(e.key==='Tab'){e.preventDefault();const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[]);if(items.length){const index=items.indexOf(document.activeElement as HTMLElement);items[index<0?(e.shiftKey?items.length-1:0):(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}}};
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(root)root.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[]);


 return createPortal(<div ref={dialog} tabIndex={-1} className="zonyx-party" role="dialog" aria-modal="true" aria-labelledby="zonyx-party-title">
  <ParticleField/>
  <NeonWave samples={media.samples} pulse={media.pulse}/>
  <button ref={close} className="zonyx-party-close" type="button" aria-label="Fermer" onClick={()=>callback.current()}>×</button>
  <div className="zonyx-party-content"><h1 id="zonyx-party-title"><svg className="zonyx-party-bravo" viewBox="0 0 900 185" aria-hidden="true"><text x="450" y="145" fill="white" stroke="#a347ff" strokeWidth="11" paintOrder="stroke fill">Bravo !!!</text><text x="450" y="145" fill="none" stroke="#39ff14" strokeWidth="8" className="zonyx-party-streak" aria-hidden="true">Bravo !!!</text><text x="450" y="145" fill="white" aria-hidden="true">Bravo !!!</text></svg><span>Bravo, vous avez trouvé un easter egg</span></h1>
   <img ref={media.robot} className="zonyx-party-media" src={EASTER_MEDIA.robot} alt="ZØNYX, le robot violet aux yeux verts" onError={()=>media.reportError('Illustration indisponible.')}/>
   <div className="zonyx-party-channel"><svg viewBox="0 0 90 40" aria-hidden="true"><defs><linearGradient id="party-arrow"><stop stopColor="#b34dff"/><stop offset="1" stopColor="#39ff14"/></linearGradient></defs><path d="M5 30Q35 0 75 20M62 7L78 20L62 32" fill="none" stroke="url(#party-arrow)" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round"/></svg><a ref={link} href={CHANNEL} target="_blank" rel="noopener noreferrer" onClick={async e=>{const api=desktop();if(api?.openExternalUrl){e.preventDefault();try{await api.openExternalUrl(CHANNEL);callback.current();}catch{setError('Impossible d’ouvrir le navigateur.');}}else{callback.current();}}}>Alden MagiX</a></div>
   {error&&<p role="alert">{error}</p>}{media.problem&&<div role="alert"><p>{media.problem}</p><button type="button" onClick={media.retry}>Réessayer la lecture</button></div>}
  </div>
 </div>,document.body);
}
