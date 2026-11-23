from pathlib import Path
import runpy
root = Path(__file__).resolve().parents[2]
for script in ['fix-tutorial-buttons-16.py', 'finalize-control-16.py', 'polish-six-16.py', 'finalize-amplitude-wave-16.py']:
    runpy.run_path(str(root / '.github/scripts' / script), run_name='__main__')
# Older finalizers use native Windows newlines; compare and normalize bytes, not universal-newline text.
outputs = [
    'src/components/ControlWindow.tsx',
    'src/components/Tutorial.tsx',
    'src/components/tutorial.css',
    'src/components/InfoModal.tsx',
    'src/components/BrandLogo.tsx',
    'src/textReadability.css',
    'README.md',
    'CHANGELOG.md',
    'RELEASE_NOTES_1.6.md',
    'src/components/HeaderParticles.tsx',
    'src/components/headerParticles.css',
    'src/utils/headerWaveMath.mjs',
    'src/utils/headerWaveMath.d.mts',
    'src/utils/headerWaveMath.test.mjs',
    'src/utils/finalUi.test.mjs',
    'src/utils/releaseCandidate.test.ts',
    'src/releaseNotes.ts',
]
for name in outputs:
    path = root / name
    original = path.read_bytes()
    normalized = original.replace(b'\r\n', b'\n')
    if normalized != original:
        path.write_bytes(normalized)
assert 'Aucun fichier récent' not in (root / 'src/components/RecentFilesMenu.tsx').read_text(encoding='utf-8')
