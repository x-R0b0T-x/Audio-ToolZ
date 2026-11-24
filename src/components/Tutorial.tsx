import {useCallback,useEffect,useRef,useState,type MouseEvent} from 'react';
import {audioEngine} from '../audio/engine';
import {fadeOutDecodedLoops} from '../audio/bufferLoop.mjs';
import {NeonWave} from '../features/q7m4n2/NeonWave';
import musicUrl from '../medias/ATZ.ogg?url';
import img1 from '../medias/01.png?url';
import img2 from '../medias/02.png?url';
import img3 from '../medias/03.png?url';
import img4 from '../medias/04.png?url';
import img5 from '../medias/05.png?url';
import './tutorial.css';

export const TUTORIAL_EVENT='atz:show-tutorial';
const KEY='atz-tutorial-hidden';
const FADE_SECONDS=1.4;
type Item=[string,string];
type Section={heading?:string;items:Item[]};
type Links={heading:string;text:string;items:{label:string;href:string}[]};
type Step={image:string;alt:string;title:string;intro:string[];sections?:Section[];links?:Links;outro?:string};
const STEPS:Step[]=[
 {image:img1,alt:"ATZ, le robot mascotte, vous salue",title:"Bienvenue dans Audio ToolZ",
  intro:["Salut, je suis ATZ, votre compagnon dans Audio ToolZ ! Je suis là pour vous accompagner.","Léger, rapide, entièrement en français et portable : pas d’installation, et tous les traitements se font sur votre machine. Vos fichiers ne quittent jamais votre ordinateur.","Que vous prépariez un sample, nettoyiez une prise ou finalisiez un mix, je vous montre les outils à votre rythme. Essayez, écoutez : je vous guide pas à pas."],
  outro:"Prêt ? Suivez-moi !"},
 {image:img2,alt:"ATZ règle des boutons",title:"Un atelier complet, pensé pour la précision",
  intro:["Ici, c’est mon coin préféré : tout se règle, et tout s’écoute en direct pendant la lecture, avant même d’appliquer l’effet."],
  sections:[
   {heading:"Précision et boucles",items:[
    ["Édition sur forme d’onde :","sélection, couper / copier / coller, rognage, silence, mixage au collage (crossfade) et annuler / rétablir."],
    ["Zoom très fort :","plongez dans la forme d’onde pour caler chaque coupe avec précision, puis revenez à la vue totale en un clic."],
    ["Boucles et samples :","bouclez un passage, jouez-le à l’envers, découpez et préparez vos échantillons."]]},
   {heading:"Rythme",items:[
    ["Détection du BPM :","repères de kicks, grille de tempo et aimantation des sélections pour couper pile sur le temps."]]},
   {heading:"Son et effets",items:[
    ["Z-Égaliseur :","je vous aide à équilibrer le son avec sept bandes : fréquence, gain, largeur Q et formes de filtre, avec spectre d’entrée et courbe de réponse."],
    ["Z-Limit/Comp :","contrôlez la dynamique en modes COMP et LIMIT, avec enveloppe, plafond et réduction de gain visibles."],
    ["Z-Delay :","ajoutez des échos calés sur le tempo en Mono, Stéréo ou Ping-pong, avec répétitions et panoramique."],
    ["Z-Pitcher :","modifiez la vitesse ou la hauteur du passage. Je vous conseille de comparer le résultat avant de valider."],
    ["Z-Fondus :","adoucissez le début ou la fin d’un passage avec un fondu linéaire, exponentiel ou en S."],
    ["Z-Reverbe :","donnez de l’espace au son avec le signal Direct, les premières réflexions et la traîne de réverbération."],
    ["Réduction de bruit spectrale :","pour nettoyer une prise."],
    ["Oscilloscope, spectre et forme d’onde colorée :","pour voir ce que vous entendez."]]}
  ]},
 {image:img3,alt:"ATZ se gratte la tête, l’air confus",title:"Pas de panique !",
  intro:["Une fausse manip, ça arrive même aux pros. Prenez votre temps : vous pouvez essayer un réglage, l’écouter et revenir en arrière. Je vous accompagne, un réglage à la fois."],
  sections:[{items:[
   ["Annuler / Rétablir (Ctrl+Z / Ctrl+Y) :","revenez en arrière pas à pas, puis revenez en avant si vous changez d’avis."],
   ["Votre fichier d’origine reste intact :","vous travaillez sur une copie en mémoire, l’original n’est pas modifié pendant que vous éditez."],
   ["Préécoute avant de valider :","réglez un effet en écoutant le résultat en direct, sans rien appliquer tant que vous n’êtes pas satisfait."],
   ["Mon petit conseil :","pensez à exporter votre travail avant de fermer le logiciel pour conserver le résultat."]]}],
  outro:"Pas de stress : je vous laisse explorer à votre rythme."},
 {image:img4,alt:"ATZ lève les pouces, très content",title:"Sauvegardez dans la qualité de votre choix",
  intro:["Les bons réglages sont trouvés ? Parfait ! Je vous accompagne pour l’export, et vous gardez le choix de la qualité."],
  sections:[
   {heading:"À l’ouverture",items:[
    ["Beaucoup de formats pris en charge :","MP3, FLAC, WAV (PCM), AAC, ALAC, Vorbis… selon vos fichiers et leurs conteneurs."]]},
   {heading:"À l’export",items:[
    ["WAV :","PCM 16 bits, PCM 24 bits ou flottant 32 bits."],
    ["MP3 :","128, 192, 256 ou 320 kbit/s."],
    ["FLAC :","compression sans perte, niveaux 0, 2 ou 5."],
    ["OGG Vorbis :","qualité de 1 à 10."]]},
   {heading:"Et pour aller plus loin",items:[
    ["Traitement par lots :","appliquez les mêmes réglages à toute une série de fichiers."],
    ["Mixes et fichiers .cue :","assemblez des pistes, importez ou exportez un .cue, détectez les silences (Auto-Cue) et découpez en WAV."],
    ["Enregistrement :","capturez directement depuis votre micro ou votre carte son."]]}
  ]},
 {image:img5,alt:"ATZ vous montre du doigt en souriant",title:"À vous de jouer !",
  intro:["Je vous ai montré les principaux outils. Maintenant, à vous de jouer !"],
  sections:[{items:[
   ["Ouvrir un fichier audio :","Ctrl+O, ou créez un document vierge avec Ctrl+N."],
   ["Sélectionnez, bouclez, écoutez :","puis ouvrez un effet depuis le menu Effets et réglez-le en direct."],
   ["Besoin de me retrouver ?","Outils, Paramètres, puis « Afficher le didacticiel »."]]}],
  links:{heading:"Un dernier mot d’ATZ",text:"Si Audio ToolZ vous plaît, retrouvez-moi avec la communauté sur Telegram pour suivre les nouveautés. Une étoile sur GitHub m’aide aussi beaucoup ! Vous pouvez également soutenir le projet par un don via PayPal.",items:[{label:"Telegram",href:"https://t.me/Audio_ToolZ"},{label:"Github",href:"https://github.com/x-R0b0T-x/Audio-ToolZ"},{label:"Paypal",href:"https://www.paypal.com/ncp/payment/GAUJE54VM28T8"}]},
  outro:"Bon son, et à très vite ! — ATZ"}
];
const readHidden=()=>{try{return window.localStorage.getItem(KEY)==='1';}catch{return false;}};
const writeHidden=(hidden:boolean)=>{try{if(hidden)window.localStorage.setItem(KEY,'1');else window.localStorage.removeItem(KEY);}catch{/* stockage indisponible */}};
const openExternal=(event:MouseEvent<HTMLAnchorElement>)=>{
 const bridge=(window as unknown as {__TAURI_INTERNALS__?:{invoke:(command:string,args:Record<string,unknown>)=>Promise<unknown>}}).__TAURI_INTERNALS__;
 if(!bridge)return;
 event.preventDefault();
 void bridge.invoke('open_community_url',{url:event.currentTarget.href}).catch(()=>{});
};

