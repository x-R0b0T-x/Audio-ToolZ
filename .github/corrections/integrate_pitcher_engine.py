import json, subprocess
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip() != 'v.1.7-dev':
    raise RuntimeError('Development branch required')
files = {}
package = json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
package['dependencies']['signalsmith-stretch'] = '1.3.2'
files['package.json'] = json.dumps(package,indent=2)+'\n'
p = 'src/components/EffectModal.tsx'
code = (ROOT/p).read_text(encoding='utf-8')
old = "import {ReverbModal} from './ReverbModal';"
new = old + "\nimport {PitcherModal} from './PitcherModal';"
if new not in code:
    if code.count(old) != 1: raise RuntimeError('Unknown effect imports')
    code = code.replace(old,new,1)
old = ':<LiveEffectSession key={`${p.document.id}:${p.effect}`} {...p} effect={p.effect} document={p.document}/>;'
new = ":p.effect==='speed-pitch'?<PitcherModal key={p.document.id} document={p.document} onStopPreview={p.onStopPreview} onClose={p.onClose} onApply={p.onApply}/>:<LiveEffectSession key={`${p.document.id}:${p.effect}`} {...p} effect={p.effect} document={p.document}/>;"
if new not in code:
    if code.count(old) != 1: raise RuntimeError('Unknown effect routing')
    code = code.replace(old,new,1)
