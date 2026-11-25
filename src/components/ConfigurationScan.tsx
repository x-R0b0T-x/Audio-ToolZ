import {useEffect,useRef,useState} from 'react';
import {audioEngine} from '../audio/engine';
import {renderSignalsmith} from '../audio/signalsmithPitcher';
import './configurationScan.css';
type Row={title:string;lines:string[];state:'info'|'ok'|'unknown'|'error'};
const headings:Record<string,string>={Nom:'Nom',Fabricant:'Fabricant',Modele:'Modèle',Coeurs:'Cœurs',ProcesseursLogiques:'Processeurs logiques',FrequenceAnnonceeGHz:'Fréquence annoncée (GHz)',RAMInstalleeGo:'RAM installée (Go)',MemoireDedieeGo:'Mémoire vidéo dédiée (Go)',MemoirePartageableGo:'Mémoire système partageable (Go)',Interface:'Interface'};
function lines(value:unknown):string[]{const entries=Array.isArray(value)?value:value&&typeof value==='object'?[value]:[];return entries.flatMap(entry=>entry&&typeof entry==='object'?Object.entries(entry).filter(([,v])=>v!==null&&v!==undefined&&String(v).trim()!=='').map(([k,v])=>`${headings[k]??k} : ${String(v)}`):[]);}
export function ConfigurationScan(){
 const [rows,setRows]=useState<Row[]>([]),[phase,setPhase]=useState('Initialisation…'),[finished,setFinished]=useState(false),[success,setSuccess]=useState(false);
 const viewport=useRef<HTMLDivElement>(null),controller=useRef<AbortController|null>(null);
 useEffect(()=>{
  const aborter=new AbortController();controller.current=aborter;
  const append=(r:Row)=>{if(!aborter.signal.aborted)setRows(old=>[...old,r]);};
  const scan=async()=>{
   const bridge=window.__TAURI_INTERNALS__;
   if(!bridge){append({title:'Configuration du PC',lines:['La détection matérielle est disponible dans la version Windows.'],state:'unknown'});setPhase('Vérification indisponible dans cette version');setFinished(true);return;}
   for(const [section,title] of [['board','Carte mère'],['cpu','Processeur'],['ram','Mémoire vive'],['gpu','Carte graphique'],['audio','Interfaces audio']]){
    if(aborter.signal.aborted)return;setPhase(`Lecture : ${title}…`);
    try{const data=await bridge.invoke('scan_configuration_section',{section});if(aborter.signal.aborted)return;const detected=lines(data);append({title,lines:detected.length?detected:['Information non détectée.'],state:detected.length?'info':'unknown'});}
    catch{append({title,lines:['Information non détectée ou lecture indisponible.'],state:'unknown'});}
   }
   if(aborter.signal.aborted)return;setPhase('Vérification du moteur audio…');
   try{
    const devices=await audioEngine.listAudioDevices();if(aborter.signal.aborted)return;
    append({title:'Périphériques disponibles',lines:[...devices.outputs.map(d=>`Sortie${d.deviceId==='default'?' par défaut':''} : ${d.label}`),...devices.inputs.map(d=>`Entrée${d.deviceId==='default'?' par défaut':''} : ${d.label}`)],state:devices.outputs.length?'info':'unknown'});
    if(!devices.outputs.length)throw Error('Aucune sortie audio accessible n’a été détectée.');
    const silent=[new Float32Array(24000),new Float32Array(24000)];
    const rendered=await renderSignalsmith(silent,48000,1,0,aborter.signal);if(aborter.signal.aborted)return;
    if(rendered.length!==2||rendered.some(c=>c.length!==24000||c.some(v=>!Number.isFinite(v))))throw Error('Le contrôle audio n’a pas produit un résultat valide.');
    append({title:'Moteur audio',lines:['Initialisation et traitement Signalsmith vérifiés, sans lecture sonore.'],state:'ok'});setSuccess(true);setPhase('Vérification terminée');
   }catch(e){if(aborter.signal.aborted)return;append({title:'Vérification audio',lines:[String(e),'Le fonctionnement audio n’a pas pu être confirmé. Vérifiez votre sortie audio puis réessayez.'],state:'error'});setPhase('Vérification à compléter');}
   if(!aborter.signal.aborted)setFinished(true);
  };void scan();return()=>aborter.abort();
 },[]);
 useEffect(()=>{const node=viewport.current;if(!node)return;const frame=requestAnimationFrame(()=>node.scrollTo({top:node.scrollHeight,behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'}));return()=>cancelAnimationFrame(frame);},[rows,finished]);
 return <div className="zonyx-config-frame"><p className="zonyx-config-private">Vérification locale : aucun fichier personnel n’est analysé et aucune information n’est envoyée.</p><div className="zonyx-config-status" role="status" aria-live="polite">{phase}</div><div ref={viewport} className="zonyx-config-list" tabIndex={0} aria-label="Résultats de la vérification de configuration" aria-busy={!finished}>{rows.map((row,i)=><section key={i} data-state={row.state}><h4>{row.title}</h4>{row.lines.map((line,j)=><p key={j}>{line}</p>)}</section>)}{finished&&success&&<div className="zonyx-config-success"><h4>Bravo</h4><p>Vous pouvez utiliser Audio ToolZ sans problème.</p><small>Les contrôles de démarrage ont réussi. Les performances dépendent des fichiers et des réglages utilisés.</small></div>}</div></div>;
}
