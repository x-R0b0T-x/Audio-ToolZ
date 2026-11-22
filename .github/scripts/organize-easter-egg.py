import hashlib,os
from pathlib import Path
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
key=hashlib.sha256(Path(__file__).read_text(encoding='utf-8').encode()).hexdigest()
marker=Path('.github/easter-media.applied')
assets=[('x.mp4','src/features/easter-egg/assets/robot.mp4','93221f160abef3ff76273b4fb9b831d9f89863ef'),('x.ogg','src/features/easter-egg/assets/music.ogg','a6dd4716c91592bb7153c31d80e54e6b86f72c52')]
def valid_media(path):
    with path.open('rb') as f:b=f.read(128)
    if path.suffix=='.mp4' and b'ftyp' not in b:raise SystemExit('Invalid MP4 header: '+str(path))
    if path.suffix=='.ogg' and not b.startswith(b'OggS'):raise SystemExit('Invalid OGG header: '+str(path))
def gitsha(b):return hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()
if marker.exists():
    if marker.read_text().strip()!=key:raise SystemExit('Different media migration already applied')
    for _,dest,_ in assets:valid_media(Path(dest))
    raise SystemExit(0)
expected={'src/components/SecretParty.tsx':'67ec6da0e3782da16e71d1ccc90d07bd7f639be6','src/components/secretParty.css':'e422e38baad62b9746565667338bac5324eab72f','src/components/WaveformView.tsx':'a29947de177863a9b4a731f5876332493046d02a','src/components/DetailedEffectGraph.tsx':'0b376c58a7651759c0d207e55e2fd84660b4e895','src/components/easterPolicy.mjs':'97d48f8835a181b0ee3c9914cc000867b721c996','src/components/easterPolicy.d.mts':'3a395d32b48d45df911630daaad3b65cb3a3d89f','src/components/easterPolicy.test.mjs':'51267cdc5673f817d918cbdff1ef08dd55ccdfce','.github/scripts/finalize-ui.py':'354dd183912d17032537804bf4e552377b3d5b88','.github/scripts/integrate-effects.py':'20776fde50738c2b3f9730d82384dcef699b91f9','.github/scripts/polish-effects.py':'08abb88b46159dcc38b6345363cd7b2248fbeba8'}
source={}
for name,sha in expected.items():
    b=Path(name).read_bytes().replace(bytes([13,10]),bytes([10]))
    if gitsha(b)!=sha:raise SystemExit('Source changed: '+name)
    source[name]=b.decode('utf-8')
for old,dest,sha in assets:
    if Path(dest).exists():raise SystemExit('Destination already exists: '+dest)
    b=Path(old).read_bytes()
    if gitsha(b)!=sha:raise SystemExit('Media changed: '+old)
    valid_media(Path(old))
pending={}
def N(name,text):
    if Path(name).exists():raise SystemExit('New file exists: '+name)
    pending[name]=text
def R(old,new):
    if pending[p].count(old)!=1:raise SystemExit('Ambiguous context: '+p+' '+old[:60])
    pending[p]=pending[p].replace(old,new,1)
