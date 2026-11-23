import {useEffect,useRef} from 'react';
import type {RefObject} from 'react';
import type {AudioDocument,AudioSelection} from '../audio/types';
import type {SelectionChangeReason} from '../components/WaveformView';
import {loopBoundaryHit} from './loopBoundaryHit';
import {restartAfterLoop} from './peakTrail';
import {loopSelection} from './finalUiMath.mjs';
import {dragFrame} from './waveformNavigation.mjs';
import {createKickMagnet,kickTargets} from './kickMagnet.mjs';
type Edge='resize-start'|'resize-end'|'cursor';
interface Options{
 onRestartPlayback?:(sample:number)=>void;isLooping?:boolean;
 canvas:RefObject<HTMLCanvasElement|null>;doc:AudioDocument|null;isRecording:boolean;
 onSelectionChange:(selection:AudioSelection,reason:SelectionChangeReason)=>void;
 onSelectionCommit?:(selection:AudioSelection,reason:SelectionChangeReason)=>void;
 onViewRangeChange:(start:number,end:number)=>void;
}
export function useWaveformInteractions(options:Options){
 const latest=useRef(options);latest.current=options;
 useEffect(()=>{
  const canvas=latest.current.canvas.current;
  if(!canvas||!options.doc||options.isRecording)return;
  const magnet=createKickMagnet();
  let drag:{edge:Edge;button:number;x:number;alt:boolean;selection:AudioSelection;start:number;end:number}|null=null;
  let raf=0,lastTime=0;
  const snap=(sample:number,width:number,length:number,alt:boolean)=>{
   const doc=latest.current.doc;
   return doc?magnet.snap(sample,kickTargets(doc.bpmInfo),width,length,doc.channels[0]?.length??0,Boolean(doc.snapToBeats&&doc.showBeatGrid&&doc.bpmInfo),alt):sample;
  };
  const move=(delta:number)=>{
   const doc=latest.current.doc;if(!drag||!doc)return;
   const total=doc.channels[0]?.length??0;if(!total)return;
   const rect=canvas.getBoundingClientRect(),left=rect.left+52,width=Math.max(1,rect.width-52);
   if(doc.viewStartSample!==Math.round(drag.start)||doc.viewEndSample!==Math.round(drag.end)){drag.start=doc.viewStartSample;drag.end=doc.viewEndSample;}
   const frame=dragFrame(drag.start,drag.end,total,left,width,drag.x,delta);
   drag.start=frame.viewStart;drag.end=frame.viewEnd;
   const start=Math.round(frame.viewStart),end=start+Math.round(frame.viewEnd-frame.viewStart);
   if(start!==doc.viewStartSample||end!==doc.viewEndSample)latest.current.onViewRangeChange(start,end);
   const point=snap(frame.sample,width,frame.viewEnd-frame.viewStart,drag.alt);
   const next=drag.edge==='cursor'?{startSample:Math.min(total-1,point),endSample:Math.min(total-1,point)}:drag.edge==='resize-start'?{startSample:Math.max(0,Math.min(drag.selection.endSample-1,point)),endSample:drag.selection.endSample}:{startSample:drag.selection.startSample,endSample:Math.min(total,Math.max(drag.selection.startSample+1,point))};
   if(next.startSample!==drag.selection.startSample||next.endSample!==drag.selection.endSample){drag.selection=next;latest.current.onSelectionChange(next,drag.edge==='cursor'?'cursor-drag':drag.edge);}
  };
  const tick=(time:number)=>{if(!drag)return;move(time-lastTime);lastTime=time;raf=requestAnimationFrame(tick);};
  const stop=(commit:boolean)=>{magnet.reset();if(!drag)return;cancelAnimationFrame(raf);const finished=drag;drag=null;canvas.style.cursor='';if(commit)latest.current.onSelectionCommit?.(finished.selection,finished.edge);};
  const begin=(edge:Edge,button:number,event:MouseEvent,selection:AudioSelection)=>{
   const doc=latest.current.doc;if(!doc)return;stop(false);
   drag={edge,button,x:event.clientX,alt:event.altKey,selection:{...selection},start:doc.viewStartSample,end:doc.viewEndSample};
   canvas.style.cursor='ew-resize';lastTime=performance.now();move(0);raf=requestAnimationFrame(tick);
  };
  const swallow=(event:MouseEvent)=>{event.preventDefault();event.stopImmediatePropagation();};
  const down=(event:MouseEvent)=>{
   const doc=latest.current.doc;if(!doc||(event.button!==0&&event.button!==2))return;
   const total=doc.channels[0]?.length??0,rect=canvas.getBoundingClientRect(),left=rect.left+52;
   if(!total||event.clientX<left)return;swallow(event);magnet.reset();
   const width=Math.max(1,rect.width-52),length=Math.max(1,doc.viewEndSample-doc.viewStartSample),selection=doc.selection;
   if(event.button===2){begin('resize-end',2,event,selection);return;}
   const boundary = loopBoundaryHit(event.clientX,left,rect.right,doc.viewStartSample,doc.viewEndSample,selection.startSample,selection.endSample);
   if(boundary){begin(boundary,0,event,selection);return;}
   const frame=dragFrame(doc.viewStartSample,doc.viewEndSample,total,left,width,event.clientX,0),point=Math.min(total-1,snap(frame.sample,width,length,event.altKey));
   if(latest.current.isLooping&&latest.current.onRestartPlayback){
    const edgeX=left+(selection.endSample-doc.viewStartSample)*width/length;
    if(restartAfterLoop(true,point,selection.startSample,selection.endSample,Math.abs(event.clientX-edgeX)<=9)){latest.current.onRestartPlayback(point);return;}
   }
   if(latest.current.isLooping){
    const next=loopSelection(point,selection.endSample);
    if(selection.endSample>selection.startSample&&next.endSample>next.startSample){begin('resize-start',0,event,selection);return;}
    latest.current.onSelectionChange(next,'cursor-drag');begin('cursor',0,event,next);return;
   }
   if(selection.endSample>selection.startSample){
    const x0=left+(selection.startSample-doc.viewStartSample)*width/length,x1=left+(selection.endSample-doc.viewStartSample)*width/length;
    const d0=x0>=left&&x0<=rect.right?Math.abs(event.clientX-x0):Infinity,d1=x1>=left&&x1<=rect.right?Math.abs(event.clientX-x1):Infinity;
    begin(Math.min(d0,d1)<=9&&d1<d0?'resize-end':'resize-start',0,event,selection);return;
   }
   const next={startSample:point,endSample:point};latest.current.onSelectionChange(next,'cursor-drag');begin('cursor',0,event,next);
  };
  const mousemove=(event:MouseEvent)=>{if(!drag)return;swallow(event);drag.x=event.clientX;drag.alt=event.altKey;move(0);};
  const mouseup=(event:MouseEvent)=>{if(!drag||event.button!==drag.button)return;swallow(event);drag.x=event.clientX;drag.alt=event.altKey;move(0);stop(true);};
  const doubleClick=(event:MouseEvent)=>{
   const doc=latest.current.doc;if(!doc||event.button!==0)return;
   const total=doc.channels[0]?.length??0,rect=canvas.getBoundingClientRect(),left=rect.left+52;if(!total||event.clientX<left)return;
   swallow(event);stop(false);const width=Math.max(1,rect.width-52),length=Math.max(1,doc.viewEndSample-doc.viewStartSample);
   const frame=dragFrame(doc.viewStartSample,doc.viewEndSample,total,left,width,event.clientX,0),point=Math.min(total-1,snap(frame.sample,width,length,event.altKey));
   const next={startSample:point,endSample:point};latest.current.onSelectionChange(next,'cursor');latest.current.onSelectionCommit?.(next, 'cursor');
  };
  const blur=()=>stop(true);
  canvas.addEventListener('mousedown',down,true);canvas.addEventListener('contextmenu',swallow,true);canvas.addEventListener('dblclick',doubleClick,true);
  window.addEventListener('mousemove',mousemove,true);window.addEventListener('mouseup',mouseup,true);window.addEventListener('blur',blur);
  return()=>{stop(false);canvas.removeEventListener('mousedown',down,true);canvas.removeEventListener('contextmenu',swallow,true);canvas.removeEventListener('dblclick',doubleClick,true);window.removeEventListener('mousemove',mousemove,true);window.removeEventListener('mouseup',mouseup,true);window.removeEventListener('blur',blur);};
 },[options.doc?.id,options.isRecording]);
}
