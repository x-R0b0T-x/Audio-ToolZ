from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
path = root / 'src/components/ControlWindow.tsx'
source = path.read_text(encoding='utf-8')
if 'data-atz-control-art' not in source:
    image = '<img data-atz-control-art src={mixArtworkUrl} alt="ATX aux commandes du mixage" draggable={false} style={{display:"block",width:"100%",height:"76px",objectFit:"contain"}} />'
    source, count = re.subn(r'<canvas\b[^>]*ref=\{vuCanvasRef\}[^>]*(?:/>|>\s*</canvas>)', lambda _: image, source)
    if count != 1:
        raise RuntimeError('Expected one VU canvas')
    source = "import mixArtworkUrl from '../medias/mix.png?url';\n" + source
    start = source.index('    const vuCanvas = vuCanvasRef.current;')
    end = source.index('    if (visCanvas) {', start)
    source = source[:start] + '''    const visCanvas = visCanvasRef.current;
    if (!visCanvas) return;
    const style = getComputedStyle(document.documentElement);
    const waveBg = style.getPropertyValue('--wave-bg').trim() || '#080a14';
    const borderSubtle = style.getPropertyValue('--border-subtle').trim() || '#272f54';
    const now = performance.now();

''' + source[end:]
    source = source.replace('formatTimecode, linearToDb', 'formatTimecode')
    source = re.sub(r'^  const vuCanvasRef = useRef<HTMLCanvasElement \| null>\(null\);\n', '', source, flags=re.M)
    source = re.sub(r'^  const peakHoldRef = useRef\([^\n]+\);\n', '', source, flags=re.M)
if '/* Persist the chosen analyzer without resetting it on startup. */' not in source:
    anchor = '  const visCanvasRef = useRef<HTMLCanvasElement | null>(null);'
    if source.count(anchor) != 1:
        raise RuntimeError('Analyzer anchor changed')
    source = source.replace(anchor, '''  /* Persist the chosen analyzer without resetting it on startup. */
  useEffect(() => { savePersistedUiState({visualMode}); }, [visualMode]);

''' + anchor)
source, count = re.subn(r'^[ \t]*<img data-atz-control-art\b[^\n]*?/>[ \t]*\n?', '', source, flags=re.M)
if count != 1:
    raise RuntimeError('Expected exactly one robot image')
boundary = '              </div>\n            </div>\n\n            <div className="col-span-7 space-y-2">'
if source.count(boundary) != 1:
    raise RuntimeError('Transport column boundary changed')
image = '              <img data-atz-control-art src={mixArtworkUrl} alt="ATX aux commandes du mixage" draggable={false} style={{display:"block",width:"100%",height:"76px",objectFit:"contain",padding:"4px",boxSizing:"border-box"}} />\n'
source = source.replace(boundary, '              </div>\n' + image + '            </div>\n\n            <div className="col-span-7 space-y-2">')
left = source.index('<div className="col-span-5 space-y-1.5">')
robot = source.index('<img data-atz-control-art')
right = source.index('<div className="col-span-7 space-y-2">')
assert left < source.index('onClick={onStop}', left) < robot < right < source.index('Analyseur temps réel')
assert source.count('<img data-atz-control-art') == 1
assert 'ref={visCanvasRef}' in source
for obsolete in ['vuCanvasRef', 'linearToDb', 'peakHoldRef']:
    assert obsolete not in source
assert 'loadPersistedUiState().visualMode' in source
for control in ['onVolumeChange', 'onBalanceChange', 'onSpeedChange', 'onPlay', 'onStop']:
    assert control in source
assert (root / 'src/medias/mix.png').is_file()
assert "visualMode: 'oscilloscope'" in (root / 'src/utils/uiStateStorage.ts').read_text(encoding='utf-8')
path.write_text(source, encoding='utf-8')
print('Robot below transport, left of audio controls and above analyzer.')
