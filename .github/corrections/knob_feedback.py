import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!='v.1.7-dev':raise RuntimeError('Wrong branch')
pending={}
def read(p):return pending[p] if p in pending else (ROOT/p).read_text(encoding='utf-8')
def replace(p,old,new):
 t=read(p)
 if new in t:return
 if t.count(old)!=1:raise RuntimeError('Unexpected source: '+p+' / '+old[:60])
 pending[p]=t.replace(old,new,1)
pending['src/components/KnobTicks.tsx']='''type Props={fraction:number;count:number;center:number;inner:number;outer:number};
export function KnobTicks({fraction,count,center,inner,outer}:Props){
 const selected=Math.round(Math.max(0,Math.min(1,fraction))*Math.max(0,count-1));
 return <>{Array.from({length:count},(_,i)=>{const a=(-135+i*270/Math.max(1,count-1))*Math.PI/180;return <line key={i} data-zonyx-tick={i===selected?'selected':Math.abs(i-selected)===1?'neighbor':'idle'} x1={center+inner*Math.sin(a)} y1={center-inner*Math.cos(a)} x2={center+outer*Math.sin(a)} y2={center-outer*Math.cos(a)}/>;})}</>;
}
'''
p='src/components/EffectParameter.tsx'
replace(p,"import './knobStates.css';","import './knobStates.css';\nimport {KnobTicks} from './KnobTicks';")
replace(p,'compact?: boolean };','compact?: boolean; displayValue?:number; onDisplayCommit?:(v:number)=>void };')
replace(p,'{Array.from({ length: 11 }, (_, i) => { const a = (-135 + i * 27) * Math.PI / 180; return <line key={i} x1={32 + 26 * Math.sin(a)} y1={32 - 26 * Math.cos(a)} x2={32 + 30 * Math.sin(a)} y2={32 - 30 * Math.cos(a)} stroke="currentColor"/>; })}','<KnobTicks fraction={fraction(p.value)} count={11} center={32} inner={26} outer={30}/>')
replace(p,'aria-valuetext={`${p.value} ${p.unit ?? \'\'}`}','aria-valuetext={`${p.displayValue??p.value} ${p.unit ?? \'\'}`}')
replace(p,'<NumericValue label={p.label} value={p.value}','<NumericValue label={p.label} value={p.displayValue??p.value}')
replace(p,'activity.pulse();p.onChange(parameterValue(v,s));','activity.pulse();if(p.onDisplayCommit)p.onDisplayCommit(v);else p.onChange(parameterValue(v,s));')
p='src/components/EffectControls.tsx'
replace(p,"import './knobStates.css';","import './knobStates.css';\nimport {KnobTicks} from './KnobTicks';")
t=read(p);a=t.find('        {Array.from({ length: tickCount }');b=t.find('        <circle cx="50"',a)
if a>=0 and b>a:pending[p]=t[:a]+'        <KnobTicks fraction={fraction} count={tickCount} center={50} inner={38} outer={45}/>\n'+t[b:]
elif '<KnobTicks fraction={fraction} count={tickCount}' not in t:raise RuntimeError('Unknown Knob renderer')
replace(p,'      </svg>\n    </div><output','      </svg>{p.label==="Panoramique de départ"&&<div className="zonyx-pan-labels" aria-hidden="true"><span>Gauche</span><span>Droite</span></div>}\n    </div><output')
p='src/utils/controlGestures.ts'
replace(p,"const direction = (sum < 0 ? 1 : -1) * (field.closest('.zonyx-rv-stereo') ? -1 : 1);",'const direction = sum < 0 ? 1 : -1;')
p='src/components/finishingV17.css'
replace(p,'#root#root .zonyx-rv-stereo .zonyx-parameter>button svg{transform:scaleX(-1)}','#root#root .zonyx-rv-stereo .zonyx-parameter>button svg{transform:none}')
p='src/components/ReverbModal.tsx'
replace(p,"id==='width'?value/2:value","id==='width'?Math.abs(value-100):value")
replace(p,'<EffectParameter label="Stéréo" value={settings.width/2} initial={DEFAULT_REVERB.width/2}','<EffectParameter label="Stéréo" displayValue={Math.abs(settings.width-100)} onDisplayCommit={v=>update(\'width\',settings.width>100?100+v:100-v,\'Stéréo\')} value={100-settings.width/2} initial={100-DEFAULT_REVERB.width/2}')
replace(p,"onChange={v=>update('width',v*2,'Stéréo')}","onChange={v=>update('width',200-v*2,'Stéréo')}")
t=read(p);old="<span role=\"status\">{busy?'Calcul…':''}</span>"
if old in t:pending[p]=t.replace(old,'',1)
p='src/utils/reviewV17.test.mjs'
if (ROOT/p).exists():pending[p]=read(p).replace('stereo wheel inversion leaves all other controls unchanged','wheel direction is identical for all controls').replace('stereo?-1:1','1').replace('stereo?1:-1','-1')
pending['src/components/knobStates.css']='''.zonyx-parameter,.zonyx-knob{--zonyx-knob-ink:#bd93f9;--zonyx-knob-light:none;--zonyx-pointer-ink:#fff;--zonyx-pointer-light:none}
#root#root .zonyx-parameter>button[role=slider],#root#root .zonyx-knob [role=slider]{outline:none!important;border:0!important;box-shadow:none!important;filter:none!important;background:transparent!important}
#root#root .zonyx-parameter>button[role=slider]>svg,#root#root .zonyx-knob [role=slider]>svg{outline:none!important;border:0!important;box-shadow:none!important;filter:none!important;overflow:visible}
#root#root .zonyx-parameter>button[role=slider]::before,#root#root .zonyx-parameter>button[role=slider]::after,#root#root .zonyx-knob [role=slider]::before,#root#root .zonyx-knob [role=slider]::after{content:none!important}
#root#root .zonyx-parameter>button[role=slider]>svg>circle,#root#root .zonyx-knob [role=slider]>svg>circle{stroke:#bd93f9!important;filter:none!important}
#root#root [role=slider]>svg>line[data-zonyx-tick]{stroke-width:2!important;stroke-linecap:round;vector-effect:non-scaling-stroke;filter:none!important;opacity:1!important}
#root#root [role=slider]>svg>line[data-zonyx-tick=idle]{stroke:#fff!important}
#root#root [role=slider]>svg>line[data-zonyx-tick=neighbor]{stroke:#39ff14!important;opacity:.25!important}
#root#root [role=slider]>svg>line[data-zonyx-tick=selected]{stroke:#39ff14!important;filter:drop-shadow(0 0 3px #39ff14)!important}
#root#root .zonyx-parameter>button[role=slider]>svg>line:last-child,#root#root .zonyx-knob [role=slider]>svg>line:last-child{stroke:#fff!important;filter:none!important}
#root#root [role=slider]:focus-visible>svg>line:last-child{stroke:#39ff14!important}
#root#root fieldset:disabled [role=slider]>svg>line[data-zonyx-tick],#root#root [role=slider][aria-disabled=true]>svg>line[data-zonyx-tick]{stroke:#fff!important;filter:none!important;opacity:.4!important}
.zonyx-pan-labels{display:flex;justify-content:space-between;gap:12px;width:100%;color:#fff;font:600 10px system-ui;margin-top:2px}
'''
p='src/components/EffectStatus.tsx'
replace(p,"useState('Choisissez un réglage')","useState('')")
replace(p,'|null=null,pulsing=false;','|null=null,pulsing=false,held=false;')
replace(p,"setAdjusting(pulsing||!!panel.querySelector('main .is-adjusting'))",'setAdjusting(held||pulsing)')
replace(p,'frame=0;refreshActivity();','frame=0;refreshActivity();if(!held&&!pulsing)return;')
replace(p,'   const existing=panel.querySelector',"   const point=active?.closest('[data-eq-band]');if(point){setText(point.getAttribute('aria-label')??'Réglage');return;}\n   const existing=panel.querySelector")
replace(p,'if(existing?.textContent){',"if(existing?.textContent&&!active?.closest('.zonyx-parameter,.zonyx-gain,.zonyx-knob,input,select,[role=\"slider\"]')){")
replace(p,"target.closest('input,select,[role=\"slider\"]')??group?.querySelector('input,select,[role=\"slider\"]')","target.closest('input,select,[role=\"slider\"],[data-eq-band]')??group?.querySelector('input,select,[role=\"slider\"]')??(event.type==='wheel'&&target.closest('.zonyx-graph.detailed')?panel.querySelector('[data-eq-band]:focus'):null)")
replace(p,"   const moving=event.type==='pointermove'","   if(control&&!control.closest('[inert],fieldset:disabled')&&!control.matches(':disabled,[aria-disabled=\"true\"]')&&event instanceof PointerEvent&&event.type==='pointerdown'&&event.button===0){held=true;refreshActivity();}\n   const moving=event.type==='pointermove'")
replace(p,'   active=group??target;','   active=group??control??target;')
replace(p,"    setText(`${target.closest","    pulse();setText(`${target.closest")
replace(p,"  const events=['input'","  const release=()=>{if(!held)return;held=false;pulsing=false;if(timer!==null){clearTimeout(timer);timer=null;}refreshActivity();};\n  window.addEventListener('pointerup',release,true);window.addEventListener('pointercancel',release,true);window.addEventListener('blur',release);\n  const events=['input'")
replace(p,"attributeFilter:['class'","attributeFilter:['aria-label','class'")
replace(p,'return()=>{observer.disconnect();',"return()=>{window.removeEventListener('pointerup',release,true);window.removeEventListener('pointercancel',release,true);window.removeEventListener('blur',release);observer.disconnect();")
replace(p,'title={text}>{text}</output>','aria-hidden={!adjusting} title={adjusting?text:undefined}>{text}</output>')
p='src/components/effectStatus.css'
t=read(p)
if '/* Temporary status fade */' not in t:t+='''
/* Temporary status fade */
#root#root .zonyx-effect-status>output{opacity:0;visibility:hidden;transition:opacity 250ms ease-out,visibility 0s 250ms}
#root#root .zonyx-effect-status.is-control-active>output{opacity:1;visibility:visible;transition:opacity 60ms ease-out,visibility 0s}
@media(prefers-reduced-motion:reduce){#root#root .zonyx-effect-status>output{transition:none}}
'''
if '/* White footer button labels */' not in t:t+='''
/* White footer button labels */
#root#root#root .zonyx-advanced>footer>button{color:#fff!important;text-shadow:none!important}
#root#root#root .zonyx-advanced>footer>button:not(:disabled):is(:hover,:focus-visible){color:#fff!important;text-shadow:none!important;border-color:#39ff14!important;box-shadow:0 0 8px #39ff1480!important;filter:none!important}
#root#root#root .zonyx-advanced>footer>button:is(:hover,:focus-visible)>*{color:#fff!important;text-shadow:none!important}
'''
pending[p]=t
p='src/components/effectHelp.css'
t=read(p)
if '/* Borderless reviewed help */' not in t:pending[p]=t+'''
/* Borderless reviewed help */
.zonyx-help-dialog.zonyx-help-dialog{border:0!important;box-shadow:0 18px 48px #000c!important}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link{border:0!important;box-shadow:none!important}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link:is(:hover,:focus-visible){outline:none!important}
.zonyx-help-dialog .zonyx-help-topic .zonyx-help-link:focus-visible{text-decoration:underline;text-decoration-thickness:3px;text-underline-offset:4px}
'''
pending['src/components/knobFeedback.test.mjs']='''import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL(p,import.meta.url),'utf8');
test('uniform wheel and no stereo mirror',()=>{assert.ok(read('../utils/controlGestures.ts').includes('const direction = sum < 0 ? 1 : -1;'));assert.ok(!read('./finishingV17.css').includes('transform:scaleX(-1)'));});
test('stereo physical direction and neutral percentage',()=>{const s=read('./ReverbModal.tsx');assert.ok(s.includes('value={100-settings.width/2}'));assert.ok(s.includes('200-v*2'));assert.ok(s.includes('Math.abs(settings.width-100)'));assert.ok(!s.includes('Calcul…'));assert.deepEqual([0,50,100].map(v=>Math.abs((200-2*v)-100)),[100,0,100]);});
test('white idle ticks localized halo and pan labels',()=>{for(const p of ['./EffectParameter.tsx','./EffectControls.tsx'])assert.ok(read(p).includes('<KnobTicks'));const css=read('./knobStates.css');assert.ok(css.includes('data-zonyx-tick=idle]{stroke:#fff'));assert.ok(css.includes('data-zonyx-tick=selected]{stroke:#39ff14'));assert.ok(read('./EffectControls.tsx').includes('<span>Gauche</span><span>Droite</span>'));});
test('status retains text for fade but stops idle updates',()=>{const s=read('./EffectStatus.tsx');assert.ok(s.includes('aria-hidden={!adjusting}'));assert.ok(s.includes('>{text}</output>'));assert.ok(s.includes('setAdjusting(held||pulsing)'));assert.ok(s.includes('if(!held&&!pulsing)return;'));assert.ok(s.includes('[data-eq-band]'));const css=read('./effectStatus.css');assert.ok(css.includes('opacity 250ms ease-out'));assert.ok(css.includes('visibility 0s 250ms'));});
test('footer hover keeps white text with an outer green halo',()=>{const css=read('./effectStatus.css');assert.ok(css.includes('button:not(:disabled):is(:hover,:focus-visible){color:#fff!important;text-shadow:none!important;border-color:#39ff14!important;box-shadow:0 0 8px #39ff1480!important'));});
'''
for p,t in pending.items():
 f=ROOT/p;f.parent.mkdir(parents=True,exist_ok=True);f.write_text(t,encoding='utf-8')
print('Corrected files:',len(pending))
