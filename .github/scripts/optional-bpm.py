from pathlib import Path
import os,re
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
marker=Path('.github/optional-bpm-v1.applied')
if marker.exists():raise SystemExit(0)
pending={}
def read(name):
    name=Path(name).as_posix()
    if name not in pending:pending[name]=Path(name).read_text(encoding='utf-8')
    return pending[name]
def patch(name,old,new):
    text=read(name)
    if text.count(old)!=1:raise SystemExit('Unexpected source: '+name+' '+old[:90])
    pending[name]=text.replace(old,new,1)

name='src/audio/musicalDelay.ts'
patch(name,'wetPercent=0,panPercent=0):Float32Array[]','wetPercent=0,panPercent=0,delayMs?:number):Float32Array[]')
patch(name,"if(!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(sampleRate)||sampleRate<=0)","if((delayMs===undefined&&(!Number.isFinite(bpm)||bpm<=0))||!Number.isFinite(sampleRate)||sampleRate<=0)")
patch(name," const step=DELAY_DIVISIONS[division];if(!step)throw new Error('Division musicale invalide.');\n const delay=Math.max(1,Math.round(sampleRate*60/bpm*step.beats)),length=channels[0].length;", " const step=DELAY_DIVISIONS[division];if(delayMs===undefined&&!step)throw new Error('Division musicale invalide.');\n if(delayMs!==undefined&&(!Number.isFinite(delayMs)||delayMs<=0||delayMs>4000))throw new Error('Durée de délai invalide.');\n const seconds=delayMs===undefined?60/bpm*step.beats:delayMs/1000;\n const delay=Math.max(1,Math.round(sampleRate*seconds)),length=channels[0].length;")
name='src/components/EffectModal.tsx'
patch(name,'reduction:14,division:DEFAULT_DIVISION,','reduction:14,sync:false,delayMs:250,division:DEFAULT_DIVISION,')
patch(name,"const blocked=effect==='echo'&&c.mode", "const blocked=effect==='echo'&&c.sync&&c.mode")
patch(name,'bpm,c.division,c.mode,c.repetitions,c.wet,c.pan)','bpm,c.division,c.mode,c.repetitions,c.wet,c.pan,c.sync?undefined:c.delayMs)')
patch(name,"<p>{bpm>0?`${bpm.toFixed(1)} BPM détectés`:'BPM non détecté : fermez puis utilisez Ctrl+B.'}</p><Knob label=\"Division\" value={c.division} max={DELAY_DIVISIONS.length-1} defaultValue={DEFAULT_DIVISION} display={DELAY_DIVISIONS[c.division].label} onChange={division=>change({division})}/>", "<button type=\"button\" aria-pressed={c.sync} disabled={!(bpm>0)} onClick={()=>change({sync:!c.sync})}>Synchronisation BPM</button>{c.sync?<Knob label=\"Division\" value={c.division} max={DELAY_DIVISIONS.length-1} defaultValue={DEFAULT_DIVISION} display={DELAY_DIVISIONS[c.division].label} onChange={division=>change({division})}/>:<Knob label=\"Durée\" value={c.delayMs} min={1} max={4000} defaultValue={250} display={`${c.delayMs} ms`} onChange={delayMs=>change({delayMs})}/>}")

name='src/audio/engine.ts'
patch(name,'onPulse?:(value:number)=>void}={})','onPulse?:(value:number)=>void;onWaveform?:(samples:Float32Array)=>void}={})')
patch(name,'if(!options.onPulse)return startDecodedLoop(ctx,buffer,options);','if(!options.onPulse&&!options.onWaveform)return startDecodedLoop(ctx,buffer,options);')
patch(name,'const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));','const waveform=new Float32Array(512);\n    const channels=Array.from({length:buffer.numberOfChannels},(_,i)=>buffer.getChannelData(i));')
patch(name,'level=smoothPulse(level,desired,elapsed);options.onPulse?.(level);','''level=smoothPulse(level,desired,elapsed);options.onPulse?.(level);
      if(options.onWaveform){
        for(let i=0;i<waveform.length;i++){const at=((Math.floor(sample)-waveform.length+i)%buffer.length+buffer.length)%buffer.length;waveform[i]=ctx.state==='running'?(channels[0][at]??0):0;}
        options.onWaveform(waveform);
      }''')
name='src/features/q7m4n2/useEasterMedia.ts'
patch(name,' const robot=useRef<HTMLImageElement>(null);',' const robot=useRef<HTMLImageElement>(null),samples=useRef<Float32Array|null>(null),pulse=useRef(0);')
patch(name,'signal:controller.signal,onPulse:value=>{','signal:controller.signal,onWaveform:value=>{samples.current=value;},onPulse:value=>{\n    pulse.current=value;')
patch(name,'return {robot,problem,','return {robot,samples,pulse,problem,')
name='src/features/q7m4n2/EasterEgg.tsx'
pending[name]="import {NeonWave} from './NeonWave';\n"+read(name)
text,count=re.subn(r'<svg className="atz-party-wave".*?</svg>','<NeonWave samples={media.samples} pulse={media.pulse}/>',read(name),count=1,flags=re.S)
if count!=1:raise SystemExit('Expected one background waveform')
pending[name]=text
name='src/features/q7m4n2/easterEgg.css'
pending[name]=read(name)+'\n.atz-party canvas.atz-party-wave{position:absolute;inset:auto;left:0;top:25%;width:100%;height:50%;opacity:.95;pointer-events:none;z-index:0}\n.atz-party-content{z-index:1}\n'

name='src/releaseNotes.ts'
patch(name,'export const RELEASE_FIXES = [','''export const RELEASE_FIXES = [
 "Delay utilisable en millisecondes sans analyse BPM ; synchronisation musicale disponible en option.",
 "Préécoute en lecture normale sans activation obligatoire de la boucle ni de la détection du tempo.",''')
for name in ['RELEASE_NOTES_1.6.md','CHANGELOG.md']:
    pending[name]=read(name)+'\n\n### Tempo facultatif\n\nLe Delay dispose d’une durée libre de 1 à 4 000 ms. La synchronisation BPM reste optionnelle. Les effets sont utilisables pendant la lecture normale, sans boucle imposée.\n'
if len(pending)!=len({str(Path(name).resolve()).casefold() for name in pending}):raise SystemExit('Aliased paths')
for name,text in pending.items():Path(name).write_text(text,encoding='utf-8',newline='\n')
marker.write_text('optional-bpm-v1\n',encoding='utf-8')
