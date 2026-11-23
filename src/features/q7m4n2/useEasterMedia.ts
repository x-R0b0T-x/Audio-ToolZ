import {useEffect,useRef,useState} from 'react';
import {audioEngine} from '../../audio/engine';
import robotUrl from './333.png?url';
import musicUrl from './assets/music.ogg?url';
export const EASTER_MEDIA={robot:robotUrl,audio:musicUrl};
export function useEasterMedia(){
 const [attempt,setAttempt]=useState(0),[problem,setProblem]=useState('');
 const robot=useRef<HTMLImageElement>(null),samples=useRef<Float32Array|null>(null),pulse=useRef(0);
 useEffect(()=>{
  const controller=new AbortController(),reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let stop:(()=>void)|undefined;setProblem('');
  void(async()=>{
   const response=await fetch(musicUrl,{signal:controller.signal});
   if(!response.ok)throw new Error('OGG unavailable');
   const end=await audioEngine.playAuxiliaryLoop(await response.arrayBuffer(),{signal:controller.signal,onWaveform:value=>{samples.current=value;},onPulse:value=>{
    pulse.current=value;
    if(robot.current)robot.current.style.setProperty('scale',String(1+(reduced.matches?0:.24*value)));
   }});
   if(controller.signal.aborted)end();else stop=end;
  })().catch(()=>{if(!controller.signal.aborted)setProblem('Lecture du son indisponible. Réessayez.');});
  return()=>{controller.abort();stop?.();robot.current?.style.removeProperty('scale');};
 },[attempt]);
 return {robot,samples,pulse,problem,retry:()=>setAttempt(n=>n+1),reportError:setProblem};
}
