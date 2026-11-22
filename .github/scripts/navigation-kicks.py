from pathlib import Path
import os,re
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':
    raise SystemExit('Restricted branch')
marker=Path('.github/workspace-final-v2.applied')
if marker.exists():
    raise SystemExit(0)
pending={}
def read(name):
    if name not in pending:
        pending[name]=Path(name).read_text(encoding='utf-8')
    return pending[name]
def patch(name,old,new):
    text=read(name)
    if text.count(old)!=1:
        raise SystemExit('Ambiguous or changed source: '+name+' '+old[:90])
    pending[name]=text.replace(old,new,1)

name='src/audio/engine.ts'
patch(name,"import {startDecodedLoop} from './bufferLoop.mjs';","import {startDecodedLoop} from './bufferLoop.mjs';\nimport {balanceGains} from '../utils/workspaceMath.mjs';")
patch(name,'const [gL, gR] = computeChannelMuteGains(channelCount, this.enabledChannels);','const [gL, gR] = computeChannelMuteGains(channelCount, this.enabledChannels);\n    const [bL,bR]=balanceGains(this.balance);')
patch(name,'const [gL, gR] = computeChannelMuteGains(channels.length, this.enabledChannels);','const [gL, gR] = computeChannelMuteGains(channels.length, this.enabledChannels);\n    const [bL,bR]=balanceGains(this.balance);')
patch(name,'gain.setTargetAtTime(gL, this.ctx.currentTime, 0.01)','gain.setTargetAtTime(gL*bL, this.ctx.currentTime, 0.01)')
patch(name,'gain.setTargetAtTime(gR, this.ctx.currentTime, 0.01)','gain.setTargetAtTime(gR*bR, this.ctx.currentTime, 0.01)')
patch(name,'gain.setValueAtTime(gL, ctx.currentTime)','gain.setValueAtTime(gL*bL, ctx.currentTime)')
patch(name,'gain.setValueAtTime(gR, ctx.currentTime)','gain.setValueAtTime(gR*bR, ctx.currentTime)')
patch(name,'this.pannerNode?.pan.setValueAtTime(this.balance, ctx.currentTime);','this.pannerNode?.pan.setValueAtTime(0, ctx.currentTime);')
patch(name,'setBalance(pan: number): void { this.balance = Math.max(-1, Math.min(1, pan)); if (this.ctx && this.pannerNode) this.pannerNode.pan.setTargetAtTime(this.balance, this.ctx.currentTime, 0.015); }','setBalance(pan: number): void { this.balance = Number.isFinite(pan)?Math.max(-1,Math.min(1,pan)):0; this.setEnabledChannels(this.enabledChannels); if(this.ctx&&this.pannerNode)this.pannerNode.pan.setValueAtTime(0,this.ctx.currentTime); }')

name='src/utils/finalUi.ts'
text=read(name)
cut=text.index('export function installDescriptions(')
pending[name]='''import {useEffect} from 'react';
import type {AudioDocument} from '../audio/types';
import {audioEngine} from '../audio/engine';
import {kickPulseAt,smoothPulse} from './workspaceMath.mjs';
export function useBeatSync(doc:AudioDocument|null){
 useEffect(()=>{
  const rate=doc?.sampleRate??44100,bpm=doc?.bpmInfo?.bpm??0;
  const kicks=doc?.bpmInfo?.kickSamples??[],beats=doc?.bpmInfo?.beatSamples??[];
  const targets=kicks.length?kicks:beats;
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  let frame=0,last=0,level=0,image:HTMLImageElement|null=null,snap:HTMLElement|null=null;
  const resetImage=()=>{image?.style.removeProperty('animation');image?.style.removeProperty('transform');};
  const resetSnap=()=>{snap?.style.removeProperty('box-shadow');};
  const tick=(now:number)=>{
   const elapsed=last?(now-last)/1000:1/60;last=now;
   const next=document.querySelector<HTMLImageElement>('.atz-about-robot>img');if(next!==image){resetImage();image=next;}
   const target=document.querySelector<HTMLElement>('[data-testid="snap-kicks-toggle"]');if(target!==snap){resetSnap();snap=target;}
   const playing=audioEngine.isPlaying;
   let desired=0;
   if(playing&&!reduced.matches){
    const sample=audioEngine.getCurrentSample();
    if(targets.length)desired=kickPulseAt(sample,rate,targets);
    else if(bpm>0){
     const period=rate*60/bpm,phase=((sample%period)+period)%period;
     desired=kickPulseAt(phase,rate,[0,period]);
    }else{
     const spectrum=audioEngine.readSpectrumSnapshot();
     desired=Math.max(0,Math.min(1,(Math.max(spectrum[1]??0,spectrum[2]??0)/255-.5)*2));
    }
   }
   level=playing&&!reduced.matches?smoothPulse(level,desired,elapsed):0;
   if(image){image.style.animation='none';image.style.transform=`scale(${1+.14*level})`;}
   if(snap&&snap.getAttribute('aria-pressed')==='true'){
    snap.style.setProperty('box-shadow',`inset 0 0 0 1px #39ff1466,0 0 ${2+10*level}px rgba(57,255,20,${.2+.65*level}),0 0 ${4+16*level}px rgba(57,255,20,${.1+.45*level})`,'important');
   }else resetSnap();
   frame=requestAnimationFrame(tick);
  };
  frame=requestAnimationFrame(tick);
  return()=>{cancelAnimationFrame(frame);resetImage();resetSnap();};
 },[doc?.id,doc?.bpmInfo,doc?.sampleRate]);
}
'''+text[cut:]

