import json, subprocess
from pathlib import Path
from PIL import Image, ImageOps
source = Path('src/features/easter-egg/333.png')
original = source.read_bytes()
with Image.open(source) as image:
    thumb = ImageOps.contain(image.convert('RGBA'), (320, 320), Image.Resampling.LANCZOS)
    work = Image.new('RGBA', (320, 320))
    work.alpha_composite(thumb, ((320-thumb.width)//2, (320-thumb.height)//2))
    rgba = list(work.tobytes())
check = r'''
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isolateGreenRing} from './src/components/ringMask.mjs';
const a=new Uint8ClampedArray(JSON.parse(readFileSync(0,'utf8'))),m=isolateGreenRing(a,320,320);
assert.ok(m,'Actual PNG must contain a detectable ring; do not ship a silent missing halo');
let lit=0,opaque=0;
for(let i=0;i<m.alpha.length;i++)if(m.alpha[i]){
 const p=i*4;lit++;if(a[p+3]>240)opaque++;
 assert.ok(a[p+1]>a[p]*1.3&&a[p+1]>a[p+2]*1.15,'Non-green foreground must remain untouched');
}
assert.ok(lit>128,'Ring mask is too small');assert.ok(opaque>32,'Must illuminate ring pixels even when original PNG is opaque');
console.log(JSON.stringify({center:[m.cx,m.cy],radius:m.radius,lit_pixels:lit,opaque_ring_pixels:opaque}));
'''
subprocess.run(['node', '--input-type=module', '-e', check], input=json.dumps(rgba), text=True, check=True)
if source.read_bytes() != original:
    raise SystemExit('Original illustration was changed')
