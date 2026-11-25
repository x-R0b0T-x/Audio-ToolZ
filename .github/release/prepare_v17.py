import json,os,re,subprocess,tomllib
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
BASE='fe45d1c117142865795d169b2eb7880029ac9df7'
def git(*args):return subprocess.check_output(['git',*args],cwd=ROOT,text=True).strip()
if os.environ.get('GITHUB_REPOSITORY')!='x-R0b0T-x/Audio-ToolZ':raise RuntimeError('Wrong repository')
if git('branch','--show-current')!='release/v1.7':raise RuntimeError('Wrong release branch')
if git('rev-parse','HEAD')!=os.environ.get('GITHUB_SHA') or git('status','--porcelain'):raise RuntimeError('Clean workflow snapshot required')
subprocess.run(['git','merge-base','--is-ancestor',BASE,'HEAD'],cwd=ROOT,check=True)
if git('diff','--name-only',BASE,'HEAD','--','src','src-tauri','package.json','package-lock.json'):raise RuntimeError('Application changed since validated development revision')
report=json.loads((ROOT/'.github/diagnostics/final-lot.json').read_text(encoding='utf-8'))
if report['validation']!='node-typescript-frontend-signalsmith-runtime-rust-and-windows-build-passed':raise RuntimeError('Development validation is required')
def write_json(path,value):(ROOT/path).write_text(json.dumps(value,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
package=json.loads((ROOT/'package.json').read_text(encoding='utf-8'))
if package['version']!='1.6.0':raise RuntimeError('Unexpected package version')
package['version']='1.7.0';write_json('package.json',package)
lock=json.loads((ROOT/'package-lock.json').read_text(encoding='utf-8'));lock['version']='1.7.0';lock['packages']['']['version']='1.7.0';write_json('package-lock.json',lock)
config=json.loads((ROOT/'src-tauri/tauri.conf.json').read_text(encoding='utf-8'))
if config['version']!='1.7.0-dev':raise RuntimeError('Unexpected Tauri version')
config['version']='1.7.0'
for window in config['app']['windows']:
 if window['title']!='Audio ToolZ v1.7-dev':raise RuntimeError('Unexpected window title')
 window['title']='Audio ToolZ v1.7'
write_json('src-tauri/tauri.conf.json',config)
p=ROOT/'src-tauri/Cargo.toml';text=p.read_text(encoding='utf-8')
if tomllib.loads(text)['package']['version']!='1.6.0':raise RuntimeError('Unexpected Rust package version')
text,count=re.subn(r'(?m)^version = "1\.6\.0"$', 'version = "1.7.0"',text,count=1)
if count!=1:raise RuntimeError('Rust version replacement failed')
p.write_text(text,encoding='utf-8')
p=ROOT/'src-tauri/Cargo.lock';text=p.read_text(encoding='utf-8');text,count=re.subn(r'(\[\[package\]\]\nname = "audio-toolz"\nversion = ")1\.6\.0(")',r'\g<1>1.7.0\2',text)
if count!=1:raise RuntimeError('Expected exactly one root Rust package in lock')
p.write_text(text,encoding='utf-8')
changed=[]
for p in (ROOT/'src').rglob('*'):
 if not p.is_file() or p.suffix not in {'.ts','.tsx','.mjs','.mts'}:continue
 text=p.read_text(encoding='utf-8');updated=text
 for old,new in [('v1.7-dev','v1.7'),(r'v1\.7-dev',r'v1\.7'),('1.7.0-dev','1.7.0'),(r'1\.7\.0-dev',r'1\.7\.0')]:updated=updated.replace(old,new)
 if updated!=text:p.write_text(updated,encoding='utf-8');changed.append(str(p.relative_to(ROOT)).replace('\\','/'))
if not changed:raise RuntimeError('Expected development labels in application and UI tests')
if "APP_VERSION = 'v1.7'" not in (ROOT/'src/components/InfoModal.tsx').read_text(encoding='utf-8'):raise RuntimeError('About version was not updated')
for name in ['src/main.tsx','src/App.tsx']:
 if 'Audio ToolZ v1.7-dev' in (ROOT/name).read_text(encoding='utf-8'):raise RuntimeError('Development title remains')
p=ROOT/'.github/maintenance/package-v17.py';packaging=p.read_text(encoding='utf-8')
if packaging.count("archive = output / 'Audio ToolZ v1.7-dev.zip'")!=1:raise RuntimeError('Unexpected validated packaging script')
packaging=packaging.replace('v1.7-dev','v1.7').replace('Candidat v1.7','Version officielle v1.7')
compile(packaging,'package_v17.py','exec');(ROOT/'.github/release/package_v17.py').write_text(packaging,encoding='utf-8')
write_json('.github/diagnostics/official-v17.json',{'validatedDevelopmentCommit':BASE,'workflowCommit':git('rev-parse','HEAD'),'version':'1.7.0','validation':'pending','developerFeedback':'Compilation and functionality confirmed by user before official rebuild','updatedVersionLabels':changed})
print(json.dumps({'officialVersion':'1.7.0','updatedLabelFiles':changed,'validation':'pending'},ensure_ascii=False))
