import ast,copy,json,subprocess,tempfile,unittest
from pathlib import Path
from types import SimpleNamespace
SCRIPT=Path(__file__).with_name('review_v17.py')
NODE=r"import fs from 'node:fs';const source=fs.readFileSync(0,'utf8');process.stdout.write(JSON.stringify({source,labels:['Curseur','S\u00e9lection'].filter(label=>source.includes(label))}));"
SOURCE='Curseur : 1.25; Sélection : 29.52; ZØNYX — chargement'
class ReviewTransportTests(unittest.TestCase):
 @classmethod
 def setUpClass(cls):
  calls=[n for n in ast.walk(ast.parse(SCRIPT.read_text(encoding='utf-8'))) if isinstance(n,ast.Call) and isinstance(n.func,ast.Attribute) and n.func.attr=='run' and any(k.arg=='input' and isinstance(k.value,ast.Name) and k.value.id=='original' for k in n.keywords)]
  if len(calls)!=1:raise AssertionError('Expected one source-to-Node transport')
  cls.call=calls[0]
 def run_transport(self,legacy=False):
  call=copy.deepcopy(self.call)
  if legacy:call.keywords=[k for k in call.keywords if k.arg not in ('encoding','errors')]
  def legacy_default(*args,**kwargs):
   kwargs.setdefault('encoding','cp1252')
   return subprocess.run(*args,**kwargs)
  with tempfile.TemporaryDirectory() as folder:
   result=eval(compile(ast.Expression(body=call),str(SCRIPT),'eval'),{'subprocess':SimpleNamespace(run=legacy_default),'ROOT':Path(folder),'node':NODE,'original':SOURCE})
  return json.loads(result.stdout)
 def test_reproduces_legacy_windows_corruption(self):
  result=self.run_transport(legacy=True)
  self.assertNotEqual(result['source'],SOURCE)
  self.assertEqual(result['labels'],['Curseur'])
 def test_actual_transport_preserves_source_and_both_labels(self):
  result=self.run_transport()
  self.assertEqual(result['source'],SOURCE)
  self.assertEqual(result['labels'],['Curseur','Sélection'])
if __name__=='__main__':unittest.main()
