import json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
REPORT='.github/diagnostics/review-v17.json'
pending={}
def read(p):return pending[p] if p in pending else (ROOT/p).read_text(encoding='utf-8')
def change(p,old,new):
 text=read(p)
 if text.count(old)!=1:raise RuntimeError(f'Unexpected source in {p}: {old[:80]!r}')
 pending[p]=text.replace(old,new,1)
def main():
 def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
 if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ' or git('branch','--show-current')!='v.1.7-dev' or git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA'):raise RuntimeError('Wrong development snapshot')
 if (ROOT/REPORT).exists():print('Review corrections already applied');return
 subprocess.run(['git','diff','--exit-code','--','src'],cwd=ROOT,check=True)
 p='src/components/EffectModal.tsx'
 change(p,"{effect!=='echo'&&effect!=='speed-pitch'&&<p>Sélection :","{effect!=='fade'&&effect!=='echo'&&effect!=='speed-pitch'&&<p>Sélection :")
 p='src/utils/controlGestures.ts'
 change(p,"    const field = event.target.closest('input[type=\"range\"], input[type=\"number\"], [role=\"slider\"]');","    const stereo = event.target.closest('.zonyx-rv-stereo');\n    if (stereo && event.target.closest('.zonyx-value-entry input')) return;\n    const field = event.target.closest('input[type=\"range\"], input[type=\"number\"], [role=\"slider\"]') ?? stereo?.querySelector('[role=\"slider\"]');")
 change(p,'    const direction = sum < 0 ? 1 : -1;',"    const direction = (sum < 0 ? 1 : -1) * (field.closest('.zonyx-rv-stereo') ? -1 : 1);")
 p='src/components/finishingV17.css'
 change(p,'border:1px solid #39ff14;border-radius:3px;background:#167d22;color:white!important;','border:1px solid #bd93f9;border-radius:3px;background:#533271;color:white!important;box-shadow:0 0 8px #39ff14;text-shadow:none!important;filter:none!important;')
 original=read(p).splitlines(keepends=True)
 obsolete=('.zonyx-opening{','.zonyx-opening>div{','.zonyx-opening img{')
 if sum(line.startswith(obsolete) for line in original)!=3:raise RuntimeError('Unknown old loading styles')
 pending[p]=''.join(line for line in original if not line.startswith(obsolete))+"""
#root#root [data-zonyx-position-label]{color:#39ff14!important}
.zonyx-welcome-presentation{display:flex;flex-direction:column;align-items:center;gap:14px;max-width:100%;flex-shrink:0}
.zonyx-opening-message{margin:0;max-width:min(420px,calc(100vw - 48px));text-align:center;color:#fff;font:600 14px/1.5 system-ui}
.zonyx-opening-sr{position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0}
.zonyx-opening-dots{display:inline-flex;width:3ch;justify-content:space-between}
.zonyx-opening-dots>span{animation:zonyx-loading-dot 1.2s ease-in-out infinite;opacity:.25}
.zonyx-opening-dots>span:nth-child(2){animation-delay:.2s}.zonyx-opening-dots>span:nth-child(3){animation-delay:.4s}
@keyframes zonyx-loading-dot{0%,60%,100%{opacity:.25}30%{opacity:1}}
.zonyx-opening-progress{position:fixed;top:64px;left:50%;transform:translateX(-50%);z-index:100;display:flex;align-items:center;gap:12px;max-width:calc(100vw - 32px);pointer-events:none}
.zonyx-opening-progress>img{width:64px;height:64px;object-fit:contain}
@media(prefers-reduced-motion:reduce){.zonyx-opening-dots>span{animation:none;opacity:1}}
"""
 p='src/utils/fileOpening.mjs'
 if 'registerWelcomeArtwork' in read(p):raise RuntimeError('Welcome loading integration already exists without its report')
 pending[p]=read(p)+"""
let welcomeCount=0;
export const getWelcomeSnapshot=()=>welcomeCount>0;
export function registerWelcomeArtwork(){welcomeCount++;notify();let active=true;return()=>{if(!active)return;active=false;welcomeCount--;notify();};}
"""
 p='src/utils/fileOpening.d.mts'
 pending[p]=read(p)+"export function getWelcomeSnapshot():boolean;\nexport function registerWelcomeArtwork():()=>void;\n"
 p='src/components/FileOpeningOverlay.tsx'
 if 'export function FileOpeningOverlay()' not in read(p):raise RuntimeError('Unknown loading component')
 pending[p]="""import {useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import waitImage from '../medias/wait.png?url';
import {subscribeFileOpening,getOpeningSnapshot,getWelcomeSnapshot} from '../utils/fileOpening.mjs';
export const FILE_OPENING_MESSAGE='Chargement du fichier en cours, veuillez patienter...';
export function FileOpeningMessage(){return <p className="zonyx-opening-message" role="status" aria-live="polite" aria-atomic="true"><span className="zonyx-opening-sr">{FILE_OPENING_MESSAGE}</span><span aria-hidden="true">Chargement du fichier en cours, veuillez patienter<span className="zonyx-opening-dots"><span>.</span><span>.</span><span>.</span></span></span></p>;}
export function FileOpeningOverlay(){
 const count=useSyncExternalStore(subscribeFileOpening,getOpeningSnapshot,()=>0),welcome=useSyncExternalStore(subscribeFileOpening,getWelcomeSnapshot,()=>false);
 return count&&!welcome?createPortal(<div className="zonyx-opening-progress" aria-busy="true"><img src={waitImage} alt="" draggable={false}/><FileOpeningMessage/></div>,document.body):null;
}
"""
 p='src/components/WelcomeArtwork.tsx'
 change(p,"import {useEffect,useRef,useState} from 'react';","import {useEffect,useLayoutEffect,useRef,useState,useSyncExternalStore} from 'react';\nimport waitImage from '../medias/wait.png?url';\nimport {FileOpeningMessage} from './FileOpeningOverlay';\nimport {subscribeFileOpening,getOpeningSnapshot,registerWelcomeArtwork} from '../utils/fileOpening.mjs';")
 change(p,'export function WelcomeArtwork(){',"export function WelcomeArtwork(){\n const loading=useSyncExternalStore(subscribeFileOpening,getOpeningSnapshot,()=>0)>0;\n useLayoutEffect(registerWelcomeArtwork,[]);\n const source=loading?waitImage:artwork;\n return <div className=\"zonyx-welcome-presentation\" aria-busy={loading}><ArtworkFrame key={source} source={source} description={loading?'ZØNYX patiente pendant le chargement':'ZØNYX vous souhaite la bienvenue'}/>{loading&&<FileOpeningMessage/>}</div>;\n}\nfunction ArtworkFrame({source,description}:{source:string;description:string}){")
 change(p,'src={artwork} alt="ZØNYX vous souhaite la bienvenue"','src={source} alt={description}')
 change(p,'/charger|ouvrir/i','/sélectionner|charger|ouvrir/i')
 labels=set()
 for p in ['src/App.tsx','src/components/WaveformView.tsx','src/components/ControlWindow.tsx']:
  original=read(p)
  node="import fs from 'node:fs';import {markStatusLabels} from './.github/maintenance/statusLabels.mjs';process.stdout.write(JSON.stringify(markStatusLabels(fs.readFileSync(0,'utf8'))));"
  result=subprocess.run(['node','--input-type=module','--eval',node],cwd=ROOT,input=original,text=True,capture_output=True,check=True)
  transformed=json.loads(result.stdout);labels.update(transformed['labels'])
  if transformed['source']!=original:pending[p]=transformed['source']
 if labels!={'Curseur','Sélection'}:raise RuntimeError('Both main-window position labels must be found')
 p='src/releaseNotes.ts'
 change(p,'export const RELEASE_FIXES = [','export const RELEASE_FIXES = [\n "Retours de test v1.7-dev : Z-Fondus allégé, valeurs de Z-Reverbe violettes et blanches, molette Stéréo corrigée.",\n "Chargement : remplacement du robot d’accueil par wait.png, texte explicite et trois points animés ; libellés Curseur et Sélection en vert.",')
 pending['src/utils/reviewV17.test.mjs']=r"""import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {markStatusLabels} from '../../.github/maintenance/statusLabels.mjs';
import {getWelcomeSnapshot,registerWelcomeArtwork} from './fileOpening.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('status labels preserve expressions attributes and repeated application',()=>{for(const input of ['const V=()=> <div>Curseur : {cursor} Sélection : {selection}</div>;',"const V=()=> <div>{'Curseur : '}{cursor}{'Sélection : '}{selection}</div>;",'const V=()=> <div>{`Curseur : ${cursor} / Sélection : ${selection}`}</div>;']){const result=markStatusLabels(input);assert.deepEqual(result.labels.sort(),['Curseur','Sélection']);assert.equal(markStatusLabels(result.source).source,result.source);assert.match(result.source,/cursor/);assert.match(result.source,/selection/);}const attributes="const V=()=> <div title={'Curseur'} aria-label={`Sélection`}>x</div>;";assert.equal(markStatusLabels(attributes).source,attributes);});
test('welcome registration cleans up exactly once',()=>{const a=registerWelcomeArtwork(),b=registerWelcomeArtwork();assert.equal(getWelcomeSnapshot(),true);a();a();assert.equal(getWelcomeSnapshot(),true);b();assert.equal(getWelcomeSnapshot(),false);});
test('loading replaces one artwork without the former modal backdrop',()=>{const w=read('../components/WelcomeArtwork.tsx'),m=read('../components/FileOpeningOverlay.tsx'),css=read('../components/finishingV17.css');assert.ok(w.includes('source=loading?waitImage:artwork'));assert.ok(w.includes('key={source}'));assert.equal((w.match(/<img\b/g)||[]).length,1);assert.ok(m.includes('count&&!welcome'));assert.ok(!m.includes('className="zonyx-opening"'));assert.ok(m.includes('Chargement du fichier en cours, veuillez patienter...'));assert.equal((m.match(/<span>\.<\/span>/g)||[]).length,3);assert.ok(css.includes('@keyframes zonyx-loading-dot'));assert.ok(!css.includes('.zonyx-opening{'));});
test('fade removes its duration while reverb keeps violet white and green styling',()=>{const source=read('../components/EffectModal.tsx'),condition=source.match(/\{([^{}]+)&&<p>Sélection :/)?.[1];assert.ok(condition);const visible=new Function('effect',`return ${condition};`);for(const effect of ['fade','echo','speed-pitch'])assert.equal(visible(effect),false);assert.equal(visible('noise-reduction'),true);const css=read('../components/finishingV17.css');for(const text of ['background:#533271','color:white!important','box-shadow:0 0 8px #39ff14'])assert.ok(css.includes(text));});
test('stereo wheel inversion leaves all other controls unchanged',()=>{const source=read('controlGestures.ts'),expression=source.match(/const direction = ([^;]+);/)?.[1];assert.ok(expression);const direction=new Function('sum','field',`return ${expression};`);for(const stereo of [false,true]){const field={closest:()=>stereo?{}:null};assert.equal(direction(-120,field),stereo?-1:1);assert.equal(direction(120,field),stereo?1:-1);}assert.ok(source.includes("?? stereo?.querySelector('[role=\"slider\"]')"));});
"""
 for p,text in pending.items():(ROOT/p).write_text(text,encoding='utf-8')
 report={'baseCommit':os.environ['GITHUB_SHA'],'files':sorted(pending),'validation':'pending','pending':['variable-tempo-detection-grid-and-effect-synchronization','manual-Windows-visual-and-listening-review','user-approval-before-main']}
 (ROOT/REPORT).write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'preparedFiles':len(pending),'labels':sorted(labels)},ensure_ascii=False))
if __name__=='__main__':main()
