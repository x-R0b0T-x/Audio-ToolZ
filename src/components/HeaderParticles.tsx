import {useEffect,useRef,useState} from 'react';
import type {CSSProperties} from 'react';
import {audioEngine} from '../audio/engine';
import {readHeaderTempo} from '../utils/finalUi';
import './headerParticles.css';
type Particle={id:number;born:number;life:number;side:number;dy:number;distance:number;size:number;color:string;startY:number;trail:number;bend:number};
export function HeaderParticles(){
  const [particles,setParticles]=useState<Particle[]>([]);
  const host=useRef<HTMLSpanElement>(null);
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let id=0,lastBeat:number|null=null,lastSample:number|null=null,lastTempo:ReturnType<typeof readHeaderTempo>=null;
    const timer=window.setInterval(()=>{
      const now=performance.now();
      if(reduced.matches||document.hidden){setParticles(current=>current.length?[]:current);lastBeat=null;lastSample=null;return;}
      const tempo=readHeaderTempo(),added:Particle[]=[];
      if(tempo!==lastTempo){lastTempo=tempo;lastBeat=null;lastSample=null;}
      if(audioEngine.isPlaying&&tempo&&Number.isFinite(tempo.bpm)&&tempo.bpm>0&&tempo.rate>0){
        const sample=audioEngine.getCurrentSample(),period=tempo.rate*60/tempo.bpm;
        const beat=Math.floor((sample-tempo.origin)/period),phase=((sample-tempo.origin)%period+period)%period;
        const emit=lastBeat===null?phase<Math.min(period*.1,tempo.rate*.05):beat!==lastBeat||(lastSample!==null&&sample<lastSample-tempo.rate*.1);
        lastBeat=beat;lastSample=sample;
        if(emit){
          const rect=host.current?.getBoundingClientRect();
          for(const side of [-1,1]){
            const count=1+Math.floor(Math.random()*2);
            const reach=Math.max(0,side<0?(rect?.left??window.innerWidth/2)-12:window.innerWidth-(rect?.right??window.innerWidth/2)-12);
            for(let dot=0;dot<count;dot++){
              const variation=Math.random()*100;
              added.push({id:id++,born:now,life:1800+variation*8,side,dy:(Math.random()-.5)*24,distance:Math.min(reach,(85+variation*.65)*3),size:2+Math.random()*2,color:Math.random()<.5?'#39ff14':'#bf40ff',startY:(Math.random()-.5)*10,trail:12+Math.random()*18,bend:(Math.random()-.5)*18});
            }
          }
        }
      }else{lastBeat=null;lastSample=null;}
      setParticles(current=>{
        const alive=current.filter(particle=>now-particle.born<particle.life);
        return !added.length&&alive.length===current.length?current:[...alive,...added].slice(-96);
      });
    },32);
    return()=>window.clearInterval(timer);
  },[]);
  return <span ref={host} className="atz-header-particles" aria-hidden="true">{particles.map(particle=><i key={particle.id} className="atz-header-particle" style={{left:particle.side<0?'0%':'100%',top:`calc(50% + ${particle.startY}px)`,width:particle.size,height:particle.size,background:particle.color,color:particle.color,'--atz-particle-x':`${particle.side*particle.distance}px`,'--atz-particle-y':`${particle.dy}px`,'--atz-particle-mid-x':`${particle.side*particle.distance*.4}px`,'--atz-particle-mid-y':`${particle.bend}px`,'--atz-particle-life':`${particle.life}ms`,'--atz-trail-length':`${particle.trail}px`,'--atz-trail-angle':`${Math.atan2(particle.dy,particle.side*particle.distance)*180/Math.PI}deg`} as CSSProperties}/>)}</span>;
}
