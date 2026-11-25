import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const script=fileURLToPath(new URL('../../.github/maintenance/vendor_bpm.py',import.meta.url));
const python=String.raw`import base64,importlib.util,sys,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('vendor_bpm',sys.argv[1]);vendor=importlib.util.module_from_spec(spec);spec.loader.exec_module(vendor)
WASM=b'\x00asm\x01\x00\x00\x00'
class AubioAssetTests(unittest.TestCase):
 def setUp(self):
  self.temp=tempfile.TemporaryDirectory();self.root=Path(self.temp.name);(self.root/'build').mkdir();self.js=self.root/'build/aubio.js';self.wasm=self.root/'build/aubio.wasm'
 def tearDown(self):self.temp.cleanup()
 def inline(self,mime='octet-stream',payload=WASM):self.js.write_text('var wasmBinaryFile="data:application/'+mime+';base64,'+base64.b64encode(payload).decode('ascii')+'";',encoding='utf-8')
 def test_single_file(self):
  self.inline();self.assertEqual(vendor.aubio_runtime_assets(self.root),[self.js]);self.assertFalse(self.wasm.exists())
 def test_wasm_mime(self):
  self.inline('wasm');self.assertEqual(vendor.aubio_runtime_assets(self.root),[self.js])
 def test_sidecar(self):
  self.js.write_text('var wasmBinaryFile="aubio.wasm";',encoding='utf-8');self.wasm.write_bytes(WASM);self.assertEqual(vendor.aubio_runtime_assets(self.root),[self.js,self.wasm])
 def test_missing_loader(self):
  self.wasm.write_bytes(WASM)
  with self.assertRaisesRegex(RuntimeError,'Missing runtime asset'):vendor.aubio_runtime_assets(self.root)
 def test_missing_both_formats(self):
  self.js.write_text('var wasmBinaryFile="aubio.wasm";',encoding='utf-8')
  with self.assertRaisesRegex(RuntimeError,'neither a sidecar nor embedded'):vendor.aubio_runtime_assets(self.root)
 def test_invalid_embedded_header(self):
  self.inline(payload=b'not-wasm')
  with self.assertRaisesRegex(RuntimeError,'Invalid WASM header'):vendor.aubio_runtime_assets(self.root)
 def test_invalid_base64(self):
  self.js.write_text('var wasmBinaryFile="data:application/octet-stream;base64,A";',encoding='utf-8')
  with self.assertRaisesRegex(RuntimeError,'Invalid embedded Aubio WASM base64'):vendor.aubio_runtime_assets(self.root)
 def test_invalid_sidecar(self):
  self.inline();self.wasm.write_bytes(b'broken')
  with self.assertRaisesRegex(RuntimeError,'Invalid WASM header'):vendor.aubio_runtime_assets(self.root)
suite=unittest.defaultTestLoader.loadTestsFromTestCase(AubioAssetTests)
result=unittest.TextTestRunner(verbosity=2).run(suite)
sys.exit(0 if result.wasSuccessful() else 1)
`;
test('Aubio runtime packaging validates embedded and separate WASM',()=>{
 const result=spawnSync(process.env.PYTHON||'python',['-X','utf8','-c',python,script],{encoding:'utf8',timeout:30000});
 assert.ifError(result.error);assert.equal(result.status,0,result.stdout+'\n'+result.stderr);
});
