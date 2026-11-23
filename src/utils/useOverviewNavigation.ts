import {useEffect,useLayoutEffect,useRef,useState} from 'react';
import type {RefObject} from 'react';
import type {AudioDocument} from '../audio/types';
import {overviewPan,overviewZoom} from './workspaceMath.mjs';
export {overviewRange,kickPulseAt} from './workspaceMath.mjs';
type Options={canvas:RefObject<HTMLCanvasElement|null>;doc:AudioDocument|null;isRecording:boolean;isLooping?:boolean;onViewRangeChange:(start:number,end:number)=>void};
type Drag={id:number;x:number;start:number;length:number;width:number;total:number;moved:boolean};
export function useOverviewNavigation(options:Options){
 const latest=useRef(options);latest.current=options;
 const viewStart=options.doc?.viewStartSample??0,viewEnd=options.doc?.viewEndSample??0;
 const [range,setRange]=useState<[number,number]>([viewStart,viewEnd]);
 const handle=useRef<[number,number]>(range);handle.current=range;
 useLayoutEffect(()=>{
  const next:[number,number]=[viewStart,viewEnd];
  handle.current=next;setRange(old=>old[0]===next[0]&&old[1]===next[1]?old:next);
 },[options.doc?.id,viewStart,viewEnd]);
 useEffect(()=>{
  const canvas=latest.current.canvas.current;
  if(!canvas||!options.doc||options.isRecording)return;
  let drag:Drag|null=null;
  const hit=(x:number,y:number)=>{
   const d=latest.current.doc,r=canvas.getBoundingClientRect(),total=d?.channels[0]?.length??0;
   if(!total||r.width<=0||y<r.top||y>r.bottom)return false;
   const [start,end]=handle.current,left=start/total*r.width;
   return x>=r.left+left&&x<=r.left+Math.min(r.width,Math.max(left+3,end/total*r.width));
  };
  const publish=(next:[number,number])=>{handle.current=next;setRange(next);latest.current.onViewRangeChange(...next);};
  const stop=()=>{const old=drag;drag=null;if(old&&canvas.hasPointerCapture(old.id))canvas.releasePointerCapture(old.id);canvas.style.cursor='grab';};
  const down=(e:PointerEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();
   if(e.button!==0||drag||!hit(e.clientX,e.clientY))return;
   const d=latest.current.doc,r=canvas.getBoundingClientRect();if(!d||r.width<=0)return;
   const [start,end]=handle.current;
   drag={id:e.pointerId,x:e.clientX,start,length:end-start,width:r.width,total:d.channels[0]?.length??0,moved:false};
   canvas.setPointerCapture(e.pointerId);canvas.style.cursor='grabbing';
  };
  const move=(e:PointerEvent)=>{
   if(!drag){canvas.style.cursor=hit(e.clientX,e.clientY)?'grab':'default';return;}
   if(e.pointerId!==drag.id)return;
   e.preventDefault();e.stopImmediatePropagation();
   const next=overviewPan(drag.total,drag.start,drag.length,e.clientX-drag.x,drag.width,drag.moved?0:3);
   if(!next)return;
   drag.moved=true;publish(next);
  };
  const up=(e:PointerEvent)=>{if(drag&&e.pointerId===drag.id){e.preventDefault();e.stopImmediatePropagation();if(drag.moved)move(e);stop();}};
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();if(drag||!hit(e.clientX,e.clientY)||!e.deltaY)return;
   const total=latest.current.doc?.channels[0]?.length??0;if(!total)return;
   const [start,end]=handle.current,unit=e.deltaMode===1?32:e.deltaMode===2?240:1;
   publish(overviewZoom(total,start,end,e.deltaY*unit));
  };
  const suppress=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
  const leave=()=>{if(!drag)canvas.style.cursor='default';};
  const oldTouch=canvas.style.touchAction;canvas.style.touchAction='none';
  canvas.title='Glisser avec le bouton gauche pour déplacer la vue ; molette vers le haut pour zoomer, vers le bas pour dézoomer.';
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
