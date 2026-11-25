import json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE='81b6be40580f0589aa4cc9832a8945413bf14628'
EXPERIMENT='0eebc77c9ab3cc6d28d152e24d916989dbf66ec5'
RESTORE=('src/App.tsx','src/components/SettingsModal.tsx','package.json','vite.config.ts')
REMOVE=('src/audio/bpmCompareMath.mjs','src/audio/bpmCompareMath.d.mts','src/audio/bpmCompare.builtin.worker.ts','src/audio/bpmCompare.ts','public/third_party/bpm/worker.js','src/components/BpmComparison.tsx','src/audio/bpmCompareMath.test.mjs','src/audio/bpmCompare.browser.mjs','.github/maintenance/add_bpm_comparison.py','.github/maintenance/vendor_bpm.py','THIRD_PARTY_BPM.md','src/audio/bpmVendor.test.mjs','src/audio/bpmRuntimeCopy.test.mjs','src/audio/bpmEssentiaWorker.test.mjs','.github/diagnostics/bpm-comparison.json')
WORKFLOW='.github/workflows/build-v1.7-dev.yml'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT).decode('utf-8').strip()
def main():
 if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ' or git('branch','--show-current')!='v.1.7-dev' or git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA'):raise RuntimeError('Wrong development checkout')
 for path in RESTORE+REMOVE:
  if git('rev-parse','HEAD:'+path)!=git('rev-parse',EXPERIMENT+':'+path):raise RuntimeError('Refusing to overwrite newer changes: '+path)
 detector='src/audio/dsp.ts'
 if git('rev-parse','HEAD:'+detector)!=git('rev-parse',BASE+':'+detector):raise RuntimeError('Native detector changed; manual review required')
 for path in RESTORE+(WORKFLOW,):git('cat-file','-e',BASE+':'+path)
 git('restore','--source='+BASE,'--staged','--worktree','--',*RESTORE,WORKFLOW)
 git('rm','-f','--ignore-unmatch','--',*REMOVE)
 git('diff','--cached','--exit-code',BASE,'--',*RESTORE,WORKFLOW)
 for path in REMOVE:
  if (ROOT/path).exists():raise RuntimeError('Experimental file remains: '+path)
 if git('rev-parse',':'+detector)!=git('rev-parse',BASE+':'+detector):raise RuntimeError('Native detector must remain unchanged')
 report={'operation':'remove-external-bpm-experiment','sourceVerification':'passed','restoredFrom':BASE,'experimentSnapshot':EXPERIMENT,'restoredFiles':list(RESTORE)+( [WORKFLOW] ),'removedFiles':list(REMOVE),'nativeDetectorBlob':git('rev-parse',BASE+':'+detector),'mainTouched':False,'historyRewritten':False}
 target=ROOT/'.github/diagnostics/bpm-removal.json';target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes((json.dumps(report,indent=2)+'\n').encode('utf-8'))
 git('add','--','.github/diagnostics/bpm-removal.json')
if __name__=='__main__':main()
