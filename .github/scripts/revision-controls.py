from pathlib import Path
import os,re
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':
    raise SystemExit('Restricted branch')
marker=Path('.github/revision-controls-v1.applied')
if marker.exists():
    raise SystemExit(0)
pending={}
def read(name):
    name=Path(name).as_posix()
    if name not in pending:pending[name]=Path(name).read_text(encoding='utf-8')
    return pending[name]
def patch(name,old,new):
    text=read(name)
    if text.count(old)!=1:raise SystemExit('Unexpected source: '+name+' '+old[:90])
    pending[name]=text.replace(old,new,1)

name='src/components/TopMenuBar.tsx'
for old in ["effect('Volume...','volume'),","effect('Normaliser (Pic dB)...','normalize'),","{tool(I.IconVolume,'Volume',()=>p.onOpenEffect('volume'),none)}","{tool(I.IconNormalize,'Normaliser',()=>p.onOpenEffect('normalize'),none)}",'<div id="atz-header-kick-slot" className="flex justify-center" />']:
    patch(name,old,'')
patch(name,'atz-main-effect-toolbar grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3','atz-main-effect-toolbar flex items-center gap-3')

name='src/components/AdvancedEffects.tsx'
patch(name,"  const [params, setParams] = useState(() => dynamicsDefault(props.effect === 'compressor' ? 'compressor' : 'limiter'));","  const [params, setParams] = useState(() => dynamicsDefault(props.effect === 'compressor' ? 'compressor' : 'limiter'));\n  const [scroll,setScroll]=useState(0);")
patch(name,'trace={trace} onBandChange={update}','trace={trace} scroll={scroll} onBandChange={update}')
patch(name,"{control('release', 'Relâch.', 10, 2000, 20, 1, 0, 'ms')}</div>","{control('release', 'Relâch.', 10, 2000, 20, 1, 0, 'ms')}</div>\n          <div className=\"atz-control-group\" role=\"group\" aria-label=\"Défilement\"><span>AFFICHAGE</span><EffectParameter label=\"Défilement\" value={scroll} initial={0} spec={{min:-3,max:3,step:.25,fine:.05,digits:2}} onChange={setScroll}/></div>")

name='src/components/DetailedEffectGraph.tsx'
patch(name,'type Props = { eq: boolean;','type Props = { scroll?:number; eq: boolean;')
patch(name,'  const [scroll, setScroll] = useState(0), speed = useRef(0); speed.current = scroll;','  const speed = useRef(0); speed.current = props.scroll??0;')
patch(name,"import { EffectParameter } from './EffectParameter';\n",'')
text=read(name)
text,count=re.subn(r'\{!props.eq&&<div className="atz-scroll-toolbar">.*?</div>\}','',text,flags=re.S)
if count!=1:raise SystemExit('Expected one graph scroll toolbar')
pending[name]=text
patch(name,'r.height-t-68','r.height-t-24')
text=read(name)
if text.count('r.height-48')!=2:raise SystemExit('Unexpected graph labels')
pending[name]=text.replace('r.height-48','r.height-5')

name='src/components/WaveformView.tsx'
patch(name,'  useOverviewNavigation({canvas:overviewCanvasRef,doc:activeDoc,isRecording,isLooping,onViewRangeChange});','  const overviewRangeRef=useOverviewNavigation({canvas:overviewCanvasRef,doc:activeDoc,isRecording,isLooping,onViewRangeChange});')
patch(name,'const vx0 = activeDoc.viewStartSample / total * w, vx1 = activeDoc.viewEndSample / total * w;','const vx0 = overviewRangeRef.current[0] / total * w, vx1 = overviewRangeRef.current[1] / total * w;')

name='src/features/q7m4n2/EasterEgg.tsx'
patch(name,'<img className="atz-party-media"','<img ref={media.robot} className="atz-party-media"')
name='src/features/q7m4n2/easterEgg.css'
patch(name,',atz-robot-breathe 2.6s 1.2s ease-in-out infinite','')
pending[name]=read(name)+'\n.atz-party-media{will-change:transform,scale;transform-origin:center}\n'

name='src/audio/engine.ts'
patch(name,"import {balanceGains} from '../utils/workspaceMath.mjs';","import {balanceGains,kickPulseAt,smoothPulse} from '../utils/workspaceMath.mjs';")
patch(name,'import { computeChannelMuteGains,','import { detectBpmAndBeats, computeChannelMuteGains,')
patch(name,'async playAuxiliaryLoop(data:ArrayBuffer,options:{volume?:number;signal?:AbortSignal}={})','async playAuxiliaryLoop(data:ArrayBuffer,options:{volume?:number;signal?:AbortSignal;onPulse?:(value:number)=>void}={})')
patch(name,'    return startDecodedLoop(ctx,buffer,options);', '''    if(!options.onPulse)return startDecodedLoop(ctx,buffer,options);
    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));
    const detected=detectBpmAndBeats(channels,buffer.sampleRate);
    const targets=detected.kickSamples.length?detected.kickSamples:detected.beatSamples;
    if(options.signal?.aborted)throw new DOMException('Aborted','AbortError');
    const started=ctx.currentTime,end=startDecodedLoop(ctx,buffer,options);
    let frame=0,last=0,level=0,stopped=false;
    const stop=()=>{if(stopped)return;stopped=true;cancelAnimationFrame(frame);options.signal?.removeEventListener('abort',stop);end();options.onPulse?.(0);};
    const tick=(now:number)=>{
      if(stopped)return;
      const elapsed=last?(now-last)/1000:1/60;last=now;
      const sample=((ctx.currentTime-started)%buffer.duration)*buffer.sampleRate;
      const desired=ctx.state==='running'?kickPulseAt(sample,buffer.sampleRate,targets):0;
      level=smoothPulse(level,desired,elapsed);options.onPulse?.(level);
      frame=requestAnimationFrame(tick);
    };
    options.signal?.addEventListener('abort',stop,{once:true});
    if(options.signal?.aborted)stop();else frame=requestAnimationFrame(tick);
    return stop;''')

name='src/utils/overviewNavigation.test.ts'
patch(name,"const header=readFileSync('src/components/TopMenuBar.tsx','utf8');assert.ok(header.includes('id=\"atz-header-kick-slot\"'));","const indicator=readFileSync('src/components/SnapIndicatorPortal.tsx','utf8');assert.ok(indicator.includes('return <>{children}</>'));\n assert.ok(readFileSync('src/components/WaveformView.tsx','utf8').includes('overviewRangeRef.current[0]'));")

name='src/components/advancedEffects.css'
pending[name]=read(name)+'''\n#root .atz-dynamics-controls .atz-control-group[aria-label="Défilement"] .atz-parameter>button{width:54px;height:54px}\n'''
if len(pending)!=len({str(Path(name).resolve()).casefold() for name in pending}):raise SystemExit('Aliased paths')
for name,text in pending.items():Path(name).write_text(text,encoding='utf-8',newline='\n')
marker.write_text('revision-controls-v1\n',encoding='utf-8')
print('Revision prepared. Tests, TypeScript and Windows compilation remain mandatory.')
