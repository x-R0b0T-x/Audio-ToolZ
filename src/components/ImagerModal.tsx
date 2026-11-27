import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import type {AudioDocument} from '../audio/types';
import {targetRange} from '../audio/effectsModel.mjs';
import {DEFAULT_IMAGER,isImagerNeutral,normalizeImager,stereoCorrelation,type ImagerSettings} from '../audio/imager.mjs';
import {EffectPanel} from './EffectPanel';
import {EffectParameter} from './EffectParameter';
import {roundTo,useFineSlider} from './useFineSlider';
import './modulation.css';
import './imager.css';
type Props={document:AudioDocument;onStartPreview:(channels:Float32Array[],rate:number,gain?:number,bands?:PreviewBand[])=>void;onApply:(channels:Float32Array[],label:string)=>void;onClose:()=>void};
type Request={id:number;settings:ImagerSettings;from:number;to:number};
type Meter={points:string;correlation:number};
const WINDOW_SECONDS=12,LABEL='Z-Stéréo';
const BAND_NAMES=['Graves','Médiums','Médiums aigus','Aigus'];
const CROSS_SPECS=[
 {min:40,max:400,step:5,fine:1,digits:0,logarithmic:true},
 {min:300,max:4000,step:50,fine:5,digits:0,logarithmic:true},
 {min:2000,max:12000,step:200,fine:20,digits:0,logarithmic:true}
];
const hz=(f:number)=>f>=1000?`${(f/1000).toFixed(f>=10000?0:1).replace('.',',')} kHz`:`${Math.round(f)} Hz`;
function BandFader({label,range,value,onChange}:{label:string;range:string;value:number;onChange:(v:number)=>void}){
 const fine=.1,clamp=(v:number)=>Math.max(-100,Math.min(100,v));
 const slider=useFineSlider({min:-100,max:100,value,step:1,fineStep:fine,onChange});
 return <div className="zonyx-imager-band" onDoubleClick={e=>{e.preventDefault();onChange(0);}}>
  <span className="zonyx-imager-band-name">{label}</span><span className="zonyx-imager-band-range">{range}</span>
  <div {...slider} className="zonyx-imager-fader" style={{width:28,height:144,touchAction:'none',cursor:'ns-resize'}} onWheel={e=>{const d=e.deltaY||e.deltaX;if(!d)return;const s=e.shiftKey?fine:5;onChange(clamp(roundTo(value+(d<0?s:-s),fine)));}}>
   <input type="range" aria-label={`Largeur ${label}`} min={-100} max={100} step={fine} value={value} onChange={e=>onChange(Number(e.target.value))}
    onKeyDown={e=>{if(!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key))return;e.preventDefault();const s=e.shiftKey?fine:1;onChange(clamp(roundTo(value+(e.key==='ArrowUp'||e.key==='ArrowRight'?s:-s),fine)));}}
    className="studio-fader-vertical cursor-pointer" style={{writingMode:'vertical-lr',direction:'rtl',height:144,width:28,accentColor:'#45f882',pointerEvents:'none'}}/>
  </div>
  <output className="zonyx-imager-value">{`${value>0?'+':''}${Number(value.toFixed(1))} %`}</output>
 </div>;
}
function Goniometer({meter}:{meter:Meter|null}){
 const corr=meter?.correlation??1,position=`${(corr+1)*50}%`;
 return <div className="zonyx-imager-gonio">
  <svg viewBox="-1.1 -1.1 2.2 2.2" role="img" aria-label="Goniomètre : image stéréo du son préécouté">
   <rect x="-1.1" y="-1.1" width="2.2" height="2.2" fill="var(--wave-bg)"/>
   <circle cx="0" cy="0" r="1" fill="none" stroke="#bd93f9" strokeWidth=".02"/>
   <path d="M0 -1V1M-1 0H1M-.7071 -.7071L.7071 .7071M.7071 -.7071L-.7071 .7071" stroke="#fff" strokeOpacity=".18" strokeWidth=".012" fill="none"/>
   <text x="-1.04" y="-.86" fill="#fff" fillOpacity=".6" fontSize=".11">G</text><text x=".93" y="-.86" fill="#fff" fillOpacity=".6" fontSize=".11">D</text>
   <path d={meter?.points??''} stroke="#39ff14" strokeWidth=".022" strokeLinecap="round" fill="none" style={{filter:'drop-shadow(0 0 .03px #39ff14)'}}/>
  </svg>
  <div className="zonyx-imager-corr" role="img" aria-label={`Corrélation ${corr.toFixed(2)}`}><i style={{left:position}}/></div>
  <div className="zonyx-imager-corr-labels"><span>−1</span><output className={corr<0?'is-warning':''}>{`Corrélation ${corr>=0?'+':''}${corr.toFixed(2).replace('.',',')}`}</output><span>+1</span></div>
 </div>;
}
export function ImagerModal(p:Props){
 const doc=p.document;
 const [s,setS]=useState<ImagerSettings>(()=>({...DEFAULT_IMAGER,widths:[...DEFAULT_IMAGER.widths],crossovers:[...DEFAULT_IMAGER.crossovers]}));
 const [touched,setTouched]=useState(false),[pending,setPending]=useState(true),[applying,setApplying]=useState(false),[error,setError]=useState(''),[meter,setMeter]=useState<Meter|null>(null);
 const change=(patch:Partial<ImagerSettings>)=>{setTouched(true);setS(old=>({...old,...patch}));};
 const setWidth=(index:number,value:number)=>{setTouched(true);setS(old=>({...old,widths:old.widths.map((w,k)=>k===index?value:w)}));};
 const setCross=(index:number,value:number)=>{setTouched(true);setS(old=>({...old,crossovers:old.crossovers.map((f,k)=>k===index?value:f)}));};
 const callbacks=useRef(p);callbacks.current=p;
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {start:r.start,end:r.end};},[doc]);
 const source=useMemo(()=>doc.channels.map(ch=>ch.subarray(range.start,range.end)),[doc,range]);
 const n=source[0]?.length??0,mono=doc.channels.length<2,eff=useMemo(()=>normalizeImager(s),[s]),neutral=isImagerNeutral(s);
 const latest=useRef(s);latest.current=s;
 const worker=useRef<Worker|null>(null),busy=useRef(false),wanted=useRef<Request|null>(null),serial=useRef(0),applyId=useRef(-1),win=useRef({from:0,to:0});
 const commit=useRef((channels:Float32Array[])=>{void channels;});
 commit.current=channels=>callbacks.current.onApply(channels.map((segment,i)=>{const full=new Float32Array(doc.channels[Math.min(i,doc.channels.length-1)]);full.set(segment,range.start);return full;}),LABEL);
 const windowAround=()=>{
  const rate=doc.sampleRate,at=Math.max(0,Math.min(n,Math.floor(audioEngine.getCurrentSample()-range.start)));
  return {from:Math.max(0,at-rate),to:Math.min(n,at+rate*WINDOW_SECONDS)};
 };
 const dispatch=()=>{
  const request=wanted.current;
  if(!worker.current||busy.current||!request)return;
  busy.current=true;worker.current.postMessage({kind:'render',...request});
 };
 useEffect(()=>{
  if(!n)return;
  let w:Worker;
  try{w=new Worker(new URL('../audio/imager.worker.ts',import.meta.url),{type:'module'});}
  catch(e){setError(String(e));setPending(false);return;}
  worker.current=w;busy.current=false;
  const copy=source.map(c=>new Float32Array(c));
  w.postMessage({kind:'init',channels:copy,sampleRate:doc.sampleRate},copy.map(c=>c.buffer as ArrayBuffer));
  w.onmessage=(e:MessageEvent<{id:number;channels?:Float32Array[];from?:number;to?:number;error?:string}>)=>{
   busy.current=false;const r=e.data;
   if(r.error||!r.channels){setError(r.error??'Échec du traitement audio.');setPending(false);setApplying(false);return;}
   if(r.id===applyId.current){applyId.current=-1;commit.current(r.channels);return;}
   if(r.id!==serial.current){dispatch();return;}
   win.current={from:r.from??0,to:r.to??n};setError('');setPending(false);
   const left=r.channels[0],right=r.channels[1]??r.channels[0],from=r.from??0,end=Math.min(r.to??n,from+doc.sampleRate*4),stride=Math.max(1,Math.floor((end-from)/500));
   let points='';for(let i=from;i<end;i+=stride)points+=`M${((right[i]-left[i])*.7071).toFixed(3)} ${(-(left[i]+right[i])*.7071).toFixed(3)}h.002`;
   setMeter({points,correlation:stereoCorrelation(left,right,from,end)});
   callbacks.current.onStartPreview(r.channels,doc.sampleRate);
  };
  w.onerror=()=>{busy.current=false;setError('Échec du traitement audio. Fermez puis rouvrez cet effet.');setPending(false);setApplying(false);};
  return()=>{w.terminate();if(worker.current===w)worker.current=null;busy.current=false;};
 },[source,doc.sampleRate,n]);
 useEffect(()=>{
  if(!n||applyId.current>=0)return;
  const id=++serial.current;setPending(true);
  wanted.current={id,settings:s,...windowAround()};
  const timer=window.setTimeout(dispatch,60);
  return()=>window.clearTimeout(timer);
 },[source,doc.sampleRate,s,n]);
 useEffect(()=>{
  if(!n)return;
  const timer=window.setInterval(()=>{
   const w=win.current;
   if(!audioEngine.isPlaying||busy.current||applyId.current>=0||(w.from<=0&&w.to>=n))return;
   const at=audioEngine.getCurrentSample()-range.start,span=w.to-w.from;
   if(at>=w.from+span*.5||at<w.from-1){const id=++serial.current;wanted.current={id,settings:latest.current,...windowAround()};dispatch();}
  },400);
  return()=>window.clearInterval(timer);
 },[n,range.start,doc.sampleRate]);
 const apply=()=>{
  if(!n||!touched||neutral||pending||applying||error)return;
  setApplying(true);
  const id=++serial.current;applyId.current=id;
  wanted.current={id,settings:latest.current,from:0,to:n};dispatch();
 };
 const ranges=[`< ${hz(eff.crossovers[0])}`,`${hz(eff.crossovers[0])} à ${hz(eff.crossovers[1])}`,`${hz(eff.crossovers[1])} à ${hz(eff.crossovers[2])}`,`> ${hz(eff.crossovers[2])}`];
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-imager" minWidth={700} minHeight={560} role="dialog" aria-modal="true" aria-labelledby="imager-title">
  <header><h2 id="imager-title">{LABEL}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
  <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-imager-body">
   <div className="zonyx-imager-top">
    <Goniometer meter={meter}/>
    <div className="zonyx-imager-bands">{BAND_NAMES.map((name,i)=><BandFader key={name} label={name} range={ranges[i]} value={s.widths[i]} onChange={v=>setWidth(i,v)}/>)}</div>
   </div>
   <div className="zonyx-mod-row">{CROSS_SPECS.map((spec,i)=><EffectParameter key={i} label={`Croisement ${i+1}`} value={s.crossovers[i]} initial={DEFAULT_IMAGER.crossovers[i]} spec={spec} unit="Hz" onChange={v=>setCross(i,v)}/>)}</div>
   <div className="zonyx-mod-row">
    <EffectParameter label="Stereoize" value={s.stereoize} initial={0} spec={{min:0,max:100,step:1,fine:.1,digits:0}} unit="%" onChange={v=>change({stereoize:v})}/>
    <div className="zonyx-imager-modes" role="group" aria-label="Mode de Stereoize">{(['I','II'] as const).map(mode=><button type="button" key={mode} className="zonyx-mod-toggle" aria-pressed={s.mode===mode} onClick={()=>change({mode})}>{`Mode ${mode}`}</button>)}</div>
    {s.mode==='I'&&<EffectParameter label="Délai" value={s.delayMs} initial={6} spec={{min:.5,max:30,step:.5,fine:.1,digits:1}} unit="ms" onChange={v=>change({delayMs:v})}/>}
   </div>
   <output className="zonyx-hint" aria-live="off">{mono?'Fichier mono : activez Stereoize pour obtenir une image stéréo.':'0 % laisse le son d’origine ; −100 % donne du mono ; +100 % double les côtés.'}</output>
   {error&&<p role="alert">{error}</p>}
  </div></fieldset></main>
  <footer><span role="status">{applying?'Application…':pending&&touched?'Calcul…':''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n||!touched||neutral||pending||applying||!!error}>Appliquer</button></footer>
 </EffectPanel></div>;
}
