import {isLoopActive} from './loopState.mjs';
const RULES={
 play:{icons:['lucide-play'],test:s=>s==='lecture'||s==='play'||(s.startsWith('lecture ')&&!/boucle|envers|arrière|arriere/.test(s))},
 loop:{icons:['lucide-repeat'],test:s=>s.includes('boucle')||s==='loop'||s.startsWith('loop ')},
 pause:{icons:['lucide-pause'],test:s=>s==='pause'||s.startsWith('pause ')},
 stop:{icons:['lucide-square'],test:s=>s==='stop'||s.startsWith('stop ')||s==='arrêt'||s==='arret'},
};
const CONTROLS='aside[aria-label="Fenêtre de contrôle flottante"] button';
export function normalizeLabel(value){return String(value??'').replace(/\s+/g,' ').trim().toLowerCase();}
export function findTransportControl(controls,action){const rule=RULES[action];return rule?controls.find(c=>!c.disabled&&c.names.some(name=>{const s=normalizeLabel(name);return Boolean(s)&&(rule.test(s)||s.split(' ').some(part=>rule.icons.includes(part)));}))??null:null;}
const space=e=>e.code==='Space'||e.key===' '||e.key==='Spacebar';
export function isTextEntry(event){const node=event.composedPath?.()[0]??event.target;return Boolean(node?.isContentEditable||node?.closest?.('textarea,[contenteditable=""],[contenteditable="true"],[contenteditable="plaintext-only"],input:not([type]),input[type="text"],input[type="search"],input[type="url"],input[type="tel"],input[type="email"],input[type="password"]'));}
const swallow=e=>{e.preventDefault();e.stopPropagation?.();e.stopImmediatePropagation?.();};
export function createSpaceTransport(env){let held=false;return {
 keydown(e){if(!space(e)||e.ctrlKey||e.altKey||e.metaKey||e.shiftKey||e.isComposing||isTextEntry(e)||env.recording())return false;swallow(e);if(e.repeat||held)return true;held=true;const controls=env.controls(),action=env.playing()?'pause':env.loopPreferred?.()?'loop':'play';const control=findTransportControl(controls,action)??(action==='loop'?findTransportControl(controls,'play'):null);if(control)env.activate(control);return true;},
 keyup(e){if(!space(e))return false;const claimed=held;held=false;if(claimed)swallow(e);return claimed;},reset(){held=false;}
};}
export function installSpaceTransport(deps,target=window){const doc=target.document;let preferred=null;
 const controls=()=>Array.from(doc.querySelectorAll(CONTROLS)).map(element=>({element,disabled:Boolean(element.disabled)||element.getAttribute('aria-disabled')==='true',names:[element.getAttribute('aria-label'),element.getAttribute('title'),element.textContent,element.querySelector?.('svg')?.getAttribute('class')]}));
 const gate=createSpaceTransport({loopPreferred:()=>preferred??isLoopActive(),recording:deps.isRecording,playing:deps.isPlaying,controls,activate:c=>c.element.click()});
 const down=e=>gate.keydown(e),up=e=>gate.keyup(e),blur=()=>gate.reset(),click=e=>{const element=e.target?.closest?.(CONTROLS);if(!element)return;const list=controls().filter(c=>c.element===element);if(findTransportControl(list,'loop'))preferred=true;else if(findTransportControl(list,'play'))preferred=false;};
 target.addEventListener('click',click,true);target.addEventListener('keydown',down,true);target.addEventListener('keyup',up,true);target.addEventListener('blur',blur);
 return()=>{target.removeEventListener('click',click,true);target.removeEventListener('keydown',down,true);target.removeEventListener('keyup',up,true);target.removeEventListener('blur',blur);};
}
