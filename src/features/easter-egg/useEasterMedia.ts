import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import robotUrl from './assets/robot.mp4?url';
import musicUrl from './assets/music.ogg?url';
import {playEasterMedia,stopEasterMedia} from './mediaPlayback.mjs';
export const EASTER_MEDIA={video:robotUrl,audio:musicUrl};
export function useEasterMedia(video:RefObject<HTMLVideoElement|null>,audio:RefObject<HTMLAudioElement|null>){
 const active=useRef(false),[problem,setProblem]=useState('');
 const retry=useCallback(()=>{const v=video.current,a=audio.current;if(!v||!a)return;setProblem('');void playEasterMedia(v,a).catch(()=>{if(active.current)setProblem('Lecture du média indisponible. Réessayez ou fermez la fenêtre.');});},[video,audio]);
 useEffect(()=>{active.current=true;const v=video.current,a=audio.current;retry();return()=>{active.current=false;if(v)stopEasterMedia(v);if(a)stopEasterMedia(a);};},[video,audio,retry]);
 return {problem,retry,reportError:setProblem};
}
