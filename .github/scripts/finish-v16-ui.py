from pathlib import Path
import hashlib, os
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
marker=Path('.github/final-ui.applied')
key=hashlib.sha256(Path(__file__).read_bytes()).hexdigest()
if marker.exists():
 if marker.read_text().strip()!=key:raise SystemExit('Final UI migration changed')
 raise SystemExit(0)
stored_links = r'''>Rejoindre la communauté Telegram</a>
        <a className="atz-about-link" href="https://github.com/x-R0b0T-x/Audio-ToolZ" target="_blank" rel="noopener noreferrer" onClick={openCommunity}>Visiter le dépôt GitHub</a>
        <a className="atz-about-link" href="https://www.paypal.com/ncp/payment/GAUJE54VM28T8" target="_blank" rel="noopener noreferrer" onClick={openCommunity}>Faire un don</a>
        </div></div>'''
layout_css = r'''
.atz-about-hero{display:grid;grid-template-columns:minmax(100px,1fr) minmax(0,2fr);gap:18px;align-items:center;width:100%;padding:4px 8px;container-type:inline-size}
.atz-about-hero .atz-about-robot{--atz-art-size:clamp(64px,20cqw,150px);justify-self:center}
.atz-about-actions{display:flex;flex-direction:column;gap:12px;min-width:0;width:100%}
.atz-about-actions>a{display:flex;align-items:center;justify-content:center;text-align:center;min-height:38px;width:100%;padding:8px 12px;border-radius:7px;border:1px solid #b34dff55;background:#b34dff12;text-decoration:none;white-space:normal;font-size:12px}
.atz-about-link:hover,.atz-about-link:focus-visible{border-color:#39ff14;box-shadow:inset 0 0 0 1px #39ff1480,0 0 7px #39ff1466;outline:none}
'''
final_ui = r'''import {useEffect} from 'react';
import type {AudioDocument} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {beatPulse} from './finalUiMath.mjs';
export function useBeatSync(doc:AudioDocument|null){
 useEffect(()=>{
  const bpm=doc?.bpmInfo?.bpm??0,rate=doc?.sampleRate??44100,origin=doc?.bpmInfo?.beatSamples[0]??0;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');let frame=0,image:HTMLImageElement|null=null,snap:HTMLElement|null=null;
  const resetImage=()=>{if(image){image.style.removeProperty('animation');image.style.removeProperty('transform');}};
  const resetSnap=()=>{if(snap)snap.style.removeProperty('box-shadow');};
  const tick=(now:number)=>{
   const next=document.querySelector<HTMLImageElement>('.atz-about-robot>img');if(next!==image){resetImage();image=next;}
   const target=document.querySelector<HTMLElement>('[data-testid="snap-kicks-toggle"]');if(target!==snap){resetSnap();snap=target;}
   const valid=Number.isFinite(bpm)&&bpm>0,playing=audioEngine.isPlaying;
   const pulse=beatPulse(playing?audioEngine.getCurrentSample():now*rate/1000,bpm,rate,playing?origin:0);
   if(image&&valid&&playing&&!reduced.matches){image.style.animation='none';image.style.transform=`scale(${1+.16*pulse})`;}else resetImage();
   if(snap&&valid&&doc?.showBeatGrid&&snap.getAttribute('aria-pressed')==='true'&&!reduced.matches){snap.style.setProperty('box-shadow',`inset 0 0 0 1px #39ff1499,0 0 ${4+8*pulse}px #39ff14cc,0 0 ${8+14*pulse}px #39ff1466`,'important');}else resetSnap();
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);return()=>{cancelAnimationFrame(frame);resetImage();resetSnap();};
 },[doc?.id,doc?.bpmInfo,doc?.sampleRate,doc?.showBeatGrid]);
}
export function installDescriptions(root:HTMLElement){
 const tip=document.createElement('div');tip.id='atz-description';tip.setAttribute('role','tooltip');
 Object.assign(tip.style,{position:'fixed',zIndex:'2147483647',maxWidth:'min(340px, calc(100vw - 16px))',padding:'8px 12px',border:'1px solid #39ff14',borderRadius:'7px',background:'#17131f',color:'#fff',font:'12px/1.45 system-ui',boxShadow:'0 0 6px #39ff14aa,0 0 14px #39ff1455',pointerEvents:'none'});
 let current:HTMLElement|null=null,title:string|null=null,described:string|null=null,timer=0;
 const hide=()=>{window.clearTimeout(timer);tip.remove();if(current){if(title!==null)current.setAttribute('title',title);if(described===null)current.removeAttribute('aria-describedby');else current.setAttribute('aria-describedby',described);}current=null;};
 const show=(event:Event)=>{
  if(!(event.target instanceof Element)||current?.contains(event.target))return;
  const node=event.target.closest<HTMLElement>('[title]');if(!node||!root.contains(node))return;
  hide();current=node;title=node.getAttribute('title');described=node.getAttribute('aria-describedby');node.removeAttribute('title');
  tip.textContent=title==='Volume'?'Volume — Régler le niveau sonore de la sélection ou du morceau.':title;
  timer=window.setTimeout(()=>{if(current!==node)return;document.body.appendChild(tip);node.setAttribute('aria-describedby',[described,tip.id].filter(Boolean).join(' '));const r=node.getBoundingClientRect(),box=tip.getBoundingClientRect();tip.style.left=`${Math.max(8,Math.min(innerWidth-box.width-8,r.left+r.width/2-box.width/2))}px`;tip.style.top=`${r.bottom+box.height+12<innerHeight?r.bottom+8:Math.max(8,r.top-box.height-8)}px`;},300);
 };
 const out=(event:PointerEvent)=>{if(current&&(!(event.relatedTarget instanceof Node)||!current.contains(event.relatedTarget)))hide();};
 const key=(event:KeyboardEvent)=>{if(event.key==='Escape')hide();};
 root.addEventListener('pointerover',show);root.addEventListener('pointerout',out);root.addEventListener('focusin',show);root.addEventListener('focusout',hide);window.addEventListener('scroll',hide,true);window.addEventListener('keydown',key);
 return()=>{hide();root.removeEventListener('pointerover',show);root.removeEventListener('pointerout',out);root.removeEventListener('focusin',show);root.removeEventListener('focusout',hide);window.removeEventListener('scroll',hide,true);window.removeEventListener('keydown',key);};
}
'''
math_code = r'''export function beatPulse(sample,bpm,rate,origin=0){
 if(!Number.isFinite(sample)||!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(rate)||rate<=0||!Number.isFinite(origin))return 0;
 const phase=((((sample-origin)*bpm/(rate*60))%1)+1)%1;
 return (1+Math.cos(phase*2*Math.PI))/2;
}
export function loopSelection(point,end){return {startSample:point,endSample:point<end?end:point};}
'''
math_types = r'''export function beatPulse(sample:number,bpm:number,rate:number,origin?:number):number;
export function loopSelection(point:number,end:number):{startSample:number;endSample:number};
'''
new_tests = r'''import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {beatPulse,loopSelection} from './finalUiMath.mjs';
test('beat pulse follows sample position and beat origin',()=>{assert.equal(beatPulse(0,120,48000),1);assert.ok(beatPulse(12000,120,48000)<1e-10);assert.equal(beatPulse(24000,120,48000),1);assert.equal(beatPulse(25000,120,48000,1000),1);assert.equal(beatPulse(-24000,120,48000),1);assert.equal(beatPulse(0,0,48000),0);});
test('loop click retains current end or starts a pending new region',()=>{assert.deepEqual(loopSelection(30,80),{startSample:30,endSample:80});assert.deepEqual(loopSelection(90,80),{startSample:90,endSample:90});assert.deepEqual(loopSelection(80,80),{startSample:80,endSample:80});});
test('stopped preview guard precedes audio replacement and fallback playback',()=>{const app=readFileSync('src/App.tsx','utf8'),start=app.indexOf('onStartPreview='),body=app.slice(start,start+2400),guard=body.indexOf('if(!audioEngine.isPlaying){setIsPreviewPlaying(false);return;}');assert.ok(start>=0&&guard>=0);assert.ok(guard<body.indexOf('audioEngine.replacePreviewAudio'));assert.ok(guard<body.indexOf('audioEngine.play('));});
test('About links are precisely allowed by the native opener',()=>{const info=readFileSync('src/components/InfoModal.tsx','utf8'),rust=readFileSync('src-tauri/src/main.rs','utf8');for(const url of ['https://github.com/x-R0b0T-x/Audio-ToolZ','https://www.paypal.com/ncp/payment/GAUJE54VM28T8']){assert.ok(info.includes(url));assert.ok(rust.includes('target != "'+url+'"'));}});
test('changelog main heading is white and bold',()=>{const css=readFileSync('src/textReadability.css','utf8');assert.ok(css.includes('#root #about-changelog-title{color:#fff!important;font-weight:700!important}'));});
'''
paths=['src/App.tsx','src/components/InfoModal.tsx','src-tauri/src/main.rs','src/utils/useWaveformInteractions.ts','src/components/WaveformView.tsx','src/main.tsx','src/components/aboutPresentation.css','src/textReadability.css','src/components/knobStates.css','src/components/aboutLight.test.mjs','src/audio/controlPolish.test.ts']
pending={p:Path(p).read_text(encoding='utf-8') for p in paths}
expected={'src/App.tsx':'69bd3974715b210a8b8642f8765bbba2fdd01199','src/components/InfoModal.tsx':'57129e5fe02b75edb182a656d1881d6d10956498','src-tauri/src/main.rs':'5f6c6fb4e5df2344b306752a6686f897a784a60d','src/utils/useWaveformInteractions.ts':'bedccb0de4728120981c693c1932114fc47d7fd1'}
for p,sha in expected.items():
 b=pending[p].encode()
 if hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()!=sha:raise SystemExit('Source changed: '+p)
