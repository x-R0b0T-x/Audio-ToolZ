import ctypes
import hashlib
import os
from pathlib import Path
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[2]
folder = ROOT / 'single-staging/Audio ToolZ'
output = ROOT / 'single-output'
extracted = ROOT / 'single-extracted'
for path in [folder.parent, output, extracted]:
    if path.exists():
        shutil.rmtree(path)
folder.mkdir(parents=True)
output.mkdir()
executables = list((ROOT / 'src-tauri/target/release').glob('*.exe'))
executables = [p for p in executables if 'audiotoolz' in p.stem.lower().replace('-', '').replace('_', '').replace(' ', '')]
if len(executables) != 1:
    raise RuntimeError('Expected exactly one Audio ToolZ executable')
exe = executables[0]
icon = ROOT / 'src/medias/logo.ico'
if not icon.is_file():
    raise RuntimeError('Folder icon missing')
shutil.copy2(exe, folder / 'Audio ToolZ.exe')
shutil.copy2(icon, folder / 'logo.ico')
ini = '[.ShellClassInfo]\r\nIconResource=logo.ico,0\r\nLocalizedResourceName=Audio ToolZ\r\n'
(folder / 'desktop.ini').write_text(ini, encoding='utf-16', newline='')
for flags, path in [(['+r', '+s'], folder), (['+h'], folder / 'logo.ico'), (['+h', '+s'], folder / 'desktop.ini')]:
    subprocess.run(['attrib', *flags, str(path)], check=True)
archive = output / 'audio tools v1.6.zip'
entries = {'Audio ToolZ/': 0x15, 'Audio ToolZ/Audio ToolZ.exe': 0x20, 'Audio ToolZ/logo.ico': 0x22, 'Audio ToolZ/desktop.ini': 0x26}
with zipfile.ZipFile(archive, 'w') as z:
    for name, attributes in entries.items():
        info = zipfile.ZipInfo(name)
        info.create_system = 0
        info.external_attr = attributes
        info.compress_type = zipfile.ZIP_DEFLATED
        z.writestr(info, b'' if name.endswith('/') else (folder / Path(name).name).read_bytes())
with zipfile.ZipFile(archive) as z:
    assert set(z.namelist()) == set(entries)
    assert z.testzip() is None
    assert z.read('Audio ToolZ/desktop.ini').decode('utf-16') == ini
    assert z.read('Audio ToolZ/Audio ToolZ.exe') == exe.read_bytes()
    assert z.read('Audio ToolZ/logo.ico') == icon.read_bytes()
    for name, attributes in entries.items():
        assert z.getinfo(name).external_attr & 0xff == attributes
script = r'''
$ErrorActionPreference = 'Stop'
$shell = New-Object -ComObject Shell.Application
New-Item -ItemType Directory -Force $env:ATZ_EXTRACT | Out-Null
$source = $shell.NameSpace($env:ATZ_ZIP)
$target = $shell.NameSpace($env:ATZ_EXTRACT)
if (-not $source -or -not $target) { throw 'Windows Shell ZIP namespaces unavailable' }
$target.CopyHere($source.Items(), 1044)
$deadline = (Get-Date).AddSeconds(120)
$folder = Join-Path $env:ATZ_EXTRACT 'Audio ToolZ'
$exe = Join-Path $folder 'Audio ToolZ.exe'
do {
  Start-Sleep -Milliseconds 500
  $ready = (Test-Path $exe) -and ((Get-Item -Force $exe).Length -eq [long]$env:ATZ_EXE_SIZE) -and (Test-Path (Join-Path $folder 'desktop.ini')) -and (Test-Path (Join-Path $folder 'logo.ico'))
} until ($ready -or (Get-Date) -gt $deadline)
if (-not $ready) { throw 'Windows Shell extraction timeout' }
'''
env = os.environ.copy()
env.update(ATZ_ZIP=str(archive), ATZ_EXTRACT=str(extracted), ATZ_EXE_SIZE=str(exe.stat().st_size))
subprocess.run(['powershell', '-NoProfile', '-NonInteractive', '-Command', script], env=env, check=True, timeout=150)
actual = extracted / 'Audio ToolZ'
get_attributes = ctypes.windll.kernel32.GetFileAttributesW
get_attributes.argtypes = [ctypes.c_wchar_p]
get_attributes.restype = ctypes.c_uint32
folder_attributes = get_attributes(str(actual))
ini_attributes = get_attributes(str(actual / 'desktop.ini'))
if folder_attributes == 0xffffffff or not folder_attributes & (0x1 | 0x4):
    raise RuntimeError('Extracted folder lost customization attributes; do not distribute this ZIP')
if ini_attributes == 0xffffffff or ini_attributes & 0x6 != 0x6:
    raise RuntimeError('Extracted desktop.ini lost hidden/system attributes; do not distribute this ZIP')
assert (actual / 'desktop.ini').read_text(encoding='utf-16') == ini.replace('\r\n', '\n')
assert (actual / 'logo.ico').read_bytes() == icon.read_bytes()
assert (actual / 'Audio ToolZ.exe').read_bytes() == exe.read_bytes()
assert {p.name for p in actual.iterdir()} == {'Audio ToolZ.exe', 'logo.ico', 'desktop.ini'}
digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
summary = '## Candidat v1.6 — distribution unique\n\n- Archive : `audio tools v1.6.zip`\n- Commit source : `' + head + '`\n- SHA-256 ZIP : `' + digest(archive) + '`\n- SHA-256 EXE : `' + digest(exe) + '`\n- Extraction Windows Shell, contenu et attributs contrôlés.\n- Rendu visuel de l’icône dans l’Explorateur : validation manuelle encore requise.\n'
if os.environ.get('GITHUB_STEP_SUMMARY'):
    with open(os.environ['GITHUB_STEP_SUMMARY'], 'a', encoding='utf-8') as f:
        f.write(summary)
print(summary)
