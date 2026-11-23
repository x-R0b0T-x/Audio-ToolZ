from pathlib import Path
import runpy
root = Path(__file__).resolve().parents[2]
for script in ['fix-tutorial-buttons-16.py', 'finalize-control-16.py', 'polish-six-16.py', 'finalize-amplitude-wave-16.py']:
    runpy.run_path(str(root / '.github/scripts' / script), run_name='__main__')
assert 'Aucun fichier récent' not in (root / 'src/components/RecentFilesMenu.tsx').read_text(encoding='utf-8')
