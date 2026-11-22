from pathlib import Path
import os,re,hashlib,shutil
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':
    raise SystemExit('Restricted branch')
marker=Path('.github/presentation-final-v1.applied')
if marker.exists():
    raise SystemExit(0)
pending={}
def read(name):
    name=Path(name).as_posix()
    if name not in pending:
        pending[name]=Path(name).read_text(encoding='utf-8')
    return pending[name]
def patch(name,old,new):
    name=Path(name).as_posix()
    text=read(name)
    if text.count(old)!=1:
        raise SystemExit('Ambiguous patch: '+name+' '+old[:100])
    pending[name]=text.replace(old,new,1)

def add_import(name,line):
    pending[name]=line+'\n'+read(name)

name='src/components/TopMenuBar.tsx'
patch(name,'<div id="atz-header-kick-slot" className="flex justify-center" />','')
patch(name,'items-center gap-4 px-4 h-16 border-b','items-center gap-4 px-4 h-12 border-b')
patch(name,'<div className="flex gap-1 overflow-x-auto px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]">','<div className="atz-main-effect-toolbar grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-3 px-3 py-1.5 border-b border-[var(--border-subtle)] bg-[var(--bg-canvas)]"><div className="flex gap-1 overflow-x-auto">')
patch(name,"{tool(I.IconVolume,'Volume'", "</div><div id=\"atz-header-kick-slot\" className=\"flex justify-center\" /><div className=\"flex gap-1 overflow-x-auto\">{tool(I.IconVolume,'Volume'")
patch(name,' </div></div>;',' </div></div></div>;')

name='src/utils/finalUi.ts'
patch(name,'scale(${1+.14*level})','scale(${1+.30*level})')
patch(name,"   if(snap&&snap.getAttribute('aria-pressed')==='true'){", "   const rebound=level*(1+.28*Math.sin((1-level)*Math.PI*3));\n   if(snap&&snap.getAttribute('aria-pressed')==='true'){")
for old,new in [('2+10*level','2+18*rebound'),('.2+.65*level','.2+.65*Math.min(1,rebound)'),('4+16*level','4+26*rebound'),('.1+.45*level','.1+.5*Math.min(1,rebound)')]:
    patch(name,old,new)
patch(name,'  if(!(event.target instanceof Element)||current?.contains(event.target))return;',"  if(event.target instanceof Element&&event.target.closest('.atz-knob,.atz-parameter')){hide();return;}\n  if(!(event.target instanceof Element)||current?.contains(event.target))return;")

name='src/components/EffectParameter.tsx'
add_import(name,"import {signedDb} from '../utils/presentationFormat';")
patch(name,' title="Glisser ou molette · Maj : réglage fin · Double-clic : valeur initiale"','')
patch(name,'digits={s.digits} onCommit=',"digits={s.digits} signed={p.unit?.startsWith('dB')} onCommit=")
patch(name,'<output>{value.toFixed(1)}</output>','<output>{signedDb(value,1)}</output>')

name='src/components/NumericValue.tsx'
add_import(name,"import {signedDb} from '../utils/presentationFormat';")
patch(name,'digits?:number;onCommit:','digits?:number;signed?:boolean;onCommit:')
patch(name,' title="Double-clic : saisir une valeur"','')
patch(name,'>{p.value.toFixed(p.digits??1)}</output>','>{p.signed?signedDb(p.value,p.digits??1):p.value.toFixed(p.digits??1)}</output>')

name='src/components/EffectControls.tsx'
add_import(name,"import {signedDbLabel} from '../utils/presentationFormat';")
patch(name,'title="Glisser ou molette pour régler ; double-clic : valeur par défaut" ','')
text=read(name)
if text.count('>{p.display}</output>')!=2:
    raise SystemExit('Unexpected legacy value outputs')
pending[name]=text.replace('>{p.display}</output>','>{signedDbLabel(p.display)}</output>')

name='src/components/DetailedEffectGraph.tsx'
add_import(name,"import {signedDb} from '../utils/presentationFormat';")
patch(name,"ctx.fillText(String(db),5,py+4)","ctx.fillText(signedDb(db,0),5,py+4)")
patch(name,'p.params.input.toFixed(1)','signedDb(p.params.input,1)')
patch(name,'p.params.ceiling.toFixed(1)','signedDb(p.params.ceiling,1)')
patch(name,'textAnchor="end">{db}</text>','textAnchor="end">{signedDb(db,0)}</text>')
patch(name,"(props.params.mode === 'limiter' ? props.params.ceiling : props.params.threshold).toFixed(1)","signedDb(props.params.mode === 'limiter' ? props.params.ceiling : props.params.threshold,1)")
patch(name,'${b.gainDb.toFixed(1)} dB','${signedDb(b.gainDb,1)} dB')
patch(name,'r.height-t-24','r.height-t-68')
text=read(name)
if text.count('r.height-5')!=2:
    raise SystemExit('Unexpected graph time labels')