def replace(p,old,new):
 if pending[p].count(old)!=1:raise SystemExit('Ambiguous patch: '+p+' '+old[:90])
 pending[p]=pending[p].replace(old,new,1)
p='src/App.tsx'
pending[p]="import {useBeatSync} from './utils/finalUi';\n"+pending[p]
replace(p,'  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;','  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;\n  useBeatSync(activeDoc);')
replace(p,'              if(!audioEngine.replacePreviewAudio(full,sampleRate,','              if(!audioEngine.isPlaying){setIsPreviewPlaying(false);return;}\n              if(!audioEngine.replacePreviewAudio(full,sampleRate,')
replace(p,'<WaveformView',"<WaveformView isLooping={isPlaying&&isLooping&&playMode==='loop'}")
replace(p,"        onSelectionCommit={(sel, reason) => {","""        onSelectionCommit={(sel, reason) => {
          if(reason==='cursor'&&isLooping&&isPlaying&&playMode==='loop'&&sel.endSample<=sel.startSample){
            audioEngine.stop(true);setIsPlaying(false);setIsPaused(false);setIsLooping(false);setPlayMode('idle');
            updateActiveDoc(doc=>({...doc,selection:sel}));return;
          }""")
old='audioEngine.updateLoopRegion(sel.startSample, sel.endSample, false);'
if pending[p].count(old) not in (1,2):raise SystemExit('Unexpected loop callbacks')
pending[p]=pending[p].replace(old,"audioEngine.updateLoopRegion(sel.startSample, sel.endSample, playMode === 'loop' && reason === 'resize-start');")
p='src/components/WaveformView.tsx'
replace(p,'interface WaveformViewProps {','interface WaveformViewProps {\n  isLooping?: boolean;')
replace(p,'  documents,\n  activeDocId,','  documents,\n  isLooping,\n  activeDocId,')
replace(p,'useWaveformInteractions({ canvas: mainCanvasRef, doc: activeDoc, isRecording,','useWaveformInteractions({ canvas: mainCanvasRef, doc: activeDoc, isRecording, isLooping,')
p='src/utils/useWaveformInteractions.ts'
pending[p]="import {loopSelection} from './finalUiMath.mjs';\n"+pending[p]
replace(p,'interface Options {','interface Options {\n  isLooping?: boolean;')
replace(p,'      if (selection.endSample > selection.startSample) {',"""      if(latest.current.isLooping){
        const frame=dragFrame(doc.viewStartSample,doc.viewEndSample,total,left,width,event.clientX,0);
        const point=Math.min(total-1,snap(frame.sample,width,length,event.altKey));
        const next=loopSelection(point,selection.endSample);
        if(selection.endSample>selection.startSample&&next.endSample>next.startSample){begin('resize-start',0,event,selection);return;}
        latest.current.onSelectionChange(next,'cursor-drag');begin('cursor',0,event,next);return;
      }
      if (selection.endSample > selection.startSample) {""")