old=source['src/components/SecretParty.tsx']
a=old.index(' useEffect(()=>{\n  const node=canvas.current');b=old.index(' },[]);',a)+len(' },[]);');effect=old[a:b]
N('src/features/easter-egg/ParticleField.tsx',"import React,{useEffect,useRef} from 'react';\nexport const ParticleField:React.FC=()=>{\n const canvas=useRef<HTMLCanvasElement>(null);\n"+effect+'\n return <canvas ref={canvas} aria-hidden="true"/>;\n};\n')
p='src/features/easter-egg/EasterEgg.tsx';N(p,old)
R(effect,'')
a=pending[p].index(' useEffect(()=>{if(!p.audioUrl)return;');b=pending[p].index('\n',a);R(pending[p][a:b],'')
R("from '../utils/desktop'","from '../../utils/desktop'")
R("from './easterPolicy.mjs'","from './clickCounter.mjs'")
R("import './secretParty.css';","import './easterEgg.css';\nimport {ParticleField} from './ParticleField';\nimport {useEasterMedia,EASTER_MEDIA} from './useEasterMedia';")
R('export function SecretHost(','export function EasterEggHost(')
R('function SecretParty(','function EasterEgg(')
R('<SecretParty audioUrl={p.audioUrl} ','<EasterEgg ')
if pending[p].count(';audioUrl?:string')!=2:raise SystemExit('Unexpected audio props')
pending[p]=pending[p].replace(';audioUrl?:string','')
R('canvas=useRef<HTMLCanvasElement>(null)','video=useRef<HTMLVideoElement>(null),audio=useRef<HTMLAudioElement>(null),dialog=useRef<HTMLDivElement>(null)')
R(" const [error,setError]=useState('');"," const [error,setError]=useState('');\n const media=useEasterMedia(video,audio);")
R('<canvas ref={canvas} aria-hidden="true"/>','<ParticleField/>')
R('<div className="atz-party" role="dialog"','<div ref={dialog} className="atz-party" role="dialog"')
R("(document.activeElement===close.current?link.current:close.current)?.focus();","const items=Array.from(dialog.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href]')??[]);if(items.length){const index=items.indexOf(document.activeElement as HTMLElement);items[(index+(e.shiftKey?-1:1)+items.length)%items.length].focus();}")
a=pending[p].index('   <svg className="atz-party-robot"');b=pending[p].index('   </svg>',a)+len('   </svg>')
R(pending[p][a:b],'''   <video ref={video} className="atz-party-media" src={EASTER_MEDIA.video} loop muted playsInline preload="auto" aria-label="Robot animé" onError={()=>media.reportError('La vidéo ne peut pas être lue sur cette machine.')}/>
   <audio ref={audio} src={EASTER_MEDIA.audio} loop preload="auto" onError={()=>media.reportError('Le fichier OGG ne peut pas être lu.')}/>''')
R('{error&&<p role="alert">{error}</p>}','{error&&<p role="alert">{error}</p>}{media.problem&&<div role="alert"><p>{media.problem}</p><button type="button" onClick={media.retry}>Réessayer la lecture</button></div>}')
p='src/features/easter-egg/easterEgg.css';N(p,source['src/components/secretParty.css'])
R('.atz-party-robot{','.atz-party-media{')
R('filter:drop-shadow(0 0 8px #39ff14) drop-shadow(0 0 25px #39ff14aa);','object-fit:contain;border-radius:14px;background:transparent;')
R('.atz-party-channel{display:flex;align-items:center;gap:10px;pointer-events:auto}', '.atz-party-channel{position:relative;display:flex;align-items:center;justify-content:center;width:max-content;max-width:100%;pointer-events:auto}')
R('.atz-party-channel svg{width:80px;', '.atz-party-channel svg{position:absolute;right:calc(100% + 10px);top:50%;transform:translateY(-50%);width:80px;')
R('@keyframes atz-party-arrow{50%{transform:translateX(7px)}}','@keyframes atz-party-arrow{0%,100%{transform:translate(0,-50%)}50%{transform:translate(7px,-50%)}}')
for ext in ['mjs','d.mts']:
    lines=source['src/components/easterPolicy.'+ext].splitlines(keepends=True)
    N('src/utils/eqGestures.'+ext,''.join(s for s in lines if 'widthFromWheel' in s or 'canDragBand' in s))
    N('src/features/easter-egg/clickCounter.'+ext,''.join(s for s in lines if 'nextSecretClick' in s))
