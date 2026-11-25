import hashlib,json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
REPORT='.github/diagnostics/finishing-v17.json'
pending={}
def read(p):return pending[p] if p in pending else (ROOT/p).read_text(encoding='utf-8')
def change(p,old,new):
 text=read(p)
 if text.count(old)!=1:raise RuntimeError(f'Unexpected source in {p}: {old[:90]!r}')
 pending[p]=text.replace(old,new,1)
def put(p,text):
 if (ROOT/p).exists():raise RuntimeError('Refusing to overwrite '+p)
 pending[p]=text

def prepare():
 p='src/utils/welcomeLogo.ts'
 change(p,"const excluded='button,header,nav,aside,[role=\"menu\"],[role=\"dialog\"]';","const excluded='header,nav,aside,[role=\"menu\"],[role=\"dialog\"]';")
 change(p,'!svg.closest(excluded)','!svg.closest(`button,${excluded}`)')
 change(p,'!img.closest(excluded)','!img.closest(`button,${excluded}`)')
 change(p,"img.className='zonyx-welcome-vinyl';","img.className='zonyx-welcome-vinyl zonyx-brand-logo';")
 p='src/components/AdvancedEffects.tsx'
 change(p,"eq ? 'Z-égaliseur'","eq ? 'Z-Égaliseur'")
 change(p,'<header><div><h2 id="advanced-title">','<header><h2 id="advanced-title">')
 change(p,"'Z-Limit/Comp'}</h2></div><button","'Z-Limit/Comp'}</h2><button")
 change(p,'<span>COMPRESSION</span>','')
 p='src/components/EffectModal.tsx'
 change(p,'<p>Sélection : {((end-start)/doc.sampleRate).toFixed(2)} s</p>',"{effect!=='echo'&&effect!=='speed-pitch'&&<p>Sélection : {((end-start)/doc.sampleRate).toFixed(2)} s</p>}")
 change(p,'<span>Double-clic : valeur initiale</span>','')
 change('src/components/EffectControls.tsx',' title="Double-clic : valeur par défaut"','')
 change('src/components/EffectPanel.tsx','title="Glisser · Double-clic : taille initiale · Flèches : ajuster"','title="Glisser pour redimensionner · Flèches : ajuster"')
 p='src/components/Tutorial.tsx'
 change(p,"import img5 from '../medias/05.png?url';","import img5 from '../medias/05.png?url';\nimport professor from '../medias/pro.png?url';")
 change(p,'Salut, je suis ZØNYX, votre compagnon dans Audio ToolZ ! Je suis là pour vous accompagner.','Salut, moi c’est ZØNYX ! Je vous accompagne pour donner vie à vos sons.')
 change(p,' {image:img3,'," {image:professor,alt:'ZØNYX vous guide dans les effets',title:'Je suis là pour vous guider',intro:['Un réglage vous intrigue ? Cliquez sur le « ? » en haut à droite de la fenêtre d’effet : je vous guide pas à pas.','Je vous explique le rôle des commandes et vous aide à explorer les réglages, à votre rythme.']},\n {image:img3,")
 change(p,'Un dernier mot d’ZØNYX','Un dernier mot de ZØNYX')
 change('src/components/InfoModal.tsx',"export const APP_VERSION = 'v1.6';","export const APP_VERSION = 'v1.7-dev';")
 change('src/App.tsx',"document.title = 'Audio ToolZ v1.6';","document.title = 'Audio ToolZ v1.7-dev';")
 p='src/components/effectHelpContent.mjs'
 change(p,'Faites glisser le triangle en bas à droite. Double-cliquez dessus pour retrouver la taille initiale ; utilisez les flèches lorsqu’il est sélectionné pour ajuster la taille.','Faites glisser le triangle en bas à droite ; utilisez les flèches lorsqu’il est sélectionné pour ajuster la taille.')
 p='src/components/effectHelpPresentation.mjs'
 line=next(line for line in read(p).splitlines() if line.startswith(' if(!/reverb'))
 if 'Réglages initiaux' not in line:raise RuntimeError('Unexpected delay help')
 change(p,line,line.split('{',1)[0]+'return {title,topics:base};')
 line=next(line for line in read(p).splitlines() if line.startswith("  if(label==='Largeur')"))
 change(p,line,"  if(label==='Largeur')return ['Stéréo','À droite, côté Mono : 0 %. Au centre, à midi : 50 %. À fond à gauche : 100 %. Le signal Direct reste inchangé.'];")
 change(p,' const base='," const clean=label=>label.replace(/_/g,' ').replace(/[.·•]+$/u,'').trim();\n const base=")
 change(p,'.map(t=>[...t])','.map(([label,text])=>[clean(label),text])')
 change(p,'topics:result};','topics:result.map(([label,text])=>[clean(label),text])};')
 p='src/components/userFeedback.test.mjs'
 change(p,'help retains requested omissions and delay explains double-click','help retains omissions and gestures without reset instructions')
 change(p,"assert.match(topics.get('Réglages initiaux'),/Double-cliquez/);","assert.equal(topics.has('Réglages initiaux'),false);assert.doesNotMatch(JSON.stringify([...topics]),/double[\\s-]*clic/i);assert.match(read('EffectControls.tsx'),/onDoubleClick/);")
 p='src/App.tsx'
 change(p,"import {useBeatSync} from './utils/finalUi';","import {useBeatSync} from './utils/finalUi';\nimport {withFileOpening} from './utils/fileOpening.mjs';")
 change(p,'async (file: File, recentToken?: string) => {','async (file: File, recentToken?: string) => withFileOpening(async () => {')
 change(p,'    },\n    [showToast]\n  );\n\n  const handleOpenRecent','    }),\n    [showToast]\n  );\n\n  const handleOpenRecent')
 change(p,'await api.openRecent(id)','await withFileOpening(()=>api.openRecent(id))')
 change(p,'await api.pickAudioFiles()','await withFileOpening(()=>api.pickAudioFiles())')
 p='src/main.tsx'
 change(p,"import {useEffect} from 'react';","import {useEffect} from 'react';\nimport {FileOpeningOverlay} from './components/FileOpeningOverlay';\nimport './components/finishingV17.css';")
 change(p,'<><App /><BuildTitle /></>','<><App /><BuildTitle /><FileOpeningOverlay /></>')
 put('src/utils/fileOpening.mjs',"""let count=0;const listeners=new Set();
export const getOpeningSnapshot=()=>count;
export function subscribeFileOpening(listener){listeners.add(listener);return()=>listeners.delete(listener);}
const notify=()=>{for(const listener of [...listeners])listener();};
const paint=()=>new Promise(resolve=>typeof requestAnimationFrame==='function'?requestAnimationFrame(()=>setTimeout(resolve,0)):setTimeout(resolve,0));
export async function withFileOpening(work){count++;try{notify();await paint();return await work();}finally{count--;notify();}}
""")
 put('src/utils/fileOpening.d.mts',"export function getOpeningSnapshot():number;\nexport function subscribeFileOpening(listener:()=>void):()=>void;\nexport function withFileOpening<T>(work:()=>Promise<T>):Promise<T>;\n")
 put('src/components/FileOpeningOverlay.tsx',"""import {useSyncExternalStore} from 'react';
import {createPortal} from 'react-dom';
import waitImage from '../medias/wait.png?url';
import {subscribeFileOpening,getOpeningSnapshot} from '../utils/fileOpening.mjs';
export function FileOpeningOverlay(){const count=useSyncExternalStore(subscribeFileOpening,getOpeningSnapshot,()=>0);return count?createPortal(<div className="zonyx-opening" role="status" aria-live="polite" aria-busy="true"><div><img src={waitImage} alt="" draggable={false}/><p>Ouverture en cours. Patientez.</p></div></div>,document.body):null;}
""")
 p='src/components/ReverbModal.tsx'
 change(p,"[error,setError]=useState('');","[error,setError]=useState(''),[info,setInfo]=useState('Choisissez un réglage');")
 change(p,' const visual=useRef('," const update=(id:keyof ReverbSettings,value:number,label=String(id),unit='%')=>{setInfo(`${label} : ${new Intl.NumberFormat('fr-FR',{maximumFractionDigits:3}).format(id==='width'?value/2:value)} ${unit}`);setBusy(true);setSettings(s=>({...s,[id]:value}));};\n const visual=useRef(")
 change(p,'onChange={v=>setSettings(s=>({...s,[id]:v}))}','onChange={v=>update(id,v,label,unit)}')
 change(p,'<div className="zonyx-rv-fader-track">',"<div className=\"zonyx-rv-fader-track\" style={{'--zonyx-level':settings[id]/100} as React.CSSProperties}>")
 change(p,'step={1} value={settings[id]} aria-label=','step={1} value={settings[id]} aria-valuetext={`${settings[id]} %`} aria-label=')
 change(p,'onDoubleClick={()=>setSettings(s=>({...s,[id]:DEFAULT_REVERB[id]}))}',"onDoubleClick={()=>update(id,DEFAULT_REVERB[id],['Direct','Réflexions','Réverbération'][i])}")
 change(p,'onChange={e=>setSettings(s=>({...s,[id]:Number(e.target.value)}))}/></div>',"onChange={e=>update(id,Number(e.target.value),['Direct','Réflexions','Réverbération'][i])}/><output className=\"zonyx-rv-exact\" aria-hidden=\"true\">{settings[id]} %</output></div>")
 change(p,'value={100-settings.width} initial={0} spec={{min:-100,max:100,step:2,fine:.2,digits:0}} unit="%" onChange={v=>setSettings(s=>({...s,width:100-v}))}',"value={settings.width/2} initial={DEFAULT_REVERB.width/2} spec={{min:0,max:100,step:1,fine:.1,digits:0}} unit=\"%\" onChange={v=>update('width',v*2,'Stéréo')}")
 change(p,'<span>Large</span><span>Mono</span>','<span>Stéréo</span><span>Mono</span>')
 change(p,'{result&&result.peak>1&&<p role="alert">Le rendu dépasse 0 dBFS.</p>}',"<div className=\"zonyx-rv-info\"><output role=\"status\">{info}</output><span role=\"status\">{result&&result.peak>1?'Attention : dépassement de 0 dBFS':''}</span></div>")
 change(p,'const channels=doc.channels.map(c=>c.slice(start,end));worker.current.postMessage({...r,channels,sampleRate:doc.sampleRate},{transfer:channels.map(c=>c.buffer as ArrayBuffer)});',"worker.current.postMessage({kind:'render',...r});")
 change(p,'worker.current=w;w.onmessage=',"worker.current=w;const channels=doc.channels.map(c=>c.slice(start,end));w.postMessage({kind:'init',channels,sampleRate:doc.sampleRate},{transfer:channels.map(c=>c.buffer as ArrayBuffer)});w.onmessage=")
 change(p,'if(exit.current!.settled)return;working.current=false;const r=e.data;','if(exit.current!.settled||worker.current!==w)return;working.current=false;const r=e.data;if(r.id!==serial.current){dispatch();return;}')
 p='src/audio/reverb.worker.ts'
 change(p,'type Request={id:number;channels:Float32Array[];sampleRate:number;settings:Partial<ReverbSettings>};',"type Request={kind:'init';channels:Float32Array[];sampleRate:number}|{kind:'render';id:number;settings:Partial<ReverbSettings>};\nlet source:Float32Array[]|null=null,rate=0;")
 change(p,' const {id,channels,sampleRate,settings}=event.data;'," const request=event.data;if(request.kind==='init'){source=request.channels;rate=request.sampleRate;return;}const {id,settings}=request,channels=source,sampleRate=rate;")
 change(p,' try{'," try{\n  if(!channels)throw new Error('Reverb source not initialized');")
 put('src/components/finishingV17.css',"""#root#root .zonyx-advanced>header{display:grid;grid-template-columns:80px minmax(0,1fr) 80px;align-items:center}
#root#root .zonyx-advanced>header>h2{grid-column:2;grid-row:1;display:flex;align-items:center;justify-content:center;margin:0;min-width:0;font-weight:700!important;white-space:nowrap!important;text-align:center}
#root#root .zonyx-advanced>header>.zonyx-effect-header-actions{grid-column:3;grid-row:1;justify-self:end}
#root#root .zonyx-delay-mode-position>span:last-child{color:#fff!important;font-weight:700;text-decoration:none!important}
#root#root .zonyx-delay-mode-position:nth-child(-n+3)[aria-checked=true]>span:last-child{color:#39ff14!important}
#root#root .zonyx-delay-mode-position:last-child[aria-checked=true]{border-color:transparent;background:transparent;box-shadow:none!important}
#root#root .zonyx-delay-mode-position:last-child .zonyx-delay-mode-contact{border-color:#9368c8;background:#34394b;box-shadow:none}
#root#root .zonyx-control-group[aria-label=Compression]{padding-top:0;margin-top:0}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link{font-weight:700!important;text-decoration:none!important;border-bottom:0}
.zonyx-help-dialog .zonyx-help-link::before{content:'→';display:inline-block;margin-right:.5em;color:var(--zonyx-help-green,#39ff14)}
#root#root .zonyx-advanced .zonyx-hint,#root#root .zonyx-advanced [class*="accent-secondary"]{font-weight:700;text-decoration:none}
#root#root .zonyx-advanced .zonyx-hint::before{content:'→ '}
#root#root .zonyx-rv-stereo .zonyx-parameter>button svg{transform:scaleX(-1)}
#root#root .zonyx-rv-exact{display:none;position:absolute;right:25px;top:calc(9px + (1 - var(--zonyx-level))*134px);transform:translateY(-50%);z-index:5;padding:2px 5px;border:1px solid #39ff14;border-radius:3px;background:#167d22;color:white!important;text-align:center;font:700 11px/16px system-ui;pointer-events:none;white-space:nowrap}
#root#root .zonyx-rv-fader-track:focus-within .zonyx-rv-exact{display:block}
#root#root .zonyx-rv-info{display:grid;grid-template-columns:1fr 1fr;align-items:center;gap:10px;height:30px;font-size:11px;font-variant-numeric:tabular-nums}
#root#root .zonyx-rv-info>span{text-align:right}
#root img.zonyx-welcome-vinyl{pointer-events:auto!important;filter:none!important;box-shadow:none!important}
.zonyx-opening{position:fixed;inset:0;z-index:2147483646;display:grid;place-items:center;background:#110d18d9;color:#fff;font:600 15px/1.5 system-ui;text-align:center}
.zonyx-opening>div{max-width:90vw;padding:24px;border:1px solid #9563c8;border-radius:12px;background:#241733}
.zonyx-opening img{display:block;width:min(200px,50vw);height:auto;margin:auto}.zonyx-opening p{margin:16px 0 0}
""")
 p='src/releaseNotes.ts'
 change(p,'export const RELEASE_ADDITIONS = [','export const RELEASE_ADDITIONS = [\n "v1.7-dev : écran d’ouverture local avec wait.png, page de conseils avec ZØNYX, titres et modes du délai corrigés.",\n "Z-Reverbe : valeurs précises, Stéréo de 0 à 100 %, ligne de réglage fixe et source transférée une seule fois au worker.",')
 change(p,'Le BPM sert au calcul des temps musicaux de Z-Delay ; les autres effets ne dépendent pas de cette détection.','Le BPM synchronise les temps musicaux de Z-Delay et le prédélai de Z-Reverbe lorsque son bouton Tempo est activé.')
 package=(ROOT/'.github/scripts/package-single-16.py').read_text(encoding='utf-8')
 package=package.replace('v1.6','v1.7-dev').replace('src/medias/logo.ico','__SOURCE_ICON__').replace('logo.ico','Audio ToolZ.ico').replace('__SOURCE_ICON__','src/medias/logo.ico').replace('desktop.ini','Desktop.ini')
 old="ini = '[.ShellClassInfo]\\r\\nIconResource=Audio ToolZ.ico,0\\r\\nLocalizedResourceName=Audio ToolZ\\r\\n'"
 if package.count(old)!=1:raise RuntimeError('Unexpected packaging template')
 package=package.replace(old,"ini = '[.ShellClassInfo]\\r\\nLocalizedResourceName=Audio ToolZ\\r\\nIconResource=Audio ToolZ.ico,0\\r\\n'")
 package=package.replace("(['+h', '+s'], folder / 'Desktop.ini')","(['+r', '+h', '+s'], folder / 'Desktop.ini')").replace("'Audio ToolZ/Desktop.ini': 0x26","'Audio ToolZ/Desktop.ini': 0x27").replace('ini_attributes & 0x6 != 0x6','ini_attributes & 0x7 != 0x7')
 package=package.replace('not folder_attributes & (0x1 | 0x4)','(folder_attributes & 0x1) != 0x1')
 package=package.replace(''.join(map(chr,[65,84,90])),'zonyx')
 package=package.replace("assert (actual / 'Audio ToolZ.ico').read_bytes() == icon.read_bytes()","assert get_attributes(str(actual / 'Audio ToolZ.ico')) & 0x2\nassert (actual / 'Audio ToolZ.ico').read_bytes() == icon.read_bytes()")
 compile(package,'package-v17.py','exec');put('.github/maintenance/package-v17.py',package)
 put('src/utils/finishingV17.test.mjs',"""import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {withFileOpening,getOpeningSnapshot,subscribeFileOpening} from './fileOpening.mjs';
import {presentEffectHelp} from '../components/effectHelpPresentation.mjs';
test('opening state clears after decoding failure',async()=>{const seen=[],stop=subscribeFileOpening(()=>seen.push(getOpeningSnapshot()));try{await assert.rejects(withFileOpening(async()=>{assert.equal(getOpeningSnapshot(),1);throw Error('decode');}),/decode/);assert.deepEqual(seen,[1,0]);}finally{stop();}assert.equal(getOpeningSnapshot(),0);});
test('nested opening keeps the overlay until all work finishes',async()=>{await withFileOpening(async()=>{assert.equal(getOpeningSnapshot(),1);await withFileOpening(async()=>assert.equal(getOpeningSnapshot(),2));assert.equal(getOpeningSnapshot(),1);});assert.equal(getOpeningSnapshot(),0);});
test('help preserves input and explains percentages without reset instructions',()=>{const input=[['Largeur','old']],before=JSON.stringify(input),result=presentEffectHelp('Z-Reverbe',input);assert.match(JSON.stringify(result),/50 %/);assert.doesNotMatch(JSON.stringify(result),/double[\\s-]*clic/i);assert.equal(JSON.stringify(input),before);});
test('stereo uses half the native width and keeps worker source initialization',()=>{const code=readFileSync('src/components/ReverbModal.tsx','utf8');assert.ok(code.includes('value={settings.width/2}'));assert.ok(code.includes("update('width',v*2,'Stéréo')"));assert.ok(code.includes("postMessage({kind:'init',channels"));assert.ok(code.includes("postMessage({kind:'render',...r})"));});
""")

