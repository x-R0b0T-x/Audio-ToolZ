import React,{useCallback,useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import {createPreviewRelay} from '../audio/livePreviewRelay';
import {applySpeedAndPitch} from '../audio/dsp';
import {applySpectralNoiseReduction,captureNoiseProfile,type NoiseProfile} from '../audio/studioDsp';
import {applyMusicalDelay,DELAY_DIVISIONS,DEFAULT_DIVISION,type DelayMode} from '../audio/musicalDelay';
import type {AudioDocument,EffectModalId,FadeDirection} from '../audio/types';
import {Fader,Knob,DelayModeSwitch} from './EffectControls';
import {AdvancedEffects} from './AdvancedEffects';
import {EffectPanel} from './EffectPanel';
import {EffectActiveContext} from './effectActive';
import {ReverbModal} from './ReverbModal';
import {PitcherModal} from './PitcherModal';
import {ModulationModal} from './ModulationModal';
import {TransientModal} from './TransientModal';
import {ImagerModal} from './ImagerModal';
import {DenoiserModal} from './DenoiserModal';
import {ClickModal} from './ClickModal';
import {FadeEditor} from './FadeEditor';
import {FADE_PRESETS,defaultFade,applyFadeShape} from '../audio/fadeCurve.mjs';
import {targetRange} from '../audio/effectsModel.mjs';
import './delayPanel.css';
import './faderThumbHover';
let lastNoiseProfile:NoiseProfile|null=null;
interface Props{effect:EffectModalId;document:AudioDocument|null;noiseProfile?:NoiseProfile|null;onCaptureNoiseProfile?:(p:NoiseProfile)=>void;isPreviewPlaying:boolean;onStartPreview:(c:Float32Array[],r:number,g?:number,b?:PreviewBand[])=>void;onStopPreview:()=>void;onApply:(c:Float32Array[],label:string,s?:{startSample:number;endSample:number})=>void;onClose:()=>void;}
export const EffectModal:React.FC<Props>=p=>!p.effect||!p.document?null:p.effect==='reverb'?<ReverbModal key={p.document.id} document={p.document} onStopPreview={p.onStopPreview} onApply={p.onApply} onClose={p.onClose}/>:p.effect==='speed-pitch'?<PitcherModal key={p.document.id} document={p.document} onStopPreview={p.onStopPreview} onClose={p.onClose} onApply={p.onApply}/>:<LiveEffectSession key={`${p.document.id}:${p.effect}`} {...p} effect={p.effect} document={p.document}/>;
function LiveEffectSession(p:Props&{effect:Exclude<EffectModalId,null>;document:AudioDocument}){
 const latest=useRef(p);latest.current=p;
 const relay=useMemo(()=>createPreviewRelay(()=>audioEngine.isPlaying,(...args:Parameters<Props['onStartPreview']>)=>latest.current.onStartPreview(...args)),[]);
 const [active,setActive]=useState(true),activeRef=useRef(true),lastWet=useRef<Parameters<Props['onStartPreview']>|null>(null),first=useRef(true);
 activeRef.current=active;
 const dry=useMemo(()=>{const r=targetRange(p.document.selection,p.document.channels[0]?.length??0);return p.document.channels.map(ch=>ch.subarray(r.start,r.end));},[p.document]);
 const dryRef=useRef(dry);dryRef.current=dry;
 const submit=useCallback((...args:Parameters<Props['onStartPreview']>)=>{lastWet.current=args;if(activeRef.current)relay.submit(...args);else relay.submit(dryRef.current,args[1],args[2],[]);},[relay]);
 useEffect(()=>{if(first.current){first.current=false;return;}const last=lastWet.current;if(!last)return;if(active)relay.submit(...last);else relay.submit(dryRef.current,last[1],last[2],[]);},[active,relay]);
 const state=useMemo(()=>({active,setActive}),[active]);
 useEffect(()=>{const timer=window.setInterval(relay.poll,80);return()=>{window.clearInterval(timer);relay.clear();};},[relay]);
 const props={...p,onStartPreview:submit};
 const view=p.effect==='eq'||p.effect==='filter'||p.effect==='compressor'?<AdvancedEffects {...props} effect={p.effect}/>:p.effect==='chorus'||p.effect==='flanger'?<ModulationModal {...props} effect={p.effect}/>:p.effect==='transient'?<TransientModal document={p.document} onStartPreview={props.onStartPreview} onApply={p.onApply} onClose={p.onClose}/>:p.effect==='imager'?<ImagerModal document={p.document} onStartPreview={props.onStartPreview} onApply={p.onApply} onClose={p.onClose}/>:p.effect==='declick'?<ClickModal document={p.document} onStartPreview={props.onStartPreview} onApply={p.onApply} onClose={p.onClose}/>:p.effect==='noise-reduction'?<DenoiserModal document={p.document} profile={p.noiseProfile??lastNoiseProfile} onProfile={profile=>{lastNoiseProfile=profile;p.onCaptureNoiseProfile?.(profile);}} onStartPreview={props.onStartPreview} onApply={p.onApply} onClose={p.onClose}/>:<Legacy {...props}/>;
 return p.effect==='declick'?view:<EffectActiveContext.Provider value={state}>{view}</EffectActiveContext.Provider>;
}
function Legacy(p:Props&{effect:Exclude<EffectModalId,null>;document:AudioDocument}){
 const {document:doc,effect}=p,[c,set]=useState({direction:null as FadeDirection|null,fade:defaultFade(),speed:1,pitch:0,reduction:0,division:DEFAULT_DIVISION,mode:'off' as DelayMode,repetitions:0,wet:0,pan:0}),[touched,setTouched]=useState(false);
 const [localProfile,setLocalProfile]=useState<NoiseProfile|null>(()=>lastNoiseProfile),profile=p.noiseProfile??localProfile;
 const [detectedBpm,setDetectedBpm]=useState(0),[detecting,setDetecting]=useState(false),[bpmError,setBpmError]=useState('');
 const detector=useRef<Worker|null>(null);
 useEffect(()=>()=>{detector.current?.terminate();detector.current=null;},[]);
 const detectBpm=()=>{
  if(detector.current||!doc.channels[0]?.length)return;
  setDetecting(true);setBpmError('');
  let guard=0;
  const fail=(message:string)=>{window.clearTimeout(guard);detector.current?.terminate();detector.current=null;setDetecting(false);setBpmError(message);};
  try{
   const worker=new Worker(new URL('../audio/delayBpm.worker.ts',import.meta.url),{type:'module'});detector.current=worker;
   worker.onmessage=(event:MessageEvent<{bpm?:number;error?:string}>)=>{
    if(detector.current!==worker)return;
    const value=event.data.bpm;
    if(typeof value!=='number'||!Number.isFinite(value)||value<=0){fail(event.data.error??'Impossible de détecter un tempo régulier sur cette piste.');return;}
    window.clearTimeout(guard);worker.terminate();detector.current=null;setDetectedBpm(value);setDetecting(false);setBpmError('');
   };
   worker.onerror=()=>fail('Échec de la détection BPM. Vous pouvez réessayer.');
   const rate=doc.sampleRate,total=doc.channels[0].length,span=Math.round(rate*45),centre=audioEngine.isPlaying?Math.floor(audioEngine.getCurrentSample()):Math.floor((start+end)/2),from=total<=span?0:Math.max(0,Math.min(total-span,centre-(span>>1))),to=Math.min(total,from+span);
   guard=window.setTimeout(()=>fail('La détection BPM a pris trop de temps. Vous pouvez réessayer.'),30000);
   worker.postMessage({channels:doc.channels.map(ch=>ch.slice(from,to)),sampleRate:rate});
  }catch{fail('Impossible de démarrer la détection BPM.');}
 };
 const change=(v:Partial<typeof c>)=>{setTouched(true);set(old=>({...old,...v}));},callback=useRef(p);callback.current=p;
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {startSample:r.start,endSample:r.end};},[doc]),start=range.startSample,end=range.endSample,source=useMemo(()=>doc.channels.map(ch=>ch.subarray(start,end)),[doc,start,end]),n=source[0]?.length??0,bpm=detectedBpm>0?detectedBpm:doc.bpmInfo?.bpm??0;
 const needsProfile=effect==='noise-reduction'&&!profile;
 const blocked=needsProfile||(effect==='echo'&&c.mode!=='off'&&c.repetitions>0&&c.wet>0&&!(Number.isFinite(bpm)&&bpm>0));
 const label=({fade:'Z-Fondus','speed-pitch':'Z-Pitcher','noise-reduction':'Z-Denoiser',echo:'Z-Delay'} as Record<string,string>)[effect];
 const captureProfile=()=>{const next=captureNoiseProfile(source,doc.sampleRate,0,n);lastNoiseProfile=next;setLocalProfile(next);p.onCaptureNoiseProfile?.(next);};
 const process=()=>{switch(effect){case 'fade':return c.direction?applyFadeShape(source,c.direction,c.fade):source;case 'noise-reduction':return c.reduction>0&&profile?applySpectralNoiseReduction(source,0,n,profile,{reductionDb:c.reduction,sensitivity:1,smoothing:.35}):source;case 'echo':return blocked?source:applyMusicalDelay(source,doc.sampleRate,bpm,c.division,c.mode,c.repetitions,c.wet,c.pan);default:return source;}};
 const speed=()=>applySpeedAndPitch(doc.channels,doc.sampleRate,start,end,c.speed,c.pitch,true);
 useEffect(()=>{if(!n)return;const timer=window.setTimeout(()=>{if(effect==='speed-pitch'){const r=speed();callback.current.onStartPreview(r.channels.map(ch=>ch.subarray(r.selection.startSample,r.selection.endSample)),doc.sampleRate);}else callback.current.onStartPreview(process(),doc.sampleRate);},60);return()=>window.clearTimeout(timer);},[effect,doc,c,source,profile,blocked,bpm]);
 const apply=()=>{if(!n||blocked||!touched)return;if(effect==='speed-pitch'){const r=speed();p.onApply(r.channels,label,r.selection);return;}p.onApply(process().map((segment,i)=>{const full=new Float32Array(doc.channels[i]??doc.channels[0]);full.set(segment,start);return full;}),label);};
 const f=(key:'speed'|'pitch'|'reduction',name:string,initial:number,min:number,max:number,step:number,unit:string)=><Fader label={name} value={c[key]} defaultValue={initial} min={min} max={max} step={step} display={`${c[key]} ${unit}`} onChange={v=>change({[key]:v})}/>;
 const presetLabels={linear:'Linéaire',exponential:'Exponentielle',scurve:'Courbe en S'} as const;
 return <div className="zonyx-advanced-backdrop"><EffectPanel className={`zonyx-advanced zonyx-legacy${effect==='echo'?' zonyx-delay-panel':''}`} {...(effect==='fade'?{minWidth:560,minHeight:520}:{})} role="dialog" aria-modal="true" aria-labelledby="legacy-title"><header><h2 id="legacy-title">{label}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header><main>{effect!=='fade'&&effect!=='echo'&&effect!=='speed-pitch'&&<p>Sélection : {((end-start)/doc.sampleRate).toFixed(2)} s</p>}<div className="zonyx-legacy-controls">
 {effect==='speed-pitch'&&<>{f('speed','Vitesse',1,.5,2,.05,'x')}{f('pitch','Hauteur',0,-12,12,1,'demi-tons')}</>}
 {effect==='noise-reduction'&&<><p role="status">{profile?'Profil de bruit mémorisé actif':'Aucun profil de bruit. Sélectionnez un passage de bruit seul, puis cliquez sur « Capturer le profil ».'}</p><button type="button" disabled={!n} onClick={captureProfile}>{profile?'Recapturer le profil':'Capturer le profil'}</button>{!needsProfile&&f('reduction','Atténuation',0,0,36,1,'dB')}</>}
 {effect==='echo'&&<div className="zonyx-delay-controls"><div className="zonyx-delay-tempo"><button type="button" onClick={detectBpm} disabled={detecting||!n} aria-busy={detecting}>{detecting?'Détection…':'Détection BPM'}</button><span role="status">{detecting?'Analyse de la piste…':Number.isFinite(bpm)&&bpm>0?`${bpm.toFixed(1)} BPM`:'Détectez le BPM pour activer les temps musicaux.'}</span></div>{bpmError&&<p role="alert">{bpmError}</p>}<div className="zonyx-delay-row"><Knob label="Temps" value={c.division} max={DELAY_DIVISIONS.length-1} defaultValue={DEFAULT_DIVISION} display={DELAY_DIVISIONS[c.division].label} onChange={division=>change({division})}/><Knob label="Répétitions" value={c.repetitions} max={16} defaultValue={0} display={String(c.repetitions)} onChange={repetitions=>change({repetitions})}/><Knob label="Volume de l’effet" value={c.wet} max={100} defaultValue={0} display={`${c.wet} %`} onChange={wet=>change({wet})}/><DelayModeSwitch value={c.mode} onChange={mode=>change({mode})}/><Knob small label="Panoramique de départ" value={c.pan} min={-100} max={100} step={5} ticks={3} defaultValue={0} display={c.pan===0?'0 — Centre':c.pan<0?`Gauche ${-c.pan} %`:`Droite ${c.pan} %`} onChange={pan=>change({pan})}/></div></div>}
 {effect==='fade'&&<><div className="zonyx-mode" onDoubleClick={()=>change({direction:null})}>{(['in','out'] as const).map(direction=><button type="button" key={direction} aria-pressed={c.direction===direction} onClick={()=>change({direction})}>{direction==='in'?'Entrée':'Sortie'}</button>)}</div>{!c.direction&&<p role="status">Choisissez Entrée ou Sortie pour activer le fondu.</p>}<FadeEditor direction={c.direction} shape={c.fade} onChange={fade=>change({fade})} start={start} length={n}/><div className="zonyx-mode zonyx-fade-presets" role="group" aria-label="Formes prédéfinies">{(['linear','exponential','scurve'] as const).map(kind=><button type="button" key={kind} disabled={!c.direction} onClick={()=>change({fade:FADE_PRESETS[kind]()})}>{presetLabels[kind]}</button>)}</div></>}
 </div></main><footer><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n||blocked||!touched}>Appliquer</button></footer></EffectPanel></div>;
}
