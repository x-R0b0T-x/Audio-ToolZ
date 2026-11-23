import hashlib
import pathlib
import re
import shutil
import subprocess
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parents[2]

def patch(relative, transform):
    path = ROOT / relative
    before = path.read_text(encoding='utf-8')
    after = transform(before)
    if after != before:
        path.write_text(after, encoding='utf-8')

def replace_checked(text, old, new):
    if old in text:
        return text.replace(old, new)
    if new in text:
        return text
    raise RuntimeError('Expected source fragment unavailable: ' + old[:90])

def ui():
    patch('src/components/RecentFilesMenu.tsx', lambda s: replace_checked(s,
        "    {!entries.length && <p className=\"px-2.5 py-1 text-xs\" style={{ color: 'var(--text-secondary)' }}>{desktop() ? 'Aucun fichier récent' : 'Disponible dans la version Windows'}</p>}\n", ''))
    patch('src/components/InfoModal.tsx', lambda s: replace_checked(s,
        '>Audio ToolZ {APP_VERSION.split(\' \')[0]}</h2>',
        '><span data-atz-brand="audio">Audio </span><span data-atz-brand="tool">Tool</span><span data-atz-brand="z">Z</span> {APP_VERSION.split(\' \')[0]}</h2>'))
    patch('src/components/TopMenuBar.tsx', lambda s: replace_checked(s,
        '<span>Audio </span><span>Tool</span><span>Z</span>',
        '<span data-atz-brand="audio">Audio </span><span data-atz-brand="tool">Tool</span><span data-atz-brand="z">Z</span>'))
    patch('src/components/BrandLogo.tsx', lambda s: s.replace("<span style={{ color: '#f8f8f2' }}>", "<span data-atz-brand=\"audio\" style={{ color: '#f8f8f2' }}>").replace("<span style={{ color: '#39ff14' }}>", "<span data-atz-brand=\"tool\" style={{ color: '#39ff14' }}>").replace("<span style={{ color: '#b34dff' }}>", "<span data-atz-brand=\"z\" style={{ color: '#b34dff' }}>"))
    css = '\n/* v1.6 explicit brand exceptions: stronger than the white text policy. */\n#root#root span[data-atz-brand="audio"]{color:#fff!important}\n#root#root span[data-atz-brand="tool"]{color:#39ff14!important}\n#root#root span[data-atz-brand="z"]{color:#b34dff!important}\n'
    patch('src/textReadability.css', lambda s: s if 'v1.6 explicit brand exceptions' in s else s + css)
    paypal = 'https://www.paypal.com/ncp/payment/GAUJE54VM28T8'
    def tutorial(s):
        old = '{label:"★ Mettre une étoile sur GitHub",href:"https://github.com/x-R0b0T-x/Audio-ToolZ"}]'
        new = '{label:"★ Mettre une étoile sur GitHub",href:"https://github.com/x-R0b0T-x/Audio-ToolZ"},{label:"Faire un don via PayPal",href:"' + paypal + '"}]'
        s = replace_checked(s, old, new)
        s = s.replace('Et si vous avez un petit moment, une étoile sur GitHub, ça m’aide énormément !', 'Et si vous avez un petit moment, une étoile sur GitHub, ça m’aide énormément ! Vous pouvez aussi soutenir le projet par un don via PayPal.')
        return s
    patch('src/components/Tutorial.tsx', tutorial)
    tutorial_css = '\n/* v1.6 final tutorial community buttons. */\n.atz-tuto-links{display:flex;flex-wrap:wrap;gap:12px;padding:5px}\n.atz-tuto-links .atz-tuto-link{border:1px solid #39ff14;border-radius:8px;color:#fff!important;background:#191320;box-shadow:0 0 4px #39ff1480,0 0 9px #b34dff60;transition:box-shadow .18s ease}\n.atz-tuto-links .atz-tuto-link:hover,.atz-tuto-links .atz-tuto-link:focus-visible{outline:2px solid #b34dff;outline-offset:2px;box-shadow:0 0 7px #39ff14bb,0 0 13px #b34dff99}\n'
    patch('src/components/tutorial.css', lambda s: s if 'v1.6 final tutorial community buttons' in s else s + tutorial_css)
    note = '\n\n## Finalisation du candidat v1.6\n\n- Nom Audio ToolZ : Audio blanc, Tool vert, Z violet.\n- Dernière page du didacticiel : liens Telegram, GitHub et PayPal.\n- Aucun texte « Aucun fichier récent » quand la liste est vide.\n- Distribution portable : ZIP contenant le dossier Audio ToolZ avec Audio ToolZ.exe, logo.ico et desktop.ini ; empreintes SHA-256 de l’exécutable et du ZIP fournies séparément.\n- Delay en temps musicaux avec détection BPM, sans réglage libre en millisecondes.\n- Ce candidat corrigé doit être testé avant fusion, tag et publication officiels. La validation de 414ae3f concerne la base antérieure.\n'
    for relative in ['CHANGELOG.md', 'RELEASE_NOTES_1.6.md', 'README.md']:
        patch(relative, lambda s: s if '## Finalisation du candidat v1.6' in s else s + note)
    patch('RELEASE_NOTES_1.6.md', lambda s: s.replace('Windows x64 portable : Audio ToolZ.exe et SHA256SUMS.txt.', 'Windows x64 portable : archive ZIP du dossier Audio ToolZ, accompagnée de SHA256SUMS.txt et BUILD.txt.'))
    recent = (ROOT / 'src/components/RecentFilesMenu.tsx').read_text(encoding='utf-8')
    assert 'Aucun fichier récent' not in recent
    tutorial_source = (ROOT / 'src/components/Tutorial.tsx').read_text(encoding='utf-8')
    for url in ['https://t.me/Audio_ToolZ', 'https://github.com/x-R0b0T-x/Audio-ToolZ', paypal]:
        assert url in tutorial_source
    native = (ROOT / 'src-tauri/src/main.rs').read_text(encoding='utf-8')
    assert paypal in native, 'PayPal must be allowed by the native opener'
    for relative in ['src/components/TopMenuBar.tsx', 'src/components/InfoModal.tsx', 'src/components/BrandLogo.tsx']:
        source = (ROOT / relative).read_text(encoding='utf-8')
        for part in ['audio', 'tool', 'z']:
            assert 'data-atz-brand="' + part + '"' in source

