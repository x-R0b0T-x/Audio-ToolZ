from pathlib import Path
import re
import runpy

ROOT = Path(__file__).resolve().parents[2]

def update(relative, transform):
    path = ROOT / relative
    before = path.read_text(encoding='utf-8')
    after = transform(before)
    if after != before:
        path.write_text(after, encoding='utf-8')

def brand(text):
    return text.replace('<span>Audio </span><span>Tool</span><span>Z</span>', '<span data-atz-brand="audio">Audio </span><span data-atz-brand="tool">Tool</span><span data-atz-brand="z">Z</span>')

for relative in ['src/components/TopMenuBar.tsx', 'src/components/InfoModal.tsx']:
    update(relative, brand)
update('src/components/InfoModal.tsx', lambda s: s.replace('>Audio ToolZ {APP_VERSION.split(\' \')[0]}</h2>', '><span data-atz-brand="audio">Audio </span><span data-atz-brand="tool">Tool</span><span data-atz-brand="z">Z</span> {APP_VERSION.split(\' \')[0]}</h2>'))
def brand_logo(s):
    for part, color in [('audio', '#f8f8f2'), ('tool', '#39ff14'), ('z', '#b34dff')]:
        s = s.replace("<span style={{ color: '" + color + "' }}>", '<span data-atz-brand="' + part + '" style={{ color: \'' + color + '\' }}>')
    return s
update('src/components/BrandLogo.tsx', brand_logo)
def policy(s):
    for part, color in [('audio', '#fff'), ('tool', '#39ff14'), ('z', '#b34dff')]:
        rule = '#root#root span[data-atz-brand="' + part + '"]{color:' + color + '!important}'
        if rule not in s:
            s += '\n' + rule + '\n'
    return s
update('src/textReadability.css', policy)
update('src/components/RecentFilesMenu.tsx', lambda s: re.sub(r'^.*\{!entries\.length && <p[^\n]*Aucun fichier récent[^\n]*\n?', '', s, flags=re.M))
runpy.run_path(str(ROOT / '.github/scripts/fix-tutorial-buttons-16.py'), run_name='__main__')
runpy.run_path(str(ROOT / '.github/scripts/finalize-control-16.py'), run_name='__main__')
note = '\n\n## Distribution finale v1.6\n\nUn seul fichier : `audio tools v1.6.zip`. Une extraction donne directement le dossier `Audio ToolZ` avec `Audio ToolZ.exe`, `logo.ico` et `desktop.ini`. Les empreintes SHA-256 restent dans le résumé de compilation, pas dans le téléchargement.\n\nContrôle : illustration mix.png à la place des deux vumètres, analyseur conservé ; oscilloscope par défaut sans préférence, puis dernier choix mémorisé. Dernière page du didacticiel : Telegram, Github, Paypal, trois boutons égaux violets devenant verts au survol. Delay en temps musicaux avec détection BPM, sans réglage libre en millisecondes.\n\nCe candidat nécessite une validation visuelle Windows avant fusion, tag et publication ; la validation de 414ae3f ne vaut pas validation de ces modifications.\n'
for relative in ['README.md', 'CHANGELOG.md', 'RELEASE_NOTES_1.6.md']:
    def notes(s):
        s = s.replace('empreintes SHA-256 de l’exécutable et du ZIP fournies séparément.', 'empreintes SHA-256 de l’exécutable et du ZIP dans le résumé de compilation.')
        s = s.replace('Windows x64 portable : archive ZIP du dossier Audio ToolZ, accompagnée de SHA256SUMS.txt et BUILD.txt.', 'Windows x64 portable : audio tools v1.6.zip, sans fichier de contrôle séparé à télécharger.')
        return s if '## Distribution finale v1.6' in s else s + note
    update(relative, notes)
assert 'Aucun fichier récent' not in (ROOT / 'src/components/RecentFilesMenu.tsx').read_text(encoding='utf-8')
