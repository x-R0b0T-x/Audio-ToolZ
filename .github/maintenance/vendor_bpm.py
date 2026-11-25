import base64,binascii,hashlib,json,os,re,shutil,subprocess,tempfile,urllib.request,zipfile
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
PACKAGES=[('essentia.js','0.1.3','MTG/essentia.js','essentia'),('aubiojs','0.2.1','qiuxiang/aubiojs','aubio')]
def command(*args,cwd=ROOT):return subprocess.check_output(args,cwd=cwd,text=True,encoding='utf-8').strip()
def write(path,text):path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(text.encode('utf-8'))
def require_wasm(payload,label):
 if payload[:8]!=b'\x00asm\x01\x00\x00\x00':raise RuntimeError('Invalid WASM header: '+str(label))
def aubio_runtime_assets(source):
 loader=source/'build/aubio.js';sidecar=source/'build/aubio.wasm'
 if not loader.is_file():raise RuntimeError('Missing runtime asset: '+str(loader))
 if sidecar.is_file():
  require_wasm(sidecar.read_bytes(),sidecar)
  return [loader,sidecar]
 text=loader.read_text(encoding='utf-8')
 embedded=re.search(r'data:application/(?:octet-stream|wasm);base64,([A-Za-z0-9+/]+={0,2})',text)
 if not embedded:raise RuntimeError('Aubio has neither a sidecar nor embedded WASM: '+str(loader))
 try:payload=base64.b64decode(embedded.group(1),validate=True)
 except (binascii.Error,ValueError) as error:raise RuntimeError('Invalid embedded Aubio WASM base64: '+str(loader)) from error
 require_wasm(payload,loader)
 return [loader]
def main():
 destination=ROOT/'public/third_party/bpm';manifest=[]
 for name,version,repository,folder in PACKAGES:
  source=ROOT/'node_modules'/name;metadata=json.loads((source/'package.json').read_text(encoding='utf-8'))
  if metadata['version']!=version:raise RuntimeError('Wrong installed version: '+name)
  target=destination/folder;target.mkdir(parents=True,exist_ok=True)
  if name=='essentia.js':
   assets=[source/'dist/essentia.js-core.js',source/'dist/essentia-wasm.umd.js']
  else:assets=aubio_runtime_assets(source)
  for asset in dict.fromkeys(assets):
   if not asset.is_file():raise RuntimeError('Missing runtime asset: '+str(asset))
   if asset.suffix=='.wasm':require_wasm(asset.read_bytes(),asset)
   shutil.copy2(asset,target/asset.name)
   manifest.append({'file':str((target/asset.name).relative_to(destination)).replace('\\','/'),'bytes':asset.stat().st_size,'sha256':hashlib.sha256(asset.read_bytes()).hexdigest()})
  license_files=[p for p in source.iterdir() if p.is_file() and p.name.lower().startswith(('license','copying'))]
  for document in license_files+[source/'package.json']+[p for p in source.iterdir() if p.is_file() and p.name.lower().startswith('readme')]:shutil.copy2(document,target/document.name)
  if not license_files:
   license_name='agpl-3.0' if name=='essentia.js' else 'gpl-3.0'
   request=urllib.request.Request('https://www.gnu.org/licenses/'+license_name+'.txt',headers={'User-Agent':'Audio-ToolZ-build'})
   with urllib.request.urlopen(request,timeout=90) as response:(target/'COPYING').write_bytes(response.read())
 notice='Experimental Audio ToolZ BPM comparison.\nEssentia.js 0.1.3: AGPL-3.0, MTG/UPF.\nAubio/aubiojs 0.2.1: GPL-3.0-or-later, upstream Aubio contributors and qiuxiang.\nNo automatic fallback. Separate corresponding-source artifact accompanies this build.\n'
 write(destination/'NOTICE.txt',notice);write(destination/'manifest.json',json.dumps(manifest,indent=2)+'\n')
 (ROOT/'audit-output').mkdir(exist_ok=True);write(ROOT/'audit-output/bpm-runtime-assets.json',json.dumps(manifest,indent=2)+'\n')
 out=ROOT/'bpm-source-output';out.mkdir(exist_ok=True)
 with tempfile.TemporaryDirectory() as temporary,zipfile.ZipFile(out/'Audio.ToolZ.BPM.sources.zip','w',zipfile.ZIP_DEFLATED) as archive:
  tracked=command('git','ls-files','-z').split('\0')
  for relative in tracked:
   if relative and (ROOT/relative).is_file():archive.write(ROOT/relative,'Audio-ToolZ/'+relative)
  archive.writestr('NOTICE.txt',notice)
  for name,version,repository,folder in PACKAGES:
   npm='npm.cmd' if os.name=='nt' else 'npm'
   head=json.loads(command(npm,'view',name+'@'+version,'gitHead','--json'))
   if not isinstance(head,str) or not re.fullmatch('[0-9a-f]{40}',head):raise RuntimeError('Missing corresponding source commit: '+name)
   checkout=Path(temporary)/folder
   subprocess.run(['git','-c','core.longpaths=true','clone','--filter=blob:none','--no-checkout','https://github.com/'+repository+'.git',str(checkout)],check=True)
   subprocess.run(['git','-C',str(checkout),'checkout','--detach',head],check=True)
   subprocess.run(['git','-C',str(checkout),'-c','core.longpaths=true','submodule','update','--init','--recursive','--depth','1'],check=True)
   for path in sorted(checkout.rglob('*')):
    relative=path.relative_to(checkout)
    if '.git' not in relative.parts and path.is_file():archive.write(path,'third-party/'+folder+'/'+relative.as_posix())
   archive.writestr('third-party/'+folder+'/SOURCE-COMMIT.txt',repository+'@'+head+'\n')
if __name__=='__main__':main()