p='src/components/InfoModal.tsx'
replace(p,"    void bridge.invoke('open_community_url',{url:'https://t.me/Audio_ToolZ'}).catch(()=>setCommunityError(\"Impossible d’ouvrir Telegram dans le navigateur.\"));","    void bridge.invoke('open_community_url',{url:event.currentTarget.href}).catch(()=>setCommunityError(\"Impossible d’ouvrir le lien dans le navigateur.\"));")
replace(p,'        <AboutRobot src={robotUrl}/>\n','')
replace(p,'        <a className="atz-about-community"','        <div className="atz-about-hero"><AboutRobot src={robotUrl}/><div className="atz-about-actions">\n        <a className="atz-about-community"')
replace(p,'>Rejoindre la communauté Telegram</a>',stored_links)
replace(p,'className="text-sm font-semibold">Changelog depuis la version 1.5','className="text-sm font-bold">Changelog depuis la version 1.5')
p='src-tauri/src/main.rs'
replace(p,'if target != COMMUNITY_URL && target != "https://www.youtube.com/@AldenMagiX" {','if target != COMMUNITY_URL && target != "https://www.youtube.com/@AldenMagiX" && target != "https://github.com/x-R0b0T-x/Audio-ToolZ" && target != "https://www.paypal.com/ncp/payment/GAUJE54VM28T8" {')
p='src/main.tsx'
pending[p]="import {installDescriptions} from './utils/finalUi';\n"+pending[p]+'\ninstallDescriptions(root);\n'
p='src/components/aboutPresentation.css'
replace(p,'transform:scale(1.025)','transform:scale(1.16)')
pending[p]+=layout_css
p='src/textReadability.css'
replace(p,',#root #about-changelog-title,',',')
pending[p]+='\n#root #about-changelog-title{color:#fff!important;font-weight:700!important}\n'
p='src/components/knobStates.css'
pending[p]+="""
.atz-parameter,.atz-knob{--atz-pointer-ink:#39ff14}
.atz-parameter>button[role=slider]>svg>line:not(:last-child),.atz-knob [role=slider]>svg>line:not(:last-child){stroke:#39ff14!important;opacity:1!important;stroke-width:2!important;vector-effect:non-scaling-stroke;stroke-linecap:round}
"""
for p in ['src/components/aboutLight.test.mjs','src/audio/controlPolish.test.ts']:
 replace(p,'transform:scale(1.025)','transform:scale(1.16)')
pending['src/utils/finalUi.ts']=final_ui
pending['src/utils/finalUiMath.mjs']=math_code
pending['src/utils/finalUiMath.d.mts']=math_types
pending['src/utils/finalUi.test.mjs']=new_tests
for p,text in pending.items():
 path=Path(p);path.parent.mkdir(parents=True,exist_ok=True);path.write_text(text,encoding='utf-8',newline='\n')
marker.write_text(key+'\n',encoding='utf-8')
print('Final UI sources prepared. Regression tests, TypeScript and Windows build must succeed before source commit.')
