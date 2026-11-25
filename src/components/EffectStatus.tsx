import {useEffect,useState} from 'react';
import type {RefObject} from 'react';
import './effectStatus.css';
export function EffectStatus({panelRef}:{panelRef:RefObject<HTMLElement|null>}){
 const [text,setText]=useState(''),[adjusting,setAdjusting]=useState(false);
 useEffect(()=>{
  const panel=panelRef.current;if(!panel)return;
  let active:Element|null=null,frame=0,timer:ReturnType<typeof setTimeout>|null=null,pulsing=false,held=false;
  const refreshActivity=()=>setAdjusting(held||pulsing);
  const pulse=()=>{pulsing=true;refreshActivity();if(timer!==null)clearTimeout(timer);timer=setTimeout(()=>{pulsing=false;refreshActivity();},220);};
  const read=()=>{
   frame=0;refreshActivity();if(!held&&!pulsing)return;
   const point=active?.closest('[data-eq-band]');if(point){setText(point.getAttribute('aria-label')??'Réglage');return;}
   const existing=panel.querySelector('.zonyx-rv-info output');
   if(existing?.textContent&&!active?.closest('.zonyx-parameter,.zonyx-gain,.zonyx-knob,input,select,[role="slider"]')){setText(existing.textContent);return;}
   if(!active||!panel.contains(active))return;
   if(active.closest('.zonyx-eq-layout')&&!active.closest('.zonyx-eq-rack')){const frequency=panel.querySelector('.zonyx-eq-frequency');if(frequency?.textContent)setText(frequency.textContent);return;}
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
   const target=event.target;if(!(target instanceof Element)||!target.closest('main')||target.closest('footer,header'))return;
   const group=target.closest('.zonyx-parameter,.zonyx-gain,.zonyx-knob,label');
   const control=target.closest('input,select,[role="slider"],[data-eq-band]')??group?.querySelector('input,select,[role="slider"]')??(event.type==='wheel'&&target.closest('.zonyx-graph.detailed')?panel.querySelector('[data-eq-band]:focus'):null);
   if(control&&!control.closest('[inert],fieldset:disabled')&&!control.matches(':disabled,[aria-disabled="true"]')&&event instanceof PointerEvent&&event.type==='pointerdown'&&event.button===0){held=true;refreshActivity();}
   const moving=event.type==='pointermove'&&event instanceof PointerEvent&&event.buttons!==0;
   const key=event instanceof KeyboardEvent&&['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Home','End','Enter'].includes(event.key);
   if(control&&!control.closest('[inert],fieldset:disabled')&&!(control instanceof HTMLInputElement&&control.disabled)&&(event.type==='input'||event.type==='change'||event.type==='dblclick'||event.type==='wheel'||moving||key))pulse();
   if(event.type==='pointermove'&&!moving)return;
   active=group??control??target;
   if(target instanceof HTMLButtonElement&&(target.hasAttribute('aria-pressed')||target.hasAttribute('aria-checked'))&&event.type==='click'){
    pulse();setText(`${target.closest('[role="group"],[role="radiogroup"]')?.getAttribute('aria-label')??'Mode'} : ${target.textContent?.trim()}`);active=null;
   }
   schedule();
  };
  const release=()=>{if(!held)return;held=false;pulsing=false;if(timer!==null){clearTimeout(timer);timer=null;}refreshActivity();};
  window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);window.addEventListener('blur',release);
  const events=['input','change','pointerdown','pointermove','keydown','wheel','dblclick','click'];
  for(const name of events)panel.addEventListener(name,track,true);
  const observer=new MutationObserver(mutations=>{if(mutations.some(m=>!(m.target instanceof Element?m.target:m.target.parentElement)?.closest('.zonyx-effect-status')))schedule();});
  observer.observe(panel,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['aria-label','class','aria-valuenow','aria-valuetext','aria-pressed','aria-checked','value']});
  schedule();
  return()=>{window.removeEventListener('pointerup',release,true);window.removeEventListener('pointercancel',release,true);window.removeEventListener('blur',release);observer.disconnect();cancelAnimationFrame(frame);if(timer!==null)clearTimeout(timer);for(const name of events)panel.removeEventListener(name,track,true);};
 },[panelRef]);
 return <div className={`zonyx-effect-status${adjusting?' is-control-active':''}`}><span className="zonyx-status-badge" aria-hidden="true"><svg viewBox="0 0 76 36"><path className="zonyx-status-shape" d="M5 1H57Q60 1 61 4L75 31Q77 35 72 35H5Q1 35 1 31V5Q1 1 5 1Z"/>{[0,1,2].map(i=><path key={i} className={`zonyx-status-chevron zonyx-status-chevron-${i}`} d="M0 0L6 6L0 12" transform={`translate(${17+i*15} 12)`}/>)}</svg></span><output aria-live="off" aria-hidden={!adjusting} title={adjusting?text:undefined}>{text}</output></div>;
}