pending[name]=text.replace('r.height-5','r.height-48')

name='src/components/advancedEffects.css'
pending[name]=read(name)+'''
/* Final visual polish: retain each band's identity and circular controls. */
#root .atz-band{position:relative;border-top-color:transparent!important}
#root .atz-band::before{content:"";position:absolute;left:0;right:0;top:-3px;height:3px;background:var(--atz-control-color);filter:saturate(1.5) brightness(1.25);box-shadow:0 0 5px var(--atz-control-color);pointer-events:none}
#root .atz-filter-shape summary svg,#root .atz-shape-options svg{filter:saturate(1.5) brightness(1.3);stroke-width:2}
#root .atz-filter-shape summary,#root .atz-filter-type select,#root .atz-shape-options{border-radius:7px}
#root .atz-advanced button:not(.atz-eq-point):not([role="slider"]){border-radius:8px}
#root .atz-dynamics .atz-graph-block{position:relative;min-height:230px}
#root .atz-dynamics .atz-scroll-toolbar{position:absolute;right:10px;bottom:5px;padding:0;z-index:2;background:var(--wave-bg,#080a14);border-radius:8px}
#root .atz-dynamics .atz-scroll-toolbar .atz-parameter{font-size:11px;gap:5px}
#root .atz-dynamics .atz-scroll-toolbar .atz-parameter>button{width:32px;height:32px}
#root .atz-dynamics-controls{flex-wrap:nowrap;overflow-x:auto;overflow-y:hidden;gap:6px;padding-top:8px}
#root .atz-dynamics-controls>.atz-control-group{flex:none;gap:6px;padding-left:7px;padding-right:7px}
'''
name='src/components/aboutLayout.css'
pending[name]=read(name)+'''
/* Larger resting artwork with room for its kick expansion. */
#root .atz-about-dialog .atz-about-hero{grid-template-columns:minmax(0,1fr) minmax(0,1.05fr);gap:16px;min-height:252px}
#root .atz-about-dialog .atz-about-hero .atz-about-robot{--atz-art-size:clamp(112px,36cqw,180px);width:calc(var(--atz-art-size) + 48px);height:calc(var(--atz-art-size) + 64px)}
#root .atz-about-dialog .atz-about-hero .atz-about-robot>img{left:24px;top:32px;will-change:transform}
#atz-header-kick-slot{min-height:32px;align-items:center;padding:0 5px}
#atz-header-kick-slot [data-testid="snap-kicks-toggle"]{font-size:11px;min-height:28px;padding:4px 10px;flex:none}
@container (max-width:430px){#root .atz-about-dialog .atz-about-hero .atz-about-robot{--atz-art-size:clamp(100px,31cqw,130px)}}
'''

old=Path('src/features/easter-egg')
new=Path('src/features/q7m4n2')
if not old.is_dir() or new.exists():
    raise SystemExit('Unexpected feature directory state')
media={p.relative_to(old).as_posix():hashlib.sha256(p.read_bytes()).hexdigest() for p in old.rglob('*') if p.is_file() and p.suffix.lower() in {'.png','.ogg'}}
if not media:
    raise SystemExit('Missing original media')
for path in Path('src').rglob('*'):
    if path.is_file() and path.suffix in {'.ts','.tsx','.mjs','.mts','.css','.json'}:
        name=path.as_posix()
        text=read(name)
        if 'easter-egg' in text:
            pending[name]=text.replace('easter-egg','q7m4n2')
name='.github/scripts/verify-about-ring.py'
pending[name]=read(name).replace('easter-egg','q7m4n2')

header=read('src/components/TopMenuBar.tsx')
if header.count('id="atz-header-kick-slot"')!=1 or header.index('id="atz-header-kick-slot"')<header.index('</header>'):
    raise SystemExit('Kick indicator must be in the effects toolbar')
for name in ['src/components/EffectParameter.tsx','src/components/EffectControls.tsx']:
    if re.search(r'title="Glisser ou molette',read(name)):
        raise SystemExit('Knob tooltip remains: '+name)
if len(pending)!=len({str(Path(p).resolve()).casefold() for p in pending}):
    raise SystemExit('Aliased output paths')
for name,text in pending.items():
    Path(name).write_text(text,encoding='utf-8',newline='\n')
shutil.move(str(old),str(new))
for relative,digest in media.items():
    if hashlib.sha256((new/relative).read_bytes()).hexdigest()!=digest:
        raise SystemExit('Media changed: '+relative)
marker.write_text('presentation-final-v1\n',encoding='utf-8')
print('Presentation prepared. Existing tests, TypeScript, media verification and Windows compilation remain mandatory.')
