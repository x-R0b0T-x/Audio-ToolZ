from pathlib import Path
import os,re,json
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
marker=Path('.github/clean-16.applied')
if marker.exists():raise SystemExit(0)
if not Path('.github/refresh-loop-ui-v1.applied').is_file():raise SystemExit('Validated loop revision marker missing')
pending={}
def read(name):
    name=Path(name).as_posix()
    if name not in pending:pending[name]=Path(name).read_text(encoding='utf-8')
    return pending[name]
def patch(name,old,new):
    text=read(name)
    if text.count(old)!=1:raise SystemExit('Unexpected source: '+name+' '+old[:100])
    pending[name]=text.replace(old,new,1)

name='src/components/AdvancedEffects.tsx'
for label in ['NIVEAU','ENVELOPPE','AFFICHAGE']:patch(name,'<span>'+label+'</span>','')
name='src/components/advancedEffects.css'
lines=read(name).splitlines()
pending[name]='\n'.join(line for line in lines if '.atz-scroll-toolbar' not in line)+'\n'+'''
/* Controls remain accessible without a horizontal scrollbar. */
#root .atz-dynamics-controls{overflow:visible!important;flex-wrap:wrap!important;row-gap:8px;align-items:flex-start}
#root .atz-dynamics-controls .atz-control-group:not(:has(>span)){padding-top:0}
#root .atz-dynamics-controls .atz-control-group[aria-label="Défilement"]{margin-left:auto;order:99;border-right:0;padding-right:0}
'''

name='src/components/EffectModal.tsx'
patch(name,'import {applyVolume,normalizeChannels,applyFade,','import {applyFade,')
patch(name,'useState({gain:0,target:-1,','useState({')
patch(name,"volume:'Volume',normalize:'Normaliser le niveau',",'')
patch(name,"case 'volume':return applyVolume(source,0,n,c.gain);case 'normalize':return normalizeChannels(source,0,n,c.target).channels;",'')
patch(name,"if(effect==='volume'){callback.current.onStartPreview(process(),doc.sampleRate);return;}",'')
patch(name,"key:'gain'|'target'|'speed'|'pitch'|'reduction'","key:'speed'|'pitch'|'reduction'")
patch(name,"{effect==='volume'&&f('gain','Gain',0,-24,24,.5,'dB')}{effect==='normalize'&&f('target','Pic cible',-1,-12,0,.5,'dBFS')}",'')
name='src/audio/types.ts'
patch(name,"  | 'volume'\n  | 'normalize'\n",'')

name='src/components/WaveformView.tsx'
patch(name,"import {SnapIndicatorPortal} from './SnapIndicatorPortal';\n",'')
text=read(name)
if text.count('<SnapIndicatorPortal>')!=1 or text.count('</SnapIndicatorPortal>')!=1:raise SystemExit('Unexpected indicator wrapper')
pending[name]=text.replace('<SnapIndicatorPortal>','').replace('</SnapIndicatorPortal>','')
name='src/utils/overviewNavigation.test.ts'
patch(name,"const indicator=readFileSync('src/components/SnapIndicatorPortal.tsx','utf8');assert.ok(indicator.includes('return <>{children}</>'));","const indicator=readFileSync('src/components/WaveformView.tsx','utf8');assert.ok(indicator.includes('data-testid=\"snap-kicks-toggle\"'));assert.ok(!indicator.includes('SnapIndicatorPortal'));")

name='src/components/aboutPresentation.css'
pending[name]='\n'.join(line for line in read(name).splitlines() if not line.startswith('.atz-about-title>span'))+'\n'
name='src/components/InfoModal.tsx'
patch(name,"export const APP_VERSION = 'v1.6 dev';","export const APP_VERSION = 'v1.6';")
for name in ['package.json','src-tauri/tauri.conf.json']:
    data=json.loads(read(name));data['version']='1.6.0'
    if name.endswith('tauri.conf.json'):data['app']['windows'][0]['title']='Audio ToolZ v1.6'
    pending[name]=json.dumps(data,ensure_ascii=False,indent=2)+'\n'
name='src-tauri/Cargo.toml'
patch(name,'version = "1.5.0"','version = "1.6.0"')
name='src/App.tsx'
patch(name,"document.title = 'Audio ToolZ v1.5';","document.title = 'Audio ToolZ v1.6';")

name='CHANGELOG.md'
text=read(name)
if not text.startswith('# Journal des modifications\n'):raise SystemExit('Unexpected changelog heading')
notes=Path('RELEASE_NOTES_1.6.md').read_text(encoding='utf-8').split('\n',1)[1].strip()
pending[name]='# Journal des modifications\n\n## 1.6\n\n'+notes+'\n\n'+text.split('\n',1)[1].lstrip()

remove=['src/components/SnapIndicatorPortal.tsx','src/components/about-ring.generated.ts']
for target in remove:
    stem=Path(target).stem
    for path in Path('src').rglob('*'):
        if path.is_file() and path.suffix in {'.ts','.tsx','.mjs','.mts'} and path.as_posix()!=target:
            text=read(path.as_posix())
            if re.search(r'(?:from\s*[\'\"]|import\s*\(\s*[\'\"])[^\'\"]*'+re.escape(stem),text):raise SystemExit('Live dependency on '+target)

migrations=['finalize-v16.py','polish-controls.py','finish-v16-ui.py','navigation-kicks.py','presentation-final.py','revision-controls.py','refresh-loop-ui.py']
workflows=list(Path('.github/workflows').glob('*.yml'))+list(Path('.github/workflows').glob('*.yaml'))
for script in migrations:
    if not any(script in p.read_text(encoding='utf-8') for p in workflows):remove.append('.github/scripts/'+script)
for name,text in pending.items():Path(name).write_text(text,encoding='utf-8',newline='\n')
for target in remove:Path(target).unlink(missing_ok=True)
marker.write_text('clean-16\n',encoding='utf-8')
print(json.dumps({'removed':remove,'status':'Candidate sources prepared; full tests and Windows compilation remain required'},ensure_ascii=False))
