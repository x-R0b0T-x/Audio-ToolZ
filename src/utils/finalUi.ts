import {useEffect} from 'react';
import type {AudioDocument} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {beatPulse} from './finalUiMath.mjs';
import {kickPulseAt} from './useOverviewNavigation';
export function useBeatSync(doc:AudioDocument|null){
 useEffect(()=>{
  const bpm=doc?.bpmInfo?.bpm??0,rate=doc?.sampleRate??44100,origin=doc?.bpmInfo?.beatSamples[0]??0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let frame=0,image:HTMLImageElement|null=null,snap:HTMLElement|null=null;
  const resetImage=()=>{if(image){image.style.removeProperty('animation');image.style.removeProperty('transform');}};
  const resetSnap=()=>{if(snap)snap.style.removeProperty('box-shadow');};
  const tick=(now:number)=>{
   const next=document.querySelector<HTMLImageElement>('.atz-about-robot>img');if(next!==image){resetImage();image=next;}
   const target=document.querySelector<HTMLElement>('[data-testid="snap-kicks-toggle"]');if(target!==snap){resetSnap();snap=target;}
   const valid=Number.isFinite(bpm)&&bpm>0,playing=audioEngine.isPlaying;
   const pulse=beatPulse(playing?audioEngine.getCurrentSample():now*rate/1000,bpm,rate,playing?origin:0);
   if(image){
    image.style.animation='none';
    const kicks=doc?.bpmInfo?.kickSamples??[];
    let robotPulse=0;
    if(playing&&!reduced.matches){
     if(kicks.length){robotPulse=kickPulseAt(audioEngine.getCurrentSample(),rate,kicks);}
     else{
      const spectrum=audioEngine.readSpectrumSnapshot();
      const bass=Math.max(spectrum[1]??0,spectrum[2]??0,spectrum[3]??0)/255;
      robotPulse=Math.max(0,Math.min(1,(bass-.45)/.55));
     }
    }
    image.style.transform=`scale(${1+.16*robotPulse})`;
   }
   if(snap&&valid&&doc?.showBeatGrid&&snap.getAttribute('aria-pressed')==='true'&&!reduced.matches){snap.style.setProperty('box-shadow',`inset 0 0 0 1px #39ff1499,0 0 ${4+8*pulse}px #39ff14cc,0 0 ${8+14*pulse}px #39ff1466`,'important');}else resetSnap();
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);resetImage();resetSnap();};
 },[doc?.id,doc?.bpmInfo,doc?.sampleRate,doc?.showBeatGrid]);
}
export function installDescriptions(root:HTMLElement){
 const tip=document.createElement('div');tip.id='atz-description';tip.setAttribute('role','tooltip');
 Object.assign(tip.style,{position:'fixed',zIndex:'2147483647',maxWidth:'min(340px, calc(100vw - 16px))',padding:'8px 12px',border:'1px solid #39ff14',borderRadius:'7px',background:'#17131f',color:'#fff',font:'12px/1.45 system-ui',boxShadow:'0 0 6px #39ff14aa,0 0 14px #39ff1455',pointerEvents:'none'});
 let current:HTMLElement|null=null,title:string|null=null,described:string|null=null,timer=0;
 const hide=()=>{window.clearTimeout(timer);tip.remove();if(current){if(title!==null)current.setAttribute('title',title);if(described===null)current.removeAttribute('aria-describedby');else current.setAttribute('aria-describedby',described);}current=null;};
 const show=(event:Event)=>{
  if(!(event.target instanceof Element)||current?.contains(event.target))return;
  const node=event.target.closest<HTMLElement>('[title]');if(!node||!root.contains(node))return;
  hide();current=node;title=node.getAttribute('title');described=node.getAttribute('aria-describedby');node.removeAttribute('title');
  tip.textContent=title==='Volume'?'Volume — Régler le niveau sonore de la sélection ou du morceau.':title;
  timer=window.setTimeout(()=>{if(current!==node)return;document.body.appendChild(tip);node.setAttribute('aria-describedby',[described,tip.id].filter(Boolean).join(' '));const r=node.getBoundingClientRect(),box=tip.getBoundingClientRect();tip.style.left=`${Math.max(8,Math.min(innerWidth-box.width-8,r.left+r.width/2-box.width/2))}px`;tip.style.top=`${r.bottom+box.height+12<innerHeight?r.bottom+8:Math.max(8,r.top-box.height-8)}px`;},300);
 };
 const out=(event:PointerEvent)=>{if(current&&(!(event.relatedTarget instanceof Node)||!current.contains(event.relatedTarget)))hide();};
 const key=(event:KeyboardEvent)=>{if(event.key==='Escape')hide();};
 root.addEventListener('pointerover',show);root.addEventListener('pointerout',out);root.addEventListener('focusin',show);root.addEventListener('focusout',hide);window.addEventListener('scroll',hide,true);window.addEventListener('keydown',key);
 return()=>{hide();root.removeEventListener('pointerover',show);root.removeEventListener('pointerout',out);root.removeEventListener('focusin',show);root.removeEventListener('focusout',hide);window.removeEventListener('scroll',hide,true);window.removeEventListener('keydown',key);};
}
