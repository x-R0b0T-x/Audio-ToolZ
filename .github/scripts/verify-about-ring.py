import base64, hashlib, io, json, subprocess
from pathlib import Path
from PIL import Image, ImageOps
source=Path('src/features/easter-egg/333.png')
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
assert.ok(m,'Actual PNG ring was not detected; build stopped');
let lit=0,opaque=0;
for(let i=0;i<m.alpha.length;i++)if(m.alpha[i]){
 const p=i*4;lit++;if(a[p+3]>240)opaque++;
 assert.ok(a[p+1]>a[p]*1.3&&a[p+1]>a[p+2]*1.15,'Non-green foreground in ring mask');
}
assert.ok(lit>128&&opaque>32,'Insufficient visible ring pixels');
console.log(JSON.stringify({cx:m.cx,cy:m.cy,radius:m.radius,lit,alpha:Array.from(m.alpha)}));
"""
result=subprocess.run(['node','--input-type=module','-e',code],input=json.dumps(list(work.tobytes())),text=True,capture_output=True)
if result.returncode:
    raise SystemExit(result.stderr or 'Ring generation failed')
model=json.loads(result.stdout)
mask=Image.new('RGBA',(320,320),(255,255,255,0))
mask.putalpha(Image.frombytes('L',(320,320),bytes(model['alpha'])))
png=io.BytesIO();mask.save(png,format='PNG',optimize=True)
url='data:image/png;base64,'+base64.b64encode(png.getvalue()).decode('ascii')
blob=hashlib.sha1(b'blob '+str(len(original)).encode()+bytes([0])+original).hexdigest()
text='export const ringMaskUrl='+json.dumps(url)+';\nexport const ringCenter='+json.dumps([model['cx'],model['cy']])+' as const;\nexport const ringSourceBlob='+json.dumps(blob)+';\n'
if source.read_bytes()!=original:raise SystemExit('Original illustration changed')
Path('src/components/about-ring.generated.ts').write_text(text,encoding='utf-8',newline='\n')
print(json.dumps({'ring_pixels':model['lit'],'radius':model['radius'],'source_blob':blob}))
