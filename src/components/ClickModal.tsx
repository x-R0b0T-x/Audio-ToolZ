import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import type {AudioDocument} from '../audio/types';
import {targetRange} from '../audio/effectsModel.mjs';
import {removeClicks,MIN_SAMPLES} from '../audio/declick.mjs';
import {EffectPanel} from './EffectPanel';
import {EffectParameter} from './EffectParameter';
import './denoiser.css';
type Props={document:AudioDocument;onStartPreview:(channels:Float32Array[],rate:number,gain?:number,bands?:PreviewBand[])=>void;onApply:(channels:Float32Array[],label:string)=>void;onClose:()=>void};
type Analysis={key:string;channels:Float32Array[];marks:number[]};
const MAX_SECONDS=60,SW=520,SH=150,SL=10,ST=10,SPW=500,SPH=130;
const LEVELS:[string,number][]=[['Prudent',2000],['Standard',1000],['Sensible',700],['Fort',500],['Très fort',300]];
export function ClickModal(p:Props){
 const doc=p.document,rate=doc.sampleRate;
 const [tolerance,setTolerance]=useState(1000),[maxMs,setMaxMs]=useState(5),[applying,setApplying]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState(''),[analysis,setAnalysis]=useState<Analysis|null>(null);
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {start:r.start,end:r.end};},[doc]);
 const source=useMemo(()=>doc.channels.map(c=>c.subarray(range.start,range.end)),[doc,range]);
 const n=source[0]?.length??0,tooShort=n<MIN_SAMPLES,tooLong=n>MAX_SECONDS*rate,key=`${tolerance}:${maxMs}`;
 const callbacks=useRef(p);callbacks.current=p;
 const headRef=useRef<SVGPathElement>(null);
 useEffect(()=>{
  if(!n||tooShort||tooLong){setAnalysis(null);setBusy(false);return;}
  setBusy(true);
  const timer=window.setTimeout(()=>{
   try{
    const result=removeClicks(source,rate,{tolerance,maxMs});
    setAnalysis({key:`${tolerance}:${maxMs}`,channels:result.channels,marks:result.clicks.map(c=>c.start)});
    setError('');
    callbacks.current.onStartPreview(result.channels,rate);
   }catch(e){setError(String(e));}
   setBusy(false);
  },200);
  return()=>window.clearTimeout(timer);
 },[tolerance,maxMs,source,n]);
 const peaks=useMemo(()=>{
  const ch=source[0];
  if(!ch||!n)return '';
  const mid=ST+SPH/2,amp=SPH/2-4;
  let d='';
  for(let c=0;c<SPW;c++){
   const a=Math.floor(c*n/SPW),b=Math.max(a+1,Math.floor((c+1)*n/SPW));
   let lo=1,hi=-1;
   for(let i=a;i<b;i++){const v=ch[i];if(v<lo)lo=v;if(v>hi)hi=v;}
   const y1=mid-Math.min(1,hi)*amp,y2=Math.max(y1+1,mid-Math.max(-1,lo)*amp);
   d+=`M${SL+c+.5} ${y1.toFixed(1)}V${y2.toFixed(1)}`;
  }
  return d;
 },[source,n]);
 const current=analysis&&analysis.key===key?analysis:null;
 const marks=current?current.marks.map(m=>`M${(SL+SPW*m/n).toFixed(1)} ${ST}V${ST+SPH}`).join(''):'';
 useEffect(()=>{
  let frame=0;
  const draw=()=>{
   const head=headRef.current;
   if(head){
    const pos=audioEngine.getCurrentSample()-range.start;
    if(audioEngine.isPlaying&&n>0&&pos>=0&&pos<=n)head.setAttribute('d',`M${(SL+SPW*pos/n).toFixed(1)} ${ST}V${ST+SPH}`);
    else head.setAttribute('d','');
   }
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return()=>cancelAnimationFrame(frame);
 },[n,range.start]);
 const count=current?.marks.length??0,canApply=!!current&&count>0&&!busy&&!applying;
 const apply=()=>{
  if(!current||!canApply)return;
  setApplying(true);
  try{
   callbacks.current.onApply(current.channels.map((s,i)=>{const full=new Float32Array(doc.channels[i]??doc.channels[0]);full.set(s,range.start);return full;}),'Pop/Clic');
  }catch(e){setError(String(e));setApplying(false);}
 };
 const status=tooShort?'Sélection trop courte : il faut au moins 4000 échantillons, soit environ 0,1 s.':tooLong?`Sélection trop longue : ${MAX_SECONDS} s au maximum. Sélectionnez une portion plus courte.`:busy||!current?'Analyse en cours…':count===0?'Aucun clic repéré à ce niveau. Choisissez un niveau plus sensible.':`${count} clic${count>1?'s':''} repéré${count>1?'s':''}. Lancez la lecture pour entendre la réparation.`;
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-denoiser" minWidth={640} minHeight={460} role="dialog" aria-modal="true" aria-labelledby="declick-title">
  <header><h2 id="declick-title">Pop/Clic</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
  <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-dn">
   <svg className="zonyx-dn-scope" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Forme d’onde de la sélection, avec les clics repérés en rouge">
    <rect x={SL} y={ST} width={SPW} height={SPH} fill="var(--wave-bg)" stroke="#bd93f9"/>
    <path d={peaks} fill="none" stroke="#bd93f9" strokeWidth="1"/>
    <path d={marks} fill="none" stroke="#ff5555" strokeWidth="2"/>
    <path ref={headRef} fill="none" stroke="#39ff14" strokeWidth="2"/>
   </svg>
   <div className="zonyx-dn-legend"><span className="source"><i/>Sélection</span><span><i style={{background:'#ff5555'}}/>Clic repéré</span></div>
   <div className="zonyx-mode" role="group" aria-label="Niveau de nettoyage">{LEVELS.map(([name,value])=><button type="button" key={name} title={`${value} %`} aria-pressed={tolerance===value} onClick={()=>setTolerance(value)}>{name}</button>)}</div>
   <div className="zonyx-dn-row">
    <div className="zonyx-dn-profile" data-ready={count>0}>
     <strong>Nettoyage des clics</strong>
     <span role="status">{status}</span>
     {tolerance<500&&<span>Sous 500 %, gardez des sélections courtes : des sons secs peuvent être touchés.</span>}
    </div>
    <EffectParameter label="Tolérance" value={tolerance} initial={1000} spec={{min:100,max:5000,step:49,fine:4.9,digits:0,logarithmic:true}} unit="%" onChange={setTolerance}/>
    <EffectParameter label="Taille maximale" value={maxMs} initial={5} spec={{min:1,max:20,step:1,fine:.1,digits:0}} unit="ms" onChange={setMaxMs}/>
   </div>
   {error&&<p role="alert">{error}</p>}
  </div></fieldset></main>
  <footer><span role="status">{applying?'Application…':''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!canApply}>Appliquer</button></footer>
 </EffectPanel></div>;
}
