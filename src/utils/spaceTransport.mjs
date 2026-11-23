import {isLoopActive} from './loopState.mjs';
const RULES={
 play:{icons:['lucide-play'],test:label=>label==='lecture'||label==='play'||(label.startsWith('lecture ')&&!label.includes('boucle')&&!label.includes('envers')&&!label.includes('arrière')&&!label.includes('arriere'))},
 loop:{icons:['lucide-repeat'],test:label=>label.includes('boucle')||label==='loop'||label.startsWith('loop ')},
 stop:{icons:['lucide-square'],test:label=>label==='stop'||label.startsWith('stop ')||label==='arrêt'||label==='arret'},
};
const CONTROLS='aside[aria-label="Fenêtre de contrôle flottante"] button';
export function normalizeLabel(value){return String(value??'').replace(/\s+/g,' ').trim().toLowerCase();}
export function findTransportControl(controls,action){
 const rule=RULES[action];if(!rule)return null;
 return controls.find(control=>!control.disabled&&control.names.some(name=>{
  const label=normalizeLabel(name);
  return Boolean(label)&&(rule.test(label)||label.split(' ').some(part=>rule.icons.includes(part)));
 }))??null;
}
function isPlainSpace(event){return (event.code==='Space'||event.key===' '||event.key==='Spacebar')&&!event.ctrlKey&&!event.altKey&&!event.metaKey&&!event.shiftKey;}
function swallow(event){event.preventDefault();event.stopPropagation?.();event.stopImmediatePropagation?.();}
export function createSpaceTransport(env){
 let held=false;
 return {
  keydown(event){
   if(!isPlainSpace(event)||!env.effectOpen()||env.recording())return false;
   swallow(event);if(event.repeat||held)return true;held=true;
   const controls=env.controls(),loop=env.loopPreferred?.()!==false;
   const start=()=>loop?findTransportControl(controls,'loop')??findTransportControl(controls,'play'):findTransportControl(controls,'play');
   const control=env.playing()?findTransportControl(controls,'stop'):start();
   if(control)env.activate(control);return true;
  },
  keyup(event){if(!isPlainSpace(event))return false;const wasHeld=held;held=false;if(!wasHeld&&(!env.effectOpen()||env.recording()))return false;swallow(event);return true;},
  reset(){held=false;},
 };
}
export function installSpaceTransport(deps,target=window){
 const doc=target.document;
 const gate=createSpaceTransport({
  effectOpen:()=>Boolean(doc.querySelector('.atz-advanced-backdrop')||doc.querySelector('.atz-about-dialog')),
  loopPreferred:()=>Boolean(doc.querySelector('.atz-advanced-backdrop'))||isLoopActive(),
  recording:deps.isRecording,playing:deps.isPlaying,
  controls:()=>Array.from(doc.querySelectorAll(CONTROLS)).map(element=>({element,disabled:Boolean(element.disabled)||element.getAttribute('aria-disabled')==='true',names:[element.getAttribute('aria-label'),element.getAttribute('title'),element.textContent,element.querySelector?.('svg')?.getAttribute('class')]})),
  activate:control=>control.element.click(),
 });
 const down=event=>{gate.keydown(event);},up=event=>{gate.keyup(event);},blur=()=>gate.reset();
 target.addEventListener('keydown',down,true);target.addEventListener('keyup',up,true);target.addEventListener('blur',blur);
 return()=>{target.removeEventListener('keydown',down,true);target.removeEventListener('keyup',up,true);target.removeEventListener('blur',blur);};
}
