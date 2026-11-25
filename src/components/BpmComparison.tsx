import {useEffect,useRef,useState,type Dispatch,type SetStateAction} from 'react';
import type {AudioDocument} from '../audio/types';
import {analyzeBpm,ENGINES,getBpmEngine,setBpmEngine,requestBpmAnalysis,reportEngine,type BpmEngineId,type BpmReport} from '../audio/bpmCompare';
type Status={docId:string;engine:BpmEngineId;state:'running'|'done'|'error'|'cancelled';report?:BpmReport;error?:string};
const publish=(status:Status)=>window.dispatchEvent(new CustomEvent('audio-toolz:bpm-status',{detail:status}));
export function useBpmComparison(documents:AudioDocument[],setDocuments:Dispatch<SetStateAction<AudioDocument[]>>,toast:(text:string,isError?:boolean)=>void){
 const docs=useRef(documents),previous=useRef(documents),running=useRef<AbortController|null>(null),sequence=useRef(0);docs.current=documents;
 useEffect(()=>{const changed=new Set(documents.filter(d=>{const old=previous.current.find(p=>p.id===d.id);return old&&old.channels!==d.channels&&d.bpmInfo&&reportEngine(d.bpmInfo)!=='builtin';}).map(d=>d.id));previous.current=documents;if(changed.size)setDocuments(current=>current.map(d=>changed.has(d.id)?{...d,bpmInfo:null,showBeatGrid:false,snapToBeats:false}:d));},[documents,setDocuments]);
 useEffect(()=>{
  const changed=()=>{sequence.current++;running.current?.abort();setDocuments(current=>current.map(d=>({...d,bpmInfo:null,showBeatGrid:false,snapToBeats:false})));};
  const request=async(event:Event)=>{const {docId,force}= (event as CustomEvent<{docId:string;force:boolean}>).detail;const doc=docs.current.find(d=>d.id===docId);if(!doc)return;const engine=getBpmEngine();
   if(!force&&doc.bpmInfo&&reportEngine(doc.bpmInfo)===engine){setDocuments(current=>current.map(d=>d.id===doc.id?{...d,showBeatGrid:!d.showBeatGrid}:d));return;}
   running.current?.abort();const controller=new AbortController();running.current=controller;const ticket=++sequence.current;publish({docId,engine,state:'running'});
   try{const report=await analyzeBpm(doc.channels,doc.sampleRate,engine,controller.signal);if(ticket!==sequence.current||getBpmEngine()!==engine)return;const current=docs.current.find(d=>d.id===doc.id);if(!current||current.channels!==doc.channels){publish({docId,engine,state:'cancelled',error:'La piste a été modifiée : relancez l’analyse.'});return;}setDocuments(all=>all.map(d=>d.id===doc.id&&d.channels===doc.channels?{...d,bpmInfo:report,showBeatGrid:true,snapToBeats:true}:d));publish({docId,engine,state:'done',report});toast(`${ENGINES[engine]} : ${report.bpm.toFixed(1)} BPM — ${report.beatSamples.length} battements — ${(report.analysisMs/1000).toFixed(2)} s`);}
   catch(error){if(ticket!==sequence.current)return;if(error instanceof DOMException&&error.name==='AbortError'){publish({docId,engine,state:'cancelled'});return;}const message=error instanceof Error?error.message:String(error);publish({docId,engine,state:'error',error:message});toast(message,true);}
  };
  window.addEventListener('audio-toolz:bpm-engine-changed',changed);window.addEventListener('audio-toolz:bpm-request',request);return()=>{sequence.current++;running.current?.abort();window.removeEventListener('audio-toolz:bpm-engine-changed',changed);window.removeEventListener('audio-toolz:bpm-request',request);};
 },[setDocuments,toast]);
 useEffect(()=>{const cancel=()=>{sequence.current++;running.current?.abort();};window.addEventListener('audio-toolz:bpm-cancel',cancel);return()=>window.removeEventListener('audio-toolz:bpm-cancel',cancel);},[]);
}
export function BpmComparisonSettings({audioDocument}:{audioDocument:AudioDocument|null}){
 const [engine,setEngine]=useState(getBpmEngine),[status,setStatus]=useState<Status|null>(null),[reports,setReports]=useState<Partial<Record<BpmEngineId,BpmReport>>>({});
 useEffect(()=>{setStatus(null);setReports({});},[audioDocument?.id]);
 useEffect(()=>{const listener=(event:Event)=>{const next=(event as CustomEvent<Status>).detail;if(next.docId!==audioDocument?.id)return;setStatus(next);if(next.report)setReports(old=>({...old,[next.engine]:next.report}));};window.addEventListener('audio-toolz:bpm-status',listener);return()=>window.removeEventListener('audio-toolz:bpm-status',listener);},[audioDocument?.id]);
 const busy=status?.state==='running';
 return <section><h3>Détection du tempo — comparaison expérimentale</h3><label htmlFor="bpm-engine-choice">Moteur de l’analyse principale et de la grille</label><select id="bpm-engine-choice" value={engine} onChange={event=>{const value=event.target.value as BpmEngineId;setEngine(value);setBpmEngine(value);setStatus(null);}}>{(Object.keys(ENGINES) as BpmEngineId[]).map(id=><option value={id} key={id}>{ENGINES[id]}{id==='builtin'?' — intégré':' — expérimental'}</option>)}</select>
 <p>Le choix est mémorisé. Changer de moteur efface les anciennes grilles, pas le son. Aucun remplacement silencieux en cas d’erreur.</p><p>{audioDocument?audioDocument.name:'Ouvrez un morceau pour comparer les moteurs.'}</p>
 <button type="button" disabled={!audioDocument||busy} onClick={()=>audioDocument&&requestBpmAnalysis(audioDocument.id,true)}>Réanalyser avec {ENGINES[engine]}</button>{busy&&<button type="button" onClick={()=>{window.dispatchEvent(new Event('audio-toolz:bpm-cancel'));setStatus(null);}}>Annuler l’analyse</button>}
 <p role="status" aria-live="polite">{busy?'Analyse en cours…':status?.error??''}</p>
 <div style={{overflowX:'auto'}}><table><thead><tr><th>Moteur</th><th>BPM global</th><th>Battements</th><th>Durée totale</th></tr></thead><tbody>{(Object.keys(ENGINES) as BpmEngineId[]).map(id=>{const r=reports[id];return <tr key={id}><td>{ENGINES[id]}</td><td>{r?r.bpm.toFixed(2):'Non testé'}</td><td>{r?r.beatSamples.length:'—'}</td><td>{r?`${(r.analysisMs/1000).toFixed(2)} s`:'—'}</td></tr>;})}</tbody></table></div>
 {status?.report&&<details><summary>Version, confiance brute et évolution locale</summary><p>{status.report.engineVersion}. Confiance brute : {status.report.confidenceRaw??'indisponible'} ; les échelles des moteurs ne sont pas comparables.</p><p>Les BPM locaux ci-dessous sont estimés sur cinq intervalles entre battements, pas sur le volume. Ils ne constituent pas encore une segmentation musicale validée.</p><pre style={{maxHeight:160,overflow:'auto'}}>{status.report.trace.filter((_,i)=>i%8===0).map(row=>`${row.seconds.toFixed(2)} s : ${row.bpm.toFixed(2)} BPM`).join('\n')}</pre></details>}
 <p>Cette première build compare l’analyse principale et la grille. Les détecteurs propres aux effets restent inchangés. Les repères Essentia/Aubio sont des battements, pas des kicks détectés. Essentia utilise ici sa plage par défaut, jusqu’à 208 BPM.</p><p>Essentia.js : AGPL-3.0 ; Aubio/aubiojs : GPL-3.0 ou ultérieure. Notices locales embarquées ; sources correspondantes livrées séparément avec la build.</p>
 </section>;
}
