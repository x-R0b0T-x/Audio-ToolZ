import hashlib, os
from pathlib import Path
if os.environ.get('GITHUB_REF') != 'refs/heads/v1.6-dev':
    raise SystemExit('Restricted to v1.6-dev')
key = hashlib.sha256(Path(__file__).read_text(encoding='utf-8').encode()).hexdigest()
receipt = Path('.github/effects-integration.applied')
if receipt.exists():
    if receipt.read_text().strip() != key:
        raise SystemExit('Different integration already applied')
    raise SystemExit(0)
expected = {'src/App.tsx':'107966e1b09607746d8c11bd3494234e8fe0c4c3','src/audio/engine.ts':'ba07c5160609e62775bdd3d2079d2d4e6ccd4c28','src/audio/advancedDsp.ts':'d175154dfe12ccf9de058330668b2cd29a067175','src/components/TopMenuBar.tsx':'128b85c04e0bb73455731d4c696bf34307df5ba5','src/components/AdvancedEffects.tsx':'efcaf395fd4bf4831db66ecb50e0520ef5a862bc','src/components/EffectModal.tsx':'d1143908af80af75fdcbdf2561cbd7cb52a56a75','src/components/EffectParameter.tsx':'348c766e8177036626788b2d55a75d9c318db6a0','src/components/DetailedEffectGraph.tsx':'22e4839c95f96d2a7b79cc377b147787f3050dbd','src/components/effectWaveHistory.ts':'ef0005d3721e130edd797ce436af127420249d2b','src/components/advancedEffects.css':'f7f00cc94c9d67615b7f3fdad98083ba4b14714a'}
pending = {}
for name, sha in expected.items():
    raw = Path(name).read_bytes().replace(b'\r\n', b'\n')
    if hashlib.sha1(b'blob '+str(len(raw)).encode()+b'\0'+raw).hexdigest() != sha:
        raise SystemExit('Source changed: '+name)
    pending[name] = raw.decode('utf-8')
def R(old, new):
    if pending[path].count(old) != 1:
        raise SystemExit('Ambiguous context: '+path+' '+old[:70])
    pending[path] = pending[path].replace(old, new, 1)
def C(start, end, new):
    s = pending[path]
    if s.count(start) != 1 or s.count(end) != 1:
        raise SystemExit('Ambiguous bounds: '+path)
    a=s.index(start);b=s.index(end,a)
    pending[path]=s[:a]+new+s[b:]
def N(name, content):
    if Path(name).exists():raise SystemExit('New file already exists: '+name)
    pending[name]=content
