import {useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import waitImage from '../medias/wait.png?url';
import {subscribeFileOpening,getOpeningSnapshot} from '../utils/fileOpening.mjs';
export function FileOpeningOverlay(){const count=useSyncExternalStore(subscribeFileOpening,getOpeningSnapshot,()=>0);return count?createPortal(<div className="zonyx-opening" role="status" aria-live="polite" aria-busy="true"><div><img src={waitImage} alt="" draggable={false}/><p>Ouverture en cours. Patientez.</p></div></div>,document.body):null;}
