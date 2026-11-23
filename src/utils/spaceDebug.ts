import {audioEngine} from '../audio/engine';
type EngineView={isLooping?:boolean;playbackStartSample?:number;playbackEndSample?:number};
type PreviewOptions={position?:number;loop?:boolean;loopStart?:number;loopEnd?:number;volumeDb?:number};
type ReplaceFn=(channels:Float32Array[],sampleRate:number,options?:PreviewOptions)=>boolean;
export function installSpaceDebug():()=>void{
 const box=document.createElement('pre');box.id='atz-space-debug';
 Object.assign(box.style,{position:'fixed',left:'8px',bottom:'8px',zIndex:'2147483647',margin:'0',padding:'8px 10px',maxWidth:'min(560px, calc(100vw - 16px))',border:'1px solid #39ff14',borderRadius:'6px',background:'#0d0b12ee',color:'#fff',font:'11px/1.45 ui-monospace, monospace',whiteSpace:'pre-wrap',pointerEvents:'none'});
 const lines:string[]=[];let hide=0,watching=false;
 const show=(text:string)=>{lines.push(text);while(lines.length>9)lines.shift();box.textContent='DIAGNOSTIC ESPACE (temporaire)\n'+lines.join('\n');if(!box.isConnected)document.body.appendChild(box);window.clearTimeout(hide);hide=window.setTimeout(()=>{box.remove();lines.length=0;watching=false;},8000);};
 const view=()=>audioEngine as unknown as EngineView;
 const engine=()=>`lecture=${audioEngine.isPlaying?'oui':'non'} boucle=${view().isLooping?'oui':'non'} plage=${view().playbackStartSample ?? '?'}→${view().playbackEndSample ?? '?'}`;
 const target=audioEngine as unknown as {replacePreviewAudio:ReplaceFn;play:typeof audioEngine.play};
 const originalReplace=target.replacePreviewAudio,originalPlay=target.play;
 target.replacePreviewAudio=function(this:unknown,channels,sampleRate,options={}){
  const engineLoops=Boolean(view().isLooping);
  const keep=engineLoops&&options.loop===false;
  const next=keep?{...options,loop:true,loopStart:undefined,loopEnd:undefined}:options;
  if(watching)show(`relecture effet : loop demandé=${String(options.loop)} moteur en boucle=${engineLoops?'oui':'non'} → ${keep?'boucle conservée':'tel quel'}`);
  return originalReplace.call(audioEngine,channels,sampleRate,next);
 };
 target.play=function(this:unknown,...args:Parameters<typeof audioEngine.play>){
  if(watching)show(`play() : début=${String(args[2])} fin=${String(args[3])} boucle=${String(args[4]?.loop)}`);
  return originalPlay.apply(audioEngine,args);
 };
 const key=(event:KeyboardEvent)=>{
  if(event.code!=='Space'||event.repeat||!document.querySelector('.atz-advanced-backdrop'))return;
  lines.length=0;watching=true;show('avant   : '+engine());
  window.setTimeout(()=>show('+0,15 s : '+engine()),150);
  window.setTimeout(()=>show('+0,60 s : '+engine()),600);
 };
 const click=(event:MouseEvent)=>{
  if(event.isTrusted||!(event.target instanceof Element))return;
  const button=event.target.closest('aside[aria-label="Fenêtre de contrôle flottante"] button');
  if(button)show('clic simulé sur : '+[button.getAttribute('title'),button.getAttribute('aria-label'),button.textContent?.trim(),button.querySelector('svg')?.getAttribute('class')].filter(Boolean).join(' | '));
 };
 window.addEventListener('keydown',key,true);document.addEventListener('click',click,true);
 return()=>{window.removeEventListener('keydown',key,true);document.removeEventListener('click',click,true);target.replacePreviewAudio=originalReplace;target.play=originalPlay;box.remove();window.clearTimeout(hide);};
}