path='src/App.tsx'
R("import { audioEngine } from './audio/engine';","import { audioEngine } from './audio/engine';\nimport {targetRange,toPreview,fromPreview,splicePreview} from './audio/effectsModel.mjs';")
R("          if (!hasSelection) {\n            showToast(\n              'Sélectionnez d’abord une zone audio pour appliquer un effet.',\n              true\n            );\n            return;\n          }\n","          if(!activeDoc||isRecording||!activeDoc.channels[0]?.length)return;\n")
R('      resetView = false\n    ) => {\n      if (!activeDocId) return;\n      audioEngine.stop(true);\n      setIsPlaying(false);\n      setIsPaused(false);\n      setIsLooping(false);','      resetView = false,\n      keepPlayback = false\n    ) => {\n      if (!activeDocId) return;\n      if(!keepPlayback){audioEngine.stop(true);setIsPlaying(false);setIsPaused(false);setIsLooping(false);}')
R('          previewLength: number;\n        };','          previewLength: number;\n          segmentLength:number;\n          previewChannels:Float32Array[];\n          originalChannels:Float32Array[];\n        };')
R('          const length = Math.max(1, session.previewLength);\n          const fraction = (position % length) / length;\n          return session.start + fraction * (session.end - session.start);','          return fromPreview(position,session.start,session.end,session.segmentLength);')
C('            onStartPreview={(previewChannels, sampleRate, liveGainDb, bands) => {','            onStopPreview=', '''            onStartPreview={(previewChannels,sampleRate,liveGainDb)=>{
              if(!activeDoc||isRecording||!previewChannels[0]?.length)return;
              const segment=liveGainDb===undefined?previewChannels:previewChannels.map(ch=>Float32Array.from(ch,x=>x*10**(liveGainDb/20)));
              const {start,end}=targetRange(activeDoc.selection,activeDoc.channels[0].length),old=engine.effectPreviewSession,loop=old?.docId===activeDoc.id?old.originalLoop:isLooping;
              const full=splicePreview(activeDoc.channels,segment,start,end,enabledChannels),segmentLength=segment[0].length,total=full[0].length,position=getDocumentPosition(),cursor=Math.min(total-1,Math.max(0,toPreview(position,start,end,segmentLength)));
              engine.effectPreviewSession={docId:activeDoc.id,start,end,originalLoop:loop,previewLength:total,segmentLength,previewChannels:full,originalChannels:activeDoc.channels};
              if(!audioEngine.replacePreviewAudio(full,sampleRate,{position:cursor,loop,loopStart:start,loopEnd:start+segmentLength,volumeDb})){
                audioEngine.play(full,sampleRate,0,total,{loop,offsetSamples:cursor,volumeDb,balance,speedRatio,enabledChannels,onEnded:finishPlayback});
                if(loop)audioEngine.updateLoopRegion(start,start+segmentLength,false);
              }
              setIsPreviewPlaying(audioEngine.isPlaying);setIsPlaying(audioEngine.isPlaying);setIsPaused(false);
            }}
''')
R('              const oldStart = activeDoc.selection.startSample;\n              const oldEnd = activeDoc.selection.endSample;','              const {start:oldStart,end:oldEnd}=targetRange(activeDoc.selection,activeDoc.channels[0].length);')
R('              commitAudioEdit(nextChannels, label, nextSelection, true);','              const keptPlaying=playing&&audioEngine.replacePreviewAudio(channels,activeDoc.sampleRate,{position:mappedPosition,loop:loop&&selection.endSample>selection.startSample,loopStart:selection.startSample,loopEnd:selection.endSample,volumeDb});\n              commitAudioEdit(nextChannels,label,nextSelection,true,false,keptPlaying);')
R('              if (playing) {\n                resumeDocument(channels, activeDoc.sampleRate, mappedPosition,','              if (playing && !keptPlaying) {\n                resumeDocument(channels, activeDoc.sampleRate, mappedPosition,')
R('              } else {\n                finishPlayback();\n              }\n              showToast(`Effet appliqué','              } else if (!playing) {\n                finishPlayback();\n              }\n              showToast(`Effet appliqué')
R('              if (playing) {\n                resumeDocument(activeDoc.channels, activeDoc.sampleRate, position,\n                  session!.originalLoop, session!.start, session!.end);\n              } else {','              if (playing) {\n                if(!audioEngine.replacePreviewAudio(activeDoc.channels,activeDoc.sampleRate,{position,loop:session!.originalLoop,loopStart:session!.start,loopEnd:session!.end,volumeDb}))resumeDocument(activeDoc.channels,activeDoc.sampleRate,position,session!.originalLoop,session!.start,session!.end);\n              } else {')
path='src/audio/engine.ts'
C('  replacePreviewAudio(','  updateLoopRegion(','''  replacePreviewAudio(channels:Float32Array[],sampleRate:number,options:{position?:number;loop?:boolean;loopStart?:number;loopEnd?:number;volumeDb?:number}={}):boolean {
    const ctx=this.ctx,old=this.sourceNode,destination=this.preSplitGain,total=channels[0]?.length??0;
    if(!ctx||!old||!destination||!this.isPlayingState||this.isReverse||!total||!Number.isFinite(sampleRate)||sampleRate<=0||channels.some(c=>c.length!==total))return false;
    const captured=ctx.currentTime,base=options.position??this.getCurrentSample(),buffer=ctx.createBuffer(channels.length,total,sampleRate);channels.forEach((ch,i)=>buffer.getChannelData(i).set(ch));
    const loop=options.loop??this.isLooping,start=loop?Math.max(0,Math.min(total-1,Math.floor(options.loopStart??this.playbackStartSample))):0,end=loop?Math.max(start+1,Math.min(total,Math.floor(options.loopEnd??this.playbackEndSample))):total,now=ctx.currentTime;
    let position=Math.max(0,base+(now-captured)*sampleRate*this.speedRatio);position=loop&&position>=end?start+(position-start)%(end-start):Math.min(total-1,position);
    const incoming=ctx.createGain(),outgoing=ctx.createGain(),next=ctx.createBufferSource();incoming.gain.setValueAtTime(0,now);incoming.gain.linearRampToValueAtTime(1,now+.02);outgoing.gain.setValueAtTime(1,now);outgoing.gain.linearRampToValueAtTime(0,now+.02);
    next.buffer=buffer;next.loop=loop;next.loopStart=start/sampleRate;next.loopEnd=end/sampleRate;next.playbackRate.setValueAtTime(this.speedRatio,now);next.connect(incoming);incoming.connect(destination);outgoing.connect(destination);old.onended=null;old.disconnect();old.connect(outgoing);
    for(const node of this.previewNodes)node.disconnect();this.previewNodes=[];
    this.sourceNode=next;this.currentBuffer=buffer;this.currentTotalSamples=total;this.currentChannelCount=channels.length;this.currentDocSampleRate=sampleRate;this.playbackStartSample=start;this.playbackEndSample=end;this.offsetSamplesAtStart=position-start;this.startedAtCtxTime=now;this.isPlayingState=true;this.isPausedState=false;this.isLooping=loop;this.isReverse=false;
    next.onended=()=>{if(this.sourceNode!==next||this.isLooping)return;this.offsetSamplesAtStart=total-this.playbackStartSample;this.isPlayingState=false;this.isPausedState=false;this.sourceNode=null;this.currentBuffer=null;incoming.disconnect();this.onEndedCallback?.();};
    if(options.volumeDb!==undefined)this.setVolumeDb(options.volumeDb);this.setEnabledChannels(this.enabledChannels,channels.length);next.start(now,position/sampleRate);old.stop(now+.02);
    window.setTimeout(()=>{try{old.disconnect();}catch{}outgoing.disconnect();if(this.sourceNode===next){next.disconnect();next.connect(destination);}incoming.disconnect();},70);return true;
  }
''')
R('        this.isPlayingState = false; this.isPausedState = false; this.isReverse = false;\n        this.sourceNode = null; this.currentBuffer = null; this.onEndedCallback?.();','        this.offsetSamplesAtStart=this.playbackEndSample-this.playbackStartSample;\n        this.isPlayingState = false; this.isPausedState = false; this.isReverse = false;\n        this.sourceNode = null; this.currentBuffer = null; this.onEndedCallback?.();')
path='src/components/TopMenuBar.tsx'
R('action:()=>p.onOpenEffect(id),disabled:selection','action:()=>p.onOpenEffect(id),disabled:none')
for t in ['volume','normalize','fade','speed-pitch']:
    R("()=>p.onOpenEffect('"+t+"'),selection)","()=>p.onOpenEffect('"+t+"'),none)")
