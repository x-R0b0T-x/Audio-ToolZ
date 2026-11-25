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
compile(source,str(p),'exec')
tree=ast.parse(source,filename=str(p))
blocks=[node.value.value for node in ast.walk(tree) if isinstance(node,ast.Assign) and isinstance(node.value,ast.Constant) and isinstance(node.value.value,str) and any(isinstance(target,ast.Subscript) and isinstance(target.slice,ast.Constant) and target.slice.value=='src-tauri/src/configuration_scan.rs' for target in node.targets)]
if len(blocks)!=1 or r"\u{feff}" not in blocks[0]:raise RuntimeError('Rust unicode escape was not preserved')
for other in (ROOT/'.github/corrections').glob('*.py'):
 compile(source if other==p else other.read_text(encoding='utf-8'),str(other),'exec')
p.write_text(source,encoding='utf-8')
print({'pythonSyntax':'passed','embeddedRustUnicode':'preserved','checkedGenerators':len(list((ROOT/'.github/corrections').glob('*.py')))})