export function Tutorial(){
 const [open,setOpen]=useState(()=>!readHidden()),[step,setStep]=useState(0),[skip,setSkip]=useState(readHidden),[closing,setClosing]=useState(false);
 const dialog=useRef<HTMLDivElement>(null),skipRef=useRef(skip),closingRef=useRef(false),timer=useRef(0),samples=useRef<Float32Array|null>(null),pulse=useRef(0);
 skipRef.current=skip;
 const close=useCallback(()=>{
  if(closingRef.current)return;
  writeHidden(skipRef.current);
  closingRef.current=true;setClosing(true);
  fadeOutDecodedLoops(FADE_SECONDS);
  timer.current=window.setTimeout(()=>{closingRef.current=false;setClosing(false);setOpen(false);},FADE_SECONDS*1000+60);
 },[]);
 useEffect(()=>{
  const show=()=>{window.clearTimeout(timer.current);closingRef.current=false;setClosing(false);setSkip(readHidden());setStep(0);setOpen(true);};
  window.addEventListener(TUTORIAL_EVENT,show);
  return()=>{window.removeEventListener(TUTORIAL_EVENT,show);window.clearTimeout(timer.current);};
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
    const end=await audioEngine.playAuxiliaryLoop(await response.arrayBuffer(),{signal:controller.signal,onWaveform:value=>{samples.current=value;},onPulse:value=>{pulse.current=value;}});
    if(controller.signal.aborted)end();else stop=end;
   }catch{/* nouvel essai au prochain clic */}finally{starting=false;}
  };
  const retry=()=>{void start();};
  void start();
  window.addEventListener('pointerdown',retry,true);
  return()=>{controller.abort();window.removeEventListener('pointerdown',retry,true);stop?.();stop=undefined;samples.current=null;pulse.current=0;};
 },[open]);
 useEffect(()=>{
  if(!open)return;
  const previous=document.activeElement,root=document.getElementById('root'),wasInert=root?.inert??false;
  if(root)root.inert=true;
  dialog.current?.focus({preventScroll:true});
  const key=(e:KeyboardEvent)=>{
   e.stopPropagation();
   if(closingRef.current)return;
   if(e.key==='Escape'){e.preventDefault();close();}
   else if(e.key==='ArrowRight'){e.preventDefault();setStep(s=>Math.min(STEPS.length-1,s+1));}
   else if(e.key==='ArrowLeft'){e.preventDefault();setStep(s=>Math.max(0,s-1));}
   else if(e.key==='Tab'){
    e.preventDefault();
    const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input,a[href]')??[]);
    if(items.length){const i=items.indexOf(document.activeElement as HTMLElement);items[i<0?(e.shiftKey?items.length-1:0):(i+(e.shiftKey?-1:1)+items.length)%items.length].focus();}
   }
  };
  window.addEventListener('keydown',key,true);
  return()=>{window.removeEventListener('keydown',key,true);if(root)root.inert=wasInert;if(previous instanceof HTMLElement&&previous.isConnected)previous.focus();};
 },[open,close]);
 if(!open)return null;
 const current=STEPS[step],last=step===STEPS.length-1;
 return <div className={`atz-tuto-backdrop${closing?' is-closing':''}`}>
  <NeonWave samples={samples} pulse={pulse}/>
  <div ref={dialog} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="atz-tuto-title" className="atz-tuto">
   <header className="atz-tuto-head">
    <h2 id="atz-tuto-title"><span className="atz-tuto-w">Audio </span><span className="atz-tuto-g">Tool</span><span className="atz-tuto-v">Z</span></h2>
    <button type="button" className="atz-tuto-close" aria-label="Fermer le guide d’accueil" onClick={close}>×</button>
   </header>
   <div className="atz-tuto-main">
    <div className="atz-tuto-art"><img key={step} src={current.image} alt={current.alt} draggable={false}/></div>
    <div className="atz-tuto-copy" key={step} aria-live="polite" tabIndex={0}>
     <h3>{current.title}</h3>
     {current.intro.map(line=><p key={line}>{line}</p>)}
     {current.sections?.map((section,index)=><section key={section.heading??index}>
      {section.heading&&<h4>{section.heading}</h4>}
      <ul>{section.items.map(([label,text])=><li key={label}><strong>{label}</strong> {text}</li>)}</ul>
     </section>)}
     {current.links&&<section>
      <h4>{current.links.heading}</h4>
      <p>{current.links.text}</p>
      <div className="atz-tuto-links">{current.links.items.map(link=><a key={link.href} className="atz-tuto-link" href={link.href} target="_blank" rel="noopener noreferrer" onClick={openExternal}>{link.label}</a>)}</div>
     </section>}
     {current.outro&&<p className="atz-tuto-outro">{current.outro}</p>}
    </div>
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
