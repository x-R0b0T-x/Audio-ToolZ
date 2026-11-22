import {useEffect,useState} from 'react';
import {audioEngine} from '../../audio/engine';
import robotUrl from './333.png?url';
import musicUrl from './assets/music.ogg?url';
export const EASTER_MEDIA={robot:robotUrl,audio:musicUrl};
export function useEasterMedia(){
 const [attempt,setAttempt]=useState(0),[problem,setProblem]=useState('');
 useEffect(()=>{const controller=new AbortController();let stop:(()=>void)|undefined;setProblem('');
  void(async()=>{const response=await fetch(musicUrl,{signal:controller.signal});if(!response.ok)throw new Error('OGG unavailable');const end=await audioEngine.playAuxiliaryLoop(await response.arrayBuffer(),{signal:controller.signal});if(controller.signal.aborted)end();else stop=end;})().catch(()=>{if(!controller.signal.aborted)setProblem('Lecture du son indisponible. Réessayez.');});
  return()=>{controller.abort();stop?.();};
 },[attempt]);
 return {problem,retry:()=>setAttempt(n=>n+1),reportError:setProblem};
}