def main():
 def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
 if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ':raise RuntimeError('Wrong repository')
 if git('branch','--show-current')!='v.1.7-dev' or git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA'):raise RuntimeError('Wrong development snapshot')
 if git('status','--porcelain'):raise RuntimeError('Clean checkout required')
 if (ROOT/REPORT).exists():print('Finishing already applied');return
 prepare()
 asset=subprocess.check_output(['git','cat-file','blob','363b9a907aea4512d2840c83d9eb706fd1ebf889'],cwd=ROOT)
 if hashlib.sha1(b'blob '+str(len(asset)).encode()+b'\0'+asset).hexdigest()!='363b9a907aea4512d2840c83d9eb706fd1ebf889':raise RuntimeError('Wrong wait.png')
 image=ROOT/'src/medias/wait.png'
 if image.exists() and image.read_bytes()!=asset:raise RuntimeError('Refusing to replace a different wait.png')
 blobs={p:text.encode('utf-8') for p,text in pending.items()};blobs['src/medias/wait.png']=asset
 for p,data in blobs.items():
  path=ROOT/p;path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data)
 report={'baseCommit':os.environ['GITHUB_SHA'],'files':sorted(blobs),'validation':'pending','pending':['variable-tempo-detection-grid-and-effect-synchronization','manual-Windows-visual-and-listening-review']}
 path=ROOT/REPORT;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
 print(json.dumps({'preparedFiles':len(blobs)},ensure_ascii=False))
if __name__=='__main__':main()
