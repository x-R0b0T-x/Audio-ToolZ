import subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!='v.1.7-dev':raise RuntimeError('Wrong branch')
control=(ROOT/'src/components/EffectControls.tsx').read_text(encoding='utf-8')
required=['<KnobTicks',"import {PositionLabel} from './PositionLabel';",'>Gauche</PositionLabel>','>Droite</PositionLabel>','>Centre</PositionLabel>','className="zonyx-pan-labels"']
missing=[token for token in required if token not in control]
if missing:raise RuntimeError('Finalized effect controls are required; refusing a legacy migration: '+repr(missing))
if control.count('className="zonyx-pan-labels"')!=1:raise RuntimeError('Expected exactly one finalized pan label block')
print({'legacyKnobMigration':'retired','finalizedControls':'verified-and-preserved','sourceWrites':0})
