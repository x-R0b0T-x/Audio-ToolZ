import {useEffect,useRef,useState} from 'react';
import {createPortal} from 'react-dom';
import {audioEngine} from '../audio/engine';
import {renderSignalsmith} from '../audio/signalsmithPitcher';
import {advanceScanScroll,scanVerdict} from './scanPresentation.mjs';
import './configurationScan.css';
type Row={title:string;lines:string[];state:'info'|'ok'|'unknown'|'error'|'warning'};
const headings:Record<string,string>={Nom:'Nom',Fabricant:'Fabricant',Modele:'Modèle',Coeurs:'Cœurs',ProcesseursLogiques:'Processeurs logiques',FrequenceAnnonceeGHz:'Fréquence annoncée (GHz)',RAMInstalleeGo:'RAM installée (Go)',MemoireDedieeGo:'Mémoire vidéo dédiée (Go)',MemoirePartageableGo:'Mémoire système partageable (Go)',Interface:'Interface'};
function lines(value:unknown):string[]{const entries=Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];return entries.flatMap(entry=>entry&&typeof entry==='object'?Object.entries(entry).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='').map(([k,v])=>`${headings[k]??k} : ${String(v)}`):[]);}
export function ConfigurationScan(){
 const [rows,setRows]=useState<Row[]>([]),[phase,setPhase]=useState('Initialisation'),[finished,setFinished]=useState(false),[verdict,setVerdict]=useState<'pending'|'success'|'warning'|'error'>('pending'),[detail,setDetail]=useState(''),[host,setHost]=useState<HTMLElement|null>(null);
 const viewport=useRef<HTMLDivElement>(null),follow=useRef(true);
 useEffect(()=>{setHost(viewport.current?.closest('.zonyx-tuto')?.querySelector<HTMLElement>('.zonyx-tuto-art')??null);},[]);
 useEffect(()=>{
  const aborter=new AbortController();
  const append=(r:Row)=>{if(!aborter.signal.aborted)setRows(old=>[...old,r]);};
  const scan=async()=>{
   const bridge=window.__TAURI_INTERNALS__;
   if(!bridge){append({title:'Configuration du PC',lines:['La détection matérielle est disponible dans la version Windows.'],state:'unknown'});setVerdict('error');setDetail('La vérification de configuration est indisponible dans cette version.');setPhase('Vérification indisponible');setFinished(true);return;}
   for(const [section,title] of [['board','Carte mère'],['cpu','Processeur'],['ram','Mémoire vive'],['gpu','Carte graphique'],['audio','Interfaces audio']]){
    if(aborter.signal.aborted)return;setPhase(`Lecture : ${title}`);
    try{const data=await bridge.invoke('scan_configuration_section',{section});if(aborter.signal.aborted)return;const detected=lines(data);append({title,lines:detected.length?detected:['Information non détectée.'],state:detected.length?'info':'unknown'});}
    catch{append({title,lines:['Information non détectée ou lecture indisponible.'],state:'unknown'});}
   }
   if(aborter.signal.aborted)return;setPhase('Vérification du moteur audio');
   try{
    const devices=await audioEngine.listAudioDevices();if(aborter.signal.aborted)return;
    append({title:'Périphériques disponibles',lines:[...devices.outputs.map(d=>`Sortie${d.deviceId==='default'?' par défaut':''} : ${d.label||'Nom non communiqué'}`),...devices.inputs.map(d=>`Entrée${d.deviceId==='default'?' par défaut':''} : ${d.label||'Nom non communiqué'}`)],state:devices.outputs.length?'info':'unknown'});
    if(!devices.outputs.length)throw Error('Aucune sortie audio accessible n’a été détectée.');
    const silent=[new Float32Array(24000),new Float32Array(24000)];
    const rendered=await renderSignalsmith(silent,48000,1,0,aborter.signal);if(aborter.signal.aborted)return;
    if(rendered.length!==2||rendered.some(c=>c.length!==24000||c.some(v=>!Number.isFinite(v))))throw Error('Le contrôle audio n’a pas produit un résultat valide.');
    append({title:'Moteur audio',lines:['Initialisation et traitement Signalsmith vérifiés, sans lecture sonore.'],state:'ok'});
    setPhase('Mesure indicative du temps de traitement');
    const probe=Array.from({length:2},()=>Float32Array.from({length:48000},(_,i)=>.1*Math.sin(2*Math.PI*440*i/48000)));
    const started=performance.now(),bench=await renderSignalsmith(probe,48000,1,3,aborter.signal),elapsed=performance.now()-started;if(aborter.signal.aborted)return;
    if(bench.length!==2||bench.some(c=>c.length!==48000||c.some(v=>!Number.isFinite(v))))throw Error('La mesure de traitement n’a pas produit un résultat valide.');
    const decision=scanVerdict(true,elapsed,1000);
    append({title:'Temps de traitement indicatif',lines:[`Une seconde d’audio traitée en ${(elapsed/1000).toLocaleString('fr-FR',{maximumFractionDigits:2})} s.`, 'Cette mesure dépend aussi de la charge actuelle du PC ; ce n’est pas une garantie pour tous les effets et fichiers.'],state:decision==='warning'?'warning':'info'});
    setVerdict(decision);setPhase('Vérification terminée');
   }catch(e){if(aborter.signal.aborted)return;const reason=e instanceof Error?e.message:String(e);append({title:'Vérification audio',lines:[reason,'Le fonctionnement audio n’a pas pu être confirmé. Vérifiez votre sortie audio puis réessayez.'],state:'error'});setVerdict('error');setDetail(reason);setPhase('Vérification à compléter');}
   if(!aborter.signal.aborted)setFinished(true);
  };void scan();return()=>aborter.abort();
 },[]);
 useEffect(()=>{
  const node=viewport.current;if(!node)return;
  const leave=()=>{follow.current=false;};
  const atEnd=()=>node.scrollHeight-node.clientHeight-node.scrollTop<4;
  const wheel=(e:WheelEvent)=>{if(e.deltaY<0)leave();};
  const keys=(e:KeyboardEvent)=>{if(['ArrowUp','PageUp','Home'].includes(e.key))leave();};
  const press=(e:PointerEvent)=>{if(e.target===node&&e.offsetX>=node.clientWidth)leave();};
  const scrolled=()=>{if(atEnd())follow.current=true;};
  node.addEventListener('wheel',wheel,{passive:true});node.addEventListener('touchmove',leave,{passive:true});node.addEventListener('keydown',keys);node.addEventListener('pointerdown',press);node.addEventListener('scroll',scrolled,{passive:true});
  return()=>{node.removeEventListener('wheel',wheel);node.removeEventListener('touchmove',leave);node.removeEventListener('keydown',keys);node.removeEventListener('pointerdown',press);node.removeEventListener('scroll',scrolled);};
 },[]);
 useEffect(()=>{
  const node=viewport.current;if(!node)return;let frame=0,last:number|null=null;
  const tick=(now:number)=>{if(!follow.current)return;const target=Math.max(0,node.scrollHeight-node.clientHeight);if(matchMedia('(prefers-reduced-motion: reduce)').matches){node.scrollTo({top:target,behavior:'auto'});return;}const elapsed=last===null?0:now-last;last=now;node.scrollTop=advanceScanScroll(node.scrollTop,target,elapsed);if(target-node.scrollTop>.5)frame=requestAnimationFrame(tick);else node.scrollTop=target;};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[rows,finished]);
 const result=verdict==='success'?'Bravo, vous pouvez utiliser Audio ToolZ sans problème.':verdict==='warning'?'Attention, votre configuration risque de faire ramer le logiciel.':'Attention, le fonctionnement d’Audio ToolZ n’a pas pu être vérifié.';
 return <><div className="zonyx-config-frame"><p className="zonyx-config-private">Vérification locale : aucun fichier personnel n’est analysé et aucune information n’est envoyée.</p><div className="zonyx-config-status" role="status" aria-live="polite">{!finished?<><span>Vérifiant tout d’abord votre configuration</span><span className="zonyx-scan-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></>:phase}</div><p className="zonyx-config-phase">{!finished?phase:'Vous pouvez consulter les résultats, puis cliquer sur Suivant.'}</p><div ref={viewport} className="zonyx-config-list" tabIndex={0} aria-label="Résultats de la vérification de configuration" aria-busy={!finished}>{rows.map((row,i)=><section key={i} data-state={row.state}><h4>{row.title}</h4>{row.lines.map((line,j)=><p key={j}>{line}</p>)}</section>)}</div></div>{finished&&host&&createPortal(<div className="zonyx-config-result" data-verdict={verdict} role="status" aria-live="polite"><p>{result}</p>{verdict==='error'&&<small>{detail}</small>}{verdict==='warning'&&<small>Le test de traitement a pris plus de temps que la durée du son testé. La charge actuelle de votre PC peut influencer ce résultat.</small>}</div>,host)}</>;
}