name='src/components/TopMenuBar.tsx'
patch(name,'items-center gap-4 px-4 h-12 border-b','items-center gap-4 px-4 h-16 border-b')
patch(name,'<div className="flex justify-center pointer-events-none">','<div className="flex flex-col items-center justify-center gap-1">')
patch(name,'</span></div><div className="flex justify-end">','</span><div id="atz-header-kick-slot" className="flex justify-center" /></div><div className="flex justify-end">')

owners=[]
for path in Path('src').rglob('*.tsx'):
    if 'data-testid="snap-kicks-toggle"' in read(str(path)):
        owners.append(str(path))
if len(owners)!=1:
    raise SystemExit('Expected one kick indicator owner: '+str(owners))
name=owners[0]
text=read(name)
pattern=r'<button\b(?:(?!</button>).)*?data-testid="snap-kicks-toggle"(?:(?!</button>).)*?</button>'
found=list(re.finditer(pattern,text,re.S))
if len(found)!=1:
    raise SystemExit('Expected one complete indicator button')
match=found[0]
text=text[:match.start()]+'<SnapIndicatorPortal>'+match.group()+'</SnapIndicatorPortal>'+text[match.end():]
module='./SnapIndicatorPortal' if Path(name).parent==Path('src/components') else './components/SnapIndicatorPortal'
pending[name]="import {SnapIndicatorPortal} from '"+module+"';\n"+text

name='src/components/ControlWindow.tsx'
patch(name,"aria-label={collapsed ? 'Déplier la fenêtre de contrôle' : 'Réduire la fenêtre de contrôle'}","data-atz-control-size\n            aria-label={collapsed ? 'Déplier la fenêtre de contrôle' : 'Réduire la fenêtre de contrôle'}")
name='src/windowClose.css'
patch(name,'@layer atz-window-controls {','''@layer atz-window-controls {
#root aside[aria-label="Fenêtre de contrôle flottante"] button[data-atz-control-size],
#root aside[aria-label="Fenêtre de contrôle flottante"] button[data-atz-control-size]:is(:hover,:active,:focus-visible){background:transparent!important;border-color:transparent!important;box-shadow:none!important;outline:none!important;filter:none!important;text-shadow:none!important}
#root aside[aria-label="Fenêtre de contrôle flottante"] button[data-atz-control-size]{color:#fff!important}
#root aside[aria-label="Fenêtre de contrôle flottante"] button[data-atz-control-size]:is(:hover,:active,:focus-visible){color:#39ff14!important}
#root aside[aria-label="Fenêtre de contrôle flottante"] button[data-atz-control-size]>svg{stroke:currentColor!important;color:inherit!important;filter:none!important}
''')
name='src/components/aboutLayout.css'
pending[name]=read(name)+'''
#root .atz-about-dialog .atz-about-hero .atz-about-robot{--atz-art-size:clamp(104px,30cqw,154px)}
#atz-header-kick-slot [data-testid="snap-kicks-toggle"]{position:static!important;margin:0!important;transform:none!important;white-space:nowrap;font-size:10px;line-height:1.3;padding:2px 9px;border-radius:6px;color:#39ff14!important}
'''

for name,text in pending.items():
    Path(name).write_text(text,encoding='utf-8',newline='\n')
marker.write_text('workspace-final-v2\n',encoding='utf-8')
print('Final workspace corrections prepared; regression tests, TypeScript and Windows build remain mandatory.')
