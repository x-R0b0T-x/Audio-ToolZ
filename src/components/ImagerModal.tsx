import React,{useEffect,useMemo,useRef,useState} from 'react';
import {audioEngine,type PreviewBand} from '../audio/engine';
import type {AudioDocument} from '../audio/types';
import {targetRange} from '../audio/effectsModel.mjs';
import {isImagerNeutral,normalizeImager,type ImagerSettings} from '../audio/imager.mjs';
import {useControlActivity} from '../utils/useControlActivity';
import {EffectPanel} from './EffectPanel';
import {EffectParameter} from './EffectParameter';
import {roundTo,useFineSlider} from './useFineSlider';
import './modulation.css';
import './imager.css';
type Props={document:AudioDocument;onStartPreview:(channels:Float32Array[],rate:number,gain?:number,bands?:PreviewBand[])=>void;onApply:(channels:Float32Array[],label:string)=>void;onClose:()=>void};
type Request={id:number;settings:ImagerSettings;from:number;to:number};
type Rendered={channels:Float32Array[];from:number;to:number};
const WINDOW_SECONDS=8,LABEL='Z-Stéréo',W=560,GH=170,FMIN=20,FMAX=20000;
const BAND_NAMES=['Graves','Médiums','Médiums aigus','Aigus'];
const COLORS=['#ff2d95','#ff9500','#39ff14','#00cfff'];
const VIEWS=['Polaire (échantillons)','Polaire (niveau)','Lissajous'];
const START_CROSS=[120,1000,5000];
const xOf=(f:number)=>W*Math.log(f/FMIN)/Math.log(FMAX/FMIN);
const fOf=(x:number)=>FMIN*(FMAX/FMIN)**(Math.max(0,Math.min(W,x))/W);
const hz=(f:number)=>f>=1000?`${(f/1000).toFixed(f>=10000?0:1).replace('.',',')} kHz`:`${Math.round(f)} Hz`;
function createSpectrum(N:number){
 const re=new Float64Array(N),im=new Float64Array(N),win=new Float64Array(N),cos=new Float64Array(N/2),sin=new Float64Array(N/2),rev=new Uint32Array(N),mid=new Float64Array(N/2+1),side=new Float64Array(N/2+1),bits=Math.round(Math.log2(N));
 let sum=0;
 for(let i=0;i<N;i++){win[i]=.5-.5*Math.cos(2*Math.PI*i/(N-1));sum+=win[i];let r=0;for(let b=0;b<bits;b++)r|=((i>>b)&1)<<(bits-1-b);rev[i]=r;}
 for(let i=0;i<N/2;i++){cos[i]=Math.cos(2*Math.PI*i/N);sin[i]=-Math.sin(2*Math.PI*i/N);}
 const norm=2/sum;
 return (left:Float32Array,right:Float32Array,begin:number)=>{
  for(let i=0;i<N;i++){const l=left[begin+i],r=right[begin+i],j=rev[i];re[j]=(l+r)/2*win[i];im[j]=(l-r)/2*win[i];}
  for(let size=2;size<=N;size<<=1){
   const half=size>>1,step=N/size;
   for(let base=0;base<N;base+=size){
    for(let k=0,t=0;k<half;k++,t+=step){
     const a=base+k,b=a+half,xr=re[b]*cos[t]-im[b]*sin[t],xi=re[b]*sin[t]+im[b]*cos[t];
     re[b]=re[a]-xr;im[b]=im[a]-xi;re[a]+=xr;im[a]+=xi;
    }
   }
  }
  for(let k=0;k<=N/2;k++){
   const k2=(N-k)%N,zr=re[k],zi=im[k],cr=re[k2],ci=-im[k2];
   mid[k]=Math.hypot((zr+cr)/2,(zi+ci)/2)*norm;
   side[k]=Math.hypot((zi-ci)/2,(zr-cr)/2)*norm;
  }
  return {mid,side};
 };
}
function BandGraph({crossovers,onChange,onReset,rendered,source,rangeStart,sampleRate}:{crossovers:number[];onChange:(i:number,f:number)=>void;onReset:(i:number)=>void;rendered:React.MutableRefObject<Rendered|null>;source:Float32Array[];rangeStart:number;sampleRate:number}){
 const canvas=useRef<HTMLCanvasElement>(null),svg=useRef<SVGSVGElement>(null),drag=useRef(-1),edges=[FMIN,...crossovers,FMAX],ticks=[50,100,500,1000,5000,10000];
 const live=useRef({edges,source,rangeStart,sampleRate});live.current={edges,source,rangeStart,sampleRate};
 const limits=(i:number)=>[i===0?30:crossovers[i-1]*1.25,i===2?16000:crossovers[i+1]/1.25];
 const move=(i:number,f:number)=>{const [lo,hi]=limits(i);onChange(i,Math.round(Math.max(lo,Math.min(hi,f))));};
 const end=()=>{drag.current=-1;};
 useEffect(()=>{
  const cv=canvas.current,ctx=cv?.getContext('2d');if(!cv||!ctx)return;
  const dpr=window.devicePixelRatio||1,N=32768,centre=GH/2,spectrum=createSpectrum(N),pm=new Float32Array(W),ps=new Float32Array(W);
  cv.width=Math.round(W*dpr);cv.height=Math.round(GH*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--wave-bg').trim()||'#080a14';
  const level=(v:number)=>v>0?Math.max(0,Math.min(1,(20*Math.log10(v)+105)/85)):0;
  let frame=0,last=0;
  const draw=(now:number)=>{
   frame=requestAnimationFrame(draw);
   if(now-last<40)return;
   last=now;
   const {edges:e,source:src,rangeStart:rs,sampleRate:sr}=live.current,buf=rendered.current,ch=buf?buf.channels:src,left=ch[0],right=ch[1]??ch[0];
   ctx.fillStyle=bg;ctx.fillRect(0,0,W,GH);
   for(let b=0;b<4;b++){ctx.fillStyle=`${COLORS[b]}30`;ctx.fillRect(xOf(e[b]),0,xOf(e[b+1])-xOf(e[b]),GH);}
   let sp:{mid:Float64Array;side:Float64Array}|null=null;
   if(left&&left.length>=N){const at=Math.floor(audioEngine.getCurrentSample()-rs),stop=Math.max(N,Math.min(left.length,at+N/2));sp=spectrum(left,right,stop-N);}
   let band=0;
   for(let x=0;x<W;x++){
    let lm=0,ls=0;
    if(sp){
     const b0=fOf(x)*N/sr,b1=fOf(x+1)*N/sr;
     if(b0<N/2-1){
      if(b1-b0<1){const p=(b0+b1)/2,i0=Math.min(N/2-1,Math.floor(p)),t=p-i0;lm=sp.mid[i0]*(1-t)+sp.mid[i0+1]*t;ls=sp.side[i0]*(1-t)+sp.side[i0+1]*t;}
      else{const i0=Math.ceil(b0),i1=Math.min(N/2,Math.floor(b1));for(let k=i0;k<=i1;k++){if(sp.mid[k]>lm)lm=sp.mid[k];if(sp.side[k]>ls)ls=sp.side[k];}}
     }
    }
    pm[x]=Math.max(level(lm),pm[x]-.06);ps[x]=Math.max(level(ls),ps[x]-.06);
    while(band<3&&x+.5>=xOf(e[band+1]))band++;
    ctx.fillStyle=COLORS[band];
    ctx.globalAlpha=.95;ctx.fillRect(x,centre-pm[x]*(centre-8),1,pm[x]*(centre-8));
    ctx.globalAlpha=.6;ctx.fillRect(x,centre,1,ps[x]*(centre-8));
   }
   ctx.globalAlpha=1;
   ctx.strokeStyle='rgba(255,255,255,.35)';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,centre);ctx.lineTo(W,centre);ctx.stroke();
   ctx.font='11px system-ui,sans-serif';ctx.fillStyle='rgba(255,255,255,.75)';ctx.textAlign='left';ctx.fillText('Centre',6,centre-6);ctx.fillText('Côtés',6,centre+14);
  };
  frame=requestAnimationFrame(draw);
  return()=>cancelAnimationFrame(frame);
 },[rendered]);
 return <div className="zonyx-imager-graph">
  <canvas ref={canvas}/>
  <svg ref={svg} viewBox={`0 0 ${W} ${GH}`} role="group" aria-label="Bandes de fréquences, spectre du centre et des côtés, points de croisement">
   {ticks.map(f=><g key={f}><path d={`M${xOf(f)} 40V${GH-16}`} stroke="#fff" strokeOpacity=".12"/><text x={xOf(f)} y={GH-4} textAnchor="middle" fill="#fff" fillOpacity=".6" fontSize="11">{hz(f)}</text></g>)}
   {COLORS.map((c,b)=><text key={b} x={(xOf(edges[b])+xOf(edges[b+1]))/2} y={16} textAnchor="middle" fill="#fff" fontSize="13" fontWeight="600">{BAND_NAMES[b]}</text>)}
   {crossovers.map((f,i)=>{
    const x=xOf(f),[lo,hi]=limits(i);
    return <g key={i} className="zonyx-imager-cross" tabIndex={0} role="slider" aria-label={`Croisement ${i+1}`} aria-valuemin={Math.round(lo)} aria-valuemax={Math.round(hi)} aria-valuenow={f} aria-valuetext={hz(f)}
     onPointerDown={e=>{if(e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.focus();drag.current=i;}}
     onPointerMove={e=>{if(drag.current!==i||!svg.current)return;const r=svg.current.getBoundingClientRect();move(i,fOf((e.clientX-r.left)/r.width*W));}}
     onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end} onDoubleClick={()=>onReset(i)}
     onKeyDown={e=>{if(e.key!=='ArrowLeft'&&e.key!=='ArrowRight')return;e.preventDefault();move(i,f*(e.shiftKey?1.01:1.06)**(e.key==='ArrowRight'?1:-1));}}>
     <rect x={x-9} y={0} width={18} height={GH} fill="transparent"/>
     <path d={`M${x} 0V${GH}`} stroke="#fff" strokeOpacity=".9" strokeWidth="1.5"/>
     <rect x={x-24} y={26} width={48} height={17} rx="4" fill="#21182c" stroke="#bd93f9"/>
     <text x={x} y={39} textAnchor="middle" fill="#fff" fontSize="11">{hz(f)}</text>
    </g>;
   })}
  </svg>
 </div>;
}
function BandColumn({label,range,color,value,onChange}:{label:string;range:string;color:string;value:number;onChange:(v:number)=>void}){
 const activity=useControlActivity(),ref=useRef<HTMLDivElement>(null),valueRef=useRef(value),[hover,setHover]=useState(false),clamp=(v:number)=>Math.max(-100,Math.min(100,v)),nudge=useRef((direction:number,fine:boolean)=>{void direction;void fine;});
 valueRef.current=value;
 nudge.current=(direction,fine)=>{activity.pulse();onChange(clamp(roundTo(value+direction*(fine?.1:2),.1)));};
 useEffect(()=>{
  const node=ref.current;if(!node)return;
  const wheel=(e:WheelEvent)=>{const d=e.deltaY||e.deltaX;if(!d||e.ctrlKey||e.metaKey||e.altKey)return;e.preventDefault();nudge.current(d<0?1:-1,e.shiftKey);};
  const track=node.querySelector('.zonyx-fader-track');
  const over=(e:PointerEvent)=>{
   if(!track)return;
   const r=track.getBoundingClientRect(),f=(valueRef.current+100)/200,cy=r.top+14+(1-f)*(r.height-28);
   setHover(Math.abs(e.clientY-cy)<=18&&Math.abs(e.clientX-(r.left+r.width/2))<=28);
  };
  const out=()=>setHover(false);
  node.addEventListener('wheel',wheel,{passive:false});
  node.addEventListener('pointermove',over);
  node.addEventListener('pointerleave',out);
  return()=>{node.removeEventListener('wheel',wheel);node.removeEventListener('pointermove',over);node.removeEventListener('pointerleave',out);};
 },[]);
 const slider=useFineSlider({min:-100,max:100,value,step:1,fineStep:.1,onChange,onStart:()=>activity.begin(),onEnd:()=>activity.end()});
 return <div className="zonyx-imager-band" style={{'--zonyx-control-color':color,'--zonyx-fader-glow':color} as React.CSSProperties}>
  <strong>{label}</strong><small>{range}</small>
  <div ref={ref} className={`zonyx-gain${activity.active?' is-adjusting is-grabbed':''}${hover?' is-thumb-hover':''}`} onDoubleClick={()=>onChange(0)}>
   <div className="zonyx-fader-track" {...slider} style={{touchAction:'none'}}>
    <div className="zonyx-fader-ticks" aria-hidden="true">{Array.from({length:9},(_,i)=><i key={i} className={i===4?'zero':''} style={{top:`${i*100/8}%`}}>{i===4?<span>0</span>:null}</i>)}</div>
    <input type="range" aria-label={`Largeur ${label}`} aria-orientation="vertical" min={-100} max={100} step={.1} value={value} style={{'--zonyx-f':(value+100)/200,pointerEvents:'none'} as React.CSSProperties}
     onKeyDown={e=>{if(!['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key))return;e.preventDefault();activity.pulse();onChange(clamp(roundTo(value+(e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1)*(e.shiftKey?.1:1),.1)));}}
     onChange={e=>onChange(Number(e.target.value))}/>
   </div>
   <output>{`${value>0?'+':''}${Number(value.toFixed(1))} %`}</output>
  </div>
 </div>;
}
function StereoMeters({rendered,source,rangeStart}:{rendered:React.MutableRefObject<Rendered|null>;source:Float32Array[];rangeStart:number}){
 const [view,setView]=useState(0),viewRef=useRef(0);viewRef.current=view;
 const scope=useRef<HTMLCanvasElement>(null),trace=useRef<HTMLCanvasElement>(null),input=useRef({source,rangeStart}),clear=useRef(true);input.current={source,rangeStart};
 useEffect(()=>{
  const sc=scope.current,tr=trace.current,sx=sc?.getContext('2d'),tx=tr?.getContext('2d');if(!sc||!tr||!sx||!tx)return;
  const dpr=window.devicePixelRatio||1,SW=262,SH=168,TW=262,TH=100,N=2048,CX=116,PB=158,R=108,LX=116,LY=84,LS=76;
  sc.width=Math.round(SW*dpr);sc.height=Math.round(SH*dpr);sx.setTransform(dpr,0,0,dpr,0,0);
  tr.width=Math.round(TW*dpr);tr.height=Math.round(TH*dpr);tx.setTransform(dpr,0,0,dpr,0,0);
  const bg=getComputedStyle(document.documentElement).getPropertyValue('--wave-bg').trim()||'#080a14',hist:number[]=[],rays=new Float32Array(64);
  let corr=1,lastPush=0,frame=0;
  const draw=(now:number)=>{
   frame=requestAnimationFrame(draw);
   const buf=rendered.current,ch=buf?buf.channels:input.current.source,left=ch[0],right=ch[1]??ch[0],mode=viewRef.current;
   let start=0,end=0;
   if(left){const lo=buf?buf.from:0,hi=buf?buf.to:left.length;start=Math.max(lo,Math.min(hi-N,Math.floor(audioEngine.getCurrentSample()-input.current.rangeStart)));end=Math.min(hi,start+N);}
   if(clear.current||mode===1){sx.globalAlpha=1;sx.fillStyle=bg;sx.fillRect(0,0,SW,SH);clear.current=false;}
   else{sx.globalAlpha=.25;sx.fillStyle=bg;sx.fillRect(0,0,236,SH);sx.globalAlpha=1;}
   sx.lineWidth=1.5;sx.strokeStyle='#bd93f9';sx.beginPath();
   if(mode===2)sx.arc(LX,LY,LS,0,Math.PI*2);else{sx.arc(CX,PB,R,Math.PI,0);sx.lineTo(CX-R,PB);}
   sx.stroke();
   sx.lineWidth=1;sx.strokeStyle='rgba(255,255,255,.3)';sx.beginPath();
   if(mode===2){sx.moveTo(LX,LY-LS);sx.lineTo(LX,LY+LS);sx.moveTo(LX-LS,LY);sx.lineTo(LX+LS,LY);}
   else{sx.moveTo(CX-R*.7071,PB-R*.7071);sx.lineTo(CX,PB);sx.lineTo(CX+R*.7071,PB-R*.7071);sx.moveTo(CX,PB-R);sx.lineTo(CX,PB);}
   sx.stroke();
   sx.font='11px system-ui,sans-serif';sx.fillStyle='rgba(255,255,255,.7)';sx.textAlign='center';
   if(mode!==2){sx.fillText('G',CX-R*.7071-8,PB-R*.7071-4);sx.fillText('D',CX+R*.7071+8,PB-R*.7071-4);sx.fillText('M',CX,PB-R-5);}
   let ll=0,rr=0,lr=0;
   if(left&&end>start){
    for(let i=start;i<end;i++){
     const l=left[i],r=right[i];ll+=l*l;rr+=r*r;lr+=l*r;
     if(mode===1){const x=(r-l)*.7071,y=Math.abs(l+r)*.7071,rad=Math.min(1,Math.hypot(x,y)*1.25),b=Math.min(63,Math.floor(Math.atan2(y,x)/Math.PI*64));if(rad>rays[b])rays[b]=rad;}
     else if((i-start)%3===0){
      const x=Math.max(-1,Math.min(1,(r-l)*.7071*1.25)),y=Math.max(-1,Math.min(1,(l+r)*.7071*1.25)),clipped=Math.abs(l)>=.999||Math.abs(r)>=.999;
      sx.fillStyle=clipped||(mode===0&&Math.abs(x)>Math.abs(y))?'#ff5555':'#39ff14';
      if(mode===0)sx.fillRect(CX+x*R-.8,PB-Math.abs(y)*R-.8,1.7,1.7);else sx.fillRect(LX+x*LS-.8,LY-y*LS-.8,1.7,1.7);
     }
    }
   }
   if(mode===1){
    sx.lineWidth=1.5;
    for(let b=0;b<64;b++){
     const ang=(b+.5)/64*Math.PI,len=rays[b]*R;
     if(len>1){sx.strokeStyle=ang>Math.PI/4&&ang<Math.PI*3/4?'#39ff14':'#ff5555';sx.beginPath();sx.moveTo(CX,PB);sx.lineTo(CX+Math.cos(ang)*len,PB-Math.sin(ang)*len);sx.stroke();}
     rays[b]*=.93;
    }
   }
   const d=Math.sqrt(ll*rr);corr+=((d>1e-12?lr/d:1)-corr)*.2;
   sx.fillStyle=bg;sx.fillRect(236,0,SW-236,SH);
   const grad=sx.createLinearGradient(0,14,0,SH-14);grad.addColorStop(0,'#39ff14');grad.addColorStop(.5,'#fbbf24');grad.addColorStop(1,'#ff5555');
   sx.fillStyle=grad;sx.fillRect(244,14,8,SH-28);sx.fillStyle='#fff';sx.fillRect(240,14+(1-corr)/2*(SH-28)-1.5,16,3);
   sx.font='10px system-ui,sans-serif';sx.fillStyle='rgba(255,255,255,.65)';sx.textAlign='center';sx.fillText('+1',248,10);sx.fillText('0',248,SH/2+3);sx.fillText('−1',248,SH-3);
   if(now-lastPush>60){hist.push(corr);if(hist.length>120)hist.shift();lastPush=now;}
   const hx=8,hw=TW-16,hy=22,hh=TH-30,mid=hy+hh/2;
   tx.fillStyle=bg;tx.fillRect(0,0,TW,TH);
   tx.font='11px system-ui,sans-serif';tx.textAlign='left';tx.fillStyle='rgba(255,255,255,.7)';tx.fillText('Historique de corrélation',hx,14);
   tx.strokeStyle='rgba(255,255,255,.25)';tx.beginPath();tx.moveTo(hx,mid);tx.lineTo(hx+hw,mid);tx.stroke();
   hist.forEach((v,i)=>{const y=mid-v*hh/2;tx.globalAlpha=.65;tx.fillStyle=v>=0?'#39ff14':'#ff5555';tx.fillRect(hx+i*hw/120,Math.min(y,mid),hw/120+.5,Math.abs(y-mid)||1);});
   tx.globalAlpha=1;
  };
  frame=requestAnimationFrame(draw);
  return()=>cancelAnimationFrame(frame);
 },[rendered]);
 return <div className="zonyx-imager-meters">
  <canvas ref={scope} className="zonyx-imager-scope" style={{width:262,height:168}} role="img" aria-label="Vectorscope et corrélation du son préécouté" onDoubleClick={()=>{clear.current=true;}}/>
  <button type="button" className="zonyx-imager-view" title="Cliquez pour changer l’affichage du vectorscope" onClick={()=>{setView(v=>(v+1)%3);clear.current=true;}}>{VIEWS[view]}</button>
  <canvas ref={trace} className="zonyx-imager-trace" style={{width:262,height:100}} role="img" aria-label="Historique de corrélation"/>
 </div>;
}
export function ImagerModal(p:Props){
 const doc=p.document;
 const [s,setS]=useState<ImagerSettings>(()=>({widths:[0,0,0,0],crossovers:[...START_CROSS],stereoize:50,mode:'I',delayMs:6}));
 const [on,setOn]=useState(false),[link,setLink]=useState(false),[touched,setTouched]=useState(false),[pending,setPending]=useState(true),[applying,setApplying]=useState(false),[error,setError]=useState('');
 const change=(patch:Partial<ImagerSettings>)=>{setTouched(true);setS(old=>({...old,...patch}));};
 const setWidth=(index:number,value:number)=>{setTouched(true);setS(old=>{const delta=value-old.widths[index];return {...old,widths:old.widths.map((w,k)=>k===index?value:link?Math.max(-100,Math.min(100,w+delta)):w)};});};
 const setCross=(index:number,value:number)=>{setTouched(true);setS(old=>({...old,crossovers:old.crossovers.map((f,k)=>k===index?value:f)}));};
 const settings=useMemo<ImagerSettings>(()=>({...s,stereoize:on?s.stereoize:0}),[s,on]);
 const callbacks=useRef(p);callbacks.current=p;
 const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {start:r.start,end:r.end};},[doc]);
 const source=useMemo(()=>doc.channels.map(ch=>ch.subarray(range.start,range.end)),[doc,range]);
 const n=source[0]?.length??0,eff=useMemo(()=>normalizeImager(settings),[settings]),neutral=isImagerNeutral(settings);
 const latest=useRef(settings);latest.current=settings;
 const rendered=useRef<Rendered|null>(null);
 const worker=useRef<Worker|null>(null),busy=useRef(false),wanted=useRef<Request|null>(null),serial=useRef(0),shown=useRef(0),applyId=useRef(-1),win=useRef({from:0,to:0});
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
   if(r.id<shown.current){dispatch();return;}
   shown.current=r.id;
   rendered.current={channels:r.channels,from:r.from??0,to:r.to??n};
   if(r.id===serial.current){win.current={from:r.from??0,to:r.to??n};setError('');setPending(false);}
   callbacks.current.onStartPreview(r.channels,doc.sampleRate);
   if(r.id!==serial.current)dispatch();
  };
  w.onerror=()=>{busy.current=false;setError('Échec du traitement audio. Fermez puis rouvrez cet effet.');setPending(false);setApplying(false);};
  return()=>{w.terminate();if(worker.current===w)worker.current=null;busy.current=false;};
 },[source,doc.sampleRate,n]);
 useEffect(()=>{
  if(!n||applyId.current>=0)return;
  const id=++serial.current;setPending(true);
  wanted.current={id,settings,...windowAround()};
  const timer=window.setTimeout(dispatch,busy.current?0:10);
  return()=>window.clearTimeout(timer);
 },[source,doc.sampleRate,settings,n]);
 useEffect(()=>{
  if(!n)return;
  const timer=window.setInterval(()=>{
   const w=win.current;
   if(!audioEngine.isPlaying||busy.current||applyId.current>=0||(w.from<=0&&w.to>=n))return;
   const at=audioEngine.getCurrentSample()-range.start,span=w.to-w.from;
   if(at>=w.from+span*.5||at<w.from-1){const id=++serial.current;wanted.current={id,settings:latest.current,...windowAround()};dispatch();}
  },300);
  return()=>window.clearInterval(timer);
 },[n,range.start,doc.sampleRate]);
 const apply=()=>{
  if(!n||!touched||neutral||pending||applying||error)return;
  setApplying(true);
  const id=++serial.current;applyId.current=id;
  wanted.current={id,settings:latest.current,from:0,to:n};dispatch();
 };
 const ranges=[`< ${hz(eff.crossovers[0])}`,`${hz(eff.crossovers[0])} à ${hz(eff.crossovers[1])}`,`${hz(eff.crossovers[1])} à ${hz(eff.crossovers[2])}`,`> ${hz(eff.crossovers[2])}`];
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-imager" minWidth={900} minHeight={680} role="dialog" aria-modal="true" aria-labelledby="imager-title">
  <header><h2 id="imager-title">{LABEL}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
  <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-imager-body">
   <div className="zonyx-imager-top">
    <div className="zonyx-imager-left">
     <BandGraph crossovers={eff.crossovers} onChange={setCross} onReset={i=>setCross(i,START_CROSS[i])} rendered={rendered} source={source} rangeStart={range.start} sampleRate={doc.sampleRate}/>
     <div className="zonyx-imager-columns">{BAND_NAMES.map((name,i)=><BandColumn key={name} label={name} range={ranges[i]} color={COLORS[i]} value={s.widths[i]} onChange={v=>setWidth(i,v)}/>)}</div>
    </div>
    <StereoMeters rendered={rendered} source={source} rangeStart={range.start}/>
   </div>
   <div className="zonyx-imager-bottom">
    <button type="button" className="zonyx-mod-toggle" aria-pressed={link} onClick={()=>setLink(v=>!v)}>Lier les bandes</button>
    <button type="button" className="zonyx-mod-toggle zonyx-imager-power" aria-pressed={on} onClick={()=>{setTouched(true);setOn(v=>!v);}}>Stereoize</button>
    <div className={on?'':'zonyx-imager-dim'} aria-disabled={!on}><EffectParameter label="Quantité" value={s.stereoize} initial={50} spec={{min:0,max:100,step:1,fine:.1,digits:0}} unit="%" onChange={v=>change({stereoize:v})}/></div>
    <div className={`zonyx-imager-modes${on?'':' zonyx-imager-dim'}`} role="group" aria-label="Mode de Stereoize">{(['I','II'] as const).map(mode=><button type="button" key={mode} className="zonyx-mod-toggle" aria-pressed={s.mode===mode} onClick={()=>change({mode})}>{`Mode ${mode}`}</button>)}</div>
    {s.mode==='I'&&<div className={on?'':'zonyx-imager-dim'} aria-disabled={!on}><EffectParameter label="Délai" value={s.delayMs} initial={6} spec={{min:.5,max:30,step:.5,fine:.1,digits:1}} unit="ms" onChange={v=>change({delayMs:v})}/></div>}
   </div>
   {error&&<p role="alert">{error}</p>}
  </div></fieldset></main>
  <footer><span role="status">{applying?'Application…':pending&&touched?'Calcul…':''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n||!touched||neutral||pending||applying||!!error}>Appliquer</button></footer>
 </EffectPanel></div>;
}
