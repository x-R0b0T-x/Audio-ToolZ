import React,{useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import helpImage from '../medias/help.png?url';
import './closeGuard.css';
import './zonyxHalo.css';
type Tauri={invoke:(command:string,args?:Record<string,unknown>)=>Promise<unknown>};
const tauri=()=>(window as unknown as {__TAURI_INTERNALS__?:Tauri}).__TAURI_INTERNALS__;
const WAVE_PATH=Array.from({length:4},(_,i)=>{const o=i*200;return `M${o} 50 H${o+55} L${o+65} 46 L${o+75} 50 L${o+85} 50 L${o+93} 14 L${o+105} 88 L${o+115} 36 L${o+123} 50 H${o+200}`;}).join(' ');
const hasOpenAudio=()=>{const button=document.querySelector<HTMLButtonElement>('button[aria-label="Vue totale"]');return Boolean(button&&!button.disabled);};
const exportOpen=()=>Boolean(document.querySelector('[aria-labelledby="export-modal-title"]'));
export function CloseGuard(){
 const [open,setOpen]=useState(false),cancel=useRef<HTMLButtonElement>(null),pending=useRef(false),seen=useRef(false);
 useEffect(()=>{
  const api=tauri();if(!api)return;
  let known:boolean|null=null,frame=0,quitTimer=0;
  const quitNow=()=>{void api.invoke('quit_app');};
  const sync=()=>{
   frame=0;
   if(pending.current){if(exportOpen())seen.current=true;else if(seen.current){pending.current=false;seen.current=false;}}
   const active=hasOpenAudio();if(active===known)return;known=active;void api.invoke('set_close_guard',{active}).catch(()=>{known=null;});
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(sync);};
  const observer=new MutationObserver(schedule);
  observer.observe(document.getElementById('root')??document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['disabled']});
  const request=()=>{if(hasOpenAudio())setOpen(true);else quitNow();};
  const exported=()=>{if(!pending.current)return;pending.current=false;seen.current=false;window.clearTimeout(quitTimer);quitTimer=window.setTimeout(quitNow,800);};
  window.addEventListener('audio-toolz:close-requested',request);window.addEventListener('audio-toolz:exported',exported);schedule();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);window.clearTimeout(quitTimer);window.removeEventListener('audio-toolz:close-requested',request);window.removeEventListener('audio-toolz:exported',exported);};
 },[]);
 useEffect(()=>{if(open)cancel.current?.focus();},[open]);
 if(!open)return null;
 const quit=()=>{void tauri()?.invoke('quit_app');};
 const saveAndClose=()=>{
  setOpen(false);pending.current=true;seen.current=false;
  window.setTimeout(()=>{if(!seen.current)pending.current=false;},3000);
  const trigger=[...document.querySelectorAll<HTMLButtonElement>('.zonyx-menu-trigger')].find(b=>b.textContent?.trim()==='Fichier');
  trigger?.click();
  window.setTimeout(()=>{[...document.querySelectorAll<HTMLButtonElement>('[role="menuitem"]')].find(b=>b.textContent?.includes('Exporter'))?.click();},60);
 };
 const keys=(event:React.KeyboardEvent<HTMLElement>)=>{
  event.stopPropagation();
  if(event.key==='Escape'){event.preventDefault();setOpen(false);return;}
  if(event.key!=='Tab')return;
  const buttons=[...event.currentTarget.querySelectorAll<HTMLButtonElement>('button')],first=buttons[0],end=buttons[buttons.length-1];
  if(event.shiftKey&&document.activeElement===first){event.preventDefault();end.focus();}
  else if(!event.shiftKey&&document.activeElement===end){event.preventDefault();first.focus();}
 };
 return createPortal(<div className="zonyx-close-guard" onKeyDown={keys}><section role="dialog" aria-modal="true" aria-labelledby="zonyx-close-guard-title" aria-describedby="zonyx-close-guard-text" className="zonyx-close-guard-panel"><h2 id="zonyx-close-guard-title">Vous me quittez comme ça</h2><div className="zonyx-close-guard-art"><span className="zonyx-close-guard-wave" aria-hidden="true"><svg viewBox="0 0 800 100" preserveAspectRatio="none" focusable="false"><path d={WAVE_PATH} vectorEffect="non-scaling-stroke"/></svg></span><img src={helpImage} alt="" draggable={false}/></div><p id="zonyx-close-guard-text">Un fichier audio est encore ouvert. Si vous quittez sans sauvegarder, vos modifications seront perdues.</p><div className="zonyx-close-guard-actions"><button type="button" className="zonyx-about-community zonyx-close-guard-btn" onClick={quit}>Quitter sans sauvegarder</button><button type="button" className="zonyx-about-community zonyx-close-guard-btn" onClick={saveAndClose}>Sauvegarder et fermer</button><button ref={cancel} type="button" className="zonyx-about-community zonyx-close-guard-btn" onClick={()=>setOpen(false)}>Annuler</button></div></section></div>,document.body);
}
