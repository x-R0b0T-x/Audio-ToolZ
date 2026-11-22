import hashlib,json,os
from pathlib import Path
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
marker=Path('.github/control-polish.applied');key=hashlib.sha256(Path(__file__).read_text(encoding='utf-8').encode()).hexdigest()
if marker.exists():
 if marker.read_text().strip()!=key:raise SystemExit('Different control polish already applied')
 raise SystemExit(0)
expected={'src/audio/advancedDsp.ts':'86dc0f3c0688b95ee4877a0d8c7116b69eae4b10','src/audio/limiterCeiling.test.ts':'797090f977fac2ed0f846390fc677c51f4f51c93','src/components/AdvancedEffects.tsx':'0eee9e20a072b2e27cf73ab08d049f409b26dbd8','src/components/TopMenuBar.tsx':'04f2a3c7f20047ddbc6412cbf564e0d0d90fa7b9','src/components/FilterShape.tsx':'9968f2cda562ba96d12e7fe48dd3991d673965f2','src/components/knobStates.css':'5429f8bbce9798d423995fa1ddfabb77bc85f2e6','src-tauri/tauri.conf.json':'e95b1e379fe7ce96ace1149f1c3a40270f1fde1e'}
pending={}
for name,sha in expected.items():
 b=Path(name).read_bytes().replace(bytes([13,10]),bytes([10]))
 if hashlib.sha1(b'blob '+str(len(b)).encode()+bytes([0])+b).hexdigest()!=sha:raise SystemExit('Source changed: '+name)
 pending[name]=b.decode('utf-8')
def R(old,new):
 if pending[p].count(old)!=1:raise SystemExit('Ambiguous patch: '+p+' '+old[:60])
 pending[p]=pending[p].replace(old,new,1)
def N(name,text):
 if Path(name).exists():raise SystemExit('File exists: '+name)
 pending[name]=text
