import {useEffect,useMemo,useRef,useState} from 'react';
import type {AudioDocument,AudioSelection} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {renderSignalsmith,splicePitcher} from '../audio/signalsmithPitcher';
import {targetRange} from '../audio/effectsModel.mjs';
import {createPreviewExit,restoreUnappliedPreview} from '../utils/effectReview.mjs';
import {Fader} from './EffectControls';
import {EffectPanel} from './EffectPanel';
type Props={document:AudioDocument;onStopPreview:()=>void;onClose:()=>void;onApply:(channels:Float32Array[],label:string,selection?:AudioSelection)=>void};
type Result={id:number;speed:number;pitch:number;channels:Float32Array[];selection:{startSample:number;endSample:number}};
export function PitcherModal(p:Props){
 const doc=p.document,[speed,setSpeed]=useState(1),[pitch,setPitch]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const latest=useRef(p);latest.current=p;
 const original=useRef({channels:doc.channels,rate:doc.sampleRate});
 const range=useMemo(()=>targetRange(doc.selection,doc.channels[0]?.length??0),[doc]);
 const source=useMemo(()=>doc.channels.map(c=>c.slice(range.start,range.end)),[doc,range]);
 const serial=useRef(0),controller=useRef<AbortController|null>(null),cache=useRef<Result|null>(null),shown=useRef<{id:number;speed:number}|null>(null);
 const wanted=useRef({speed,pitch});wanted.current={speed,pitch};
 const exit=useRef<ReturnType<typeof createPreviewExit>|null>(null);
 if(!exit.current)exit.current=createPreviewExit(()=>{serial.current++;controller.current?.abort();cache.current=null;if(shown.current)restoreUnappliedPreview(audioEngine,original.current.channels,original.current.rate);shown.current=null;latest.current.onStopPreview();});
 useEffect(()=>{exit.current!.reset();return()=>exit.current!.discard();},[]);
 useEffect(()=>{
  const id=++serial.current,aborter=new AbortController();controller.current=aborter;
  setBusy(true);setError('');setResult(null);cache.current=null;
  const timer=window.setTimeout(async()=>{
   try{
    const segment=await renderSignalsmith(source,doc.sampleRate,speed,pitch,aborter.signal);
    if(aborter.signal.aborted||exit.current!.settled||id!==serial.current)return;
    const full=splicePitcher(original.current.channels,segment,range.start,range.end),r={id,speed,pitch,...full};
    cache.current=r;setResult(r);setBusy(false);
   }catch(e){
    if(aborter.signal.aborted||exit.current!.settled||id!==serial.current)return;
    cache.current=null;setResult(null);setBusy(false);
    if(shown.current)restoreUnappliedPreview(audioEngine,original.current.channels,original.current.rate);shown.current=null;
    setError(`Échec de Signalsmith Stretch : ${String(e)}. Aucun autre moteur n’a été utilisé.`);
   }
  },80);
  return()=>{window.clearTimeout(timer);aborter.abort();};
 },[source,doc.sampleRate,range,speed,pitch]);
 useEffect(()=>{
  let frame=0;
  const tick=()=>{
   if(exit.current!.settled)return;
   const r=cache.current;
   if(!audioEngine.isPlaying)shown.current=null;
   if(audioEngine.isPlaying&&r&&r.id===serial.current&&r.speed===wanted.current.speed&&r.pitch===wanted.current.pitch&&shown.current?.id!==r.id){
    const at=audioEngine.getCurrentSample(),oldSpeed=shown.current?.speed??1;
    const sourcePosition=at<=range.start?at:range.start+(at-range.start)*oldSpeed;
    const position=sourcePosition<=range.start?sourcePosition:range.start+(sourcePosition-range.start)/r.speed;
    if(audioEngine.replacePreviewAudio(r.channels,doc.sampleRate,{position,loopStart:range.start,loopEnd:r.selection.endSample}))shown.current={id:r.id,speed:r.speed};
   }
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[doc.sampleRate,range]);
 const ready=!busy&&!error&&range.end>range.start&&result?.id===serial.current&&result?.speed===speed&&result?.pitch===pitch;
 const cancel=()=>{exit.current!.discard();latest.current.onClose();};
 const apply=()=>{const r=cache.current;if(!ready||!r||r.id!==serial.current||r.speed!==wanted.current.speed||r.pitch!==wanted.current.pitch)return;exit.current!.apply(()=>{latest.current.onApply(r.channels,'Z-Pitcher',r.selection);controller.current?.abort();});};
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-pitcher" role="dialog" aria-modal="true" aria-labelledby="pitcher-title"><header><h2 id="pitcher-title">Z-Pitcher</h2><button type="button" aria-label="Fermer" onClick={cancel}>×</button></header><main><div className="zonyx-legacy-controls"><Fader label="Vitesse" value={speed} defaultValue={1} min={.5} max={2} step={.05} display={`${speed} ×`} onChange={setSpeed}/><Fader label="Hauteur" value={pitch} defaultValue={0} min={-12} max={12} step={1} display={`${pitch} demi-tons`} onChange={setPitch}/></div>{busy&&<p role="status">Calcul Signalsmith Stretch…</p>}{error&&<p role="alert">{error}</p>}</main><footer><button type="button" onClick={cancel}>Annuler</button><button type="button" disabled={!ready} onClick={apply}>Appliquer</button></footer></EffectPanel></div>;
}
