import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import {audioEngine} from '../audio/engine';
import './headerParticles.css';
type Particle={id:number;born:number;life:number;side:number;dy:number;distance:number;size:number;color:string};
export function HeaderParticles(){
  const [particles,setParticles]=useState<Particle[]>([]);
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let id=0,lastEmission=-Infinity;
    const timer=window.setInterval(()=>{
      const now=performance.now();
      if(reduced.matches||document.hidden){setParticles(current=>current.length?[]:current);lastEmission=-Infinity;return;}
      const added:Particle[]=[];
      if(audioEngine.isPlaying&&now-lastEmission>=120){
        lastEmission=now;
        for(const side of [-1,1])for(let dot=0;dot<2;dot++){
          const index=id++,variation=(index*37)%101;
          added.push({id:index,born:now,life:1800+variation*8,side,dy:(variation/100-.5)*28,distance:85+variation*.65,size:2.5+(variation%4)*.45,color:(Math.floor(index/4)+dot)%2?'#bd45ff':'#55ff16'});
        }
      }
      setParticles(current=>{
        const alive=current.filter(particle=>now-particle.born<particle.life);
        return !added.length&&alive.length===current.length?current:[...alive,...added].slice(-96);
      });
    },60);
    return()=>window.clearInterval(timer);
  },[]);
  return <span className="atz-header-particles" aria-hidden="true">{particles.map(particle=><i key={particle.id} className="atz-header-particle" style={{left:particle.side<0?'0%':'100%',top:`calc(50% + ${particle.dy/3}px)`,width:particle.size,height:particle.size,background:particle.color,color:particle.color,'--atz-particle-x':`${particle.side*particle.distance}px`,'--atz-particle-y':`${particle.dy}px`,'--atz-particle-life':`${particle.life}ms`,'--atz-trail-angle':`${Math.atan2(particle.dy,particle.side*particle.distance)*180/Math.PI}deg`} as CSSProperties}/>)}</span>;
}