files[p] = code
files['src/audio/signalsmithStretch.d.ts'] = '''declare module 'signalsmith-stretch' {
 export interface StretchNode extends AudioWorkletNode {
  addBuffers(channels:Float32Array[]):Promise<number>;
  latency():number|Promise<number>;
  schedule(options:{output?:number;input?:number;active?:boolean;rate?:number;semitones?:number}):void;
 }
 export default function SignalsmithStretch(context:BaseAudioContext,options?:AudioWorkletNodeOptions):Promise<StretchNode>;
}
'''
files['src/audio/pitcherModel.mjs'] = '''export function validatePitcher(channels,sampleRate,speed,pitch){
 if(!Number.isFinite(speed)||speed<.5||speed>2||!Number.isFinite(pitch)||pitch< -12||pitch>12)throw Error('Paramètres Z-Pitcher hors limites');
 const length=channels[0]?.length??0;
 if(!channels.length||channels.some(c=>!(c instanceof Float32Array)||c.length!==length)||!Number.isFinite(sampleRate)||sampleRate<=0)throw Error('Audio Z-Pitcher invalide');
 if(channels.some(c=>c.some(v=>!Number.isFinite(v))))throw Error('Échantillon Z-Pitcher invalide');
 return length?Math.max(1,Math.round(length/speed)):0;
}
export function splicePitcher(original,segment,start,end){
 const total=original[0]?.length??0,size=segment[0]?.length??0;
 if(!original.length||original.length!==segment.length||original.some(c=>c.length!==total)||segment.some(c=>c.length!==size)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>total)throw Error('Sélection Z-Pitcher invalide');
 const channels=original.map((c,i)=>{const out=new Float32Array(total-(end-start)+size);out.set(c.subarray(0,start));out.set(segment[i],start);out.set(c.subarray(end),start+size);return out;});
 return {channels,selection:{startSample:start,endSample:start+size}};
}
'''
files['src/audio/pitcherModel.d.mts'] = '''export function validatePitcher(channels:Float32Array[],sampleRate:number,speed:number,pitch:number):number;
export function splicePitcher(original:Float32Array[],segment:Float32Array[],start:number,end:number):{channels:Float32Array[];selection:{startSample:number;endSample:number}};
'''
files['src/audio/signalsmithPitcher.ts'] = '''import SignalsmithStretch,{type StretchNode} from 'signalsmith-stretch';
import {validatePitcher} from './pitcherModel.mjs';
export {splicePitcher} from './pitcherModel.mjs';
export async function renderSignalsmith(channels:Float32Array[],sampleRate:number,speed:number,pitch:number,signal?:AbortSignal):Promise<Float32Array[]>{
 const length=validatePitcher(channels,sampleRate,speed,pitch);
 signal?.throwIfAborted();
 if(!length)return channels.map(()=>new Float32Array());
 const setup=new OfflineAudioContext(channels.length,1,sampleRate);
 if(!setup.audioWorklet)throw Error('Signalsmith Stretch : AudioWorklet indisponible dans le moteur audio local');
 let node:StretchNode|undefined,timer:ReturnType<typeof setTimeout>|undefined;
 let abort:()=>void=()=>{};
 const interrupted=new Promise<never>((_,reject)=>{
  abort=()=>reject(new DOMException('Aborted','AbortError'));
  signal?.addEventListener('abort',abort,{once:true});
  timer=setTimeout(()=>reject(Error('Signalsmith Stretch : délai de traitement dépassé')),120000);
 });
 const wait=<T,>(task:Promise<T>)=>Promise.race([task,interrupted]);
 try{
  const options:AudioWorkletNodeOptions={numberOfInputs:0,numberOfOutputs:1,outputChannelCount:[channels.length],channelCount:channels.length,channelCountMode:'explicit'};
  const probe=await wait(SignalsmithStretch(setup,options));node=probe;
  const latency=await wait(Promise.resolve(probe.latency()));
  if(!Number.isFinite(latency)||latency<0)throw Error('Signalsmith Stretch : latence invalide');
  probe.disconnect();probe.port.close();node=undefined;
  const padding=Math.ceil(Math.max(.25,latency*2+.05)*sampleRate);
  const context=new OfflineAudioContext(channels.length,length+padding,sampleRate);
  node=await wait(SignalsmithStretch(context,options));signal?.throwIfAborted();
  await wait(node.addBuffers(channels.map(c=>c.slice())));signal?.throwIfAborted();
  node.connect(context.destination);
  node.schedule({output:padding/sampleRate,input:0,active:true,rate:speed,semitones:pitch});
  const rendered=await wait(context.startRendering());signal?.throwIfAborted();
  const result=channels.map((_,i)=>rendered.getChannelData(i).slice(padding,padding+length));
  if(result.some(c=>c.length!==length||c.some(v=>!Number.isFinite(v))))throw Error('Signalsmith Stretch : rendu audio invalide');
  return result;
 }finally{
  if(timer!==undefined)clearTimeout(timer);signal?.removeEventListener('abort',abort);
  node?.disconnect();node?.port.close();
 }
}
'''
files['src/components/PitcherModal.tsx'] = '''import {useEffect,useMemo,useRef,useState} from 'react';
import type {AudioDocument,AudioSelection} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {renderSignalsmith,splicePitcher} from '../audio/signalsmithPitcher';
import {targetRange} from '../audio/effectsModel.mjs';
import {createPreviewExit,restoreUnappliedPreview} from '../utils/effectReview.mjs';
import {Fader} from './EffectControls';
import {EffectPanel} from './EffectPanel';
type Props={document:AudioDocument;onStopPreview:()=>void;onClose:()=>void;onApply:(channels:Float32Array[],label:string,selection?:AudioSelection)=>void};
type Result={id:number;speed:number;pitch:number;channels:Float32Array[];selection:{startSample:number;endSample:number}};
export function PitcherModal(p:Props){
 const doc=p.document,[speed,setSpeed]=useState(1),[pitch,setPitch]=useState(0),[busy,setBusy]=useState(true),[error,setError]=useState(''),[result,setResult]=useState<Result|null>(null);
 const latest=useRef(p);latest.current=p;
 const original=useRef({channels:doc.channels,rate:doc.sampleRate});
 const range=useMemo(()=>targetRange(doc.selection,doc.channels[0]?.length??0),[doc]);
 const source=useMemo(()=>doc.channels.map(c=>c.slice(range.start,range.end)),[doc,range]);
 const serial=useRef(0),controller=useRef<AbortController|null>(null),cache=useRef<Result|null>(null),shown=useRef<{id:number;speed:number}|null>(null);
 const wanted=useRef({speed,pitch});wanted.current={speed,pitch};
 const exit=useRef<ReturnType<typeof createPreviewExit>|null>(null);
 if(!exit.current)exit.current=createPreviewExit(()=>{serial.current++;controller.current?.abort();cache.current=null;if(shown.current)restoreUnappliedPreview(audioEngine,original.current.channels,original.current.rate);shown.current=null;latest.current.onStopPreview();});
 useEffect(()=>{exit.current!.reset();return()=>exit.current!.discard();},[]);
 useEffect(()=>{
  const id=++serial.current,aborter=new AbortController();controller.current=aborter;
  setBusy(true);setError('');setResult(null);cache.current=null;
  const timer=window.setTimeout(async()=>{
   try{
    const segment=await renderSignalsmith(source,doc.sampleRate,speed,pitch,aborter.signal);
    if(aborter.signal.aborted||exit.current!.settled||id!==serial.current)return;
    const full=splicePitcher(original.current.channels,segment,range.start,range.end),r={id,speed,pitch,...full};
    cache.current=r;setResult(r);setBusy(false);
   }catch(e){
    if(aborter.signal.aborted||exit.current!.settled||id!==serial.current)return;
    cache.current=null;setResult(null);setBusy(false);
    if(shown.current)restoreUnappliedPreview(audioEngine,original.current.channels,original.current.rate);shown.current=null;
    setError(`Échec de Signalsmith Stretch : ${String(e)}. Aucun autre moteur n’a été utilisé.`);
   }
  },80);
  return()=>{window.clearTimeout(timer);aborter.abort();};
 },[source,doc.sampleRate,range,speed,pitch]);
 useEffect(()=>{
  let frame=0;
  const tick=()=>{
   if(exit.current!.settled)return;
   const r=cache.current;
   if(!audioEngine.isPlaying)shown.current=null;
   if(audioEngine.isPlaying&&r&&r.id===serial.current&&r.speed===wanted.current.speed&&r.pitch===wanted.current.pitch&&shown.current?.id!==r.id){
    const at=audioEngine.getCurrentSample(),oldSpeed=shown.current?.speed??1;
    const sourcePosition=at<=range.start?at:range.start+(at-range.start)*oldSpeed;
    const position=sourcePosition<=range.start?sourcePosition:range.start+(sourcePosition-range.start)/r.speed;
    if(audioEngine.replacePreviewAudio(r.channels,doc.sampleRate,{position,loopStart:range.start,loopEnd:r.selection.endSample}))shown.current={id:r.id,speed:r.speed};
   }
   frame=requestAnimationFrame(tick);
  };frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[doc.sampleRate,range]);
 const ready=!busy&&!error&&range.end>range.start&&result?.id===serial.current&&result?.speed===speed&&result?.pitch===pitch;
 const cancel=()=>{exit.current!.discard();latest.current.onClose();};
 const apply=()=>{const r=cache.current;if(!ready||!r||r.id!==serial.current||r.speed!==wanted.current.speed||r.pitch!==wanted.current.pitch)return;exit.current!.apply(()=>{latest.current.onApply(r.channels,'Z-Pitcher',r.selection);controller.current?.abort();});};
 return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-pitcher" role="dialog" aria-modal="true" aria-labelledby="pitcher-title"><header><h2 id="pitcher-title">Z-Pitcher</h2><button type="button" aria-label="Fermer" onClick={cancel}>×</button></header><main><div className="zonyx-legacy-controls"><Fader label="Vitesse" value={speed} defaultValue={1} min={.5} max={2} step={.05} display={`${speed} ×`} onChange={setSpeed}/><Fader label="Hauteur" value={pitch} defaultValue={0} min={-12} max={12} step={1} display={`${pitch} demi-tons`} onChange={setPitch}/></div>{busy&&<p role="status">Calcul Signalsmith Stretch…</p>}{error&&<p role="alert">{error}</p>}</main><footer><button type="button" onClick={cancel}>Annuler</button><button type="button" disabled={!ready} onClick={apply}>Appliquer</button></footer></EffectPanel></div>;
}
'''
files['src/audio/pitcherEngine.test.mjs'] = '''import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {validatePitcher,splicePitcher} from './pitcherModel.mjs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('pitch and speed limits are independent and determine duration',()=>{const source=[new Float32Array(480)];for(const pitch of [-12,0,12]){assert.equal(validatePitcher(source,48000,.5,pitch),960);assert.equal(validatePitcher(source,48000,2,pitch),240);}for(const speed of [0,.49,2.01,NaN])assert.throws(()=>validatePitcher(source,48000,speed,0));for(const pitch of [-13,13,NaN])assert.throws(()=>validatePitcher(source,48000,1,pitch));});
test('splice preserves outside audio and cancel source byte for byte',()=>{const original=[Float32Array.of(1,2,3,4,5),Float32Array.of(6,7,8,9,10)],snapshot=original.map(c=>c.slice()),r=splicePitcher(original,[Float32Array.of(.1,.2,.3),Float32Array.of(.4,.5,.6)],1,3);assert.deepEqual(r.selection,{startSample:1,endSample:4});assert.deepEqual(Array.from(r.channels[0].subarray(0,1)),[1]);assert.deepEqual(Array.from(r.channels[0].subarray(4)),[4,5]);assert.deepEqual(original,snapshot);assert.notEqual(r.channels[0],original[0]);});
test('malformed channels and selection are rejected',()=>{assert.throws(()=>validatePitcher([Float32Array.of(NaN)],48000,1,0));assert.throws(()=>validatePitcher([new Float32Array(2),new Float32Array(3)],48000,1,0));assert.throws(()=>splicePitcher([new Float32Array(2)],[new Float32Array(1)],0,3));});
test('active route uses Signalsmith without legacy fallback',()=>{assert.ok(read('../components/EffectModal.tsx').includes("p.effect==='speed-pitch'?<PitcherModal"));const render=read('./signalsmithPitcher.ts'),modal=read('../components/PitcherModal.tsx');for(const code of [render,modal])assert.ok(!code.includes('applySpeedAndPitch'));assert.ok(render.includes('rate:speed,semitones:pitch'));assert.ok(modal.includes('r.id!==serial.current'));assert.ok(modal.includes('disabled={!ready}'));assert.ok(modal.includes('restoreUnappliedPreview'));assert.ok(modal.includes("onApply(r.channels,'Z-Pitcher',r.selection)"));});
'''
for p,text in files.items():
    file=ROOT/p;file.parent.mkdir(parents=True,exist_ok=True);file.write_text(text,encoding='utf-8')
print(json.dumps({'engine':'signalsmith-stretch@1.3.2','files':sorted(files),'validation':'pending'},ensure_ascii=False))
