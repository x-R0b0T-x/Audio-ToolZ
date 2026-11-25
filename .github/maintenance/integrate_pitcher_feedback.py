import json, subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
pending={}
def read(p): return pending.get(p,(ROOT/p).read_text(encoding='utf-8'))
def put(p,text): pending[p]=text
def replace(p,old,new):
    text=read(p)
    if old not in text:
        if new in text:return
        raise RuntimeError('Unexpected source: '+p+' / '+old[:60])
    if text.count(old)!=1:raise RuntimeError('Ambiguous source: '+p)
    put(p,text.replace(old,new,1))
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!='v.1.7-dev':
    raise RuntimeError('Development branch required')
p='package.json'
pkg=json.loads(read(p));pkg['dependencies']['signalsmith-stretch']='1.3.2';put(p,json.dumps(pkg,indent=2)+'\n')
put('src/audio/signalsmithStretch.d.ts',"""declare module 'signalsmith-stretch' {
 export interface StretchNode extends AudioWorkletNode {
  addBuffers(channels:Float32Array[]):Promise<number>;
  schedule(options:{output?:number;input?:number;active?:boolean;rate?:number;semitones?:number}):void;
  stop(when?:number):void;
 }
 export default function SignalsmithStretch(context:BaseAudioContext,options?:AudioWorkletNodeOptions):Promise<StretchNode>;
}
""")
put('src/audio/signalsmithPitcher.ts',"""import SignalsmithStretch from 'signalsmith-stretch';
export async function renderSignalsmith(channels:Float32Array[],sampleRate:number,speed:number,pitch:number):Promise<Float32Array[]>{
 if(!Number.isFinite(speed)||speed<.5||speed>2||!Number.isFinite(pitch)||pitch< -12||pitch>12)throw new Error('Paramètres Z-Pitcher hors limites');
 const inputLength=channels[0]?.length??0;
 if(!channels.length||channels.some(c=>c.length!==inputLength)||!Number.isFinite(sampleRate)||sampleRate<=0)throw new Error('Audio Z-Pitcher invalide');
 if(!inputLength)return channels.map(()=>new Float32Array());
 const length=Math.max(1,Math.round(inputLength/speed));
 const context=new OfflineAudioContext(channels.length,length,sampleRate);
 if(!context.audioWorklet)throw new Error('Signalsmith Stretch nécessite AudioWorklet dans le moteur audio local');
 const node=await SignalsmithStretch(context,{numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[channels.length],channelCount:channels.length,channelCountMode:'explicit'});
 try{
  await node.addBuffers(channels.map(c=>c.slice()));
  node.connect(context.destination);
  node.schedule({output:0,input:0,active:true,rate:speed,semitones:pitch});
  const audio=await context.startRendering();
  const result=channels.map((_,i)=>audio.getChannelData(i).slice());
  if(result.some(c=>c.some(v=>!Number.isFinite(v))))throw new Error('Signalsmith a produit un échantillon invalide');
  return result;
 }finally{node.disconnect();node.port.close();}
}
export function splicePitcher(original:Float32Array[],segment:Float32Array[],start:number,end:number){
 if(original.length!==segment.length)throw new Error('Canaux Z-Pitcher incohérents');
 const size=segment[0]?.length??0;
 const channels=original.map((c,i)=>{const result=new Float32Array(c.length-(end-start)+size);result.set(c.subarray(0,start));result.set(segment[i],start);result.set(c.subarray(end),start+size);return result;});
 return {channels,selection:{startSample:start,endSample:start+size}};
}
""")
put('src/components/PitcherModal.tsx',"""import {useEffect,useMemo,useRef,useState} from 'react';
import type {AudioDocument} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {renderSignalsmith,splicePitcher} from '../audio/signalsmithPitcher';
import {targetRange} from '../audio/effectsModel.mjs';
import {Fader} from './EffectControls';
import {EffectPanel} from './EffectPanel';
type Props={document:AudioDocument;onStartPreview:(channels:Float32Array[],rate:number)=>void;onStopPreview:()=>void;onClose:()=>void;onApply:(channels:Float32Array[],label:string,selection?:{startSample:number;endSample:number})=>void};
export function PitcherModal(p:Props){
 const [speed,setSpeed]=useState(1),[pitch,setPitch]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState('');
 const latest=useRef(p);latest.current=p;
 const original=useRef({channels:p.document.channels,rate:p.document.sampleRate});
 const serial=useRef(0),settled=useRef(false),previewed=useRef(false);
 const cache=useRef<{speed:number;pitch:number;segment:Float32Array[]}|null>(null);
 const {start,end}=useMemo(()=>targetRange(p.document.selection,p.document.channels[0]?.length??0),[p.document]);
 const source=useMemo(()=>p.document.channels.map(c=>c.slice(start,end)),[p.document,start,end]);
 const wanted=useRef({speed,pitch});wanted.current={speed,pitch};
 const finish=(apply=false)=>{if(settled.current)return;settled.current=true;serial.current++;if(!apply&&previewed.current)audioEngine.replacePreviewAudio(original.current.channels,original.current.rate);latest.current.onStopPreview();};
 useEffect(()=>{settled.current=false;return()=>finish();},[]);
 useEffect(()=>{
  let disposed=false;const id=++serial.current;setBusy(true);setError('');
  const timer=window.setTimeout(async()=>{
   try{
    const segment=await renderSignalsmith(source,p.document.sampleRate,speed,pitch);
    if(disposed||settled.current||id!==serial.current)return;
    cache.current={speed,pitch,segment};setBusy(false);
    latest.current.onStartPreview(segment,p.document.sampleRate);previewed.current=true;
   }catch(e){if(disposed||settled.current||id!==serial.current)return;cache.current=null;setBusy(false);setError(`Échec de Signalsmith Stretch : ${String(e)}. Aucun autre moteur n’a été utilisé.`);}
  },80);
  return()=>{disposed=true;window.clearTimeout(timer);};
 },[source,p.document.sampleRate,speed,pitch]);
 const ready=!busy&&!error&&end>start&&cache.current?.speed===speed&&cache.current?.pitch===pitch;
 const cancel=()=>{finish();latest.current.onClose();};
 const apply=()=>{const result=cache.current;if(!ready||!result||result.speed!==wanted.current.speed||result.pitch!==wanted.current.pitch)return;const full=splicePitcher(original.current.channels,result.segment,start,end);finish(true);latest.current.onApply(full.channels,'Z-Pitcher',full.selection);};
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-pitcher" role="dialog" aria-modal="true" aria-labelledby="pitcher-title"><header><h2 id="pitcher-title">Z-Pitcher</h2><button type="button" aria-label="Fermer" onClick={cancel}>×</button></header><main><div className="zonyx-legacy-controls"><Fader label="Vitesse" value={speed} defaultValue={1} min={.5} max={2} step={.05} display={`${speed} ×`} onChange={setSpeed}/><Fader label="Hauteur" value={pitch} defaultValue={0} min={-12} max={12} step={1} display={`${pitch} demi-tons`} onChange={setPitch}/></div>{busy&&<p role="status">Calcul Signalsmith Stretch…</p>}{error&&<p role="alert">{error}</p>}</main><footer><button type="button" onClick={cancel}>Annuler</button><button type="button" disabled={!ready} onClick={apply}>Appliquer</button></footer></EffectPanel></div>;
}
""")
p='src/components/EffectModal.tsx'
replace(p,"import {ReverbModal} from './ReverbModal';","import {ReverbModal} from './ReverbModal';\nimport {PitcherModal} from './PitcherModal';")
replace(p,":<LiveEffectSession key={`${p.document.id}:${p.effect}`} {...p} effect={p.effect} document={p.document}/>;",":p.effect==='speed-pitch'?<PitcherModal key={p.document.id} document={p.document} onStartPreview={p.onStartPreview} onStopPreview={p.onStopPreview} onClose={p.onClose} onApply={p.onApply}/>:<LiveEffectSession key={`${p.document.id}:${p.effect}`} {...p} effect={p.effect} document={p.document}/>;")
put('src/components/KnobTicks.tsx',"""type Props={fraction:number;count:number;center:number;inner:number;outer:number};
export function KnobTicks({fraction,count,center,inner,outer}:Props){
 const position=Math.max(0,Math.min(1,fraction)),selected=Math.round(position*Math.max(0,count-1));
 return <>{Array.from({length:count},(_,i)=>{const a=(-135+i*270/Math.max(1,count-1))*Math.PI/180;return <line key={i} data-zonyx-tick={i===selected?'selected':Math.abs(i-selected)===1?'neighbor':'idle'} x1={center+inner*Math.sin(a)} y1={center-inner*Math.cos(a)} x2={center+outer*Math.sin(a)} y2={center-outer*Math.cos(a)}/>;})}</>;
}
""")
p='src/components/EffectParameter.tsx'
replace(p,"import './knobStates.css';","import './knobStates.css';\nimport {KnobTicks} from './KnobTicks';")
replace(p,'compact?: boolean };','compact?: boolean; displayValue?:number; onDisplayCommit?:(v:number)=>void };')
replace(p,'{Array.from({ length: 11 }, (_, i) => { const a = (-135 + i * 27) * Math.PI / 180; return <line key={i} x1={32 + 26 * Math.sin(a)} y1={32 - 26 * Math.cos(a)} x2={32 + 30 * Math.sin(a)} y2={32 - 30 * Math.cos(a)} stroke="currentColor"/>; })}','<KnobTicks fraction={fraction(p.value)} count={11} center={32} inner={26} outer={30}/>')
replace(p,'aria-valuetext={`${p.value} ${p.unit ?? \'\'}`}','aria-valuetext={`${p.displayValue??p.value} ${p.unit ?? \'\'}`}')
replace(p,'<NumericValue label={p.label} value={p.value}','<NumericValue label={p.label} value={p.displayValue??p.value}')
replace(p,'activity.pulse();p.onChange(parameterValue(v,s));','activity.pulse();if(p.onDisplayCommit)p.onDisplayCommit(v);else p.onChange(parameterValue(v,s));')
p='src/components/EffectControls.tsx'
replace(p,"import './knobStates.css';","import './knobStates.css';\nimport {KnobTicks} from './KnobTicks';")
t=read(p)
start=t.find('        {Array.from({ length: tickCount }')
end=t.find('        <circle cx="50"',start)
if start>=0 and end>start:put(p,t[:start]+'        <KnobTicks fraction={fraction} count={tickCount} center={50} inner={38} outer={45}/>\n'+t[end:])
elif '<KnobTicks fraction={fraction} count={tickCount}' not in t:raise RuntimeError('Unknown Knob ticks')
p='src/utils/controlGestures.ts'
replace(p,"const direction = (sum < 0 ? 1 : -1) * (field.closest('.zonyx-rv-stereo') ? -1 : 1);","const direction = sum < 0 ? 1 : -1;")
p='src/components/ReverbModal.tsx'
replace(p,"id==='width'?value/2:value","id==='width'?Math.abs(value-100):value")
replace(p,'<EffectParameter label="Stéréo" value={settings.width/2}','<EffectParameter label="Stéréo" displayValue={Math.abs(settings.width-100)} onDisplayCommit={v=>update(\'width\',settings.width<100?100-v:100+v,\'Stéréo\')} value={settings.width/2}')
p='src/utils/reviewV17.test.mjs'
if (ROOT/p).exists():
    t=read(p).replace("stereo wheel inversion leaves all other controls unchanged","wheel direction is identical for all controls").replace('stereo?-1:1','1').replace('stereo?1:-1','-1');put(p,t)
