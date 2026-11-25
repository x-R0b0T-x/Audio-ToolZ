import hashlib,json,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!='v.1.7-dev':raise RuntimeError('Wrong branch')
files={}
def read(p):return files[p] if p in files else (ROOT/p).read_text(encoding='utf-8')
def change(p,old,new):
 t=read(p)
 if new in t:return
 if t.count(old)!=1:raise RuntimeError('Unexpected source '+p+' / '+old[:70])
 files[p]=t.replace(old,new,1)
change('src/components/effectStatus.css','opacity 250ms ease-out,visibility 0s 250ms','opacity 1500ms linear,visibility 0s 1500ms')
change('src/components/effectStatus.css','transition:opacity 60ms ease-out,visibility 0s','transition:none')
p='src/components/knobStates.css'
t=read(p).replace('data-zonyx-tick=neighbor]{stroke:#39ff14!important;opacity:.25!important}','data-zonyx-tick=neighbor]{stroke:#39ff14!important;opacity:.65!important;filter:drop-shadow(0 0 3px #39ff14)!important}').replace('data-zonyx-tick=selected]{stroke:#39ff14!important;filter:drop-shadow(0 0 3px #39ff14)!important}','data-zonyx-tick=selected]{stroke:#39ff14!important;filter:drop-shadow(0 0 5px #39ff14) drop-shadow(0 0 8px #39ff1480)!important}')
files[p]=t
files['src/components/finalFeedbackMath.mjs']='''export const labelLight=(fraction,position)=>Math.max(0,Math.min(1,1-Math.abs(fraction-position)/.25));
export const speedPosition=value=>value<=1?(value-.5)*100:50+(value-1)*50;
export const positionSpeed=position=>position<=50?.5+position/100:1+(position-50)/50;
'''
files['src/components/finalFeedbackMath.d.mts']='''export function labelLight(fraction:number,position:number):number;
export function speedPosition(value:number):number;
export function positionSpeed(position:number):number;
'''
files['src/components/PositionLabel.tsx']='''import type {CSSProperties} from 'react';
import {labelLight} from './finalFeedbackMath.mjs';
import './finalFeedback.css';
export function PositionLabel({children,fraction,position}:{children:string;fraction:number;position:number}){return <span className="zonyx-position-label" style={{'--label-light':labelLight(fraction,position)} as CSSProperties}>{children}</span>;}
'''
p='src/components/EffectControls.tsx'
change(p,"import {KnobTicks} from './KnobTicks';","import {KnobTicks} from './KnobTicks';\nimport {PositionLabel} from './PositionLabel';")
change(p,'<div className="zonyx-pan-labels" aria-hidden="true"><span>Gauche</span><span>Droite</span></div>','<div className="zonyx-pan-labels" style={{width:p.small?72:100}} aria-hidden="true"><PositionLabel fraction={fraction} position={0}>Gauche</PositionLabel><PositionLabel fraction={fraction} position={1}>Droite</PositionLabel><PositionLabel fraction={fraction} position={.5}>Centre</PositionLabel></div>')
p='src/components/ReverbModal.tsx'
change(p,"import {EffectPanel} from './EffectPanel';","import {EffectPanel} from './EffectPanel';\nimport {PositionLabel} from './PositionLabel';")
change(p,'<div className="zonyx-rv-stereo-labels"><span>Stéréo</span><span>Mono</span></div>','<div className="zonyx-rv-stereo-labels"><PositionLabel fraction={(100-settings.width/2)/100} position={0}>Stéréo</PositionLabel><PositionLabel fraction={(100-settings.width/2)/100} position={1}>Mono</PositionLabel></div>')
p='src/components/EffectPanel.tsx'
change(p,'[box,setBox]=useState<PanelBox|null>(null);','[box,setBox]=useState<PanelBox|null>(null),[resizing,setResizing]=useState(false);')
change(p,'drag.current={mode,x:e.clientX,y:e.clientY,box:b};','setResizing(mode===\'resize\');drag.current={mode,x:e.clientX,y:e.clientY,box:b};')
change(p,'const end=()=>{drag.current=null;};','const end=()=>{drag.current=null;setResizing(false);};')
change(p,'className="zonyx-resize-grip"','className={`zonyx-resize-grip${resizing?\' is-resizing\':\'\'}`}')
files['src/components/PitcherFader.tsx']='''import {positionSpeed,speedPosition} from './finalFeedbackMath.mjs';
import './finalFeedback.css';
type Props={kind:'speed'|'pitch';value:number;onChange:(value:number)=>void};
export function PitcherFader({kind,value,onChange}:Props){
 const speed=kind==='speed',label=speed?'Vitesse':'Hauteur',position=speed?speedPosition(value):(value+12)/24*100;
 const marks=speed?[.5,.6,.7,.8,.9,1,1.2,1.4,1.6,1.8,2]:Array.from({length:25},(_,i)=>i-12);
 const display=speed?`${value.toLocaleString('fr-FR',{maximumFractionDigits:2})} ×`:`${value>0?'+':''}${value} demi-tons`;
 const set=(coordinate:number)=>onChange(speed?Math.round(positionSpeed(coordinate)*100)/100:Math.round(coordinate/100*24-12));
 return <label className="zonyx-pitcher-fader"><span className="zonyx-pitcher-fader-title">{label}</span><div className="zonyx-pitcher-scale" aria-hidden="true">{marks.map(mark=><span key={mark} style={{left:`${speed?speedPosition(mark):(mark+12)/24*100}%`}}><span>{speed?mark.toLocaleString('fr-FR'):`${mark>0?'+':''}${mark}`}</span><i/></span>)}</div><input className="zonyx-pitcher-horizontal" type="range" aria-label={label} aria-valuetext={display} min={0} max={100} step={speed?1:100/24} value={position} data-zonyx-default="50" onChange={e=>set(Number(e.target.value))} onDoubleClick={e=>{e.preventDefault();onChange(speed?1:0);}} onKeyDown={e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();const delta=(e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1)*(speed?(e.shiftKey?.01:.05):1);onChange(Math.max(speed?.5:-12,Math.min(speed?2:12,Math.round((value+delta)*100)/100)));}else if(e.key==='Home'||e.key==='End'){e.preventDefault();onChange(e.key==='Home'?(speed?.5:-12):(speed?2:12));}}}/><output>{display}</output></label>;
}
'''
p='src/components/PitcherModal.tsx'
change(p,"import {Fader} from './EffectControls';","import {PitcherFader} from './PitcherFader';")
change(p,'<Fader label="Vitesse" value={speed} defaultValue={1} min={.5} max={2} step={.05} display={`${speed} ×`} onChange={setSpeed}/><Fader label="Hauteur" value={pitch} defaultValue={0} min={-12} max={12} step={1} display={`${pitch} demi-tons`} onChange={setPitch}/>','<PitcherFader kind="speed" value={speed} onChange={setSpeed}/><PitcherFader kind="pitch" value={pitch} onChange={setPitch}/>')
change(p,'{busy&&<p role="status">Calcul Signalsmith Stretch…</p>}','<span className="zonyx-pitcher-progress" aria-busy={busy}/>')
p='src/utils/spaceTransport.mjs'
change(p,"env.playing()?'pause':env.loopPreferred?.()?'loop':'play'","env.playing()?'stop':env.loopPreferred?.()?'loop':'play'")
for p in (ROOT/'src').rglob('*.test.mjs'):
 name=str(p.relative_to(ROOT)).replace('\\','/');t=read(name)
 if 'opacity 250ms ease-out' in t or 'visibility 0s 250ms' in t:t=t.replace('opacity 250ms ease-out','opacity 1500ms linear').replace('visibility 0s 250ms','visibility 0s 1500ms')
 if name=='src/components/aboutLight.test.mjs':t=t.replace('opacity:.25!important','opacity:.65!important').replace('filter:drop-shadow(0 0 3px #39ff14)!important','filter:drop-shadow(0 0 5px #39ff14) drop-shadow(0 0 8px #39ff1480)!important')
 if name=='src/components/knobFeedback.test.mjs':t=t.replace('<span>Gauche</span><span>Droite</span>','>Gauche</PositionLabel>')
 if 'createSpaceTransport' in t or 'installSpaceTransport' in t:
  for old,new in [("['Lecture','Pause','Lecture']","['Lecture','Stop','Lecture']"),("['Boucle','Pause','Boucle']","['Boucle','Stop','Boucle']"),("['Lecture','Pause']","['Lecture','Stop']"),('space pauses and resumes in','space plays and stops in'),('loop mode survives pause without clicking Stop','loop preference survives Stop and restarts from loop control'),('missing controls never fall back from Pause to Stop','missing Stop never falls back to Pause'),("controls.find(c=>c.id==='Pause').disabled=true","controls.find(c=>c.id==='Stop').disabled=true")]:t=t.replace(old,new)
 if t!=read(name):files[name]=t