p='src/audio/advancedDsp.ts';R('ceiling:-1,threshold:-18','ceiling:0,threshold:-6')
p='src/audio/limiterCeiling.test.ts';R("test('default ceiling remains minus one',()=>assert.equal(dynamicsDefault().ceiling,-1));","test('default ceiling is zero',()=>assert.equal(dynamicsDefault().ceiling,0));")
p='src/components/AdvancedEffects.tsx';R('initial={dynamicsDefault()[key]}','initial={dynamicsDefault(params.mode)[key]}')
p='src/components/TopMenuBar.tsx';R("import React,{useEffect,useRef,useState} from 'react';","import React,{useEffect,useRef,useState} from 'react';\nimport './headerMotion.css';");R('className={`w-8 h-8 inline-flex','className={`atz-toolbar-action w-8 h-8 inline-flex');R('className="px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--bg-hover)]"','className="atz-menu-trigger px-3 py-1.5 rounded-md text-sm font-medium hover:bg-[var(--bg-hover)]"')
p='src/components/FilterShape.tsx';R("import type {Band} from '../audio/advancedDsp';","import type {Band} from '../audio/advancedDsp';\nimport {colors} from '../audio/advancedDsp';\nimport './filterShapeColors.css';");R('stroke="currentColor"','stroke={colors[p.index]}');R('<details className="atz-filter-shape">',"""<details className="atz-filter-shape" style={{'--atz-band-color':colors[p.index]} as React.CSSProperties}>""")
p='src-tauri/tauri.conf.json';config=json.loads(pending[p]);window=config['app']['windows'][0]
if window.get('title')!='Audio ToolZ v1.6 dev':raise SystemExit('Unexpected primary window')
window.update(maximized=True,fullscreen=False);pending[p]=json.dumps(config,ensure_ascii=False,indent=2)+chr(10)
pending['src/components/knobStates.css']='''.atz-parameter,.atz-knob{--atz-knob-ink:#bd93f9;--atz-knob-light:none;--atz-pointer-ink:#fff;--atz-pointer-light:none}
.atz-parameter:hover,.atz-parameter.is-adjusting,.atz-parameter:has(>button:focus-visible),.atz-knob:hover,.atz-knob.is-adjusting,.atz-knob:has([role=slider]:focus-visible){--atz-knob-ink:#39ff14;--atz-knob-light:drop-shadow(0 0 4px #39ff14)}
.atz-parameter.is-adjusting,.atz-knob.is-adjusting{--atz-pointer-ink:#39ff14;--atz-pointer-light:drop-shadow(0 0 4px #39ff14)}
.atz-parameter>button[role=slider]>svg>circle,.atz-knob [role=slider]>svg>circle{stroke:var(--atz-knob-ink)!important;filter:var(--atz-knob-light)!important}
.atz-parameter>button[role=slider]>svg>line:not(:last-child),.atz-knob [role=slider]>svg>line:not(:last-child){stroke:#39ff14!important;filter:var(--atz-knob-light)!important}
.atz-parameter>button[role=slider]>svg>line:last-child,.atz-knob [role=slider]>svg>line:last-child{stroke:var(--atz-pointer-ink)!important;filter:var(--atz-pointer-light)!important}
fieldset:disabled .atz-parameter,.atz-knob:has([aria-disabled=true]){--atz-knob-ink:#bd93f9!important;--atz-knob-light:none!important;--atz-pointer-ink:#fff!important;--atz-pointer-light:none!important}
'''
N('src/components/headerMotion.css','''.atz-toolbar-action,.atz-menu-trigger{transform-origin:center;transition:transform 160ms ease-out,box-shadow 160ms ease-out,background-color 160ms ease-out}
@media(hover:hover) and (pointer:fine){.atz-toolbar-action:not(:disabled):not([aria-disabled=true]):hover{transform:scale(1.04);box-shadow:0 0 4px #39ff1460}.atz-menu-trigger:not(:disabled):hover{transform:scale(1.02);box-shadow:inset 0 0 0 1px #39ff1450}}
.atz-toolbar-action:not(:disabled):focus-visible{transform:scale(1.04)}
.atz-menu-trigger:focus-visible{transform:scale(1.02)}
.atz-menu-trigger[aria-expanded=true]{background:var(--bg-hover);box-shadow:inset 0 0 0 1px #39ff1450}
@media(prefers-reduced-motion:reduce){.atz-toolbar-action,.atz-menu-trigger{transition:none!important;transform:none!important}}
''')
N('src/components/filterShapeColors.css','''.atz-filter-shape .atz-shape-options{border-color:var(--atz-band-color);box-shadow:0 0 8px var(--atz-band-color)}
.atz-filter-shape .atz-shape-options button[aria-pressed=true],.atz-filter-shape .atz-shape-options button:hover{color:var(--atz-band-color);border-color:var(--atz-band-color)}
.atz-filter-shape .atz-shape-options button[aria-pressed=true] svg{filter:drop-shadow(0 0 2px var(--atz-band-color))}
''')
N('src/audio/controlPolish.test.ts',"""import {test} from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';import {dynamicsDefault,CEILING_RANGE} from './advancedDsp';
test('compressor opens with zero gain, zero ceiling and minus six threshold',()=>{const p=dynamicsDefault('compressor');assert.deepEqual([p.input,p.ceiling,p.threshold],[0,0,-6]);assert.equal(p.mode,'compressor');});
test('limiter opens with zero gain and ceiling',()=>{const p=dynamicsDefault('limiter');assert.deepEqual([p.input,p.ceiling],[0,0]);assert.equal(p.mode,'limiter');});
test('positive ceiling range remains twelve',()=>assert.equal(CEILING_RANGE.max,12));
test('default objects do not share mutable state',()=>{const p=dynamicsDefault();p.input=12;assert.equal(dynamicsDefault().input,0);});
test('startup is maximized, not fullscreen',()=>{const p=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8')).app.windows[0];assert.equal(p.maximized,true);assert.equal(p.fullscreen,false);});
test('all knob graduations remain green and moving indicators can glow',()=>{const css=readFileSync('src/components/knobStates.css','utf8');assert.ok(css.includes('stroke:#39ff14!important'));assert.ok(css.includes('--atz-pointer-ink:#39ff14'));assert.ok(css.includes('stroke:var(--atz-pointer-ink)!important'));});
test('filter icons use the band color and headers respect reduced motion',()=>{assert.ok(readFileSync('src/components/FilterShape.tsx','utf8').includes('stroke={colors[p.index]}'));const css=readFileSync('src/components/headerMotion.css','utf8');assert.ok(css.includes('prefers-reduced-motion:reduce'));assert.ok(css.includes('scale(1.04)'));assert.ok(css.includes('scale(1.02)'));});
""")
for name,text in pending.items():
 path=Path(name);path.parent.mkdir(parents=True,exist_ok=True)
 with path.open('w',encoding='utf-8',newline=chr(10)) as f:f.write(text)
marker.write_text(key+chr(10),encoding='utf-8')
print('Controls prepared; tests, TypeScript and Windows compilation must succeed before source commit')