lines=source['src/components/easterPolicy.test.mjs'].splitlines(keepends=True)
prelude="import {test} from 'node:test';import assert from 'node:assert/strict';"
N('src/utils/eqGestures.test.mjs',prelude+"import {widthFromWheel,canDragBand} from './eqGestures.mjs';\n"+''.join(s for s in lines[1:] if 'thirtieth' not in s))
N('src/features/easter-egg/clickCounter.test.mjs',prelude+"import {nextSecretClick} from './clickCounter.mjs';\n"+''.join(s for s in lines[1:] if 'thirtieth' in s))
p='src/components/DetailedEffectGraph.tsx';pending[p]=source[p]
R("from './easterPolicy.mjs'","from '../utils/eqGestures.mjs'")
p='src/components/WaveformView.tsx';pending[p]=source[p]
R("import {SecretHost} from './SecretParty';","import {EasterEggHost} from '../features/easter-egg/EasterEgg';")
R('<SecretHost enabled=','<EasterEggHost enabled=');R('</SecretHost>','</EasterEggHost>')
N('.gitattributes','src/features/easter-egg/assets/*.mp4 binary\nsrc/features/easter-egg/assets/*.ogg binary\n')
N('src/features/easter-egg/useEasterMedia.ts', r'''import {useCallback,useEffect,useRef,useState,type RefObject} from 'react';
import robotUrl from './assets/robot.mp4?url';
import musicUrl from './assets/music.ogg?url';
import {playEasterMedia,stopEasterMedia} from './mediaPlayback.mjs';
export const EASTER_MEDIA={video:robotUrl,audio:musicUrl};
export function useEasterMedia(video:RefObject<HTMLVideoElement|null>,audio:RefObject<HTMLAudioElement|null>){
 const active=useRef(false),[problem,setProblem]=useState('');
 const retry=useCallback(()=>{const v=video.current,a=audio.current;if(!v||!a)return;setProblem('');void playEasterMedia(v,a).catch(()=>{if(active.current)setProblem('Lecture du média indisponible. Réessayez ou fermez la fenêtre.');});},[video,audio]);
 useEffect(()=>{active.current=true;const v=video.current,a=audio.current;retry();return()=>{active.current=false;if(v)stopEasterMedia(v);if(a)stopEasterMedia(a);};},[video,audio,retry]);
 return {problem,retry,reportError:setProblem};
}
''')
N('src/features/easter-egg/mediaPlayback.mjs', r'''export async function playEasterMedia(video,audio){video.muted=true;video.loop=true;audio.loop=true;audio.volume=.4;await Promise.all([video.play(),audio.play()]);}
export function stopEasterMedia(...elements){for(const media of elements){media.pause();media.removeAttribute('src');media.load();}}
''')
N('src/features/easter-egg/mediaPlayback.d.mts', r'''export function playEasterMedia(video:HTMLVideoElement,audio:HTMLAudioElement):Promise<void>;
export function stopEasterMedia(...elements:HTMLMediaElement[]):void;
''')
N('src/features/easter-egg/mediaPlayback.test.mjs', r'''import {test} from 'node:test';import assert from 'node:assert/strict';import {playEasterMedia,stopEasterMedia} from './mediaPlayback.mjs';
const fake=()=>({muted:false,loop:false,volume:1,starts:0,pauses:0,loads:0,removed:[],play(){this.starts++;return Promise.resolve();},pause(){this.pauses++;},removeAttribute(name){this.removed.push(name);},load(){this.loads++;}});
test('video is muted and OGG loops independently',async()=>{const video=fake(),audio=fake();await playEasterMedia(video,audio);assert.equal(video.muted,true);assert.equal(video.loop,true);assert.equal(audio.loop,true);assert.equal(audio.volume,.4);assert.equal(video.starts,1);assert.equal(audio.starts,1);});
test('closing releases both media sources',()=>{const video=fake(),audio=fake();stopEasterMedia(video,audio);for(const media of [video,audio]){assert.equal(media.pauses,1);assert.equal(media.loads,1);assert.deepEqual(media.removed,['src']);}});
test('playback errors reach the UI',async()=>{const video=fake(),audio=fake();audio.play=()=>Promise.reject(new Error('blocked'));await assert.rejects(playEasterMedia(video,audio),/blocked/);});
''')
N('src/features/easter-egg/assets.d.ts', r'''declare module '*.mp4?url' {const url:string;export default url;}
declare module '*.ogg?url' {const url:string;export default url;}
''')
remove=['src/components/SecretParty.tsx','src/components/secretParty.css','src/components/easterPolicy.mjs','src/components/easterPolicy.d.mts','src/components/easterPolicy.test.mjs','.github/scripts/integrate-effects.py','.github/scripts/polish-effects.py','.github/scripts/finalize-ui.py','.github/effects-integration.applied','.github/effects-polish.applied','.github/last-ui.applied']
for path in Path('src').rglob('*'):
    name=path.as_posix()
    if path.is_file() and path.suffix in ['.ts','.tsx','.mjs','.mts','.css'] and name not in remove:
        text=pending.get(name) if name in pending else path.read_text(encoding='utf-8')
        if any(word in text for word in ['SecretParty','secretParty.css','easterPolicy']):raise SystemExit('Old import remains: '+name)
for name,text in pending.items():
    path=Path(name);path.parent.mkdir(parents=True,exist_ok=True)
    with path.open('w',encoding='utf-8',newline='\n') as f:f.write(text)
for old,dest,sha in assets:
    path=Path(dest);path.parent.mkdir(parents=True,exist_ok=True);Path(old).rename(path)
    if gitsha(path.read_bytes())!=sha:raise SystemExit('Media move integrity failure')
for name in remove:Path(name).unlink(missing_ok=True)
marker.write_text(key+'\n',encoding='utf-8')
print('Organized Easter egg sources and original media; run tests and Windows build before committing')