def package():
    folder = ROOT / 'portable-staging/Audio ToolZ'
    output = ROOT / 'portable-output'
    if folder.parent.exists():
        shutil.rmtree(folder.parent)
    if output.exists():
        shutil.rmtree(output)
    folder.mkdir(parents=True)
    output.mkdir()
    exe = ROOT / 'release-output/Audio ToolZ.exe'
    icon = ROOT / 'src/medias/logo.ico'
    if not exe.is_file() or not icon.is_file():
        raise RuntimeError('Executable or folder icon unavailable')
    digest = lambda p: hashlib.sha256(p.read_bytes()).hexdigest()
    expected = (ROOT / 'release-output/SHA256SUMS.txt').read_text(encoding='ascii').split()[0]
    if digest(exe) != expected:
        raise RuntimeError('Executable checksum mismatch')
    shutil.copy2(exe, folder / exe.name)
    shutil.copy2(icon, folder / 'logo.ico')
    (folder / 'desktop.ini').write_text('[.ShellClassInfo]\r\nIconResource=logo.ico,0\r\n', encoding='utf-16', newline='')
    for flags, path in [(['+r'], folder), (['+h'], folder / 'logo.ico'), (['+r', '+h', '+s'], folder / 'desktop.ini')]:
        subprocess.run(['attrib', *flags, str(path)], check=True)
    archive = output / 'Audio-ToolZ-v1.6-Windows-x64-portable.zip'
    attributes = {'Audio ToolZ/': 0x11, 'Audio ToolZ/logo.ico': 0x22, 'Audio ToolZ/desktop.ini': 0x27, 'Audio ToolZ/Audio ToolZ.exe': 0x20}
    with zipfile.ZipFile(archive, 'w') as z:
        for name, attr in attributes.items():
            info = zipfile.ZipInfo(name)
            info.create_system = 0
            info.external_attr = attr
            info.compress_type = zipfile.ZIP_DEFLATED
            z.writestr(info, b'' if name.endswith('/') else (folder / pathlib.PurePosixPath(name).name).read_bytes())
    with zipfile.ZipFile(archive) as z:
        assert set(z.namelist()) == set(attributes)
        assert z.testzip() is None
        assert hashlib.sha256(z.read('Audio ToolZ/Audio ToolZ.exe')).hexdigest() == digest(exe)
        for name, attr in attributes.items():
            assert z.getinfo(name).external_attr & 0xff == attr
        assert 'IconResource=logo.ico,0' in z.read('Audio ToolZ/desktop.ini').decode('utf-16')
    (output / 'SHA256SUMS.txt').write_text(digest(archive) + '  ' + archive.name + '\n' + digest(exe) + '  Audio ToolZ/Audio ToolZ.exe\n', encoding='ascii')
    head = subprocess.check_output(['git', 'rev-parse', 'HEAD'], cwd=ROOT, text=True).strip()
    (output / 'BUILD.txt').write_text('Source commit: ' + head + '\nWindows Explorer rendering requires manual validation after extraction. ZIP extractors may not preserve DOS attributes.\n', encoding='ascii')
    print('Verified archive:', archive.name, 'SHA256:', digest(archive))

if __name__ == '__main__':
    if sys.argv[1:] == ['--package']:
        package()
    elif not sys.argv[1:]:
        ui()
    else:
        raise SystemExit('Usage: finalize-candidate-16.py [--package]')
