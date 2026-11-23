import {useEffect,useState} from 'react';
import type {CSSProperties} from 'react';
import {audioEngine} from '../audio/engine';
import './headerParticles.css';
type Particle={id:number;born:number;side:number;dy:number;color:string};
export function HeaderParticles(){
  const [particles,setParticles]=useState<Particle[]>([]);
  useEffect(()=>{
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    let id=0,lastEmission=-Infinity;
    const timer=window.setInterval(()=>{
      const now=performance.now();
      if(reduced.matches||document.hidden){
        setParticles(current=>current.length?[]:current);
        lastEmission=-Infinity;return;
      }
      const emit=audioEngine.isPlaying&&now-lastEmission>=180;
      const added:Particle[]=[];
      if(emit){
        lastEmission=now;
        for(const side of [-1,1]){
          const index=id++;
          added.push({id:index,born:now,side,dy:((Math.floor(index/2)%5)-2)*4,color:Math.floor(index/2)%2?'#b34dff':'#39ff14'});
        }
      }
      setParticles(current=>{
        const alive=current.filter(particle=>now-particle.born<900);
        return !added.length&&alive.length===current.length?current:[...alive,...added].slice(-24);
      });
    },100);
    return()=>window.clearInterval(timer);
  },[]);
  return <span className="atz-header-particles" aria-hidden="true">{particles.map(particle=><i key={particle.id} className="atz-header-particle" style={{left:particle.side<0?'0%':'100%',top:`calc(50% + ${particle.dy/2}px)`,background:particle.color,color:particle.color,'--atz-particle-x':`${particle.side*36}px`,'--atz-particle-y':`${particle.dy}px`} as CSSProperties}/>)}</span>;
}
