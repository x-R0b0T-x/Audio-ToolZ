import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import {createPreviewRelay} from '../audio/livePreviewRelay';
import {applyFade,applySpeedAndPitch,computeFadeGain} from '../audio/dsp';
import {applySpectralNoiseReduction,captureNoiseProfile,type NoiseProfile} from '../audio/studioDsp';
import {applyMusicalDelay,DELAY_DIVISIONS,DEFAULT_DIVISION,type DelayMode} from '../audio/musicalDelay';
import type {AudioDocument,EffectModalId,FadeCurve,FadeDirection} from '../audio/types';
import {Fader,Knob,DelayModeSwitch} from './EffectControls';
import {AdvancedEffects} from './AdvancedEffects';
import {EffectPanel} from './EffectPanel';
import {ReverbModal} from './ReverbModal';
import {PitcherModal} from './PitcherModal';
import {targetRange} from '../audio/effectsModel.mjs';
import './delayPanel.css';
interface Props{effect:EffectModalId;document:AudioDocument|null;noiseProfile?:NoiseProfile|null;onCaptureNoiseProfile?:(p:NoiseProfile)=>void;isPreviewPlaying:boolean;onStartPreview:(c:Float32Array[],r:number,g?:number,b?:PreviewBand[])=>void;onStopPreview:()=>void;onApply:(c:Float32Array[],label:string,s?:{startSample:number;endSample:number})=>void;onClose:()=>void;}
export const EffectModal:React.FC<Props>=p=>!p.effect||!p.document?null:p.effect==='reverb'?<ReverbModal key={p.document.id} document={p.document} onStopPreview={p.onStopPreview} onApply={p.onApply} onClose={p.onClose}/>:p.effect==='speed-pitch'?<PitcherModal key={p.document.id} document={p.document} onStopPreview={p.onStopPreview} onClose={p.onClose} onApply={p.onApply}/>:<LiveEffectSession key={`${p.document.id}:${p.effect}`} {...p} effect={p.effect} document={p.document}/>;
function LiveEffectSession(p:Props&{effect:Exclude<EffectModalId,null>;document:AudioDocument}){
 const latest=useRef(p);latest.current=p;
 const relay=useMemo(()=>createPreviewRelay(()=>audioEngine.isPlaying,(...args:Parameters<Props['onStartPreview']>)=>latest.current.onStartPreview(...args)),[]);
 useEffect(()=>{const timer=window.setInterval(relay.poll,80);return()=>{window.clearInterval(timer);relay.clear();};},[relay]);
 const props={...p,onStartPreview:relay.submit};
 return p.effect==='eq'||p.effect==='filter'||p.effect==='compressor'?<AdvancedEffects {...props} effect={p.effect}/>:<Legacy {...props}/>;
}
function Legacy(p:Props&{effect:Exclude<EffectModalId,null>;document:AudioDocument}){
 const {document:doc,effect}=p,[c,set]=useState({direction:null as FadeDirection|null,curve:'scurve' as FadeCurve,speed:1,pitch:0,reduction:0,division:DEFAULT_DIVISION,mode:'off' as DelayMode,repetitions:0,wet:0,pan:0}),[touched,setTouched]=useState(false);
 const [detectedBpm,setDetectedBpm]=useState(0),[detecting,setDetecting]=useState(false),[bpmError,setBpmError]=useState('');
 const detector=useRef<Worker|null>(null);
 useEffect(()=>()=>{detector.current?.terminate();detector.current=null;},[]);
 const detectBpm=()=>{
  if(detector.current||!doc.channels[0]?.length)return;
  setDetecting(true);setBpmError('');
  const fail=(message:string)=>{detector.current?.terminate();detector.current=null;setDetecting(false);setBpmError(message);};
  try{
   const worker=new Worker(new URL('../audio/delayBpm.worker.ts',import.meta.url),{type:'module'});detector.current=worker;
   worker.onmessage=(event:MessageEvent<{bpm?:number;error?:string}>)=>{
    if(detector.current!==worker)return;
    const value=event.data.bpm;
    if(typeof value!=='number'||!Number.isFinite(value)||value<=0){fail(event.data.error??'Impossible de détecter un tempo régulier sur cette piste.');return;}
    worker.terminate();detector.current=null;setDetectedBpm(value);setDetecting(false);setBpmError('');
   };
   worker.onerror=()=>fail('Échec de la détection BPM. Vous pouvez réessayer.');
   worker.postMessage({channels:doc.channels,sampleRate:doc.sampleRate});
  }catch{fail('Impossible de démarrer la détection BPM.');}
 };
 const change=(v:Partial<typeof c>)=>{setTouched(true);set(old=>({...old,...v}));},callback=useRef(p);callback.current=p;
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {startSample:r.start,endSample:r.end};},[doc]),start=range.startSample,end=range.endSample,source=useMemo(()=>doc.channels.map(ch=>ch.subarray(start,end)),[doc,start,end]),n=source[0]?.length??0,bpm=detectedBpm>0?detectedBpm:doc.bpmInfo?.bpm??0;
 const blocked=effect==='echo'&&c.mode!=='off'&&c.repetitions>0&&c.wet>0&&!(Number.isFinite(bpm)&&bpm>0);
 const label=({fade:'Z-Fondus','speed-pitch':'Z-Pitcher','noise-reduction':'Z-Denoiser',echo:'Z-Delay'} as Record<string,string>)[effect];
 const process=()=>{switch(effect){case 'fade':return c.direction?applyFade(source,0,n,c.direction,c.curve):source;case 'noise-reduction':return c.reduction>0?applySpectralNoiseReduction(source,0,n,p.noiseProfile??captureNoiseProfile(source,doc.sampleRate,0,n),{reductionDb:c.reduction,sensitivity:1,smoothing:.35}):source;case 'echo':return blocked?source:applyMusicalDelay(source,doc.sampleRate,bpm,c.division,c.mode,c.repetitions,c.wet,c.pan);default:return source;}};
 const speed=()=>applySpeedAndPitch(doc.channels,doc.sampleRate,start,end,c.speed,c.pitch,true);
 useEffect(()=>{if(!n)return;const timer=window.setTimeout(()=>{if(effect==='speed-pitch'){const r=speed();callback.current.onStartPreview(r.channels.map(ch=>ch.subarray(r.selection.startSample,r.selection.endSample)),doc.sampleRate);}else callback.current.onStartPreview(process(),doc.sampleRate);},60);return()=>window.clearTimeout(timer);},[effect,doc,c,source,p.noiseProfile,blocked,bpm]);
 const head=useRef<SVGLineElement>(null);
 useEffect(()=>{
  if(effect!=='fade')return;
  let frame=0;
  const tick=()=>{
   const line=head.current;
   if(line){
    const session=(audioEngine as typeof audioEngine&{effectPreviewSession?:{start:number;segmentLength:number}}).effectPreviewSession;
    const from=session?.start??start,length=session?.segmentLength??n,fraction=length>0?(audioEngine.getCurrentSample()-from)/length:-1;
    if(audioEngine.isPlaying&&fraction>=0&&fraction<=1){const x=(12+fraction*256).toFixed(1);line.setAttribute('x1',x);line.setAttribute('x2',x);line.style.visibility='visible';}else line.style.visibility='hidden';
   }
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>cancelAnimationFrame(frame);
 },[effect,start,n]);
 const apply=()=>{if(!n||blocked||!touched)return;if(effect==='speed-pitch'){const r=speed();p.onApply(r.channels,label,r.selection);return;}p.onApply(process().map((segment,i)=>{const full=new Float32Array(doc.channels[i]??doc.channels[0]);full.set(segment,start);return full;}),label);};
 const f=(key:'speed'|'pitch'|'reduction',name:string,initial:number,min:number,max:number,step:number,unit:string)=><Fader label={name} value={c[key]} defaultValue={initial} min={min} max={max} step={step} display={`${c[key]} ${unit}`} onChange={v=>change({[key]:v})}/>;
 const curveLabels:Record<FadeCurve,string>={linear:'Linéaire',exponential:'Exponentielle',scurve:'Courbe en S'};
 const shownDirection:FadeDirection=c.direction??'in';
 const points=effect==='fade'?Array.from({length:81},(_,i)=>`${i?'L':'M'}${12+i*3.2} ${12+(1-computeFadeGain(i/80,shownDirection,c.curve))*116}`).join(' '):'';
 const grid=Array.from({length:7},(_,i)=>`M${12+(i+1)*32} 12V128`).concat(Array.from({length:3},(_,i)=>`M12 ${12+(i+1)*29}H268`)).join(' ');
 return <div className="zonyx-advanced-backdrop"><EffectPanel className={`zonyx-advanced zonyx-legacy${effect==='echo'?' zonyx-delay-panel':''}`} role="dialog" aria-modal="true" aria-labelledby="legacy-title"><header><h2 id="legacy-title">{label}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header><main>{effect!=='fade'&&effect!=='echo'&&effect!=='speed-pitch'&&<p>Sélection : {((end-start)/doc.sampleRate).toFixed(2)} s</p>}<div className="zonyx-legacy-controls">
 {effect==='speed-pitch'&&<>{f('speed','Vitesse',1,.5,2,.05,'x')}{f('pitch','Hauteur',0,-12,12,1,'demi-tons')}</>}
 {effect==='noise-reduction'&&<><p>{p.noiseProfile?'Profil de bruit mémorisé actif':'Profil automatique sur la sélection'}</p>{p.onCaptureNoiseProfile&&<button type="button" disabled={!n} onClick={()=>p.onCaptureNoiseProfile?.(captureNoiseProfile(source,doc.sampleRate,0,n))}>Capturer le profil</button>}{f('reduction','Atténuation',0,0,36,1,'dB')}</>}
 {effect==='echo'&&<div className="zonyx-delay-controls"><div className="zonyx-delay-tempo"><button type="button" onClick={detectBpm} disabled={detecting||!n} aria-busy={detecting}>{detecting?'Détection…':'Détection BPM'}</button><span role="status">{detecting?'Analyse de la piste…':Number.isFinite(bpm)&&bpm>0?`${bpm.toFixed(1)} BPM`:'Détectez le BPM pour activer les temps musicaux.'}</span></div>{bpmError&&<p role="alert">{bpmError}</p>}<div className="zonyx-delay-row"><Knob label="Temps" value={c.division} max={DELAY_DIVISIONS.length-1} defaultValue={DEFAULT_DIVISION} display={DELAY_DIVISIONS[c.division].label} onChange={division=>change({division})}/><Knob label="Répétitions" value={c.repetitions} max={16} defaultValue={0} display={String(c.repetitions)} onChange={repetitions=>change({repetitions})}/><Knob label="Volume de l’effet" value={c.wet} max={100} defaultValue={0} display={`${c.wet} %`} onChange={wet=>change({wet})}/><DelayModeSwitch value={c.mode} onChange={mode=>change({mode})}/><Knob small label="Panoramique de départ" value={c.pan} min={-100} max={100} step={5} ticks={3} defaultValue={0} display={c.pan===0?'0 — Centre':c.pan<0?`Gauche ${-c.pan} %`:`Droite ${c.pan} %`} onChange={pan=>change({pan})}/></div></div>}
 {effect==='fade'&&<><div className="zonyx-mode" onDoubleClick={()=>change({direction:null})}>{(['in','out'] as const).map(direction=><button type="button" key={direction} aria-pressed={c.direction===direction} onClick={()=>change({direction})}>{direction==='in'?'Entrée':'Sortie'}</button>)}</div>{!c.direction&&<p role="status">Choisissez Entrée ou Sortie pour activer le fondu.</p>}<div className="zonyx-mode" onDoubleClick={()=>change({curve:'scurve'})}>{(['linear','exponential','scurve'] as const).map(curve=><button type="button" key={curve} aria-pressed={c.curve===curve} onClick={()=>change({curve})}>{curveLabels[curve]}</button>)}</div><svg viewBox="0 0 280 140" width="280" role="img" aria-label={`Courbe de fondu ${curveLabels[c.curve]}`} style={{opacity:c.direction?1:.45}}><rect x="12" y="12" width="256" height="116" fill="var(--wave-bg)" stroke="#bd93f9"/><path d={grid} fill="none" stroke="#fff" strokeOpacity=".3" strokeWidth="1"/><path d={`${points} L268 128 L12 128 Z`} fill="#39ff1422"/><path d={points} fill="none" stroke="#39ff14" strokeWidth="2.8"/><line ref={head} x1="12" x2="12" y1="12" y2="128" stroke="#39ff14" strokeWidth="2" style={{visibility:'hidden',filter:'drop-shadow(0 0 3px #39ff14)'}}/></svg></>}
 </div></main><footer><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n||blocked||!touched}>Appliquer</button></footer></EffectPanel></div>;
}
