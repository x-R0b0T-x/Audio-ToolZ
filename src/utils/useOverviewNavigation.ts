import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {AudioDocument} from '../audio/types';
import {overviewRange,overviewZoom} from './workspaceMath.mjs';
export {overviewRange,kickPulseAt} from './workspaceMath.mjs';
type Options={canvas:RefObject<HTMLCanvasElement|null>;doc:AudioDocument|null;isRecording:boolean;isLooping?:boolean;onViewRangeChange:(start:number,end:number)=>void};
export function useOverviewNavigation(options:Options){
 const latest=useRef(options);latest.current=options;
 const handle=useRef<[number,number]>([options.doc?.viewStartSample??0,options.doc?.viewEndSample??0]);
 const state=useRef<{id:string|null;valid:boolean;manual:boolean}>({id:null,valid:false,manual:false});
 useEffect(()=>{
  const d=options.doc;if(!d)return;
  const s=d.selection,valid=s.endSample>s.startSample,total=d.channels[0]?.length??0;
  const changed=state.current.id!==d.id;
  if(changed){state.current={id:d.id,valid:false,manual:false};handle.current=[d.viewStartSample,d.viewEndSample];}
  if(!valid)state.current.manual=false;
  if(valid&&(!state.current.valid||!state.current.manual))handle.current=overviewRange(total,s.startSample,s.endSample-s.startSample);
  state.current.valid=valid;
 },[options.doc?.id,options.doc?.selection.startSample,options.doc?.selection.endSample]);
 useEffect(()=>{
  const canvas=latest.current.canvas.current;
  if(!canvas||!options.doc||options.isRecording)return;
  let drag:{id:number;x:number;start:number;length:number;width:number;total:number}|null=null;
  const hit=(x:number,y:number)=>{
   const d=latest.current.doc,r=canvas.getBoundingClientRect(),total=d?.channels[0]?.length??0;
   if(!total||r.width<=0||y<r.top||y>r.bottom)return false;
   const [start,end]=handle.current,left=start/total*r.width;
   return x>=r.left+left&&x<=r.left+Math.min(r.width,Math.max(left+3,end/total*r.width));
  };
  const publish=(range:[number,number])=>{state.current.manual=true;handle.current=range;latest.current.onViewRangeChange(...range);};
  const stop=()=>{const old=drag;drag=null;if(old&&canvas.hasPointerCapture(old.id))canvas.releasePointerCapture(old.id);canvas.style.cursor='grab';};
  const down=(e:PointerEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();
   if(e.button!==0||drag||!hit(e.clientX,e.clientY))return;
   const d=latest.current.doc,r=canvas.getBoundingClientRect();if(!d||r.width<=0)return;
   const [start,end]=handle.current;
   drag={id:e.pointerId,x:e.clientX,start,length:end-start,width:r.width,total:d.channels[0]?.length??0};
   canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
  };
  const move=(e:PointerEvent)=>{
   if(!drag){canvas.style.cursor=hit(e.clientX,e.clientY)?'grab':'default';return;}
   if(e.pointerId!==drag.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   publish(overviewRange(drag.total,drag.start+(e.clientX-drag.x)*drag.total/drag.width,drag.length));
  };
  const up=(e:PointerEvent)=>{if(drag&&e.pointerId===drag.id){move(e);e.preventDefault();e.stopImmediatePropagation();stop();}};
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();
   if(drag||!hit(e.clientX,e.clientY)||!e.deltaY)return;
   const total=latest.current.doc?.channels[0]?.length??0;if(!total)return;
   const [start,end]=handle.current,unit=e.deltaMode===1?32:e.deltaMode===2?240:1;
   publish(overviewZoom(total,start,end,e.deltaY*unit));
  };
  const suppress=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
  const leave=()=>{if(!drag)canvas.style.cursor='default';};
  const oldTouch=canvas.style.touchAction;canvas.style.touchAction='none';
  canvas.title='Glisser avec le bouton gauche pour déplacer la vue ; molette vers le haut pour élargir, vers le bas pour rétrécir.';
  canvas.addEventListener('pointerdown',down,true);canvas.addEventListener('pointermove',move,true);canvas.addEventListener('pointerup',up,true);
  canvas.addEventListener('pointercancel',stop,true);canvas.addEventListener('lostpointercapture',stop,true);canvas.addEventListener('pointerleave',leave);
  canvas.addEventListener('wheel',wheel,{passive:false,capture:true});
  for(const name of ['mousedown','mouseup','click','dblclick','contextmenu'])canvas.addEventListener(name,suppress,true);
  window.addEventListener('blur',stop);
  return()=>{stop();canvas.style.touchAction=oldTouch;canvas.style.cursor='';canvas.removeAttribute('title');
   canvas.removeEventListener('pointerdown',down,true);canvas.removeEventListener('pointermove',move,true);canvas.removeEventListener('pointerup',up,true);
   canvas.removeEventListener('pointercancel',stop,true);canvas.removeEventListener('lostpointercapture',stop,true);canvas.removeEventListener('pointerleave',leave);
   canvas.removeEventListener('wheel',wheel,true);for(const name of ['mousedown','mouseup','click','dblclick','contextmenu'])canvas.removeEventListener(name,suppress,true);window.removeEventListener('blur',stop);
  };
 },[options.doc?.id,options.isRecording]);
 return handle;
}
