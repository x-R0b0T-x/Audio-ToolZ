from pathlib import Path
import re

root = Path(__file__).resolve().parents[2]
def read(name):
    return (root / name).read_text(encoding='utf-8')
def write(name, text):
    (root / name).write_text(text, encoding='utf-8')
def once(text, old, new):
    if old not in text and new in text:
        return text
    if text.count(old) != 1:
        raise RuntimeError('Unexpected source anchor: ' + old[:100])
    return text.replace(old, new, 1)

name = 'src/components/ControlWindow.tsx'
source = read(name)
if 'vuCanvasRef' in source:
    source, count = re.subn(r'<canvas\b[^>]*ref=\{vuCanvasRef\}[^>]*(?:/>|>\s*</canvas>)', '', source)
    if count != 1:
        raise RuntimeError('Expected one legacy VU canvas')
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
    source = re.sub(r'^  const (?:vuCanvasRef|peakHoldRef) = [^\n]+\n', '', source, flags=re.M)
source = re.subn(r'^[ \t]*<img data-atz-control-art\b[^\n]*?/>[ \t]*\n?', '', source, flags=re.M)[0]
source = source.replace("import mixArtworkUrl from '../medias/mix.png?url';\n", '')
source = re.sub(r'\s*<span className="text-\[11px\]" style=\{\{ color: \'var\(--text-secondary\)\' \}\}>\s*Analyseur temps réel\s*</span>', '', source)
source = source.replace('flex items-center justify-between mb-1', 'flex items-center justify-start mb-0.5')
source = source.replace('className="p-3 space-y-2.5"', 'className="p-3 space-y-2"')
assert 'Analyseur temps réel' not in source
assert 'mixArtworkUrl' not in source and 'vuCanvasRef' not in source
assert 'ref={visCanvasRef}' in source and "'oscilloscope'" in source
assert 'loadPersistedUiState().visualMode' in source
write(name, source)

name = 'src/components/WaveformView.tsx'
source = read(name)
if 'data-atz-welcome-art' not in source:
    matches = list(re.finditer(r'<BrandLogo\b[^>]*?/>', source))
    if len(matches) != 1:
        raise RuntimeError('Expected one welcome BrandLogo; refusing an ambiguous placement')
    match = matches[0]
    source = source[:match.start()] + '<div data-atz-welcome-art className="flex flex-col items-center gap-3"><img src={welcomeArtworkUrl} alt="ATZ vous souhaite la bienvenue" draggable={false} style={{display:"block",width:"min(220px,40vw)",height:"min(170px,25vh)",objectFit:"contain",pointerEvents:"none"}} />' + match.group() + '</div>' + source[match.end():]
    source = "import welcomeArtworkUrl from '../medias/mix.png?url';\n" + source
assert source.count('data-atz-welcome-art') == 1
write(name, source)

name = 'src/components/TopMenuBar.tsx'
source = read(name)
if "import {HeaderParticles}" not in source:
    source = "import {HeaderParticles} from './HeaderParticles';\n" + source
source = once(source, '<div className="flex flex-col items-center justify-center gap-1"><span data-testid="header-brand-title"', '<div className="atz-header-emitter flex flex-col items-center justify-center gap-1"><HeaderParticles/><span data-testid="header-brand-title"')
assert source.count('<HeaderParticles/>') == 1
write(name, source)

name = 'src/utils/useWaveformInteractions.ts'
source = read(name)
if 'const boundary = loopBoundaryHit(' not in source:
    source = "import {loopBoundaryHit} from './loopBoundaryHit';\n" + source
    anchor = '      if(latest.current.isLooping&&latest.current.onRestartPlayback){'
    insertion = '''      const boundary = loopBoundaryHit(event.clientX,left,rect.right,doc.viewStartSample,doc.viewEndSample,selection.startSample,selection.endSample);
      if (boundary) { begin(boundary,0,event,selection); return; }
'''
    source = once(source, anchor, insertion + anchor)
assert source.index('const boundary = loopBoundaryHit(') < source.index('if(latest.current.isLooping&&latest.current.onRestartPlayback)')
write(name, source)

note = '\n\n### Dernières finitions v1.6\n\n- Bornes de boucle saisissables au clic gauche, même pendant la lecture ; création au clic droit et suppression au double-clic conservées.\n- Robot statique sur l’accueil sans document, retiré de Contrôle.\n- Sélecteur de visualisation aligné à gauche sans libellé redondant ; zone de visualisation conservée.\n- Particules vertes/violettes discrètes autour du titre pendant la lecture, sans synchronisation BPM/volume ; préférence de réduction des animations respectée.\n- Boutons du didacticiel toujours violets ; seul le contour et son halo deviennent verts au survol.\n- Tests, compilation, ZIP et rendu Windows à valider sur ce candidat.\n'
for name in ['README.md', 'CHANGELOG.md', 'RELEASE_NOTES_1.6.md']:
    text = read(name).replace('Contrôle : illustration mix.png à la place des deux vumètres, analyseur conservé', 'Accueil : illustration mix.png sans document ; Contrôle sans robot ni vumètres, analyseur conservé').replace('trois boutons égaux violets devenant verts au survol', 'trois boutons égaux restant violets avec contour lumineux vert au survol')
    if '### Dernières finitions v1.6' not in text:
        text += note
    write(name, text)
print('Final v1.6 candidate sources prepared; runtime and Windows validation remain required.')
