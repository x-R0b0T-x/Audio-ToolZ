import {useCallback,useEffect,useRef,useState} from 'react';
import {audioEngine} from '../audio/engine';
import musicUrl from '../medias/ATZ.ogg?url';
import img1 from '../medias/01.png?url';
import img2 from '../medias/02.png?url';
import img3 from '../medias/03.png?url';
import img4 from '../medias/04.png?url';
import img5 from '../medias/05.png?url';
import './tutorial.css';

export const TUTORIAL_EVENT='atz:show-tutorial';
const KEY='atz-tutorial-hidden';
type Step={image:string;alt:string;title:string;lines:string[];list?:string[]};
const STEPS:Step[]=[
 {image:img1,alt:"ATX, le robot mascotte, vous salue",title:"Bienvenue dans Audio ToolZ",lines:["Salut, je suis ATX ! Je suis là pour vous présenter et vous accompagner dans ce merveilleux logiciel d’édition audio.","Suivez-moi, on fait le tour ensemble."]},
 {image:img2,alt:"ATX règle des boutons",title:"Des réglages et des effets en pagaille",lines:["Audio ToolZ met énormément d’outils à portée de main :"],list:["Fondus, vitesse et hauteur (pitch)","Égaliseur paramétrique à 7 bandes","Limiteur / Compresseur","Delay musical, calé sur le tempo","Détection du BPM et grille des kicks","Assemblage de fichiers et fichiers .cue","Auto-Cue et découpe par repères","Traitement par lots"]},
 {image:img3,alt:"ATX se gratte la tête, l’air confus",title:"Pas de panique !",lines:["Une fausse manipulation arrive à tout le monde. Annuler (Ctrl+Z) et Rétablir (Ctrl+Y) vous permettent de revenir en arrière à tout moment.","Vos retouches ne s’appliquent qu’au document ouvert dans le logiciel : vous ne pouvez ni perdre votre travail ni abîmer votre fichier d’origine en cours de route."]},
 {image:img4,alt:"ATX lève les pouces, très content",title:"Sauvegardez en qualité choisie",lines:["Quand vous avez trouvé les bons réglages, exportez votre travail dans le format de votre choix : WAV, MP3, FLAC ou OGG.","Vous choisissez aussi la qualité qui convient à votre usage."]},
 {image:img5,alt:"ATX vous montre du doigt en souriant",title:"À vous de jouer !",lines:["Vous savez maintenant l’essentiel. Ouvrez un fichier audio ou créez un document vierge, et amusez-vous !","Vous pourrez revoir cette présentation à tout moment : Outils, Paramètres, puis « Afficher le didacticiel »."]}
];
const readHidden=()=>{try{return window.localStorage.getItem(KEY)==='1';}catch{return false;}};
const writeHidden=(hidden:boolean)=>{try{if(hidden)window.localStorage.setItem(KEY,'1');else window.localStorage.removeItem(KEY);}catch{/* stockage indisponible */}};

export function Tutorial(){
 const [open,setOpen]=useState(()=>!readHidden()),[step,setStep]=useState(0),[skip,setSkip]=useState(readHidden);
 const dialog=useRef<HTMLDivElement>(null),skipRef=useRef(skip);skipRef.current=skip;
 const close=useCallback(()=>{writeHidden(skipRef.current);setOpen(false);},[]);
 useEffect(()=>{
  const show=()=>{setSkip(readHidden());setStep(0);setOpen(true);};
  window.addEventListener(TUTORIAL_EVENT,show);
  return()=>window.removeEventListener(TUTORIAL_EVENT,show);
 },[]);
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  let stop:(()=>void)|undefined,starting=false;
  const start=async()=>{
   if(starting||stop||controller.signal.aborted)return;
   starting=true;
   try{
    const response=await fetch(musicUrl,{signal:controller.signal});
    if(!response.ok)throw new Error('OGG unavailable');
    const end=await audioEngine.playAuxiliaryLoop(await response.arrayBuffer(),{signal:controller.signal,onWaveform:()=>{},onPulse:()=>{}});
    if(controller.signal.aborted)end();else stop=end;
   }catch{/* nouvel essai au prochain clic */}finally{starting=false;}
  };
  const retry=()=>{void start();};
  void start();
  window.addEventListener('pointerdown',retry,true);
  return()=>{controller.abort();window.removeEventListener('pointerdown',retry,true);stop?.();stop=undefined;};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement,root=document.getElementById('root'),wasInert=root?.inert??false;
  if(root)root.inert=true;
  dialog.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{
   e.stopPropagation();
   if(e.key==='Escape'){e.preventDefault();close();}
   else if(e.key==='ArrowRight'){e.preventDefault();setStep(s=>Math.min(STEPS.length-1,s+1));}
   else if(e.key==='ArrowLeft'){e.preventDefault();setStep(s=>Math.max(0,s-1));}
   else if(e.key==='Tab'){
    e.preventDefault();
    const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input')??[]);
    if(items.length){const i=items.indexOf(document.activeElement as HTMLElement);items[i<0?(e.shiftKey?items.length-1:0):(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
   }
  };
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(root)root.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[open,close]);
 if(!open)return null;
 const current=STEPS[step],last=step===STEPS.length-1;
 return <div className="atz-tuto-backdrop">
  <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="atz-tuto-title" className="atz-tuto">
   <header className="atz-tuto-head">
    <h2 id="atz-tuto-title"><span className="atz-tuto-w">Audio </span><span className="atz-tuto-g">Tool</span><span className="atz-tuto-v">Z</span><small>Présentation</small></h2>
    <button type="button" className="atz-tuto-close" aria-label="Fermer la présentation" onClick={close}>×</button>
   </header>
   <div className="atz-tuto-art"><img key={step} src={current.image} alt={current.alt} draggable={false}/></div>
   <div className="atz-tuto-copy" aria-live="polite">
    <h3>{current.title}</h3>
    {current.lines.map(line=><p key={line}>{line}</p>)}
    {current.list&&<ul>{current.list.map(item=><li key={item}>{item}</li>)}</ul>}
   </div>
   <footer className="atz-tuto-foot">
    <label className="atz-tuto-skip"><input type="checkbox" checked={skip} onChange={e=>setSkip(e.target.checked)}/>Ne plus afficher au démarrage</label>
    <div className="atz-tuto-dots" role="img" aria-label={`Étape ${step+1} sur ${STEPS.length}`}>{STEPS.map((_,i)=><span key={i} data-active={i===step?'true':undefined}/>)}</div>
    <div className="atz-tuto-nav">
     <button type="button" disabled={step===0} onClick={()=>setStep(s=>Math.max(0,s-1))}>Précédent</button>
     <button type="button" className="atz-tuto-primary" onClick={()=>{if(last)close();else setStep(s=>s+1);}}>{last?'Terminer':'Suivant'}</button>
    </div>
   </footer>
  </div>
 </div>;
}
