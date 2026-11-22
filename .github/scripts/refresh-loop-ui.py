from pathlib import Path
import os
if os.environ.get('GITHUB_REF')!='refs/heads/v1.6-dev':raise SystemExit('Restricted branch')
marker=Path('.github/refresh-loop-ui-v1.applied')
if marker.exists():raise SystemExit(0)
path=Path('src/components/WaveformView.tsx')
text=path.read_text(encoding='utf-8')
old='  }, [\n    activeDoc,'
new='  }, [\n    overviewRangeRef.current[0],\n    overviewRangeRef.current[1],\n    activeDoc,'
if text.count(old)!=1:raise SystemExit('Ambiguous waveform redraw dependencies')
text=text.replace(old,new,1)
css=Path('src/components/advancedEffects.css')
style=css.read_text(encoding='utf-8')+'''\n#root .atz-dynamics-controls .atz-control-group[aria-label="Défilement"]{margin-left:auto;border-right:0;padding-right:0;order:99}\n'''
path.write_text(text,encoding='utf-8',newline='\n')
css.write_text(style,encoding='utf-8',newline='\n')
marker.write_text('refresh-loop-ui-v1\n',encoding='utf-8')
