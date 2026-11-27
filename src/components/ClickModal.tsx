import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import type {AudioDocument} from '../audio/types';
import {targetRange} from '../audio/effectsModel.mjs';
import {removeClicks,MIN_SAMPLES} from '../audio/declick.mjs';
import {EffectPanel} from './EffectPanel';
import {EffectParameter} from './EffectParameter';
import './denoiser.css';
type Props={document:AudioDocument;onStartPreview:(channels:Float32Array[],rate:number,gain?:number,bands?:PreviewBand[])=>void;onApply:(channels:Float32Array[],label:string)=>void;onClose:()=>void};
const WINDOW_SECONDS=8,PAD=4096,SW=520,SH=190,SL=10,ST=10,SPW=500,SPH=170;
export function ClickModal(p:Props){
 const doc=p.document,rate=doc.sampleRate;
 const [tolerance,setTolerance]=useState(1000),[maxMs,setMaxMs]=useState(5),[applying,setApplying]=useState(false),[error,setError]=useState(''),[found,setFound]=useState<number|null>(null);
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {start:r.start,end:r.end};},[doc]);
 const source=useMemo(()=>doc.channels.map(c=>c.subarray(range.start,range.end)),[doc,range]);
 const n=source[0]?.length??0,tooShort=n<MIN_SAMPLES;
 const callbacks=useRef(p);callbacks.current=p;
 const live=useRef({tolerance,maxMs});live.current={tolerance,maxMs};
 const regions=useRef<{start:number;end:number}[]>([]);
 const win=useRef({from:0,to:0});
 const outRef=useRef<SVGPathElement>(null),origRef=useRef<SVGPathElement>(null),markRef=useRef<SVGPathElement>(null),hintRef=useRef<SVGTextElement>(null);
 const windowAround=()=>{const at=Math.max(0,Math.min(n,Math.floor(audioEngine.getCurrentSample()-range.start)));return {from:Math.max(0,at-Math.round(rate*.25)),to:Math.min(n,at+Math.round(rate*WINDOW_SECONDS))};};
 const render=(from:number,to:number)=>{
  const l=live.current,lead=Math.max(0,from-PAD),end=Math.min(n,to+PAD);
  const result=removeClicks(source.map(c=>c.subarray(lead,end)),rate,{tolerance:l.tolerance,maxMs:l.maxMs});
  regions.current=result.clicks.filter(c=>c.channel===0).map(c=>({start:c.start+lead,end:c.end+lead}));
  setFound(result.clicks.filter(c=>c.start+lead>=from&&c.start+lead<to).length);
  return source.map((c,k)=>{const o=new Float32Array(c),part=result.channels[k];for(let i=from;i<to;i++)o[i]=part[i-lead];return o;});
 };
 const push=(from:number,to:number)=>{
  if(!n||tooShort)return;
  try{win.current={from,to};callbacks.current.onStartPreview(render(from,to),rate);setError('');}catch(e){setError(String(e));}
 };
 useEffect(()=>{
  if(!n||tooShort)return;
  const timer=window.setTimeout(()=>{const w=windowAround();push(w.from,w.to);},50);
  return()=>window.clearTimeout(timer);
 },[tolerance,maxMs,source,n]);
 useEffect(()=>{
  if(!n||tooShort)return;
  const timer=window.setInterval(()=>{
   const w=win.current;
   if(!audioEngine.isPlaying||(w.from<=0&&w.to>=n))return;
   const at=audioEngine.getCurrentSample()-range.start,span=w.to-w.from;
   if(span>0&&(at>=w.from+span*.5||at<w.from-1)){const next=windowAround();push(next.from,next.to);}
  },400);
  return()=>window.clearInterval(timer);
 },[source,n,range.start]);
 useEffect(()=>{
  let frame=0;
  const center=ST+SPH/2,amp=SPH/2-6;
  const draw=()=>{
   const playing=audioEngine.isPlaying,out=outRef.current,orig=origRef.current,marks=markRef.current;
   if(out&&orig&&marks){
    if(!playing){out.setAttribute('d','');orig.setAttribute('d','');marks.setAttribute('d','');}
    else{
     const snap=audioEngine.readWaveformSnapshot(),m=snap.length;
     let d='';
     for(let i=0;i<m;i+=2)d+=`${i?'L':'M'}${(SL+SPW*i/(m-1)).toFixed(1)} ${(center-Math.max(-1,Math.min(1,snap[i]))*amp).toFixed(1)}`;
     out.setAttribute('d',d);
     const pos=Math.floor(audioEngine.getCurrentSample()-range.start),ch=source[0];
     let o='';
     if(ch&&pos>=m&&pos<=ch.length)for(let i=0;i<m;i+=2)o+=`${i?'L':'M'}${(SL+SPW*i/(m-1)).toFixed(1)} ${(center-Math.max(-1,Math.min(1,ch[pos-m+i]??0))*amp).toFixed(1)}`;
     orig.setAttribute('d',o);
     let k='';
     for(const r of regions.current){const rel=r.start-(pos-m);if(rel>=0&&rel<m)k+=`M${(SL+SPW*rel/(m-1)).toFixed(1)} ${ST}V${ST+SPH}`;}
     marks.setAttribute('d',k);
    }
   }
   hintRef.current?.setAttribute('fill-opacity',playing?'0':'.7');
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return()=>cancelAnimationFrame(frame);
 },[source,range.start]);
 const canApply=!tooShort&&!applying&&n>0;
 const apply=()=>{
  if(!canApply)return;
  setApplying(true);
  window.setTimeout(()=>{
   try{
    const l=live.current,result=removeClicks(source,rate,{tolerance:l.tolerance,maxMs:l.maxMs});
    if(!result.clicks.length){setError('Aucun clic à réparer avec cette tolérance. Abaissez-la, puis réessayez.');setApplying(false);return;}
    callbacks.current.onApply(result.channels.map((s,i)=>{const full=new Float32Array(doc.channels[i]??doc.channels[0]);full.set(s,range.start);return full;}),'Z-Clics');
   }catch(e){setError(String(e));setApplying(false);}
  },40);
 };
 const status=tooShort?'Sélection trop courte : il faut au moins 4000 échantillons, soit environ 0,1 s.':found===null?'Lancez la lecture pour entendre la réparation.':found===0?'Aucun clic détecté dans la zone en lecture. Abaissez la tolérance si des clics restent audibles.':`${found} défaut${found>1?'s':''} réparé${found>1?'s':''} dans la zone en lecture.`;
 const grid=Array.from({length:9},(_,i)=>`M${SL+(i+1)*50} ${ST}V${ST+SPH}`).concat(Array.from({length:3},(_,j)=>`M${SL} ${ST+SPH*(j+1)/4}H${SL+SPW}`)).join(' ');
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-denoiser" minWidth={640} minHeight={440} role="dialog" aria-modal="true" aria-labelledby="declick-title">
  <header><h2 id="declick-title">Z-Clics</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
  <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-dn">
   <svg className="zonyx-dn-scope" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Forme d’onde du son en lecture">
    <rect x={SL} y={ST} width={SPW} height={SPH} fill="var(--wave-bg)" stroke="#bd93f9"/>
    <path d={grid} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/>
    <path ref={origRef} fill="none" stroke="#bd93f9" strokeOpacity=".75" strokeWidth="1.4" strokeLinejoin="round"/>
    <path ref={outRef} fill="none" stroke="#39ff14" strokeWidth="2" strokeLinejoin="round" style={{filter:'drop-shadow(0 0 3px #39ff14)'}}/>
    <path ref={markRef} fill="none" stroke="#ff5555" strokeWidth="2"/>
    <text ref={hintRef} x={SL+SPW/2} y={ST+SPH/2+4} fill="#fff" fillOpacity=".7" fontSize="13" textAnchor="middle">Lancez la lecture pour voir l’onde</text>
   </svg>
   <div className="zonyx-dn-legend"><span className="clean"><i/>Son réparé</span><span className="source"><i/>Son d’origine</span><span><i style={{background:'#ff5555'}}/>Clic détecté</span></div>
   <div className="zonyx-dn-row">
    <div className="zonyx-dn-profile" data-ready={!tooShort&&!!found}>
     <strong>Réparation des clics</strong>
     <span>{status}</span>
    </div>
    <EffectParameter label="Tolérance" value={tolerance} initial={1000} spec={{min:100,max:5000,step:49,fine:4.9,digits:0,logarithmic:true}} unit="%" onChange={setTolerance}/>
    <EffectParameter label="Taille maximale" value={maxMs} initial={5} spec={{min:1,max:20,step:1,fine:.1,digits:0}} unit="ms" onChange={setMaxMs}/>
   </div>
   {error&&<p role="alert">{error}</p>}
  </div></fieldset></main>
  <footer><span role="status">{applying?'Application…':''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!canApply}>Appliquer</button></footer>
 </EffectPanel></div>;
}
