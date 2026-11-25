import ast,subprocess
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
if subprocess.check_output(['git','branch','--show-current'],cwd=ROOT,text=True).strip()!='v.1.7-dev':raise RuntimeError('Wrong branch')
p=ROOT/'.github/corrections/apply_final_lot.py'
source=p.read_text(encoding='utf-8')
old="files['src-tauri/src/configuration_scan.rs']='''"
new="files['src-tauri/src/configuration_scan.rs']=r'''"
if new not in source:
 if source.count(old)!=1:raise RuntimeError('Unexpected embedded Rust block')
 source=source.replace(old,new,1)
old_guard=' if new in t:return\n'
new_guard=" if new in t:return\n if p=='src/components/Tutorial.tsx' and old==' {image:img2,alt:' and 'image:scanner' in t:return\n"
if new_guard not in source:
 if source.count(old_guard)!=1:raise RuntimeError('Unexpected change helper')
 source=source.replace(old_guard,new_guard,1)
source=source.replace("scan.includes('Vous pouvez utiliser Audio ToolZ sans problème.')","scan.includes('vous pouvez utiliser Audio ToolZ sans problème.')")
hook="subprocess.run(['python','.github/corrections/finalize_tutorial_scan.py'],cwd=ROOT,check=True)"
if hook not in source:source+='\n'+hook+'\n'
compile(source,str(p),'exec')
tree=ast.parse(source,filename=str(p))
blocks=[node.value.value for node in ast.walk(tree) if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str) and any(isinstance(target,ast.Subscript) and isinstance(target.slice,ast.Constant) and target.slice.value=='src-tauri/src/configuration_scan.rs' for target in node.targets)]
if len(blocks)!=1 or r"\u{feff}" not in blocks[0]:raise RuntimeError('Rust unicode escape was not preserved')
if "env.playing()?'stop':" not in source or 'src/components/finalLot.test.mjs' not in source:raise RuntimeError('Complete Play Stop lot and its regression tests are required')
for other in (ROOT/'.github/corrections').glob('*.py'):
 compile(source if other==p else other.read_text(encoding='utf-8'),str(other),'exec')
p.write_text(source,encoding='utf-8')
print({'pipeline':'complete-v1.7-dev-windows','pythonSyntax':'passed','embeddedRustUnicode':'preserved','completePlayStopLot':'present','tutorialFinalization':'scheduled','scanInsertion':'repeatable','checkedGenerators':len(list((ROOT/'.github/corrections').glob('*.py')))})
