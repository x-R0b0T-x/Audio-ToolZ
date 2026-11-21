import hashlib,os
from pathlib import Path
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
key=hashlib.sha256(Path(__file__).read_text(encoding='utf-8').encode()).hexdigest()
marker=Path('.github/effects-polish.applied')
if marker.exists():
    if marker.read_text().strip()!=key:raise SystemExit('Different polish already applied')
    raise SystemExit(0)
expected={'AdvancedEffects.tsx':'6160768740a8ade1d2f6e5a0da7b7ca87ab37b78','EffectParameter.tsx':'6c152d71d6d5d66eef5d98a0d43d53969e0dc5af','DetailedEffectGraph.tsx':'b178ea254fc94acc765eb9245f37bd7272b50f29','EffectControls.tsx':'3f554965d17ea037a92ffaffee837ba8f06fb59a','advancedEffects.css':'afd2fae92c84edb298e16124b2a1538dec5eee5c','effectPanel.css':'a5f920081bb676980f2b2ff98cfcc3a4ac36f003','../utils/controlWheel.ts':'e9080bdef4176e86bc1a2a42e4695db1c9fc8854'}
pending={}
for name,sha in expected.items():
    path=Path('src/components')/name
    b=path.read_bytes().replace(bytes([13,10]),bytes([10]))
    if hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()!=sha:raise SystemExit('Source changed: '+name)
    pending[name]=b.decode('utf-8')
def R(old,new):
    if pending[p].count(old)!=1:raise SystemExit('Ambiguous context: '+p+' '+old[:60])
    pending[p]=pending[p].replace(old,new,1)
def N(name,text):
    if (Path('src/components')/name).exists():raise SystemExit('New file exists: '+name)
    pending[name]=text