p='src/components/knobStates.css'
t=read(p);marker='/* Unified localized tick lighting */'
if marker not in t:put(p,t+"""
/* Unified localized tick lighting */
#root#root [role=slider]>svg>line[data-zonyx-tick]{stroke-width:2!important;stroke-linecap:round;opacity:1!important;filter:none!important;vector-effect:non-scaling-stroke}
#root#root [role=slider]>svg>line[data-zonyx-tick=idle]{stroke:#bd93f9!important;opacity:.22!important}
#root#root [role=slider]>svg>line[data-zonyx-tick=neighbor]{stroke:#39ff14!important;opacity:.25!important}
#root#root [role=slider]>svg>line[data-zonyx-tick=selected]{stroke:#39ff14!important;filter:drop-shadow(0 0 4px #39ff14)!important}
#root#root fieldset:disabled [role=slider]>svg>line[data-zonyx-tick],#root#root [role=slider][aria-disabled=true]>svg>line[data-zonyx-tick]{stroke:#bd93f9!important;opacity:.22!important;filter:none!important}
""")
p='src/components/effectHelp.css'
t=read(p)
if '/* Borderless reviewed help */' not in t:put(p,t+"""
/* Borderless reviewed help */
.zonyx-help-dialog.zonyx-help-dialog{border:0!important;box-shadow:0 18px 48px #000c!important}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link{border:0!important;box-shadow:none!important}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link:is(:hover,:focus-visible){outline:none!important}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link:focus-visible{text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px}
""")
put('src/components/pitcherFeedback.test.mjs',"""import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('all shared knob tick renderers use localized lighting',()=>{for(const p of ['./EffectParameter.tsx','./EffectControls.tsx'])assert.ok(read(p).includes('<KnobTicks'));const css=read('./knobStates.css');for(const state of ['idle','neighbor','selected'])assert.ok(css.includes('data-zonyx-tick='+state));});
test('stereo wheel has no inverse direction and display is bipolar',()=>{const s=read('../utils/controlGestures.ts');assert.ok(s.includes('const direction = sum < 0 ? 1 : -1;'));assert.ok(!s.includes(\"field.closest('.zonyx-rv-stereo') ? -1 : 1\"));const r=read('./ReverbModal.tsx');assert.ok(r.includes('displayValue={Math.abs(settings.width-100)}'));assert.deepEqual([0,100,200].map(v=>Math.abs(v-100)),[100,0,100]);});
test('Z-Pitcher routes exclusively to the Signalsmith session',()=>{assert.ok(read('./EffectModal.tsx').includes(\"p.effect==='speed-pitch'?<PitcherModal\"));for(const p of ['./PitcherModal.tsx','../audio/signalsmithPitcher.ts'])assert.ok(!read(p).includes('applySpeedAndPitch'));const p=read('./PitcherModal.tsx');assert.ok(p.includes('result.segment'));assert.ok(p.includes('replacePreviewAudio(original.current.channels'));});
""")
for p,text in pending.items():
    file=ROOT/p;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(text,encoding='utf-8')
report={'preparedFiles':sorted(pending),'engine':'signalsmith-stretch@1.3.2','validation':'awaiting-typescript-build-and-manual-audio-review','preview':'offline-rendered-segment-shared-with-apply','limitations':['AudioWorklet in OfflineAudioContext must be tested in Windows WebView2','long selections can delay preview','beginning and end require listening tests','ZIP size not measured']}
file=ROOT/'.github/diagnostics/pitcher-feedback.json';file.parent.mkdir(parents=True,exist_ok=True);file.write_text(json.dumps(report,indent=2)+'\n',encoding='utf-8')
print(json.dumps(report))
