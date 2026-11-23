from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
path = root / 'src/components/ControlWindow.tsx'
source = path.read_text(encoding='utf-8')
marker = 'data-atz-control-art'
if marker not in source:
    image = '<img data-atz-control-art src={mixArtworkUrl} alt="ATX aux commandes du mixage" draggable={false} style={{display:"block",width:"100%",height:"140px",objectFit:"contain",padding:"6px",boxSizing:"border-box"}} />'
    pattern = r'<canvas\b(?=[\s\S]*?ref=\{vuCanvasRef\})[^>]*ref=\{vuCanvasRef\}[^>]*(?:/>|>\s*</canvas>)'
    source, count = re.subn(pattern, lambda _: image, source)
    if count != 1:
        raise RuntimeError('Expected one VU canvas to replace, got ' + str(count))
    source = "import mixArtworkUrl from '../medias/mix.png?url';\n" + source
    start = source.index('    const vuCanvas = vuCanvasRef.current;')
    end = source.index('    if (visCanvas) {', start)
    prefix = '''    const visCanvas = visCanvasRef.current;
    if (!visCanvas) return;
    const style = getComputedStyle(document.documentElement);
    const waveBg = style.getPropertyValue('--wave-bg').trim() || '#080a14';
    const borderSubtle = style.getPropertyValue('--border-subtle').trim() || '#272f54';
    const now = performance.now();

'''
    source = source[:start] + prefix + source[end:]
    source = source.replace('formatTimecode, linearToDb', 'formatTimecode')
    source = re.sub(r'^  const vuCanvasRef = useRef<HTMLCanvasElement \| null>\(null\);\n', '', source, flags=re.M)
    source = re.sub(r'^  const peakHoldRef = useRef\([^\n]+\);\n', '', source, flags=re.M)
if '/* Persist the chosen analyzer without resetting it on startup. */' not in source:
    anchor = '  const visCanvasRef = useRef<HTMLCanvasElement | null>(null);'
    if anchor not in source:
        raise RuntimeError('Analyzer anchor unavailable')
    source = source.replace(anchor, '''  /* Persist the chosen analyzer without resetting it on startup. */
  useEffect(() => { savePersistedUiState({visualMode}); }, [visualMode]);

''' + anchor)
assert 'ref={visCanvasRef}' in source
assert 'vuCanvasRef' not in source
assert 'linearToDb' not in source
assert 'peakHoldRef' not in source
assert 'loadPersistedUiState().visualMode' in source
for control in ['onVolumeChange', 'onBalanceChange', 'onSpeedChange', 'onPlay', 'onStop']:
    assert control in source
assert (root / 'src/medias/mix.png').is_file()
storage = (root / 'src/utils/uiStateStorage.ts').read_text(encoding='utf-8')
assert "visualMode: 'oscilloscope'" in storage
path.write_text(source, encoding='utf-8')
print('Control artwork replaces VU canvas; analyzer and persisted preferences retained.')
