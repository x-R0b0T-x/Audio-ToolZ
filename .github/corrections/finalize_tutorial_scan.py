import json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!='v.1.7-dev':raise RuntimeError('Wrong branch')
files={}
files['src/components/scanPresentation.mjs']="export const advanceScanScroll=(position,target,elapsed)=>Math.min(target,position+48*Math.max(0,Math.min(elapsed,100))/1000);\nexport const scanVerdict=(audioOk,processingMs,durationMs)=>!audioOk||!Number.isFinite(processingMs)||processingMs<0||!Number.isFinite(durationMs)||durationMs<=0?'error':processingMs>durationMs?'warning':'success';\n"
files['src/components/scanPresentation.d.mts']="export function advanceScanScroll(position:number,target:number,elapsed:number):number;\nexport function scanVerdict(audioOk:boolean,processingMs:number,durationMs:number):'error'|'warning'|'success';\n"
files['src/components/ConfigurationScan.tsx']='''import {useEffect,useRef,useState} from 'react';
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
 const viewport=useRef<HTMLDivElement>(null);
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
  const node=viewport.current;if(!node)return;let frame=0,last:number|null=null;
  const tick=(now:number)=>{const target=Math.max(0,node.scrollHeight-node.clientHeight);if(matchMedia('(prefers-reduced-motion: reduce)').matches){node.scrollTo({top:target,behavior:'auto'});return;}const elapsed=last===null?0:now-last;last=now;node.scrollTop=advanceScanScroll(node.scrollTop,target,elapsed);if(target-node.scrollTop>.5)frame=requestAnimationFrame(tick);else node.scrollTop=target;};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[rows,finished]);
 const result=verdict==='success'?'Bravo, vous pouvez utiliser Audio ToolZ sans problème.':verdict==='warning'?'Attention, votre configuration risque de faire ramer le logiciel.':'Attention, le fonctionnement d’Audio ToolZ n’a pas pu être vérifié.';
 return <><div className="zonyx-config-frame"><p className="zonyx-config-private">Vérification locale : aucun fichier personnel n’est analysé et aucune information n’est envoyée.</p><div className="zonyx-config-status" role="status" aria-live="polite">{!finished?<><span>Vérifiant tout d’abord votre configuration</span><span className="zonyx-scan-dots" aria-hidden="true"><span>.</span><span>.</span><span>.</span></span></>:phase}</div><p className="zonyx-config-phase">{!finished?phase:'Vous pouvez consulter les résultats, puis cliquer sur Suivant.'}</p><div ref={viewport} className="zonyx-config-list" tabIndex={0} aria-label="Résultats de la vérification de configuration" aria-busy={!finished}>{rows.map((row,i)=><section key={i} data-state={row.state}><h4>{row.title}</h4>{row.lines.map((line,j)=><p key={j}>{line}</p>)}</section>)}</div></div>{finished&&host&&createPortal(<div className="zonyx-config-result" data-verdict={verdict} role="status" aria-live="polite"><p>{result}</p>{verdict==='error'&&<small>{detail}</small>}{verdict==='warning'&&<small>Le test de traitement a pris plus de temps que la durée du son testé. La charge actuelle de votre PC peut influencer ce résultat.</small>}</div>,host)}</>;
}
'''
files['src/components/configurationScan.css']='''.zonyx-config-frame{border:1px solid #a15eff;border-radius:10px;padding:14px;background:#171021;box-shadow:0 0 12px #a15eff22;min-width:0;display:flex;flex-direction:column;flex:1;min-height:0}
.zonyx-tuto .zonyx-config-private{font-size:11px;color:white!important;opacity:.8;margin:0 0 10px}
.zonyx-config-status{color:#39ff14;font:600 13px system-ui;margin-bottom:6px;overflow-wrap:anywhere}
.zonyx-tuto .zonyx-config-phase{font-size:11px;margin:0 0 8px;color:white!important}
.zonyx-scan-dots{display:inline-block;width:1.4em;white-space:nowrap}.zonyx-scan-dots>span{opacity:0;animation:zonyx-scan-dot 1.2s steps(1,end) infinite}.zonyx-scan-dots>span:nth-child(2){animation-delay:.2s}.zonyx-scan-dots>span:nth-child(3){animation-delay:.4s}@keyframes zonyx-scan-dot{0%,75%,100%{opacity:0}25%,74%{opacity:1}}
.zonyx-config-list{flex:1;min-height:0;overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#39ff14 #241733;scrollbar-width:thin;padding:0 10px 20px 0;scroll-behavior:auto}
.zonyx-config-list::-webkit-scrollbar{width:9px}.zonyx-config-list::-webkit-scrollbar-track{background:#241733;border-radius:8px}.zonyx-config-list::-webkit-scrollbar-thumb{background:#39ff14;border:1px solid #b8ffaa;border-radius:8px;box-shadow:inset 0 0 5px #39ff14}
.zonyx-config-list>section{border-bottom:1px solid #bd93f933;padding:10px 0}
.zonyx-tuto .zonyx-config-list h4{color:#bd93f9!important;margin:0 0 6px;font-weight:700}.zonyx-tuto .zonyx-config-list p{color:white!important;margin:4px 0;font-size:12px;overflow-wrap:anywhere}
.zonyx-tuto .zonyx-config-list [data-state=ok] h4{color:#39ff14!important}.zonyx-tuto .zonyx-config-list :is([data-state=error],[data-state=warning]) h4{color:#ff3b50!important}
.zonyx-tuto-main:has(.zonyx-config-frame) .zonyx-tuto-copy{display:flex;flex-direction:column;overflow:hidden;min-height:0}.zonyx-tuto-main:has(.zonyx-config-frame) .zonyx-tuto-copy>h3{flex:none}
.zonyx-tuto-main:has(.zonyx-config-frame) .zonyx-tuto-art{display:flex;flex-direction:column;justify-content:center;gap:12px;min-height:0;box-sizing:border-box}.zonyx-tuto-main:has(.zonyx-config-frame) .zonyx-tuto-art>img{max-height:min(28vh,240px);max-width:100%;flex:0 1 auto;min-height:0}
.zonyx-tuto .zonyx-tuto-art .zonyx-config-result{width:100%;flex:none;text-align:center;overflow-wrap:anywhere;box-sizing:border-box;padding:0 6px}.zonyx-tuto .zonyx-tuto-art .zonyx-config-result>p{margin:0;color:#39ff14!important;font-size:clamp(18px,2vw,26px);line-height:1.25;font-weight:700;text-shadow:0 0 7px #39ff1466;white-space:normal}
.zonyx-tuto .zonyx-tuto-art .zonyx-config-result:not([data-verdict=success])>p{color:#ff3b50!important;text-shadow:0 0 6px #ff3b5033}.zonyx-config-result>small{display:block;margin-top:8px;color:white;font-size:11px;line-height:1.35}
@media(max-width:720px){.zonyx-tuto-main:has(.zonyx-config-frame){grid-template-columns:1fr;grid-template-rows:minmax(0,45%) minmax(0,55%)}.zonyx-tuto-main:has(.zonyx-config-frame) .zonyx-tuto-art{padding:6px 16px;gap:6px}.zonyx-tuto-main:has(.zonyx-config-frame) .zonyx-tuto-art>img{max-height:14vh}.zonyx-tuto .zonyx-tuto-art .zonyx-config-result>p{font-size:18px}.zonyx-config-result>small{font-size:10px;margin-top:3px}}
@media(prefers-reduced-motion:reduce){.zonyx-scan-dots>span{animation:none;opacity:1}}
'''
p=ROOT/'src/components/Tutorial.tsx';t=p.read_text(encoding='utf-8');old="intro:['D’abord, nous allons examiner votre configuration et vérifier les éléments nécessaires au fonctionnement d’Audio ToolZ sur votre machine.']"
if old in t:t=t.replace(old,'intro:[]',1)
if 'image:scanner' not in t or 'step===1&&<ConfigurationScan/>' not in t:raise RuntimeError('Scan must remain page two without replacing existing pages')
files['src/components/Tutorial.tsx']=t
p=ROOT/'src/components/finalLot.test.mjs';t=p.read_text(encoding='utf-8').replace("scan.includes('finished&&success')","scan.includes('finished&&host')");files['src/components/finalLot.test.mjs']=t
files['src/components/scanPresentation.test.mjs']='''import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {advanceScanScroll,scanVerdict} from './scanPresentation.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('slow scrolling is monotonic bounded and reaches the end',()=>{let p=0;for(let i=0;i<1000;i++){const next=advanceScanScroll(p,300,16);assert.ok(next>=p&&next<=300);p=next;}assert.equal(p,300);assert.equal(advanceScanScroll(0,300,1000),4.8);assert.equal(advanceScanScroll(0,300,-1),0);});
test('warning is based on measured processing not missing hardware names',()=>{assert.equal(scanVerdict(true,300,1000),'success');assert.equal(scanVerdict(true,1000,1000),'success');assert.equal(scanVerdict(true,1200,1000),'warning');for(const ms of [NaN,Infinity,-1])assert.equal(scanVerdict(true,ms,1000),'error');assert.equal(scanVerdict(false,100,1000),'error');});
test('outcome is below robot outside the scrolling results and dots stop on completion',()=>{const code=read('./ConfigurationScan.tsx'),css=read('./configurationScan.css');assert.ok(code.includes("('.zonyx-tuto-art')"));assert.ok(code.includes('createPortal'));assert.ok(code.includes('finished&&host'));assert.ok(code.includes('!finished?<>'));assert.ok(code.includes('Vérifiant tout d’abord votre configuration'));assert.ok(code.includes('Bravo, vous pouvez utiliser Audio ToolZ sans problème.'));assert.ok(code.includes('Attention, votre configuration risque de faire ramer le logiciel.'));assert.ok(css.includes('padding:0 10px 20px 0'));assert.ok(css.includes('white-space:normal'));});
'''
for name,text in files.items():p=ROOT/name;p.parent.mkdir(parents=True,exist_ok=True);p.write_text(text,encoding='utf-8')
p=ROOT/'.github/diagnostics/final-lot.json';report=json.loads(p.read_text(encoding='utf-8'));report['files']=sorted(set(report['files'])|set(files));report['validation']='pending';report['releaseTarget']='v1.7 official after validation and publication approval';report['scanPerformanceRule']='Indicative comparison of processing time with one second of audio; not a hardware minimum or guarantee';report['manualReview']+=['slow scan scrolling reaches last line','large green or red outcome below robot at small window sizes','animated dots stop on completion'];p.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'tutorialFinalization':'applied','files':sorted(files),'validation':'pending'},ensure_ascii=False))
