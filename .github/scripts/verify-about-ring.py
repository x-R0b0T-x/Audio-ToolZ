import hashlib,json,subprocess
from pathlib import Path
from PIL import Image,ImageOps
source=Path('src/features/q7m4n2/333.png')
original=source.read_bytes()
with Image.open(source) as image:
    thumb=ImageOps.contain(image.convert('RGBA'),(320,320),Image.Resampling.LANCZOS)
    work=Image.new('RGBA',(320,320))
    work.alpha_composite(thumb,((320-thumb.width)//2,(320-thumb.height)//2))
code=r"""
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isolateGreenRing} from './src/components/ringMask.mjs';
const a=new Uint8ClampedArray(JSON.parse(readFileSync(0,'utf8'))),m=isolateGreenRing(a,320,320);
assert.ok(m,'Actual PNG ring was not detected');
let lit=0,opaque=0;
for(let i=0;i<m.alpha.length;i++)if(m.alpha[i]){
 const p=i*4;lit++;if(a[p+3]>240)opaque++;
 assert.ok(a[p+1]>a[p]*1.3&&a[p+1]>a[p+2]*1.15,'Non-green foreground in ring mask');
}
assert.ok(lit>128&&opaque>32,'Insufficient visible ring pixels');
console.log(JSON.stringify({lit,opaque}));
"""
result=subprocess.run(['node','--input-type=module','-e',code],input=json.dumps(list(work.tobytes())),text=True,capture_output=True)
if result.returncode:raise SystemExit(result.stderr or 'PNG validation failed')
if source.read_bytes()!=original:raise SystemExit('Original illustration changed')
print(json.dumps({'sha256':hashlib.sha256(original).hexdigest(),'validation':json.loads(result.stdout)}))
