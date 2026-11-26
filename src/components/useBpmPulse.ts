import {useEffect} from 'react';
import {audioEngine} from '../audio/engine';
import {readHeaderTempo} from '../utils/finalUi';
import {robotBeatPulse} from '../utils/finalUiMath.mjs';
/* Le bouton BPM actif passe du vert clair au vert lumineux sur chaque temps de la grille detectee. */
export function useBpmPulse(active:boolean){
 useEffect(()=>{
  const button=document.querySelector<HTMLElement>('button[aria-label^="Détecteur de BPM"]');
  if(!button)return;
  if(!active||matchMedia('(prefers-reduced-motion: reduce)').matches){button.style.removeProperty('--zonyx-pulse');return;}
  let frame=0,last=0,avg=0,pulse=0,cool=0;
  const tick=(now:number)=>{
   const dt=last?Math.min(.1,(now-last)/1000):1/60;last=now;
   const tempo=readHeaderTempo();
   if(audioEngine.isPlaying&&!document.hidden){
    if(tempo)pulse=robotBeatPulse(audioEngine.getCurrentSample(),tempo.bpm,tempo.rate,tempo.origin);
    else{
     const bins=audioEngine.readSpectrumSnapshot();let bass=0;for(let j=1;j<=5&&j<bins.length;j++)bass+=bins[j];bass/=5*255;
     cool-=dt;if(bass-avg>.1&&cool<=0){pulse=1;cool=.22;}
     avg+=(bass-avg)*Math.min(1,dt*3);pulse=Math.max(0,pulse-dt/.3);
    }
   }else{avg=0;pulse=Math.max(0,pulse-dt/.3);}
   button.style.setProperty('--zonyx-pulse',pulse.toFixed(3));
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);button.style.removeProperty('--zonyx-pulse');};
 },[active]);
}
