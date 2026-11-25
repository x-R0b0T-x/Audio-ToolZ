import {useEffect,useState} from 'react';
import type {RefObject} from 'react';
import './effectStatus.css';
export function EffectStatus({panelRef}:{panelRef:RefObject<HTMLElement|null>}){
 const [text,setText]=useState('Choisissez un réglage');
 useEffect(()=>{
  const panel=panelRef.current;if(!panel)return;
  let active:Element|null=null,frame=0;
  const read=()=>{
   frame=0;
   const existing=panel.querySelector('.zonyx-rv-info output');
   if(existing?.textContent){setText(existing.textContent);return;}
   if(!active||!panel.contains(active))return;
   const control=active.matches('input,select,[role="slider"]')?active:active.querySelector('input[type="range"],select,[role="slider"]');
   if(!control)return;
   const group=control.closest('.zonyx-parameter,.zonyx-gain,.zonyx-knob,label,[role="group"]');
   let displayGroup=group??control.parentElement;while(displayGroup&&displayGroup!==panel&&!displayGroup.querySelector('output'))displayGroup=displayGroup.parentElement;
   const label=control.getAttribute('aria-label')??group?.querySelector('span')?.textContent??'Réglage';
   const value=control.getAttribute('aria-valuetext')??(control instanceof HTMLSelectElement?control.selectedOptions[0]?.textContent:displayGroup?.querySelector('output')?.textContent??(control instanceof HTMLInputElement?control.value:control.getAttribute('aria-valuenow')));
   if(value)setText(`${label} : ${value}`);
  };
  const schedule=()=>{if(!frame)frame=requestAnimationFrame(read);};
  const track=(event:Event)=>{
   const target=event.target;if(!(target instanceof Element)||target.closest('footer,header'))return;
   const group=target.closest('.zonyx-parameter,.zonyx-gain,.zonyx-knob,label');
   active=group??target;
   if(target instanceof HTMLButtonElement&&(target.hasAttribute('aria-pressed')||target.hasAttribute('aria-checked'))){
    setText(`${target.closest('[role="group"],[role="radiogroup"]')?.getAttribute('aria-label')??'Mode'} : ${target.textContent?.trim()}`);active=null;
   }
   schedule();
  };
  const events=['input','change','pointerdown','pointermove','keydown','wheel','dblclick','click'];
  for(const name of events)panel.addEventListener(name,track,true);
  const observer=new MutationObserver(mutations=>{if(mutations.some(m=>!(m.target instanceof Element?m.target:m.target.parentElement)?.closest('.zonyx-effect-status')))schedule();});
  observer.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-valuenow','aria-valuetext','aria-pressed','aria-checked','value']});
  schedule();
  return()=>{observer.disconnect();cancelAnimationFrame(frame);for(const name of events)panel.removeEventListener(name,track,true);};
 },[panelRef]);
 return <div className="zonyx-effect-status"><span className="zonyx-status-badge" aria-hidden="true"><svg viewBox="0 0 76 36"><path className="zonyx-status-shape" d="M5 1H57Q60 1 61 4L75 31Q77 35 72 35H5Q1 35 1 31V5Q1 1 5 1Z"/>{[0,1,2].map(i=><path key={i} className={`zonyx-status-chevron zonyx-status-chevron-${i}`} d="M0 0L6 6L0 12" transform={`translate(${17+i*15} 12)`}/>)}</svg></span><output aria-live="off" title={text}>{text}</output></div>;
}
