import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine} from '../audio/engine';
import {DEFAULT_REVERB,type ReverbSettings} from '../audio/reverb.mjs';
import {targetRange} from '../audio/effectsModel.mjs';
import type {AudioDocument,AudioSelection} from '../audio/types';
import {EffectParameter} from './EffectParameter';
import {EffectPanel} from './EffectPanel';
import './reverbPanel.css';
type Props={document:AudioDocument;onStopPreview:()=>void;onClose:()=>void;onApply:(channels:Float32Array[],label:string,selection?:AudioSelection)=>void};
type Render={id:number;channels:Float32Array[];meter:Float32Array;hop:number;peak:number;tailSamples:number;error?:string};
const divisions=[['1/64',.0625],['1/32',.125],['1/16',.25],['1/8',.5],['1/4',1]] as const;
export function ReverbModal(p:Props){
 const doc=p.document,{start,end}=targetRange(doc.selection,doc.channels[0]?.length??0);
 const [settings,setSettings]=useState<ReverbSettings>({...DEFAULT_REVERB}),[tempo,setTempo]=useState(false),[division,setDivision]=useState(2),[bpm,setBpm]=useState(doc.bpmInfo?.bpm??0),[detecting,setDetecting]=useState(false);
 const [result,setResult]=useState<Render|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const worker=useRef<Worker|null>(null),detector=useRef<Worker|null>(null),working=useRef(false),wanted=useRef<{id:number;settings:ReverbSettings}|null>(null),serial=useRef(0),cache=useRef<Render|null>(null),previewId=useRef(-1),view=useRef<SVGCircleElement>(null);
 const latest=useRef(p);latest.current=p;
 const effective=useMemo(()=>({...settings,preDelay:tempo&&bpm>0?Math.min(250,60000/bpm*divisions[division][1]):settings.preDelay}),[settings,tempo,bpm,division]);
 const dispatch=()=>{const request=wanted.current;if(!worker.current||working.current||!request)return;working.current=true;const channels=doc.channels.map(ch=>ch.slice(start,end));worker.current.postMessage({...request,channels,sampleRate:doc.sampleRate},{transfer:channels.map(ch=>ch.buffer as ArrayBuffer)});};
 useEffect(()=>{
  cache.current=null;previewId.current=-1;working.current=false;
  let w:Worker;
  try{w=new Worker(new URL('../audio/reverb.worker.ts',import.meta.url),{type:'module'});}catch(e){setError(String(e));setBusy(false);return;}
  worker.current=w;
  w.onmessage=(e:MessageEvent<Render>)=>{
   working.current=false;const r=e.data;
   if(r.error){setError(r.error);setBusy(false);}else{cache.current=r;setResult(r);setError('');setBusy(r.id!==serial.current);}
   if(wanted.current&&wanted.current.id!==r.id)dispatch();
  };
  w.onerror=()=>{working.current=false;setBusy(false);setError('Échec du traitement audio. Fermez puis rouvrez cet effet.');};
  return()=>{w.terminate();worker.current=null;working.current=false;};
 },[doc.channels,doc.sampleRate,start,end]);
 useEffect(()=>{setBusy(true);wanted.current={id:++serial.current,settings:effective};const timer=window.setTimeout(dispatch,35);return()=>clearTimeout(timer);},[effective,doc.channels,doc.sampleRate,start,end]);
 const merge=(r:Render)=>doc.channels.map((ch,c)=>{const out=new Float32Array(Math.max(ch.length,start+r.channels[c].length));out.set(ch);out.set(r.channels[c].subarray(0,end-start),start);for(let i=end-start;i<r.channels[c].length;i++)out[start+i]+=r.channels[c][i];return out;});
 useEffect(()=>{
  let frame=0,last=0,level=0,wasPlaying=false;
  const tick=(now:number)=>{
   const playing=audioEngine.isPlaying,r=cache.current;
   if(!playing)previewId.current=-1;
   if(playing&&r&&(previewId.current!==r.id||!wasPlaying)){
    if(audioEngine.replacePreviewAudio(merge(r),doc.sampleRate))previewId.current=r.id;
   }
   const sample=audioEngine.getCurrentSample()-start,rms=playing&&r&&previewId.current===r.id&&sample>=0?r.meter[Math.floor(sample/r.hop)]??0:0;
   const target=rms>0?Math.max(0,Math.min(1,(20*Math.log10(rms)+66)/66)):0,dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;wasPlaying=playing;
   level+=(target-level)*(1-Math.exp(-dt/(target>level?.02:.18)));if(level<.002)level=0;
   if(view.current){view.current.style.filter=level?`drop-shadow(0 0 ${3+level*22}px rgba(57,255,20,${level}))`:'none';view.current.style.fill=`rgba(57,255,20,${level*.4})`;view.current.style.strokeOpacity=String(.45+level*.55);}
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[doc.channels,doc.sampleRate,start,end]);
 useEffect(()=>()=>{detector.current?.terminate();latest.current.onStopPreview();},[]);
 const toggleTempo=()=>{
  if(tempo){setTempo(false);return;}if(bpm>0){setTempo(true);return;}if(detector.current)return;
  setDetecting(true);
  try{
   const w=new Worker(new URL('../audio/delayBpm.worker.ts',import.meta.url),{type:'module'});detector.current=w;
   const finish=()=>{w.terminate();detector.current=null;setDetecting(false);};
   w.onmessage=(e:MessageEvent<{bpm?:number;error?:string}>)=>{const value=e.data.bpm;finish();if(value&&Number.isFinite(value)&&value>0){setBpm(value);setTempo(true);setError('');}else setError(e.data.error??'Tempo non détecté.');};
   w.onerror=()=>{finish();setError('Détection du tempo indisponible.');};w.postMessage({channels:doc.channels,sampleRate:doc.sampleRate});
  }catch(e){setDetecting(false);setError(String(e));}
 };
 const knob=(id:keyof ReverbSettings,label:string,min:number,max:number,unit:string,digits=0,logarithmic=false)=><EffectParameter key={id} label={label} value={settings[id]} initial={DEFAULT_REVERB[id]} spec={{min,max,step:(max-min)/100,fine:(max-min)/1000,digits,logarithmic}} unit={unit} onChange={v=>setSettings(old=>({...old,[id]:v}))}/>;
 const ready=!!result&&result.id===serial.current&&!busy&&!error;
 return <div className="atz-advanced-backdrop"><EffectPanel className="atz-advanced atz-legacy atz-reverb" minWidth={740} minHeight={320} role="dialog" aria-modal="true" aria-labelledby="reverb-title">
  <header><h2 id="reverb-title">Z-Reverbe</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
  <main><div className="atz-rv-rack"><div className="atz-rv-room"><svg viewBox="0 0 200 200" role="img" aria-label={`Taille de la pièce : ${Math.round(settings.size)} %`}><circle ref={view} cx="100" cy="100" r={16+settings.size*.7} stroke="#39ff14" strokeWidth="3" fill="transparent"/></svg></div>
   <div className="atz-rv-knobs">
    {tempo?<label className="atz-rv-division">Prédélai<select aria-label="Prédélai" value={division} onChange={e=>setDivision(Number(e.target.value))}>{divisions.map(([label],i)=><option key={label} value={i}>{label}</option>)}</select></label>:knob('preDelay','Prédélai',0,250,'ms')}
    <button className="atz-rv-tempo" type="button" aria-pressed={tempo} disabled={detecting} onClick={toggleTempo}>{detecting?'Analyse…':'Tempo'}</button>
    {knob('size','Taille',0,100,'%')}{knob('modulation','Modulation',0,100,'%')}{knob('diffusion','Diffusion',0,100,'%')}{knob('rate','Vitesse',.05,5,'Hz',2,true)}
   </div><div className="atz-rv-colour">{knob('decay','Décroissance',.1,20,'s',2,true)}{knob('damping','Amort. aigu',200,20000,'Hz',0,true)}{knob('lowCut','Coupe-bas',20,2000,'Hz',0,true)}</div>
   <div className="atz-rv-levels"><div className="atz-rv-faders">{(['direct','reflections','reverb'] as const).map((id,i)=><label key={id}><input type="range" min={0} max={150} step={1} value={settings[id]} aria-label={['Direct','Réflexions','Réverbération'][i]} onDoubleClick={()=>setSettings(old=>({...old,[id]:DEFAULT_REVERB[id]}))} onChange={e=>setSettings(old=>({...old,[id]:Number(e.target.value)}))}/><span>{['Direct','Réflex.','Réverb.'][i]}</span></label>)}</div>{knob('width','Largeur',0,100,'%')}</div>
  </div>{error&&<p role="alert">{error}</p>}{result&&result.peak>1&&<p role="alert">Le rendu dépasse 0 dBFS.</p>}</main>
  <footer><span role="status">{busy?'Calcul…':''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" disabled={!ready} onClick={()=>{if(result&&ready)p.onApply(merge(result),'Z-Reverbe',{...doc.selection});}}>Appliquer</button></footer>
 </EffectPanel></div>;
}
