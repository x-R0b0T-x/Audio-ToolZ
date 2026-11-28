import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import type {AudioDocument} from '../audio/types';
import {targetRange} from '../audio/effectsModel.mjs';
import {isImagerNeutral,normalizeImager,type ImagerSettings} from '../audio/imager.mjs';
import {EffectPanel} from './EffectPanel';
import {EffectParameter} from './EffectParameter';
import {roundTo,useFineSlider} from './useFineSlider';
import './modulation.css';
import './imager.css';
type Props={document:AudioDocument;onStartPreview:(channels:Float32Array[],rate:number,gain?:number,bands?:PreviewBand[])=>void;onApply:(channels:Float32Array[],label:string)=>void;onClose:()=>void};
type Request={id:number;settings:ImagerSettings;from:number;to:number};
type Rendered={channels:Float32Array[];from:number;to:number};
const WINDOW_SECONDS=12,LABEL='Z-Stéréo',W=560,H=96,FMIN=20,FMAX=20000;
const BAND_NAMES=['Graves','Médiums','Médiums aigus','Aigus'];
const COLORS=['#ff79c6','#ffb86c','#50fa7b','#8be9fd'];
const START_CROSS=[120,1000,5000];
const xOf=(f:number)=>W*Math.log(f/FMIN)/Math.log(FMAX/FMIN);
const fOf=(x:number)=>FMIN*(FMAX/FMIN)**(Math.max(0,Math.min(W,x))/W);
const hz=(f:number)=>f>=1000?`${(f/1000).toFixed(f>=10000?0:1).replace('.',',')} kHz`:`${Math.round(f)} Hz`;
function BandsPanel({crossovers,onChange,onReset}:{crossovers:number[];onChange:(i:number,f:number)=>void;onReset:(i:number)=>void}){
 const svg=useRef<SVGSVGElement>(null),drag=useRef(-1),edges=[FMIN,...crossovers,FMAX],ticks=[50,100,500,1000,5000,10000];
 const limits=(i:number)=>[i===0?30:crossovers[i-1]*1.25,i===2?16000:crossovers[i+1]/1.25];
 const move=(i:number,f:number)=>{const [lo,hi]=limits(i);onChange(i,Math.round(Math.max(lo,Math.min(hi,f))));};
 const end=()=>{drag.current=-1;};
 return <svg ref={svg} className="zonyx-imager-bands-svg" viewBox={`0 0 ${W} ${H}`} role="group" aria-label="Bandes de fréquences et points de croisement">
  <rect width={W} height={H} rx="6" fill="var(--wave-bg)"/>
  {COLORS.map((c,b)=><rect key={b} x={xOf(edges[b])} y={0} width={xOf(edges[b+1])-xOf(edges[b])} height={H} fill={c} fillOpacity=".16"/>)}
  {ticks.map(f=><g key={f}><path d={`M${xOf(f)} 30V${H-16}`} stroke="#fff" strokeOpacity=".14"/><text x={xOf(f)} y={H-4} textAnchor="middle" fill="#fff" fillOpacity=".55" fontSize="10">{hz(f)}</text></g>)}
  {COLORS.map((c,b)=><text key={b} x={(xOf(edges[b])+xOf(edges[b+1]))/2} y={20} textAnchor="middle" fill={c} fontSize="12" fontWeight="600">{BAND_NAMES[b]}</text>)}
  {crossovers.map((f,i)=>{
   const x=xOf(f),[lo,hi]=limits(i);
   return <g key={i} className="zonyx-imager-cross" tabIndex={0} role="slider" aria-label={`Croisement ${i+1}`} aria-valuemin={Math.round(lo)} aria-valuemax={Math.round(hi)} aria-valuenow={f} aria-valuetext={hz(f)}
    onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.focus();drag.current=i;}}
    onPointerMove={e=>{if(drag.current!==i||!svg.current)return;const r=svg.current.getBoundingClientRect();move(i,fOf((e.clientX-r.left)/r.width*W));}}
    onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onDoubleClick={()=>onReset(i)}
    onKeyDown={e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();move(i,f*(e.shiftKey?1.01:1.06)**(e.key==='ArrowRight'?1:-1));}}>
    <rect x={x-9} y={0} width={18} height={H} fill="transparent"/>
    <path d={`M${x} 0V${H}`} stroke="#fff" strokeOpacity=".85" strokeWidth="1.5"/>
    <rect x={x-23} y={34} width={46} height={16} rx="4" fill="#3d2466" stroke="#bd93f9"/>
    <text x={x} y={46} textAnchor="middle" fill="#fff" fontSize="10">{hz(f)}</text>
   </g>;
  })}
 </svg>;
}
function BandFader({label,range,value,color,onChange}:{label:string;range:string;value:number;color:string;onChange:(v:number)=>void}){
 const fine=.1,clamp=(v:number)=>Math.max(-100,Math.min(100,v)),fill=Math.abs(value)/100*72;
 const slider=useFineSlider({min:-100,max:100,value,step:1,fineStep:fine,onChange});
 return <div className="zonyx-imager-band" onDoubleClick={e=>{e.preventDefault();onChange(0);}}>
  <span className="zonyx-imager-band-name" style={{color}}>{label}</span><span className="zonyx-imager-band-range">{range}</span>
  <div {...slider} className="zonyx-imager-fader" style={{touchAction:'none',cursor:'ns-resize'}} onWheel={e=>{const d=e.deltaY||e.deltaX;if(!d)return;const s=e.shiftKey?fine:5;onChange(clamp(roundTo(value+(d<0?s:-s),fine)));}}>
   <i className="zonyx-imager-zero"/>
   <i className="zonyx-imager-fill" style={{background:color,color,height:fill,...(value>=0?{bottom:72}:{top:72})}}/>
   <input type="range" aria-label={`Largeur ${label}`} min={-100} max={100} step={fine} value={value} onChange={e=>onChange(Number(e.target.value))}
    onKeyDown={e=>{if(!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key))return;e.preventDefault();const s=e.shiftKey?fine:1;onChange(clamp(roundTo(value+(e.key==='ArrowUp'||e.key==='ArrowRight'?s:-s),fine)));}}
    className="studio-fader-vertical cursor-pointer" style={{writingMode:'vertical-lr',direction:'rtl',height:144,width:28,accentColor:color,pointerEvents:'none'}}/>
  </div>
  <output className="zonyx-imager-value" style={{color}}>{`${value>0?'+':''}${Number(value.toFixed(1))} %`}</output>
 </div>;
}
function StereoScope({rendered,source,rangeStart}:{rendered:React.MutableRefObject<Rendered|null>;source:Float32Array[];rangeStart:number}){
 const canvas=useRef<HTMLCanvasElement>(null),input=useRef({source,rangeStart});input.current={source,rangeStart};
 useEffect(()=>{
  const cv=canvas.current,ctx=cv?.getContext('2d');if(!cv||!ctx)return;
  const dpr=window.devicePixelRatio||1,CW=254,CH=246,CX=112,BASE=132,R=104,N=2048;
  cv.width=Math.round(CW*dpr);cv.height=Math.round(CH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--wave-bg').trim()||'#080a14',hist:number[]=[];
  let corr=1,lastPush=0,frame=0;
  ctx.fillStyle=bg;ctx.fillRect(0,0,CW,CH);
  const draw=(now:number)=>{
   const buf=rendered.current,ch=buf?buf.channels:input.current.source,left=ch[0],right=ch[1]??ch[0];
   let start=0,end=0;
   if(left){const lo=buf?buf.from:0,hi=buf?buf.to:left.length;start=Math.max(lo,Math.min(hi-N,Math.floor(audioEngine.getCurrentSample()-input.current.rangeStart)));end=Math.min(hi,start+N);}
   ctx.globalAlpha=.3;ctx.fillStyle=bg;ctx.fillRect(0,0,226,BASE+10);ctx.globalAlpha=1;
   ctx.strokeStyle='#bd93f9';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(CX,BASE,R,Math.PI,0);ctx.lineTo(CX-R,BASE);ctx.stroke();
   ctx.strokeStyle='rgba(255,255,255,.3)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(CX-R*.7071,BASE-R*.7071);ctx.lineTo(CX,BASE);ctx.lineTo(CX+R*.7071,BASE-R*.7071);ctx.moveTo(CX,BASE-R);ctx.lineTo(CX,BASE);ctx.stroke();
   ctx.font='11px monospace';ctx.fillStyle='rgba(255,255,255,.7)';ctx.textAlign='center';ctx.fillText('G',CX-R*.7071-8,BASE-R*.7071-6);ctx.fillText('D',CX+R*.7071+8,BASE-R*.7071-6);ctx.fillText('M',CX,BASE-R-5);
   let ll=0,rr=0,lr=0;
   if(left&&end>start){
    for(let i=start;i<end;i++){
     const l=left[i],r=right[i];ll+=l*l;rr+=r*r;lr+=l*r;
     if((i-start)%3===0){const x=(r-l)*.7071*1.25,y=Math.abs(l+r)*.7071*1.25;ctx.fillStyle=Math.abs(x)>y?'#ff5555':'#39ff14';ctx.fillRect(CX+Math.max(-1,Math.min(1,x))*R-.8,BASE-Math.min(1,y)*R-.8,1.7,1.7);}
    }
   }
   const d=Math.sqrt(ll*rr);corr+=((d>1e-12?lr/d:1)-corr)*.2;
   if(!audioEngine.isPlaying){ctx.fillStyle='rgba(255,255,255,.45)';ctx.font='10px monospace';ctx.fillText('Lecture : image en direct',CX,BASE+8);}
   ctx.fillStyle=bg;ctx.fillRect(226,0,CW-226,BASE+16);
   const grad=ctx.createLinearGradient(0,14,0,BASE);grad.addColorStop(0,'#39ff14');grad.addColorStop(.5,'#fbbf24');grad.addColorStop(1,'#ff5555');
   ctx.fillStyle=grad;ctx.fillRect(236,14,8,BASE-14);ctx.fillStyle='#fff';ctx.fillRect(232,14+(1-corr)/2*(BASE-14)-1.5,16,3);
   ctx.font='10px monospace';ctx.fillStyle='rgba(255,255,255,.6)';ctx.textAlign='center';ctx.fillText('+1',240,10);ctx.fillText('−1',240,BASE+13);
   if(now-lastPush>60){hist.push(corr);if(hist.length>120)hist.shift();lastPush=now;}
   const hx=8,hw=238,hy=166,hh=70,mid=hy+hh/2;
   ctx.fillStyle=bg;ctx.fillRect(0,BASE+18,CW,CH-BASE-18);
   ctx.textAlign='left';ctx.fillStyle='rgba(255,255,255,.6)';ctx.fillText('Historique de corrélation',hx,158);
   ctx.strokeStyle='rgba(255,255,255,.25)';ctx.beginPath();ctx.moveTo(hx,mid);ctx.lineTo(hx+hw,mid);ctx.stroke();
   hist.forEach((v,i)=>{const y=mid-v*hh/2;ctx.globalAlpha=.6;ctx.fillStyle=v>=0?'#39ff14':'#ff5555';ctx.fillRect(hx+i*hw/120,Math.min(y,mid),hw/120+.5,Math.abs(y-mid)||1);});
   ctx.globalAlpha=1;
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);
  return()=>cancelAnimationFrame(frame);
 },[rendered]);
 return <canvas ref={canvas} className="zonyx-imager-scope" style={{width:254,height:246}} role="img" aria-label="Vectorscope, corrélation et historique de corrélation du son préécouté"/>;
}
export function ImagerModal(p:Props){
 const doc=p.document;
 const [s,setS]=useState<ImagerSettings>(()=>({widths:[0,0,0,0],crossovers:[...START_CROSS],stereoize:50,mode:'I',delayMs:6}));
 const [on,setOn]=useState(false),[touched,setTouched]=useState(false),[pending,setPending]=useState(true),[applying,setApplying]=useState(false),[error,setError]=useState('');
 const change=(patch:Partial<ImagerSettings>)=>{setTouched(true);setS(old=>({...old,...patch}));};
 const setWidth=(index:number,value:number)=>{setTouched(true);setS(old=>({...old,widths:old.widths.map((w,k)=>k===index?value:w)}));};
 const setCross=(index:number,value:number)=>{setTouched(true);setS(old=>({...old,crossovers:old.crossovers.map((f,k)=>k===index?value:f)}));};
 const settings=useMemo<ImagerSettings>(()=>({...s,stereoize:on?s.stereoize:0}),[s,on]);
 const callbacks=useRef(p);callbacks.current=p;
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {start:r.start,end:r.end};},[doc]);
 const source=useMemo(()=>doc.channels.map(ch=>ch.subarray(range.start,range.end)),[doc,range]);
 const n=source[0]?.length??0,mono=doc.channels.length<2,eff=useMemo(()=>normalizeImager(settings),[settings]),neutral=isImagerNeutral(settings),edges=[FMIN,...eff.crossovers,FMAX];
 const latest=useRef(settings);latest.current=settings;
 const rendered=useRef<Rendered|null>(null);
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
   rendered.current={channels:r.channels,from:r.from??0,to:r.to??n};
   callbacks.current.onStartPreview(r.channels,doc.sampleRate);
  };
  w.onerror=()=>{busy.current=false;setError('Échec du traitement audio. Fermez puis rouvrez cet effet.');setPending(false);setApplying(false);};
  return()=>{w.terminate();if(worker.current===w)worker.current=null;busy.current=false;};
 },[source,doc.sampleRate,n]);
 useEffect(()=>{
  if(!n||applyId.current>=0)return;
  const id=++serial.current;setPending(true);
  wanted.current={id,settings,...windowAround()};
  const timer=window.setTimeout(dispatch,60);
  return()=>window.clearTimeout(timer);
 },[source,doc.sampleRate,settings,n]);
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
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-imager" minWidth={900} minHeight={640} role="dialog" aria-modal="true" aria-labelledby="imager-title">
  <header><h2 id="imager-title">{LABEL}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
  <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-imager-body">
   <div className="zonyx-imager-main">
    <div className="zonyx-imager-left">
     <BandsPanel crossovers={eff.crossovers} onChange={setCross} onReset={i=>setCross(i,START_CROSS[i])}/>
     <div className="zonyx-imager-faders">{BAND_NAMES.map((name,i)=><div key={name} className="zonyx-imager-slot" style={{left:`${(xOf(edges[i])+xOf(edges[i+1]))/2/W*100}%`}}><BandFader label={name} range={ranges[i]} color={COLORS[i]} value={s.widths[i]} onChange={v=>setWidth(i,v)}/></div>)}</div>
    </div>
    <StereoScope rendered={rendered} source={source} rangeStart={range.start}/>
   </div>
   <div className="zonyx-imager-stereoize" role="group" aria-label="Stereoize">
    <button type="button" className="zonyx-mod-toggle zonyx-imager-power" aria-pressed={on} onClick={()=>{setTouched(true);setOn(v=>!v);}}>Stereoize</button>
    <div className={on?'':'zonyx-imager-dim'} aria-disabled={!on}><EffectParameter label="Quantité" value={s.stereoize} initial={50} spec={{min:0,max:100,step:1,fine:.1,digits:0}} unit="%" onChange={v=>change({stereoize:v})}/></div>
    <div className={`zonyx-imager-modes${on?'':' zonyx-imager-dim'}`} role="group" aria-label="Mode de Stereoize">{(['I','II'] as const).map(mode=><button type="button" key={mode} className="zonyx-mod-toggle" aria-pressed={s.mode===mode} onClick={()=>change({mode})}>{`Mode ${mode}`}</button>)}</div>
    {s.mode==='I'&&<div className={on?'':'zonyx-imager-dim'} aria-disabled={!on}><EffectParameter label="Délai" value={s.delayMs} initial={6} spec={{min:.5,max:30,step:.5,fine:.1,digits:1}} unit="ms" onChange={v=>change({delayMs:v})}/></div>}
   </div>
   <output className="zonyx-hint" aria-live="off">{mono?'Fichier mono : activez Stereoize pour obtenir une image stéréo.':'Faders à 0 % : le son ne change pas. Lancez la lecture pour entendre et voir les réglages en direct.'}</output>
   {error&&<p role="alert">{error}</p>}
  </div></fieldset></main>
  <footer><span role="status">{applying?'Application…':pending&&touched?'Calcul…':''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n||!touched||neutral||pending||applying||!!error}>Appliquer</button></footer>
 </EffectPanel></div>;
}
