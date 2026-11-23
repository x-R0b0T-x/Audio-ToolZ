from pathlib import Path
root = Path(__file__).resolve().parents[2]
targets = [
    '.github/scripts/package-single-16.py',
    '.github/scripts/finalize-amplitude-wave-16.py',
    'src/components/aboutLight.test.mjs',
    'README.md',
    'CHANGELOG.md',
    'RELEASE_NOTES_1.6.md',
    'src/releaseNotes.ts',
]
for name in targets:
    path = root / name
    source = path.read_text(encoding='utf-8')
    updated = source.replace('audio tools v1.6.zip', 'Audio ToolZ v1.6.zip')
    updated = updated.replace(r'audio tools v1\.6\.zip', r'Audio ToolZ v1\.6\.zip')
    data = updated.encode('utf-8')
    if path.read_bytes() != data:
        path.write_bytes(data)
packaging = (root / '.github/scripts/package-single-16.py').read_text(encoding='utf-8')
assert "archive = output / 'Audio ToolZ v1.6.zip'" in packaging
workflow = (root / '.github/workflows/build-v1.6.yml').read_text(encoding='utf-8')
assert 'path: single-output/Audio ToolZ v1.6.zip' in workflow
for name in targets:
    source = (root / name).read_text(encoding='utf-8')
    assert 'audio tools v1.6.zip' not in source, name
    assert r'audio tools v1\.6\.zip' not in source, name
