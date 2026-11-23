const WANTED={play:'lecture',loop:'boucle',stop:'stop'};
const CONTROLS='aside[aria-label="Fenêtre de contrôle flottante"] button';
export function normalizeLabel(value){return String(value??'').replace(/\s+/g,' ').trim().toLowerCase();}
export function findTransportControl(controls,action){
 const wanted=WANTED[action];if(!wanted)return null;
 return controls.find(control=>!control.disabled&&control.names.some(name=>{const label=normalizeLabel(name);return label===wanted||label.startsWith(wanted+' ');}))??null;
}
function isPlainSpace(event){
 return (event.code==='Space'||event.key===' '||event.key==='Spacebar')&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey;
}
function swallow(event){event.preventDefault();event.stopPropagation?.();event.stopImmediatePropagation?.();}
export function createSpaceTransport(env){
 let held=false;
 return {
  keydown(event){
   if(!isPlainSpace(event)||!env.effectOpen()||env.recording())return false;
   swallow(event);
   if(event.repeat||held)return true;
   held=true;
   const control=findTransportControl(env.controls(),env.playing()?'stop':'loop');
   if(control)env.activate(control);
   return true;
  },
  keyup(event){
   if(!isPlainSpace(event))return false;
   const wasHeld=held;held=false;
   if(!wasHeld&&(!env.effectOpen()||env.recording()))return false;
   swallow(event);return true;
  },
  reset(){held=false;},
 };
}
export function installSpaceTransport(deps,target=window){
 const doc=target.document;
 const gate=createSpaceTransport({
  effectOpen:()=>Boolean(doc.querySelector('.atz-advanced-backdrop')),
  recording:deps.isRecording,
  playing:deps.isPlaying,
  controls:()=>Array.from(doc.querySelectorAll(CONTROLS)).map(element=>({element,disabled:Boolean(element.disabled)||element.getAttribute('aria-disabled')==='true',names:[element.getAttribute('aria-label'),element.getAttribute('title'),element.textContent]})),
  activate:control=>control.element.click(),
 });
 const down=event=>{gate.keydown(event);};
 const up=event=>{gate.keyup(event);};
 const blur=()=>gate.reset();
 target.addEventListener('keydown',down,true);target.addEventListener('keyup',up,true);target.addEventListener('blur',blur);
 return()=>{target.removeEventListener('keydown',down,true);target.removeEventListener('keyup',up,true);target.removeEventListener('blur',blur);};
}
