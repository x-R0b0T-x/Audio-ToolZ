import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {audioEngine} from '../audio/engine';
import {readHeaderTempo} from '../utils/finalUi';
import './headerParticles.css';
type Arc={id:number;born:number;life:number;side:number;width:number;path:string;branch:string};
function makeArc(id:number,born:number,side:number,reach:number):Arc{
  const width=Math.min(reach,190+Math.random()*250),steps=12+Math.floor(Math.random()*7);
  const points=Array.from({length:steps+1},(_,i)=>({x:width*i/steps,y:20+(i===0?0:(Math.random()-.5)*(8+Math.random()*12))}));
  const path=points.map((p,i)=>`${i?'L':'M'}${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ');
  const root=points[3+Math.floor(Math.random()*(steps-5))];
  const length=Math.min(width-root.x,24+Math.random()*36),direction=Math.random()<.5?-1:1;
  const branch=`M${root.x} ${root.y} l${length*.4} ${direction*4} l${length*.25} ${-direction*2} l${length*.35} ${direction*5}`;
  return {id,born,life:650+Math.random()*200,side,width,path,branch};
}
export function HeaderParticles(){
  const [arcs,setArcs]=useState<Arc[]>([]);
  const host=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let id=0,lastBeat:number|null=null,lastSample:number|null=null,lastTempo:ReturnType<typeof readHeaderTempo>=null;
    const timer=window.setInterval(()=>{
      const now=performance.now();
      if(reduced.matches||document.hidden){setArcs(current=>current.length?[]:current);lastBeat=null;lastSample=null;return;}
      const tempo=readHeaderTempo(),added:Arc[]=[];
      if(tempo!==lastTempo){lastTempo=tempo;lastBeat=null;lastSample=null;}
      if(audioEngine.isPlaying&&tempo&&Number.isFinite(tempo.bpm)&&tempo.bpm>0&&tempo.rate>0){
        const sample=audioEngine.getCurrentSample(),period=tempo.rate*60/tempo.bpm;
        const beat=Math.floor((sample-tempo.origin)/period),phase=((sample-tempo.origin)%period+period)%period;
        const emit=lastBeat===null?phase<Math.min(period*.1,tempo.rate*.05):beat!==lastBeat||(lastSample!==null&&sample<lastSample-tempo.rate*.1);
        lastBeat=beat;lastSample=sample;
        if(emit){
          const rect=host.current?.getBoundingClientRect();
          if(rect)for(const side of [-1,1]){
            const reach=Math.max(0,side<0?rect.left-12:window.innerWidth-rect.right-12);
            if(reach>24)added.push(makeArc(id++,now,side,reach));
          }
        }
      }else{lastBeat=null;lastSample=null;}
      setArcs(current=>{
        const alive=current.filter(arc=>now-arc.born<arc.life);
        return !added.length&&alive.length===current.length?current:[...alive,...added].slice(-16);
      });
    },24);
    return()=>window.clearInterval(timer);
  },[]);
  return <span ref={host} className="atz-header-particles" aria-hidden="true">{arcs.map(arc=><svg key={arc.id} className={`atz-header-arc${arc.side<0?' atz-header-arc-left':''}`} width={arc.width} height={40} viewBox={`0 0 ${arc.width} 40`} focusable="false" style={{'--atz-arc-life':`${arc.life}ms`} as CSSProperties}>
    <path className="atz-arc-glow" d={arc.path} pathLength={1}/>
    <path className="atz-arc-core" d={arc.path} pathLength={1}/>
    <path className="atz-arc-branch" d={arc.branch} pathLength={1}/>
  </svg>)}</span>;
}
