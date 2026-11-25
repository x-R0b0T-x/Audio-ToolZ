import {useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import waitImage from '../medias/wait.png?url';
import {subscribeFileOpening,getOpeningSnapshot,getWelcomeSnapshot} from '../utils/fileOpening.mjs';
export const FILE_OPENING_MESSAGE='Chargement du fichier en cours, veuillez patienter...';
export function FileOpeningMessage(){return <p className="zonyx-opening-message" role="status" aria-live="polite" aria-atomic="true"><span className="zonyx-opening-sr">{FILE_OPENING_MESSAGE}</span><span aria-hidden="true">Chargement du fichier en cours, veuillez patienter<span className="zonyx-opening-dots"><span>.</span><span>.</span><span>.</span></span></span></p>;}
export function FileOpeningOverlay(){
 const count=useSyncExternalStore(subscribeFileOpening,getOpeningSnapshot,()=>0),welcome=useSyncExternalStore(subscribeFileOpening,getWelcomeSnapshot,()=>false);
 return count&&!welcome?createPortal(<div className="zonyx-opening-progress" aria-busy="true"><img src={waitImage} alt="" draggable={false}/><FileOpeningMessage/></div>,document.body):null;
}