files['src/components/finalFeedback.css']='''#root#root#root .zonyx-position-label{color:rgb(calc(255 - 198*var(--label-light)) 255 calc(255 - 235*var(--label-light)))!important;text-shadow:0 0 calc(8px*var(--label-light)) rgba(57,255,20,var(--label-light)),0 0 calc(14px*var(--label-light)) rgba(57,255,20,calc(var(--label-light)*.5));transition:color 80ms linear,text-shadow 80ms linear;font-weight:600}
#root#root#root .zonyx-knob [role=slider]{position:relative}
#root#root#root .zonyx-pan-labels{display:block;position:relative;height:16px;overflow:visible;margin:2px auto 0;font:600 10px system-ui}
#root#root#root .zonyx-pan-labels>.zonyx-position-label{position:absolute;white-space:nowrap}
#root#root#root .zonyx-pan-labels>.zonyx-position-label:nth-child(1){left:18.18%;transform:translateX(-100%)}
#root#root#root .zonyx-pan-labels>.zonyx-position-label:nth-child(2){left:81.82%}
#root#root#root .zonyx-pan-labels>.zonyx-position-label:nth-child(3){left:50%;transform:translateX(-50%)}
#root#root#root button.zonyx-resize-grip{color:#20b957!important;opacity:1!important;filter:none!important}
#root#root#root button.zonyx-resize-grip:is(:hover,:focus-visible,:active,.is-resizing){color:#39ff14!important;filter:drop-shadow(0 0 3px #39ff14) drop-shadow(0 0 7px #39ff1480)!important}
#root#root#root .zonyx-pitcher .zonyx-legacy-controls{display:flex;flex-direction:column;gap:28px;width:min(680px,100%);margin:auto;padding:10px 24px 18px;box-sizing:border-box}
#root#root#root .zonyx-pitcher-fader{display:flex;flex-direction:column;gap:8px;width:100%;color:white}
.zonyx-pitcher-fader-title{text-align:center;font-size:14px;font-weight:700}
.zonyx-pitcher-scale{height:38px;position:relative;margin:0 13px;font:11px/1.3 monospace;color:white}
.zonyx-pitcher-scale>span{position:absolute;bottom:0;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:5px;white-space:nowrap}
.zonyx-pitcher-scale i{display:block;height:10px;width:2px;background:white}
#root#root#root input.zonyx-pitcher-horizontal{appearance:none;-webkit-appearance:none;writing-mode:horizontal-tb;direction:ltr;width:100%;height:28px;margin:0;background:transparent;cursor:pointer;accent-color:#39ff14}
#root#root#root input.zonyx-pitcher-horizontal::-webkit-slider-runnable-track{height:7px;border-radius:6px;background:#9a4dff;border:1px solid #bd93f9}
#root#root#root input.zonyx-pitcher-horizontal::-webkit-slider-thumb{appearance:none;-webkit-appearance:none;width:26px;height:26px;margin-top:-10px;border-radius:50%;background:#39ff14;border:2px solid #c2ffb6;box-shadow:0 0 7px #39ff14,0 0 13px #39ff1466}
#root#root#root input.zonyx-pitcher-horizontal::-moz-range-track{height:7px;border-radius:6px;background:#9a4dff}
#root#root#root input.zonyx-pitcher-horizontal::-moz-range-thumb{width:24px;height:24px;border-radius:50%;background:#39ff14;border:2px solid #c2ffb6;box-shadow:0 0 7px #39ff14}
#root#root#root .zonyx-pitcher-fader>output{text-align:center;color:white!important;font:600 13px monospace}
.zonyx-pitcher-progress{display:none}
@media(max-width:600px){.zonyx-pitcher-scale{font-size:9px}}
'''
files['src-tauri/src/configuration_gpu.ps1']='''Add-Type -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Runtime.InteropServices;
public static class AudioToolZGpu {
 [StructLayout(LayoutKind.Sequential, CharSet=CharSet.Unicode)] public struct Desc {
  [MarshalAs(UnmanagedType.ByValTStr, SizeConst=128)] public string Description;
  public uint VendorId,DeviceId,SubSysId,Revision;
  public UIntPtr DedicatedVideoMemory,DedicatedSystemMemory,SharedSystemMemory;
  public uint LuidLow;public int LuidHigh;public uint Flags;
 }
 [DllImport("dxgi.dll")] static extern int CreateDXGIFactory1(ref Guid iid,out IntPtr factory);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int EnumAdapter(IntPtr self,uint index,out IntPtr adapter);
 [UnmanagedFunctionPointer(CallingConvention.StdCall)] delegate int GetDesc(IntPtr self,out Desc desc);
 public static object[] Read(){
  var iid=new Guid("770aae78-f26f-4dba-a829-253c83d1b387");IntPtr factory;
  Marshal.ThrowExceptionForHR(CreateDXGIFactory1(ref iid,out factory));var rows=new List<object>();
  try{
   var table=Marshal.ReadIntPtr(factory);
   var enumerate=(EnumAdapter)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(table,12*IntPtr.Size),typeof(EnumAdapter));
   for(uint i=0;i<32;i++){
    IntPtr adapter;int hr=enumerate(factory,i,out adapter);
    if(hr==unchecked((int)0x887A0002))break;Marshal.ThrowExceptionForHR(hr);
    try{
     var get=(GetDesc)Marshal.GetDelegateForFunctionPointer(Marshal.ReadIntPtr(Marshal.ReadIntPtr(adapter),10*IntPtr.Size),typeof(GetDesc));Desc d;Marshal.ThrowExceptionForHR(get(adapter,out d));
     if((d.Flags&2)==0)rows.Add(new {Nom=d.Description,MemoireDedieeGo=Math.Round(d.DedicatedVideoMemory.ToUInt64()/1073741824.0,2),MemoirePartageableGo=Math.Round(d.SharedSystemMemory.ToUInt64()/1073741824.0,2)});
    }finally{Marshal.Release(adapter);}
   }
  }finally{Marshal.Release(factory);}return rows.ToArray();
 }
}
'@
@([AudioToolZGpu]::Read()) | ConvertTo-Json -Depth 4 -Compress
'''
files['src-tauri/src/configuration_scan.rs']=r'''use serde_json::Value;
fn query(section:&str)->Result<String,String>{
 let q=match section {
  "board"=>"@(Get-CimInstance Win32_BaseBoard -Property Manufacturer,Product -OperationTimeoutSec 8 | Select-Object @{n='Fabricant';e={$_.Manufacturer}},@{n='Modele';e={$_.Product}}) | ConvertTo-Json -Compress",
  "cpu"=>"@(Get-CimInstance Win32_Processor -Property Name,NumberOfCores,NumberOfLogicalProcessors,MaxClockSpeed -OperationTimeoutSec 8 | Select-Object @{n='Nom';e={$_.Name}},@{n='Coeurs';e={$_.NumberOfCores}},@{n='ProcesseursLogiques';e={$_.NumberOfLogicalProcessors}},@{n='FrequenceAnnonceeGHz';e={[Math]::Round($_.MaxClockSpeed/1000,2)}}) | ConvertTo-Json -Compress",
  "ram"=>"@(Get-CimInstance Win32_PhysicalMemory -Property Capacity -OperationTimeoutSec 8 | Measure-Object Capacity -Sum | Select-Object @{n='RAMInstalleeGo';e={[Math]::Round($_.Sum/1GB,2)}}) | ConvertTo-Json -Compress",
  "gpu"=>include_str!("configuration_gpu.ps1"),
  "audio"=>"@(Get-CimInstance Win32_SoundDevice -Property Name -OperationTimeoutSec 8 | Select-Object @{n='Interface';e={$_.Name}}) | ConvertTo-Json -Compress",
  _=>return Err("Section de configuration non autorisée".into())
 };
 Ok(format!("$ErrorActionPreference='Stop';[Console]::OutputEncoding=New-Object System.Text.UTF8Encoding;{q}"))
}
#[cfg(target_os="windows")]
fn run(section:&str)->Result<Value,String>{
 use std::os::windows::process::CommandExt;
 use std::process::{Command,Stdio};use std::time::{Duration,Instant};
 let script=query(section)?;
 let root=std::env::var_os("SystemRoot").ok_or("Windows indisponible")?;
 let exe=std::path::PathBuf::from(root).join("System32/WindowsPowerShell/v1.0/powershell.exe");
 let mut child=Command::new(exe).args(["-NoLogo","-NoProfile","-NonInteractive","-Command",&script]).creation_flags(0x08000000).stdin(Stdio::null()).stdout(Stdio::piped()).stderr(Stdio::piped()).spawn().map_err(|e|format!("Lecture de configuration indisponible : {e}"))?;
 let started=Instant::now();
 loop{
  match child.try_wait(){Ok(Some(_))=>break,Ok(None)=>{},Err(e)=>{let _=child.kill();let _=child.wait();return Err(e.to_string());}}
  if started.elapsed()>Duration::from_secs(20){let _=child.kill();let _=child.wait();return Err("Délai de lecture de configuration dépassé".into());}
  std::thread::sleep(Duration::from_millis(40));
 }
 let output=child.wait_with_output().map_err(|e|e.to_string())?;
 if !output.status.success(){return Err(String::from_utf8_lossy(&output.stderr).trim().to_string());}
 let text=String::from_utf8_lossy(&output.stdout);if text.trim().is_empty(){return Ok(serde_json::json!([]));}
 serde_json::from_str(text.trim().trim_start_matches('\u{feff}')).map_err(|e|format!("Configuration illisible : {e}"))
}
#[cfg(not(target_os="windows"))]
fn run(section:&str)->Result<Value,String>{query(section)?;Err("Détection disponible dans la version Windows".into())}
#[tauri::command]
pub async fn scan_configuration_section(section:String)->Result<Value,String>{
 query(&section)?;
 tauri::async_runtime::spawn_blocking(move||run(&section)).await.map_err(|e|e.to_string())?
}
#[cfg(test)]mod tests{
 use super::*;
 #[test]fn refuses_unknown_queries(){assert!(query("cpu; Remove-Item *").is_err());assert!(query("serial").is_err());}
 #[test]fn approved_queries_are_read_only(){for s in ["board","cpu","ram","gpu","audio"]{let q=query(s).unwrap();for forbidden in ["SerialNumber","Invoke-WebRequest","Set-CimInstance","Remove-Item"]{assert!(!q.contains(forbidden));}}}
 #[cfg(target_os="windows")]
 #[test]fn windows_cpu_query_returns_json(){let result=run("cpu").unwrap();assert!(result.is_array()||result.is_object());assert!(!result.is_null());}
}
'''
p='src-tauri/src/main.rs'
change(p,'mod audio_fallback;','mod audio_fallback;\nmod configuration_scan;')
change(p,'            audio_fallback::decode_audio_fallback,','            audio_fallback::decode_audio_fallback,\n            configuration_scan::scan_configuration_section,')
files['src/components/ConfigurationScan.tsx']='''import {useEffect,useRef,useState} from 'react';
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
'''
files['src/components/configurationScan.css']='''.zonyx-config-frame{border:1px solid #a15eff;border-radius:10px;padding:14px;background:#171021;box-shadow:0 0 12px #a15eff22;min-width:0}
#root .zonyx-config-private,.zonyx-tuto .zonyx-config-private{font-size:11px;color:white!important;opacity:.8;margin:0 0 10px}
.zonyx-config-status{color:#39ff14;font:600 12px system-ui;margin-bottom:10px}
.zonyx-config-list{height:clamp(200px,36vh,360px);overflow-y:auto;overscroll-behavior:contain;scrollbar-color:#39ff14 #241733;scrollbar-width:thin;padding:0 10px 0 0}
.zonyx-config-list::-webkit-scrollbar{width:9px}.zonyx-config-list::-webkit-scrollbar-track{background:#241733;border-radius:8px}.zonyx-config-list::-webkit-scrollbar-thumb{background:#39ff14;border:1px solid #b8ffaa;border-radius:8px;box-shadow:inset 0 0 5px #39ff14}
.zonyx-config-list>section{border-bottom:1px solid #bd93f933;padding:10px 0}
.zonyx-tuto .zonyx-config-list h4{color:#bd93f9!important;margin:0 0 6px;font-weight:700}
.zonyx-tuto .zonyx-config-list p{color:white!important;margin:4px 0;font-size:12px;overflow-wrap:anywhere}
.zonyx-tuto .zonyx-config-list [data-state=ok] h4,.zonyx-tuto .zonyx-config-success h4{color:#39ff14!important}
.zonyx-tuto .zonyx-config-list [data-state=error] h4{color:#ffadb8!important}
.zonyx-config-success{padding:16px 0 8px}.zonyx-config-success h4{font-size:22px;text-shadow:0 0 7px #39ff1470}.zonyx-config-success small{color:#bd93f9;font-size:10px}
'''
p='src/components/Tutorial.tsx'
change(p,"import professor from '../medias/pro.png?url';","import professor from '../medias/pro.png?url';\nimport scanner from '../medias/test.png?url';\nimport {ConfigurationScan} from './ConfigurationScan';")
change(p,' {image:img2,alt:'," {image:scanner,alt:'ZØNYX examine votre configuration avec sa loupe',title:'Votre configuration',intro:['D’abord, nous allons examiner votre configuration et vérifier les éléments nécessaires au fonctionnement d’Audio ToolZ sur votre machine.']},\n {image:img2,alt:")
change(p,'     {current.intro.map(line=><p key={line}>{line}</p>)}','     {current.intro.map(line=><p key={line}>{line}</p>)}\n     {step===1&&<ConfigurationScan/>}')
blob=subprocess.check_output(['git','cat-file','blob','94807aa4dc443fcd8d53a5cd15f388a56ac2ce6e'],cwd=ROOT)
if hashlib.sha1(b'blob '+str(len(blob)).encode()+b'\0'+blob).hexdigest()!='94807aa4dc443fcd8d53a5cd15f388a56ac2ce6e':raise RuntimeError('Wrong tutorial illustration')
image=ROOT/'src/medias/test.png'
if image.exists() and image.read_bytes()!=blob:raise RuntimeError('Refusing to replace a different tutorial illustration')
files['src/components/finalLot.test.mjs']='''import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {labelLight,speedPosition,positionSpeed} from './finalFeedbackMath.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('position text starts at half the path and peaks on label',()=>{assert.equal(labelLight(.5,0),0);assert.equal(labelLight(.25,0),0);assert.equal(labelLight(.125,0),.5);assert.equal(labelLight(0,0),1);assert.equal(labelLight(.75,1),0);assert.equal(labelLight(1,1),1);assert.equal(labelLight(.25,.5),0);assert.equal(labelLight(.5,.5),1);});
test('horizontal speed scale has neutral in exact center',()=>{for(const value of [.5,.75,1,1.5,2])assert.ok(Math.abs(positionSpeed(speedPosition(value))-value)<1e-9);assert.deepEqual([.5,1,2].map(speedPosition),[0,50,100]);});
test('final UI keeps slow fade diode halos and no calculation text',()=>{assert.ok(read('./effectStatus.css').includes('opacity 1500ms linear,visibility 0s 1500ms'));const ticks=read('./knobStates.css');assert.ok(ticks.includes('opacity:.65!important;filter:drop-shadow(0 0 3px #39ff14)!important'));assert.ok(ticks.includes('filter:drop-shadow(0 0 5px #39ff14) drop-shadow(0 0 8px #39ff1480)!important'));assert.ok(!read('./PitcherModal.tsx').includes('Calcul Signalsmith'));assert.ok(read('./PitcherModal.tsx').includes('disabled={!ready}'));assert.ok(read('./EffectPanel.tsx').includes('is-resizing'));});
test('tutorial inserts scanner as page two with conditional success and no microphone request',()=>{const tutorial=read('./Tutorial.tsx'),scan=read('./ConfigurationScan.tsx');assert.ok(tutorial.indexOf('image:scanner')<tutorial.indexOf('image:img2'));assert.ok(tutorial.includes('step===1&&<ConfigurationScan/>'));assert.ok(scan.includes('finished&&success'));assert.ok(scan.includes('Vous pouvez utiliser Audio ToolZ sans problème.'));assert.ok(scan.includes('renderSignalsmith(silent'));assert.ok(!scan.includes('getUserMedia'));assert.ok(scan.includes('node.scrollTo'));});
'''
for p,t in files.items():
 f=ROOT/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(t,encoding='utf-8')
image.parent.mkdir(parents=True,exist_ok=True);image.write_bytes(blob)
report={'files':sorted(files)+['src/medias/test.png'],'scope':'v.1.7-dev only','validation':'pending','manualReview':['visual halos and text placement','Play Stop loop in Z-Delay','Windows WebView2 configuration scan and audio','hardware naming and GPU memory'],'tutorialImageBlob':'94807aa4dc443fcd8d53a5cd15f388a56ac2ce6e'}
f=ROOT/'.github/diagnostics/final-lot.json';f.parent.mkdir(parents=True,exist_ok=True);f.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report,ensure_ascii=False))