p='AdvancedEffects.tsx'
R("import { DetailedEffectGraph } from './DetailedEffectGraph';","import { DetailedEffectGraph } from './DetailedEffectGraph';\nimport {FilterShape} from './FilterShape';")
R("{applying ? 'Application…' : pending ? 'Recalcul audio… le traitement précédent continue' : 'Molette : réglage · Maj : précision · Double-clic : réinitialisation'}","{applying ? 'Application…' : ''}")
a=pending[p].index('            <select aria-label={`Bande ${i+1} : type`}');b=pending[p].index('</select>',a)+9
R(pending[p][a:b],"            <FilterShape value={b.type??'peaking'} index={i} onChange={type=>update(i,{type})}/>")
a=pending[p].index('          <EffectParameter compact label="Hz"');b=pending[p].index('/>',a)+2
if pending[p][b:b+1]=='\n':b+=1
R(pending[p][a:b],'')
R(' · Double-clic : valeur initiale</p>','</p>')
R('className="atz-filter-type" onDoubleClick={()=>update(i,{type:\'peaking\',order:2})}','className="atz-filter-type"')
p='DetailedEffectGraph.tsx'
R('spectrumShade = (level: number) => `hsl(272 72% ${(22 + 58 * level).toFixed(1)}%)`','spectrumShade = (level: number) => `hsl(278 98% ${(8 + 86 * Math.pow(clamp(level,0,1),1.6)).toFixed(1)}%)`')
R("if(!host.current||e.ctrlKey","if(!latest.current.eq||!host.current||e.ctrlKey")
R("node?.addEventListener('wheel', wheel, { passive: false }); return () => node?.removeEventListener('wheel', wheel);","node?.addEventListener('wheel', wheel, { passive: false, capture: true }); return () => node?.removeEventListener('wheel', wheel, true);")
R('if(!e.currentTarget.hasPointerCapture(e.pointerId))return;','if(e.buttons!==1||!e.currentTarget.hasPointerCapture(e.pointerId))return;')
R('      onDoubleClick={()=>props.onBandChange(i,bandsDefault(props.rate)[i])}\n','')
R('y=(db:number)=>t+clamp((24-db)/84,0,1)*ph','y=(db:number)=>t+clamp((6-db)/16,0,1)*ph')
R("ctx.fillText('dBFS / dB',4,15);",'')
R('[24,12,0,-12,-24,-36,-48,-60].forEach','[6,4,2,0,-2,-4,-6,-8,-10].forEach')
R("ctx.fillText(`Plafond ${p.params.ceiling.toFixed(1)} dBFS`,l+150,15);","ctx.textAlign='right';ctx.fillText(`Plafond ${p.params.ceiling.toFixed(1)} dB`,l+pw,15);ctx.textAlign='left';")
p='../utils/controlWheel.ts'
R("    const control = event.target.closest<HTMLElement>","    if(event.target.closest('[data-eq-band]'))return;\n    const control = event.target.closest<HTMLElement>")
p='EffectParameter.tsx'
R("import { parameterValue, stepParameter, type ParameterSpec } from './effectUiMath';","import { parameterValue, stepParameter, type ParameterSpec } from './effectUiMath';\nimport {NumericValue} from './NumericValue';")
R("      if (e.defaultPrevented || e.ctrlKey","      if(e.target instanceof Element&&e.target.closest('.atz-value-entry input'))return;\n      if (e.defaultPrevented || e.ctrlKey")
R(' onDoubleClick={() => p.onChange(p.initial)}>','>')
R('<span>{p.label}</span><button type="button" role="slider"','<span>{p.label}</span><button type="button" onDoubleClick={()=>p.onChange(p.initial)} role="slider"')
a=pending[p].index('    <input type="number" aria-label={`${p.label} valeur`}');b=pending[p].index('/>',a)+2
R(pending[p][a:b],'    <NumericValue label={p.label} value={p.value} min={s.min} max={s.max} digits={s.digits} onCommit={v=>{activity.pulse();p.onChange(parameterValue(v,s));}}/>')
p='EffectControls.tsx'
R("stroke={active ? '#45f882' : '#a987df'}",'stroke="#39ff14" opacity={active?1:.75}')
p='advancedEffects.css'
pending[p]+='''
.atz-advanced{border-color:#39ff1480;box-shadow:0 0 0 1px #39ff1430,0 0 14px #39ff1470,0 0 36px #39ff1438,0 24px 48px #000b}
.atz-advanced footer [role=status]{min-height:18px}
.atz-advanced .atz-parameter svg>line,.atz-advanced .atz-knob svg>line{stroke:#39ff14!important;filter:drop-shadow(0 0 2px #39ff14)}
.atz-advanced .atz-parameter svg>circle,.atz-advanced .atz-knob svg>circle:first-of-type{stroke:#39ff14!important}
.atz-gain input:hover:not(:disabled)::-webkit-slider-thumb,.atz-gain.is-adjusting input:not(:disabled)::-webkit-slider-thumb,.atz-gain input:focus-visible:not(:disabled)::-webkit-slider-thumb{border-color:#baff9c;box-shadow:0 0 5px #39ff14,0 0 14px #39ff14,0 0 24px #39ff14b3}
.atz-dynamics .atz-scroll-toolbar p,.atz-dynamics .atz-hint{display:none!important}
.atz-control-group.atz-mode{display:grid;grid-template-columns:1fr;align-content:center;justify-items:stretch;min-width:88px;padding:0 10px 5px;gap:6px}
.atz-control-group.atz-mode>span{position:static;text-align:center;align-self:center;letter-spacing:.7px}
.atz-control-group.atz-mode>button{width:100%;text-align:center;margin:0}
.atz-value-entry{display:inline-flex;justify-content:center;min-width:64px;min-height:24px;align-items:center;user-select:text}
.atz-value-entry output{font:13px system-ui;color:#fff;cursor:text;padding:2px 5px;min-width:58px;text-align:center}
.atz-value-entry output:focus-visible{outline:1px solid #39ff14}
.atz-value-entry input{width:76px!important;border-color:#39ff14!important}
.atz-filter-shape{position:relative;width:100%;color:#fff;z-index:5}
.atz-filter-shape[open]{z-index:20}
.atz-filter-shape summary{list-style:none;cursor:pointer;display:flex;align-items:center;justify-content:center;border:1px solid var(--border-subtle);border-radius:3px;background:var(--bg-elevated)}
.atz-filter-shape summary::-webkit-details-marker{display:none}
.atz-filter-shape summary::after{content:'▾';font-size:10px;margin-left:2px}
.atz-filter-shape svg{display:block;width:44px;height:26px;flex-shrink:1}
.atz-shape-options{position:absolute;left:0;top:100%;display:grid;grid-template-columns:repeat(4,1fr);gap:3px;padding:5px;width:226px;background:var(--bg-surface);border:1px solid #39ff14;box-shadow:0 0 12px #39ff1460;border-radius:4px}
.atz-advanced .atz-shape-options button{padding:2px!important;display:flex;align-items:center;justify-content:center}
.atz-shape-options button[aria-pressed=true]{color:#39ff14;border-color:#39ff14}
.atz-band:nth-last-child(-n+3) .atz-shape-options{left:auto;right:0}
'''
p='effectPanel.css'
pending[p]+='''
.atz-advanced button.atz-resize-grip{color:#39ff14;opacity:.8;filter:drop-shadow(0 0 3px #39ff14)}
'''
N('NumericValue.tsx', '''import React,{useRef,useState} from 'react';
type Props={label:string;value:number;min:number;max:number;digits?:number;onCommit:(v:number)=>void};
export function NumericValue(p:Props){
 const [editing,setEditing]=useState(false),[draft,setDraft]=useState(''),done=useRef(false);
 const begin=()=>{done.current=false;setDraft(p.value.toFixed(p.digits??1));setEditing(true);};
 const finish=(cancel=false)=>{if(done.current)return;done.current=true;const text=draft.trim().replace(',','.'),v=Number(text);if(!cancel&&text&&Number.isFinite(v))p.onCommit(Math.max(p.min,Math.min(p.max,v)));setEditing(false);};
 return <span className="atz-value-entry" onDoubleClick={e=>{e.stopPropagation();if(!editing)begin();}}>{editing?<input type="text" inputMode="decimal" autoFocus aria-label={`${p.label} valeur`} value={draft} onFocus={e=>e.currentTarget.select()} onChange={e=>setDraft(e.target.value)} onBlur={()=>finish()} onKeyDown={e=>{e.stopPropagation();if(e.key==='Enter'){e.preventDefault();finish();}if(e.key==='Escape'){e.preventDefault();finish(true);}}}/>:<output tabIndex={0} aria-label={`${p.label} valeur`} title="Double-clic : saisir une valeur" onKeyDown={e=>{if(e.key==='Enter'||e.key==='F2'){e.preventDefault();e.stopPropagation();begin();}}}>{p.value.toFixed(p.digits??1)}</output>}</span>;
}
''')
N('FilterShape.tsx','''import React from 'react';
import type {Band} from '../audio/advancedDsp';
const shapes=[['off','Désactivé','M8 6L56 26M8 26L56 6'],['peaking','Cloche','M2 26H15C24 26 24 5 32 5S40 26 49 26H62'],['lowshelf','Plateau grave','M2 6H20C32 6 29 26 43 26H62'],['highshelf','Plateau aigu','M2 26H20C32 26 29 6 43 6H62'],['highpass','Coupe-bas','M2 28C18 28 18 6 33 6H62'],['lowpass','Coupe-haut','M2 6H31C46 6 46 28 62 28'],['bandpass','Passe-bande','M2 28C20 28 20 6 32 6S44 28 62 28'],['notch','Notch','M2 6H15C25 6 24 28 32 28S39 6 49 6H62']] as const;
export function FilterShape(p:{value:NonNullable<Band['type']>;index:number;onChange:(v:NonNullable<Band['type']>)=>void}){
 const current=shapes.find(s=>s[0]===p.value)??shapes[1];
 const icon=(d:string)=><svg viewBox="0 0 64 32" aria-hidden="true"><path d={d} fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg>;
 return <details className="atz-filter-shape"><summary aria-label={`Bande ${p.index+1} : ${current[1]}`} title={current[1]}>{icon(current[2])}</summary><div className="atz-shape-options" role="group" aria-label="Forme du filtre">{shapes.map(([value,label,d])=><button type="button" key={value} aria-label={label} title={label} aria-pressed={p.value===value} onClick={e=>{p.onChange(value);e.currentTarget.closest('details')?.removeAttribute('open');}}>{icon(d)}</button>)}</div></details>;
}
''')
for name,text in pending.items():
    path=Path('src/components')/name
    with path.open('w',encoding='utf-8',newline='\n') as f:f.write(text)
marker.write_text(key+'\n',encoding='utf-8')
print('Applied effect polish; tests, TypeScript and Windows build must still pass')