path='src/audio/advancedDsp.ts'
R('export type Band = { frequency: number; gainDb: number; q: number };',"import {sections,bandResponse,filterAudio,type EqBand} from './effectsModel.mjs';\nexport type Band=EqBand;")
R('gainDb:0,q:1}));',"gainDb:0,q:1,type:'peaking' as const,order:2 as const}));")
C('export function coefficients(','export type Dynamics =','export function coefficients(b:Band,rate:number){return sections(b,rate)[0]??[1,0,0,0,0];}\nexport function response(bands:Band[],rate:number,f:number){return bandResponse(bands,rate,f);}\nexport function equalize(source:Float32Array[],rate:number,bands:Band[]){return filterAudio(source,rate,bands);}\n')
R("if(p.mode==='limiter')gain=Math.min(gain,ceiling/Math.max(1e-12,peak[i]));",'gain=Math.min(gain,ceiling/Math.max(1e-12,peak[i]*makeup));')
path='src/components/AdvancedEffects.tsx'
R("import { clampSelection } from '../audio/dsp';","import {targetRange,hasGain} from '../audio/effectsModel.mjs';")
R('const range = useMemo(() => clampSelection(doc.selection, doc.channels[0]?.length ?? 0), [doc]);','const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {startSample:r.start,endSample:r.end};},[doc]);')
R('useState(!eq), [applying','useState(true), [applying')
R("    if (eq) { callbacks.current.onStartPreview(source, doc.sampleRate, undefined, bands.map(b => ({ ...b, type: 'peaking' as const }))); return; }\n    const id = ++serial.current; rendered.current = null; setPending(true);\n    desired.current = { kind: 'dynamics', id, params };","    const id = ++serial.current; rendered.current = null; setPending(true);\n    desired.current=eq?{kind:'eq',id,bands}:{kind:'dynamics',id,params};")
R('if (!eq && rendered.current?.id === serial.current)','if (rendered.current?.id === serial.current)')
R('          <EffectGain label={`${b.frequency} Hz : gain`} value={b.gainDb} onChange={gainDb => update(i, { gainDb })}/>','''          <div className="atz-filter-type" onDoubleClick={()=>update(i,{type:'peaking',order:2})}>
            <select aria-label={`Bande ${i+1} : type`} value={b.type??'peaking'} onChange={e=>update(i,{type:e.target.value as Band['type']})}>{[['off','Désactivé'],['peaking','Cloche'],['lowshelf','Plateau grave'],['highshelf','Plateau aigu'],['highpass','Coupe-bas'],['lowpass','Coupe-haut'],['bandpass','Passe-bande'],['notch','Notch']].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select>
            <select aria-label={`Bande ${i+1} : pente`} disabled={!['highpass','lowpass','lowshelf','highshelf'].includes(b.type??'peaking')} value={b.order??2} onChange={e=>update(i,{order:Number(e.target.value) as Band['order']})}>{[1,2,4,6,8].map(n=><option key={n} value={n}>{n*6} dB/oct{n===1?' Gentle':n>=4?' Steep':''}</option>)}</select>
          </div>
          <EffectGain disabled={!hasGain(b)} label={`${b.frequency} Hz : gain`} value={b.gainDb} onChange={gainDb => update(i, { gainDb })}/>''')
