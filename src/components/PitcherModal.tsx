import {useEffect,useMemo,useRef,useState} from 'react';
import type {AudioDocument,AudioSelection} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {renderSignalsmith,splicePitcher} from '../audio/signalsmithPitcher';
import {targetRange} from '../audio/effectsModel.mjs';
import {createPreviewExit,restoreUnappliedPreview} from '../utils/effectReview.mjs';
import {PitcherFader} from './PitcherFader';
import {EffectPanel} from './EffectPanel';
import {EffectActiveContext} from './effectActive';
type Props={document:AudioDocument;onStopPreview:()=>void;onClose:()=>void;onApply:(channels:Float32Array[],label:string,selection?:AudioSelection)=>void};
type Geometry={ws:number;we:number;segLen:number};
type Result=Geometry&{id:number;speed:number;pitch:number;channels:Float32Array[]};
const WINDOW_SECONDS=8;
const toSource=(at:number,g:Geometry|null)=>{if(!g||at<=g.ws)return at;if(at<g.ws+g.segLen)return g.ws+(at-g.ws)*(g.we-g.ws)/Math.max(1,g.segLen);return at-(g.segLen-(g.we-g.ws));};
const toShown=(src:number,g:Geometry)=>{if(src<=g.ws)return src;if(src<g.we)return g.ws+(src-g.ws)*g.segLen/Math.max(1,g.we-g.ws);return src+(g.segLen-(g.we-g.ws));};
export function PitcherModal(p:Props){
 const doc=p.document,[speed,setSpeed]=useState(1),[pitch,setPitch]=useState(0),[touched,setTouched]=useState(false),[busy,setBusy]=useState(false),[applying,setApplying]=useState(false),[error,setError]=useState('');
 const [active,setActive]=useState(true),activeRef=useRef(true),state=useMemo(()=>({active,setActive}),[active]);activeRef.current=active;
 const latest=useRef(p);latest.current=p;
 const original=useRef({channels:doc.channels,rate:doc.sampleRate});
 const range=useMemo(()=>targetRange(doc.selection,doc.channels[0]?.length??0),[doc]);
 const source=useMemo(()=>doc.channels.map(c=>c.subarray(range.start,range.end)),[doc,range]);
 const serial=useRef(0),controller=useRef<AbortController|null>(null),cache=useRef<Result|null>(null),shown=useRef<Result|null>(null),rendering=useRef(false),failed=useRef(false),lastChange=useRef(0),applyingRef=useRef(false);
 const wanted=useRef({speed,pitch,touched});wanted.current={speed,pitch,touched};
 const exit=useRef<ReturnType<typeof createPreviewExit>|null>(null);
 if(!exit.current)exit.current=createPreviewExit(()=>{serial.current++;controller.current?.abort();cache.current=null;if(shown.current)restoreUnappliedPreview(audioEngine,original.current.channels,original.current.rate);shown.current=null;latest.current.onStopPreview();});
 useEffect(()=>{exit.current!.reset();return()=>exit.current!.discard();},[]);
 const startRender=(atSource:number)=>{
  const rate=doc.sampleRate,ws=Math.max(range.start,Math.min(range.end,Math.floor(atSource))),we=Math.min(range.end,ws+Math.round(rate*WINDOW_SECONDS));
  if(we<=ws)return;
  const id=++serial.current;controller.current?.abort();const aborter=new AbortController();controller.current=aborter;
  const {speed:s,pitch:q}=wanted.current;rendering.current=true;setBusy(true);
  renderSignalsmith(source.map(c=>c.subarray(ws-range.start,we-range.start)),rate,s,q,aborter.signal).then(segment=>{
   if(aborter.signal.aborted||exit.current!.settled||id!==serial.current)return;
   const base=original.current.channels,segLen=segment[0]?.length??0;
   const channels=base.map((c,i)=>{const out=new Float32Array(ws+segLen+(c.length-we));out.set(c.subarray(0,ws));out.set(segment[i],ws);out.set(c.subarray(we),ws+segLen);return out;});
   cache.current={id,speed:s,pitch:q,ws,we,segLen,channels};rendering.current=false;setBusy(false);
  }).catch(e=>{
   if(aborter.signal.aborted||exit.current!.settled||id!==serial.current)return;
   rendering.current=false;failed.current=true;cache.current=null;setBusy(false);
   setError(`Échec de Signalsmith Stretch : ${String(e)}. Aucun autre moteur n’a été utilisé.`);
  });
 };
 const startRef=useRef(startRender);startRef.current=startRender;
 useEffect(()=>{
  if(!touched)return;
  serial.current++;controller.current?.abort();cache.current=null;rendering.current=false;failed.current=false;lastChange.current=performance.now();setBusy(false);setError('');
 },[speed,pitch,touched]);
 useEffect(()=>{
  let frame=0;
  const covers=(src:number,r:Result)=>src>=r.ws-1&&(r.we>=range.end||src<r.ws+(r.we-r.ws)*.5);
  const tick=()=>{
   if(exit.current!.settled)return;
   if(!audioEngine.isPlaying)shown.current=null;
   else if(!activeRef.current){
    if(shown.current&&audioEngine.replacePreviewAudio(original.current.channels,doc.sampleRate,{position:toSource(audioEngine.getCurrentSample(),shown.current),loopStart:range.start,loopEnd:range.end}))shown.current=null;
   }
   else if(wanted.current.touched&&!applyingRef.current&&!failed.current){
    const r=cache.current,src=toSource(audioEngine.getCurrentSample(),shown.current),same=!!r&&r.id===serial.current&&r.speed===wanted.current.speed&&r.pitch===wanted.current.pitch;
    if(same&&r){
     if(!covers(src,r)){if(!rendering.current)startRef.current(src);}
     else if(shown.current?.id!==r.id){
      const position=toShown(toSource(audioEngine.getCurrentSample(),shown.current),r);
      if(audioEngine.replacePreviewAudio(r.channels,doc.sampleRate,{position,loopStart:range.start,loopEnd:toShown(range.end,r)}))shown.current=r;
     }
    }else if(!rendering.current&&performance.now()-lastChange.current>80)startRef.current(src);
   }
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[doc.sampleRate,range]);
 const ready=touched&&!applying&&!error&&range.end>range.start;
 const cancel=()=>{exit.current!.discard();latest.current.onClose();};
 const apply=async()=>{
  if(!ready)return;
  applyingRef.current=true;setApplying(true);serial.current++;controller.current?.abort();rendering.current=false;
  const aborter=new AbortController();controller.current=aborter;
  try{
   const segment=await renderSignalsmith(source,doc.sampleRate,wanted.current.speed,wanted.current.pitch,aborter.signal);
   if(aborter.signal.aborted||exit.current!.settled)return;
   const full=splicePitcher(original.current.channels,segment,range.start,range.end);
   exit.current!.apply(()=>{latest.current.onApply(full.channels,'Z-Pitcher',full.selection);});
  }catch(e){
   if(aborter.signal.aborted||exit.current!.settled)return;
   applyingRef.current=false;setApplying(false);failed.current=true;
   setError(`Échec de Signalsmith Stretch : ${String(e)}. Aucun autre moteur n’a été utilisé.`);
  }
 };
 return <div className="zonyx-advanced-backdrop"><EffectActiveContext.Provider value={state}><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-pitcher" role="dialog" aria-modal="true" aria-labelledby="pitcher-title"><header><h2 id="pitcher-title">Z-Pitcher</h2><button type="button" aria-label="Fermer" onClick={cancel}>×</button></header><main><div className="zonyx-legacy-controls"><PitcherFader kind="speed" value={speed} onChange={v=>{setTouched(true);setSpeed(v);}}/><PitcherFader kind="pitch" value={pitch} onChange={v=>{setTouched(true);setPitch(v);}}/></div><span className="zonyx-pitcher-progress" aria-busy={busy||applying}/>{error&&<p role="alert">{error}</p>}</main><footer><span role="status">{applying?'Application…':''}</span><button type="button" onClick={cancel}>Annuler</button><button type="button" disabled={!ready} onClick={apply}>Appliquer</button></footer></EffectPanel></EffectActiveContext.Provider></div>;
}
