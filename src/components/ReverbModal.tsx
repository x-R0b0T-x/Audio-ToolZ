import React,{useCallback,useEffect,useRef,useState} from 'react';
import {audioEngine} from '../audio/engine';
import {DEFAULT_REVERB,type ReverbSettings} from '../audio/reverb.mjs';
import {targetRange} from '../audio/effectsModel.mjs';
import type {AudioDocument,AudioSelection} from '../audio/types';
import {Knob} from './EffectControls';
import {EffectPanel} from './EffectPanel';
import './reverbPanel.css';
type Props={document:AudioDocument;onStopPreview:()=>void;onClose:()=>void;onApply:(channels:Float32Array[],label:string,selection?:AudioSelection)=>void};
type Render={key:string;channels:Float32Array[];meter:Float32Array;hop:number;tailSamples:number;peak:number};
type Control=[keyof ReverbSettings,string,number,number,string,number?];
const groups:{title:string;controls:Control[]}[]=[
 {title:'Espace',controls:[['size','Taille',0,100,'%'],['decay','Décroissance',.1,20,'s',100],['preDelay','Prédélai',0,250,'ms'],['diffusion','Diffusion',0,100,'%']]},
 {title:'Couleur et modulation',controls:[['lowCut','Coupe-bas',20,2000,'Hz'],['damping','Amortissement aigu',200,20000,'Hz'],['modulation','Modulation',0,100,'%'],['rate','Vitesse de modulation',.05,5,'Hz',100]]},
 {title:'Niveaux et stéréo',controls:[['direct','Direct',0,150,'%'],['reflections','Réflexions',0,150,'%'],['reverb','Réverbération',0,150,'%'],['width','Largeur',0,100,'%']]}
];
export function ReverbModal(p:Props){
 const latest=useRef(p);latest.current=p;
 const [settings,setSettings]=useState<ReverbSettings>({...DEFAULT_REVERB});
 const [result,setResult]=useState<Render|null>(null),[busy,setBusy]=useState(true),[error,setError]=useState(''),[playing,setPlaying]=useState(false);
 const playingRef=useRef(false),resumeRef=useRef(false),renderRef=useRef<Render|null>(null);
 const halo=useRef<HTMLDivElement>(null),room=useRef<SVGGElement>(null),dialog=useRef<HTMLDivElement>(null);
 const doc=p.document,{start,end}=targetRange(doc.selection,doc.channels[0]?.length??0);
 const key=JSON.stringify([settings,start,end,doc.id]),ready=!busy&&result?.key===key;
 const stop=useCallback(()=>{resumeRef.current=false;playingRef.current=false;setPlaying(false);latest.current.onStopPreview();audioEngine.stop(true);},[]);
 const play=useCallback((r:Render)=>{
  latest.current.onStopPreview();
  audioEngine.play(r.channels,latest.current.document.sampleRate,0,r.channels[0]?.length??0,{loop:false,speedRatio:1,volumeDb:0,balance:0,enabledChannels:[true,true],onEnded:()=>{playingRef.current=false;resumeRef.current=false;setPlaying(false);}});
  playingRef.current=audioEngine.isPlaying;setPlaying(audioEngine.isPlaying);resumeRef.current=false;
 },[]);
 useEffect(()=>{
  const resume=playingRef.current||resumeRef.current;stop();resumeRef.current=resume;
  setBusy(true);setError('');setResult(null);renderRef.current=null;
  if(end<=start){setBusy(false);return;}
  let worker:Worker|null=null,disposed=false;
  const timer=window.setTimeout(()=>{
   try{
    worker=new Worker(new URL('../audio/reverb.worker.ts',import.meta.url),{type:'module'});
    worker.onmessage=(event:MessageEvent<Omit<Render,'key'>&{error?:string}>)=>{
     if(disposed)return;worker?.terminate();worker=null;setBusy(false);
     if(event.data.error){resumeRef.current=false;setError(event.data.error);return;}
     const rendered={...event.data,key};renderRef.current=rendered;setResult(rendered);if(resumeRef.current)play(rendered);
    };
    worker.onerror=()=>{if(disposed)return;worker?.terminate();worker=null;resumeRef.current=false;setBusy(false);setError('Échec du calcul. Modifiez un réglage pour réessayer.');};
    const channels=doc.channels.map(ch=>ch.slice(start,end));
    worker.postMessage({channels,sampleRate:doc.sampleRate,settings},{transfer:channels.map(ch=>ch.buffer as ArrayBuffer)});
   }catch(e){worker?.terminate();worker=null;resumeRef.current=false;setBusy(false);setError(String(e));}
  },180);
  return()=>{disposed=true;window.clearTimeout(timer);worker?.terminate();};
 },[doc.channels,doc.sampleRate,doc.id,start,end,settings,key,play,stop]);
 useEffect(()=>{const previous=document.activeElement as HTMLElement|null;dialog.current?.focus();return()=>{stop();previous?.focus();};},[stop]);
 useEffect(()=>{
  let frame=0,last=0,level=0;
  const tick=(now:number)=>{
   const r=renderRef.current;let target=0;
   if(playingRef.current&&audioEngine.isPlaying&&r){const rms=r.meter[Math.floor(audioEngine.getCurrentSample()/r.hop)]??0;target=rms>0?Math.max(0,Math.min(1,(20*Math.log10(rms)+72)/72)):0;}
   const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
   level+=(target-level)*(1-Math.exp(-dt/(target>level?0.025:0.3)));if(level<.001)level=0;
   if(halo.current)halo.current.style.boxShadow=`inset 0 0 ${8+level*24}px rgba(170,65,255,${level*.3}),0 0 ${level*48}px ${level*12}px rgba(170,65,255,${level*.65})`;
   if(room.current)room.current.style.filter=level?`drop-shadow(0 0 ${2+level*18}px rgba(193,112,255,${level}))`:'none';
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[]);
 const w=85+settings.size*1.3,h=45+settings.size*.65,d=14+settings.size*.45,x=(360-w-d)/2,y=198;
 const close=()=>{stop();p.onClose();};
 const apply=()=>{
  if(!ready||!result)return;
  try{
   const count=end-start,total=Math.max(doc.channels[0].length,start+result.channels[0].length);
   const channels=doc.channels.map((ch,c)=>{const output=new Float32Array(total);output.set(ch);output.set(result.channels[c].subarray(0,count),start);for(let i=count;i<result.channels[c].length;i++)output[start+i]+=result.channels[c][i];return output;});
   stop();p.onApply(channels,'Z-Reverbe',{...doc.selection});
  }catch(e){setError(String(e));}
 };
 return <div className="atz-advanced-backdrop" onKeyDown={e=>{
  e.stopPropagation();if(e.key==='Escape'){e.preventDefault();close();}
  if(e.key==='Tab'){const nodes=dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),[tabindex="0"]');if(!nodes?.length)return;const first=nodes[0],last=nodes[nodes.length-1];if(e.shiftKey&&(document.activeElement===first||document.activeElement===dialog.current)){e.preventDefault();last.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first.focus();}}
 }}><div ref={dialog} tabIndex={-1} className="atz-reverb-focus"><EffectPanel className="atz-advanced atz-reverb" role="dialog" aria-modal="true" aria-labelledby="reverb-title">
 <header><h2 id="reverb-title">Z-Reverbe</h2><button type="button" aria-label="Fermer Z-Reverbe" onClick={close}>×</button></header>
 <main><div className="atz-reverb-room" ref={halo}><svg viewBox="0 0 360 230" role="img" aria-label={`Pièce : taille ${settings.size} %. La lueur suit le signal réverbéré en préécoute.`}><g ref={room} stroke="#bd93f9" strokeWidth="2" strokeLinejoin="round">
 <polygon points={`${x+w},${y} ${x+w+d},${y-d} ${x+w+d},${y-h-d} ${x+w},${y-h}`} fill="#7043aa55"/><polygon points={`${x},${y-h} ${x+d},${y-h-d} ${x+w+d},${y-h-d} ${x+w},${y-h}`} fill="#bd93f933"/><polygon points={`${x},${y-h} ${x+w},${y-h} ${x+w},${y} ${x},${y}`} fill="#28163f99"/><path d={`M${x+d} ${y-h-d} V${y-d} L${x} ${y} M${x+d} ${y-d} H${x+w+d}`} fill="none" strokeDasharray="4 5" opacity=".55"/>
 </g></svg><p>Taille {settings.size} % · Décroissance {settings.decay.toFixed(2)} s</p><small>Halo violet : niveau réverbéré, sans synchronisation BPM</small></div>
 <div className="atz-reverb-groups">{groups.map(group=><fieldset key={group.title}><legend>{group.title}</legend><div className="atz-reverb-knobs">{group.controls.map(([id,label,min,max,unit,factor=1])=><Knob small key={id} label={label} value={Math.round(settings[id]*factor)} min={Math.round(min*factor)} max={Math.round(max*factor)} ticks={11} defaultValue={Math.round(DEFAULT_REVERB[id]*factor)} display={`${factor===100?settings[id].toFixed(2):settings[id]} ${unit}`} onChange={value=>setSettings(old=>({...old,[id]:value/factor}))}/>)}</div></fieldset>)}</div>
 <p role="status" aria-live="polite">{busy?'Calcul de la réverbération…':`Zone : ${((end-start)/doc.sampleRate).toFixed(2)} s · Queue rendue : ${((result?.tailSamples??0)/doc.sampleRate).toFixed(2)} s`}</p>
 {error&&<p role="alert">{error}</p>}{result&&result.peak>1&&<p role="alert">Le rendu dépasse 0 dBFS. Baissez les niveaux pour éviter la saturation à l’export.</p>}
 <p className="atz-reverb-help">La queue est mélangée à la suite sans décalage ; la piste est prolongée si nécessaire. Après application, exportez le document entier pour conserver toute la queue. Double-clic sur un potard : valeur initiale.</p>
 </main><footer><button type="button" disabled={!ready||playing} onClick={()=>result&&play(result)}>Préécouter avec la queue</button><button type="button" onClick={stop}>Arrêter</button><button type="button" onClick={close}>Annuler</button><button type="button" disabled={!ready} onClick={apply}>Appliquer</button></footer>
 </EffectPanel></div></div>;
}
