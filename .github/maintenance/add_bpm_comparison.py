import json,os,re,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
def read(path):return (ROOT/path).read_text(encoding='utf-8')
def write(path,text):
 target=ROOT/path;target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(text.encode('utf-8'))
def once(text,old,new):
 if text.count(old)!=1:raise RuntimeError('Unexpected source: '+old[:90])
 return text.replace(old,new,1)
def main():
 def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True,encoding='utf-8').strip()
 if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ' or git('branch','--show-current')!='v.1.7-dev' or git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA'):raise RuntimeError('Wrong development checkout')
 app=read('src/App.tsx');settings=read('src/components/SettingsModal.tsx');package=json.loads(read('package.json'))
 marker="import {useBpmComparison} from './components/BpmComparison';"
 if marker in app:
  if 'BpmComparisonSettings audioDocument=' not in settings or package['dependencies'].get('essentia.js')!='0.1.3' or package['dependencies'].get('aubiojs')!='0.2.1':raise RuntimeError('Partial BPM integration')
  return
 app=once(app,'  const updateActiveDoc = useCallback(',"  useBpmComparison(documents,setDocuments,showToast);\n  const updateActiveDoc = useCallback(")
 pattern=r'  const handleDetectBpm = useCallback\(\(\) => \{.*?\}, \[activeDoc, showToast, updateActiveDoc\]\);'
 app,count=re.subn(pattern,'  const handleDetectBpm = useCallback(() => {if(activeDoc)requestBpmAnalysis(activeDoc.id);}, [activeDoc]);',app,flags=re.S)
 if count!=1:raise RuntimeError('Cannot safely replace main BPM handler')
 app,count=re.subn(r'(?m)^\s*detectBpmAndBeats,\s*$', '', app,count=1)
 if count!=1 or app.count('detectBpmAndBeats(')!=3:raise RuntimeError('Unexpected legacy recomputation sites')
 app=app.replace('detectBpmAndBeats(','recomputeBpmForSelectedEngine(')
 app=once(app,'<SettingsModal','<SettingsModal bpmDocument={activeDoc}')
 app=marker+"\nimport {requestBpmAnalysis,recomputeBpmForSelectedEngine} from './audio/bpmCompare';\n"+app
 settings="import {BpmComparisonSettings} from './BpmComparison';\nimport type {AudioDocument} from '../audio/types';\n"+settings
 settings=once(settings,'onClose:()=>void;}','onClose:()=>void;bpmDocument?:AudioDocument|null;}')
 settings=once(settings,'<main>','<main><BpmComparisonSettings audioDocument={p.bpmDocument??null}/>')
 package['dependencies'].update({'essentia.js':'0.1.3','aubiojs':'0.2.1'});package.setdefault('devDependencies',{})['playwright']='1.56.1'
 write('src/App.tsx',app);write('src/components/SettingsModal.tsx',settings);write('package.json',json.dumps(package,ensure_ascii=False,indent=2)+'\n')
 write('.github/diagnostics/bpm-comparison.json',json.dumps({'baseCommit':os.environ['GITHUB_SHA'],'validation':'pending','engines':{'builtin':'Audio ToolZ','essentia':'essentia.js 0.1.3','aubio':'aubiojs 0.2.1'},'scope':['main BPM analysis','beat grid','settings comparator'],'pending':['manual Windows comparison','full variable-tempo effect synchronization','user approval before main']},indent=2)+'\n')
if __name__=='__main__':main()
