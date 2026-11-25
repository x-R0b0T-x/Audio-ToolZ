import {BpmComparisonSettings} from './BpmComparison';
import type {AudioDocument} from '../audio/types';
import React,{useCallback,useEffect,useState} from 'react';
import {Check,Mic,RefreshCw,Settings,ShieldCheck,Speaker,X} from 'lucide-react';
import {audioEngine,type AudioInputDevice,type AudioOutputDevice} from '../audio/engine';
import type {RecordingPreferences} from '../utils/uiStateStorage';
import './interfaceConsistency.css';
interface SettingsModalProps{open:boolean;selectedInputDeviceId:string;selectedOutputDeviceId:string;recordingSettings:RecordingPreferences;onSelectInputDevice:(id:string)=>void;onSelectOutputDevice:(id:string)=>void;onChangeRecordingSettings:(patch:Partial<RecordingPreferences>)=>void;onClose:()=>void;bpmDocument?:AudioDocument|null;}
export const SettingsModal:React.FC<SettingsModalProps>=p=>{
 const [inputs,setInputs]=useState<AudioInputDevice[]>([]),[outputs,setOutputs]=useState<AudioOutputDevice[]>([]),[supportsOutputSelect,setSupportsOutputSelect]=useState(false),[loading,setLoading]=useState(false),[statusMessage,setStatusMessage]=useState<string|null>(null);
 const refreshDevices=useCallback(async()=>{
  setLoading(true);
  try{const res=await audioEngine.listAudioDevices();setInputs(res.inputs);setOutputs(res.outputs);setSupportsOutputSelect(res.supportsOutputSelect);
   if(res.inputs.length&&(!p.selectedInputDeviceId||!res.inputs.some(d=>d.deviceId===p.selectedInputDeviceId)))p.onSelectInputDevice(res.inputs[0].deviceId);
   if(res.outputs.length&&(!p.selectedOutputDeviceId||!res.outputs.some(d=>d.deviceId===p.selectedOutputDeviceId)))p.onSelectOutputDevice(res.outputs[0].deviceId);
  }catch{setStatusMessage('Je n’ai pas pu lire la liste des périphériques. Vous pouvez réessayer.');}finally{setLoading(false);}
 },[p.selectedInputDeviceId,p.selectedOutputDeviceId,p.onSelectInputDevice,p.onSelectOutputDevice]);
 useEffect(()=>{if(p.open){setStatusMessage(null);void refreshDevices();}},[p.open,refreshDevices]);
 const request=async()=>{setLoading(true);setStatusMessage(null);try{const granted=await audioEngine.requestMicrophonePermission(p.selectedInputDeviceId||undefined);await refreshDevices();setStatusMessage(granted?'J’ai retrouvé vos cartes son et microphones.':'Je n’ai pas accès au microphone : vérifiez son autorisation et son branchement.');}catch{setStatusMessage('Je n’ai pas pu accéder au microphone. Vous pouvez réessayer.');}finally{setLoading(false);}};
 if(!p.open)return null;
 return <div role="dialog" aria-modal="true" aria-labelledby="settings-modal-title" className="zonyx-settings fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"><div className="zonyx-settings-panel">
  <header><Settings className="zonyx-settings-icon"/><h2 id="settings-modal-title">Paramètres audio &amp; Périphériques</h2><button type="button" className="zonyx-settings-close" aria-label="Fermer" onClick={p.onClose}><X/></button></header>
  <main><BpmComparisonSettings audioDocument={p.bpmDocument??null}/>
   <section><h3><Mic className="zonyx-settings-icon"/>Carte d’entrée audio / Microphone</h3><div className="zonyx-settings-actions"><button type="button" disabled={loading} onClick={()=>void request()}><ShieldCheck/>Détecter les cartes son</button><button type="button" disabled={loading} aria-label="Actualiser la liste des périphériques" title="Actualiser" onClick={()=>void refreshDevices()}><RefreshCw className={loading?'animate-spin':''}/></button></div>
    {statusMessage&&<p role="status">{statusMessage}</p>}
    <label htmlFor="settings-audio-input-select">Périphérique d’enregistrement actif</label>
    <select id="settings-audio-input-select" data-testid="settings-audio-input-select" value={p.selectedInputDeviceId} disabled={loading} onChange={e=>p.onSelectInputDevice(e.target.value)}>{inputs.length?inputs.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label}</option>):<option value="">Entrée audio par défaut</option>}</select>
    {inputs.length>0&&<div className="zonyx-settings-devices">{inputs.map(d=><button type="button" key={d.deviceId} aria-pressed={d.deviceId===p.selectedInputDeviceId} onClick={()=>p.onSelectInputDevice(d.deviceId)}><span>{d.label}</span>{d.deviceId===p.selectedInputDeviceId&&<Check/>}</button>)}</div>}
   </section>
   <section><h3><Speaker className="zonyx-settings-icon"/>Sortie audio (Lecture / Moniteurs)</h3><select id="settings-audio-output-select" data-testid="settings-audio-output-select" aria-label="Périphérique de sortie audio" value={p.selectedOutputDeviceId} disabled={loading||!supportsOutputSelect||!outputs.length} onChange={e=>p.onSelectOutputDevice(e.target.value)}>{outputs.length?outputs.map(d=><option key={d.deviceId} value={d.deviceId}>{d.label}</option>):<option value="">Sortie audio par défaut du système</option>}</select>{!supportsOutputSelect&&<p>La sortie audio principale du système est utilisée automatiquement.</p>}</section>
   <section><h3>Traitement de l’entrée à l’enregistrement</h3>{([['echoCancellation','Annulation d’écho'],['noiseSuppression','Réduction de bruit automatique'],['autoGainControl','Contrôle automatique du gain (AGC)']] as const).map(([key,label])=><label className="zonyx-settings-check" key={key}><span>{label}</span><input type="checkbox" checked={p.recordingSettings[key]} onChange={e=>p.onChangeRecordingSettings({[key]:e.target.checked})}/></label>)}</section>
   <section><h3>Didacticiel avec ZØNYX</h3><p>Retrouvez-moi dans le guide et choisissez de l’afficher ou non au démarrage.</p><button type="button" onClick={()=>{p.onClose();window.dispatchEvent(new Event('zonyx:show-tutorial'));}}>Afficher le didacticiel</button></section>
  </main><footer><button type="button" onClick={p.onClose}>Valider</button></footer>
 </div></div>;
};
