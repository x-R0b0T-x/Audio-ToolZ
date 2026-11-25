import json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'.github/diagnostics/repository-cleanup-2.json'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ' or os.environ.get('GITHUB_REF')!='refs/heads/main':raise RuntimeError('Wrong cleanup target')
if git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA') or git('status','--porcelain'):raise RuntimeError('Clean exact workflow checkout required')
if REPORT.exists():print('Final repository cleanup already recorded');raise SystemExit(0)
manifest=[]
def group(folder,names):manifest.extend(folder+'/'+name for name in names.split())
group('.github/workflows','build-v1.6.yml package-v1.6.yml single-v1.6.yml')
group('.github/scripts','check-live-preview.cjs finalize-amplitude-wave-16.py finalize-candidate-16.py finalize-control-16.py finishing-playback.py fix-tutorial-buttons-16.py optional-bpm.py package-single-16.py polish-six-16.py prepare-clean-16.py rename-archive-16.py verify-about-ring.py')
group('.github/maintenance','statusLabels.mjs')
group('.github','clean-16.applied finishing-playback-v1.applied optional-bpm-v1.applied refresh-loop-ui-v1.applied')
group('.github/art-review','333-info.json 333-preview.b64.txt 333-preview.jpg')
group('.github/diagnostics','final-lot.json')
manifest.extend(['.github/release/notes-v1.7.md','RELEASE_NOTES_1.6.md'])
tracked=set(git('ls-files','-z').split('\0'));tracked.discard('')
missing=sorted(set(manifest)-tracked)
if missing:raise RuntimeError('Cleanup snapshot changed; review missing paths: '+repr(missing))
candidates=set(manifest);texts={}
ignored={'.github/cleanup.py','.github/diagnostics/repository-cleanup.json','.github/diagnostics/repository-cleanup-2.json'}
for name in tracked-ignored:
 p=ROOT/name
 if p.suffix.lower() in {'.png','.ico','.ogg','.wav','.mp3','.zip'}:continue
 try:texts[name]=p.read_text(encoding='utf-8')
 except UnicodeError:continue
retained=tracked-candidates;references={}
while True:
 protected={}
 for name in sorted(candidates):
  base=Path(name).name
  hits=[other for other in sorted(retained-ignored) if other in texts and (name in texts[other] or base in texts[other])]
  if hits:protected[name]=hits
 if not protected:break
 references.update(protected);candidates-=set(protected);retained|=set(protected)
for name in sorted(candidates):subprocess.run(['git','rm','--',name],cwd=ROOT,check=True)
REPORT.parent.mkdir(parents=True,exist_ok=True)
report={'baseCommit':os.environ['GITHUB_SHA'],'validation':'pending','removed':sorted(candidates),'preservedBecauseReferenced':references,'notTouched':['application source','tests','used media','licenses','dependency manifests and lockfiles','published releases and their assets','branches and tags'],'retainedBuildTools':['.github/workflows/validate.yml','.github/maintenance/verify_pitcher_runtime.mjs','.github/release/package_v17.py']}
REPORT.write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'removalCandidates':len(manifest),'removed':len(candidates),'preservedBecauseReferenced':references},ensure_ascii=False))