R('          <EffectParameter compact label="Q" value={b.q} initial={1} spec={{ min: .1, max: 24, step: .1, fine: .001, digits: 3, logarithmic: true }} onChange={q => update(i, { q })}/>\n','')
R("{params.mode === 'limiter' ? control('ceiling', 'Plafond', -18, 0, .5, .1, 1, 'dBFS') : control('threshold', 'Seuil', -60, 0, .5, .1, 1, 'dBFS')}","{control('ceiling','Plafond',-18,0,.5,.1,1,'dBFS')}{params.mode==='compressor'&&control('threshold','Seuil',-60,0,.5,.1,1,'dBFS')}")
path='src/components/EffectModal.tsx'
R('applySpeedAndPitch,clampSelection,computeFadeGain','applySpeedAndPitch,computeFadeGain')
R("import {EffectPanel} from './EffectPanel';","import {EffectPanel} from './EffectPanel';\nimport {targetRange} from '../audio/effectsModel.mjs';")
R('const range=useMemo(()=>clampSelection(doc.selection,doc.channels[0]?.length??0),[doc])','const range=useMemo(()=>{const r=targetRange(doc.selection,doc.channels[0]?.length??0);return {startSample:r.start,endSample:r.end};},[doc])')
R('callback.current.onStartPreview(source,doc.sampleRate,c.gain)','callback.current.onStartPreview(process(),doc.sampleRate)')
path='src/components/EffectParameter.tsx'
R('export function EffectGain({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void })','export function EffectGain({ label, value, onChange, disabled=false }: { label: string; value: number; onChange: (v: number) => void; disabled?:boolean })')
R('useWheel(ref, (direction, fine) => { activity.pulse(); onChange(stepParameter(value, direction, fine,','useWheel(ref, (direction, fine) => { if(disabled)return; activity.pulse(); onChange(stepParameter(value, direction, fine,')
R("className={`atz-gain${activity.active ? ' is-adjusting' : ''}`} onDoubleClick={() => onChange(0)}","className={`atz-gain${activity.active ? ' is-adjusting' : ''}${disabled?' is-disabled':''}`} onDoubleClick={() => {if(!disabled)onChange(0);}}")
R('<input type="range" aria-label={label}','<input type="range" disabled={disabled} aria-label={label}')
path='src/components/DetailedEffectGraph.tsx'
R("import { EffectWaveHistory } from './effectWaveHistory';","import { EffectWaveHistory } from './effectWaveHistory';\nimport {hasGain} from '../audio/effectsModel.mjs';")
R('  const [scroll, setScroll] = useState(0), speed = useRef(0); speed.current = scroll;','  const selectedBand=useRef<number|null>(null);\n  const [scroll, setScroll] = useState(0), speed = useRef(0); speed.current = scroll;')
R("if (!point || !host.current?.contains(point) || e.ctrlKey || e.metaKey || e.altKey || host.current.closest('fieldset:disabled,[inert]')) return;","if(!host.current||e.ctrlKey||e.metaKey||e.altKey||host.current.closest('fieldset:disabled,[inert]'))return;\n      if(point&&!host.current.contains(point))return;")
R("const p = latest.current, i = Number(point.getAttribute('data-eq-band')); if (!e.deltaY || !p.bands[i]) return;","const p=latest.current,i=point?Number(point.getAttribute('data-eq-band')):selectedBand.current;if(i===null||!e.deltaY||!p.bands[i])return;")
R("e.preventDefault(); p.onBandChange(i, { q: Number(clamp(p.bands[i].q * (e.shiftKey ? 1.025 : 1.15) ** (e.deltaY < 0 ? 1 : -1)","e.preventDefault();e.stopPropagation(); p.onBandChange(i, { q: Number(clamp(p.bands[i].q * (e.shiftKey ? 1.025 : 1.15) ** (e.deltaY < 0 ? -1 : 1)")
R('const bins = fft.read(p.source, pos)',"const bins = fft.read((audioEngine as typeof audioEngine & {effectPreviewSession?:{originalChannels:Float32Array[]}}).effectPreviewSession?.originalChannels??p.source, pos)")
R('data-eq-band={i} className="atz-eq-point"','data-eq-band={i} onFocus={()=>{selectedBand.current=i;}} className="atz-eq-point"')
R('top:geo.gy(b.gainDb)','top:geo.gy(hasGain(b)?b.gainDb:0)')
R('gainDb:Number(clamp(g.dbAt(e.clientY-r.top-node.clientTop),-18,18).toFixed(1))','gainDb:hasGain(b)?Number(clamp(g.dbAt(e.clientY-r.top-node.clientTop),-18,18).toFixed(1)):b.gainDb')
R("else if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();props.onBandChange","else if(['ArrowUp','ArrowDown'].includes(e.key)&&hasGain(b)){e.preventDefault();props.onBandChange")
C('          } else {\n            const output = p.output','          }\n        }\n      }\n      frame = requestAnimationFrame(draw);','''          } else {
            const session=(audioEngine as typeof audioEngine & {effectPreviewSession?:{start:number;segmentLength:number;originalLoop:boolean;previewChannels:Float32Array[]}}).effectPreviewSession;
            const output=session?.previewChannels??p.output,length=output?.[0]?.length??0;
            if(output&&length){const channels=Math.min(2,output.length);
              if(!history||history.rate!==p.rate||history.channels!==channels){history=new EffectWaveHistory(p.rate,channels);previous=null;}
              const append=(start:number,count:number)=>{const take=Math.min(Math.max(0,count),history!.capacity,dt>.5?Math.round(p.rate*.25):history!.capacity);history!.append(output,start+count-take,take,p.trace?.reduction,p.trace?.hop??256,session?.start??0);};
              if(playing){if(previous===null){const n=Math.min(pos,Math.round(p.rate/30));append(pos-n,n);}else if(pos>=previous)append(previous,pos-previous);else if(session?.originalLoop&&dt<.5){append(previous,session.start+session.segmentLength-previous);append(session.start,pos-session.start);}else history=new EffectWaveHistory(p.rate,channels);previous=pos;}else{if(previous!==null&&pos>previous)append(previous,pos-previous);previous=null;}
            }
            ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
            const l=48,t=40,pw=Math.max(1,r.width-l-12),ph=Math.max(1,r.height-t-24),y=(db:number)=>t+clamp((24-db)/84,0,1)*ph,span=6/2**speed.current;
            ctx.font='12px system-ui';ctx.fillStyle='#fff';ctx.fillText('dBFS / dB',4,15);
            [24,12,0,-12,-24,-36,-48,-60].forEach(db=>{const py=y(db);ctx.fillStyle='#fff';ctx.fillText(String(db),5,py+4);ctx.fillStyle='#ffffff18';ctx.fillRect(l,py,pw,1);});
            if(history&&history.total){const buckets=Math.max(1,Math.floor(pw*dpr)),data=history.read(span,buckets),width=pw*Math.min(1,data.count/(span*p.rate)),x0=l+pw-width,points:Array<[number,number]>=[];
              ctx.save();ctx.beginPath();ctx.rect(l,t,pw,ph);ctx.clip();
              for(let i=0;i<buckets;i++){let amplitude=0;for(let c=0;c<history.channels;c++){const v=data.peaks[c][i];amplitude=Math.max(amplitude,Math.abs(v.min),Math.abs(v.max));}const a=Math.floor(i*data.count/buckets),b=Math.min(data.count,Math.max(a+1,Math.floor((i+1)*data.count/buckets)));let tone=0,n=0,reduction=0;for(let s=a;s<b;s++){tone+=data.tones[s];n++;reduction=Math.max(reduction,data.reductions[s]);}
                const py=y(20*Math.log10(Math.max(1e-6,amplitude))),x=x0+i/buckets*width;ctx.fillStyle=`hsl(273 80% ${Math.max(24,tone/Math.max(1,n))}%)`;ctx.fillRect(x,py,Math.max(1/dpr,width/buckets),Math.max(0,y(-60)-py));points.push([x,y(-reduction)]);
              }
              if(points.length){ctx.beginPath();ctx.moveTo(points[0][0],y(0));points.forEach(([x,py])=>ctx.lineTo(x,py));ctx.lineTo(points[points.length-1][0],y(0));ctx.closePath();ctx.fillStyle='#8ceeff28';ctx.fill();ctx.beginPath();points.forEach(([x,py],i)=>i?ctx.lineTo(x,py):ctx.moveTo(x,py));ctx.strokeStyle='#b9f7ff';ctx.lineWidth=1.7;ctx.stroke();}ctx.restore();
            }
            const line=(db:number,color:string)=>{ctx.fillStyle=color;ctx.fillRect(l,y(db),pw,1.5);};line(p.params.input,'#ffb45e');line(Math.min(0,p.params.ceiling),'#39ff14');
            ctx.fillStyle='#ffb45e';ctx.fillText(`Gain ${p.params.input.toFixed(1)} dB`,l+3,15);ctx.fillStyle='#39ff14';ctx.fillText(`Plafond ${p.params.ceiling.toFixed(1)} dBFS`,l+150,15);ctx.fillStyle='#b9f7ff';ctx.fillText('Réduction de gain',l+3,31);ctx.fillStyle='#fff';ctx.fillText(`−${span.toFixed(2)} s`,l,r.height-5);ctx.fillText('0 s',l+pw-20,r.height-5);
''')
R('Waveform linéaire G/D · Vumètre : 0 à −12 dBFS · Trait blanc : réduction 0–12 dB','Sortie : vue unique · Orange : gain relatif (dB) · Vert : plafond (dBFS) · Cyan : réduction')
path='src/components/effectWaveHistory.ts'
R('hop = 256) {','hop = 256, reductionOffset = 0) {')
R('reduction?.[Math.floor(pos / hop)]','reduction?.[Math.floor((pos-reductionOffset) / hop)]')
R('private reductions: Uint8Array;','private reductions: Float32Array;')
R('private reductionScratch: Uint8Array;','private reductionScratch: Float32Array;')
R('this.reductions = new Uint8Array(this.capacity); this.reductionScratch = new Uint8Array(this.capacity);','this.reductions = new Float32Array(this.capacity); this.reductionScratch = new Float32Array(this.capacity);')
R('Math.round(Math.max(0, Math.min(25.5, reduction?.[Math.floor((pos-reductionOffset) / hop)] ?? 0)) * 10)','Math.max(0,reduction?.[Math.floor((pos-reductionOffset) / hop)]??0)')
path='src/components/advancedEffects.css'
pending[path]+='''
.atz-gain input,.atz-gain:hover input,.atz-gain.is-adjusting input,.atz-gain input:focus-visible{filter:none!important;box-shadow:none!important;outline:none!important}
.atz-gain input::-webkit-slider-thumb{box-shadow:none}
.atz-gain input:hover:not(:disabled)::-webkit-slider-thumb,.atz-gain.is-adjusting input:not(:disabled)::-webkit-slider-thumb,.atz-gain input:focus-visible:not(:disabled)::-webkit-slider-thumb{box-shadow:0 0 3px #39ff14,0 0 8px #39ff14bf}
.atz-gain.is-disabled{opacity:.35}
.atz-advanced .atz-parameter svg>line:not(:last-child),.atz-advanced .atz-knob svg>line:not(:last-child){stroke:#39ff14}
.atz-filter-type{display:flex;flex-direction:column;gap:3px;width:100%;color:#fff}
.atz-filter-type select{width:100%;min-width:0;background:var(--bg-elevated);border:1px solid var(--border-subtle);color:#fff;font:11px system-ui;padding:2px 0}
.atz-filter-type select:disabled{opacity:.35}
.atz-advanced footer [role=status]{display:block;max-width:55%;font-size:12px}
.atz-dynamics .atz-graph-caption{display:none}
'''
N('src/audio/effectsIntegration.test.ts','''import {test} from 'node:test';import assert from 'node:assert/strict';
import {dynamics,dynamicsDefault} from './advancedDsp';
import {EffectWaveHistory} from '../components/effectWaveHistory';
test('ceiling after makeup in both modes',()=>{for(const mode of ['limiter','compressor'] as const){const r=dynamics([new Float32Array(4096).fill(4)],48000,{...dynamicsDefault(mode),input:24,makeup:24,ceiling:0});assert.ok(r.channels[0].every(v=>Number.isFinite(v)&&Math.abs(v)<=1));}});
test('reduction attacks and releases',()=>{const r=dynamics([Float32Array.from({length:24000},(_,i)=>i<1000?1:.01)],48000,{...dynamicsDefault(),ceiling:-6,attack:0,release:120});assert.ok(r.trace.reduction[0]>5.9);assert.ok(r.trace.reduction[r.trace.reduction.length-1]<r.trace.reduction[0]);});
test('reduction history offset and full precision',()=>{const h=new EffectWaveHistory(10,1);h.append([new Float32Array(8)],1,4,Float32Array.from([10,40,80]),1,2);assert.deepEqual([...h.read(1,4).reductions],[0,10,40,80]);});
''')
for name, content in pending.items():
    dest=Path(name);dest.parent.mkdir(parents=True,exist_ok=True)
    with dest.open('w',encoding='utf-8',newline='\n') as out:out.write(content)
receipt.parent.mkdir(exist_ok=True)
receipt.write_text(key+'\n',encoding='utf-8')
print('Applied',len(pending),'source files; the workflow must test and compile before committing')
