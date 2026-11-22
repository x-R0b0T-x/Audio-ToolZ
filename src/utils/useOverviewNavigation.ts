import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {AudioDocument} from '../audio/types';

export function overviewRange(total:number,start:number,length:number):[number,number]{
 const size=Math.max(1,Math.min(total,Math.round(length)));
 const left=Math.max(0,Math.min(total-size,Math.round(start)));
 return [left,left+size];
}
export function kickPulseAt(sample:number,rate:number,kicks:number[]):number{
 if(!Number.isFinite(sample)||rate<=0||!kicks.length)return 0;
 let lo=0,hi=kicks.length;
 while(lo<hi){const mid=(lo+hi)>>>1;if(kicks[mid]<=sample)lo=mid+1;else hi=mid;}
 if(!lo)return 0;
 const age=(sample-kicks[lo-1])/rate;
 return age>=0&&age<.18?Math.exp(-age/0.045):0;
}
export function useOverviewNavigation(options:{canvas:RefObject<HTMLCanvasElement|null>;doc:AudioDocument|null;isRecording:boolean;isLooping?:boolean;onViewRangeChange:(start:number,end:number)=>void}){
 const latest=useRef(options);latest.current=options;
 const loop=useRef({id:options.doc?.id,active:false});
 useEffect(()=>{
  const doc=options.doc;
  if(doc&&options.isLooping&&(!loop.current.active||loop.current.id!==doc.id)&&doc.selection.endSample>doc.selection.startSample){options.onViewRangeChange(doc.selection.startSample,doc.selection.endSample);}
  loop.current={id:doc?.id,active:!!options.isLooping};
 },[options.isLooping,options.doc?.id]);
 useEffect(()=>{
  const canvas=latest.current.canvas.current;
  if(!canvas||!options.doc||options.isRecording)return;
  let drag:{x:number;start:number;length:number}|null=null;
  const hit=(x:number)=>{
   const doc=latest.current.doc;if(!doc)return false;
   const total=doc.channels[0]?.length??0,r=canvas.getBoundingClientRect();if(!total||!r.width)return false;
   const left=doc.viewStartSample/total*r.width,right=Math.min(r.width,Math.max(left+3,doc.viewEndSample/total*r.width));
   return x-r.left>=left&&x-r.left<=right;
  };
  const cursor=(x:number)=>{canvas.style.cursor=drag?'grabbing':hit(x)?'grab':'default';};
  const down=(e:MouseEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();
   const doc=latest.current.doc;
   if(e.button!==2||!doc||!hit(e.clientX))return;
   drag={x:e.clientX,start:doc.viewStartSample,length:doc.viewEndSample-doc.viewStartSample};cursor(e.clientX);
  };
  const move=(e:MouseEvent)=>{
   cursor(e.clientX);if(!drag)return;
   e.preventDefault();e.stopImmediatePropagation();
   const doc=latest.current.doc,r=canvas.getBoundingClientRect();if(!doc||r.width<=0)return;
   const total=doc.channels[0]?.length??0;if(!total)return;
   const [start,end]=overviewRange(total,drag.start+(e.clientX-drag.x)*total/r.width,drag.length);
   latest.current.onViewRangeChange(start,end);
  };
  const up=(e:MouseEvent)=>{if(drag&&e.button===2){e.preventDefault();e.stopImmediatePropagation();drag=null;cursor(e.clientX);}};
  const blur=()=>{drag=null;canvas.style.cursor='default';};
  const wheel=(e:WheelEvent)=>{
   e.preventDefault();e.stopImmediatePropagation();
   const doc=latest.current.doc;if(!doc||drag||!hit(e.clientX)||!e.deltaY)return;
   const total=doc.channels[0]?.length??0;if(!total)return;
   const old=doc.viewEndSample-doc.viewStartSample,unit=e.deltaMode===1?32:e.deltaMode===2?240:1;
   const delta=Math.max(-240,Math.min(240,e.deltaY*unit));
   const length=Math.max(Math.min(64,total),Math.min(total,Math.round(old*Math.pow(1.0022,delta))));
   const [start,end]=overviewRange(total,(doc.viewStartSample+doc.viewEndSample-length)/2,length);
   latest.current.onViewRangeChange(start,end);
  };
  const suppress=(e:Event)=>{e.preventDefault();e.stopImmediatePropagation();};
  canvas.addEventListener('mousedown',down,true);canvas.addEventListener('wheel',wheel,{passive:false,capture:true});
  canvas.addEventListener('contextmenu',suppress,true);canvas.addEventListener('click',suppress,true);canvas.addEventListener('dblclick',suppress,true);
  window.addEventListener('mousemove',move,true);window.addEventListener('mouseup',up,true);window.addEventListener('blur',blur);
  return()=>{blur();canvas.removeEventListener('mousedown',down,true);canvas.removeEventListener('wheel',wheel,true);canvas.removeEventListener('contextmenu',suppress,true);canvas.removeEventListener('click',suppress,true);canvas.removeEventListener('dblclick',suppress,true);window.removeEventListener('mousemove',move,true);window.removeEventListener('mouseup',up,true);window.removeEventListener('blur',blur);};
 },[options.doc?.id,options.isRecording]);
}
