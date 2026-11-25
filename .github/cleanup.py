import json,os,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
REPORT=ROOT/'.github/diagnostics/repository-cleanup.json'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ' or os.environ.get('GITHUB_REF')!='refs/heads/main':raise RuntimeError('Wrong cleanup target')
if git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA') or git('status','--porcelain'):raise RuntimeError('Clean exact workflow checkout required')
if REPORT.exists():print('Repository cleanup already recorded');raise SystemExit(0)
manifest=[]
def group(folder,names):manifest.extend(folder+'/'+name for name in names.split())
group('.github/workflows','build-v1.5.yml build-v1.6.yml build-v1.7-dev.yml inspect-v16-transport.yml knob-feedback-dev.yml package-v1.6.yml publish-v1.5.yml publish-v1.7.yml release-v1.7.yml rename-mascot.yml review-easter-art.yml single-v1.6.yml update-release-notes-v1.5.yml update-release-notes-v1.7.yml')
group('.github/scripts','check-live-preview.cjs finalize-amplitude-wave-16.py finalize-candidate-16.py finalize-control-16.py finishing-playback.py fix-tutorial-buttons-16.py optional-bpm.py package-single-16.py polish-six-16.py prepare-clean-16.py rename-archive-16.py verify-about-ring.py')
group('.github/corrections','apply_final_lot.py finalize_tutorial_scan.py integrate_pitcher_engine.py knob_feedback.py repair_final_lot_encoding.py')
group('.github/maintenance','finish_v17.py integrate_pitcher_feedback.py package-v17.py remove_bpm_experiment.py rename_mascot.py review_v17.py statusLabels.mjs test_review_transport.py')
group('.github','clean-16.applied control-polish.applied final-ui.applied finishing-playback-v1.applied optional-bpm-v1.applied presentation-final-v1.applied refresh-loop-ui-v1.applied revision-controls-v1.applied v16-final.applied workspace-final-v2.applied')
group('.github/diagnostics','bpm-removal.json finishing-v17.json review-v17.json v16-transport-1.txt v16-transport-2.txt v16-transport-3.txt v16-transport-4.txt zonyx-migration.json')
manifest.extend(['RELEASE_NOTES_1.5.md','RELEASE_NOTES_1.6.md','RELEASE-NOTES-v1.7.md','CAHIER_DES_CHARGES_v1.6.md','.github/release/prepare_v17.py'])
tracked=set(git('ls-files','-z').split('\0'));tracked.discard('')
missing=sorted(set(manifest)-tracked)
if missing:raise RuntimeError('Cleanup snapshot changed; review missing paths: '+repr(missing))
candidates=set(manifest);texts={}
ignored={'.github/cleanup.py','.github/diagnostics/repository-cleanup.json'}
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
