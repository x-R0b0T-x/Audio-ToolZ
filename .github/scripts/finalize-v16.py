from pathlib import Path
import os
from PIL import Image

if os.environ.get('GITHUB_REF') != 'refs/heads/v1.6-dev':
    raise SystemExit('Restricted branch')

marker = Path('.github/v16-final.applied')
if not marker.is_file() or not marker.read_text(encoding='utf-8').strip():
    raise SystemExit('Finalized source marker missing; refusing to replay obsolete migrations')

feature = Path('src/features/q7m4n2')
if not feature.is_dir():
    raise SystemExit('Current feature directory missing: ' + str(feature))

image = feature / '333.png'
with Image.open(image) as artwork:
    if artwork.format != 'PNG' or artwork.width < 1 or artwork.height < 1:
        raise SystemExit('Invalid robot PNG')
    artwork.verify()

audio = feature / 'assets/music.ogg'
with audio.open('rb') as stream:
    if stream.read(4) != b'OggS':
        raise SystemExit('Invalid OGG header')

for name in ('src/audio/advancedDsp.ts', 'src/audio/engine.ts', 'src-tauri/src/main.rs'):
    if not Path(name).is_file():
        raise SystemExit('Finalized source missing: ' + name)

print('Finalized sources and renamed media validated; downstream tests and compilation remain mandatory.')
