import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import {signedDb} from './presentationFormat';
const read=(path:string)=>readFileSync(path,'utf8');
test('retired standalone effects are absent but batch processing is preserved',()=>{
 const modal=read('src/components/EffectModal.tsx');assert.ok(!modal.includes("case 'volume'"));assert.ok(!modal.includes("case 'normalize'"));
 const batch=read('src/audio/batchProcessor.ts');assert.ok(batch.includes('applyVolume'));assert.ok(batch.includes('normalizeChannels'));
});
test('unused indicator wrapper and generated mask are removed',()=>{
 assert.ok(!existsSync('src/components/SnapIndicatorPortal.tsx'));assert.ok(!existsSync('src/components/about-ring.generated.ts'));
 assert.ok(read('src/components/WaveformView.tsx').includes('data-testid="snap-kicks-toggle"'));
});
test('dynamics group legends are removed without deleting controls',()=>{
 const code=read('src/components/AdvancedEffects.tsx');for(const label of ['NIVEAU','ENVELOPPE','AFFICHAGE'])assert.ok(!code.includes('<span>'+label+'</span>'));
 for(const key of ['attack','release','ceiling'])assert.ok(code.includes("control('"+key+"'"));assert.ok(code.includes('label="Défilement"'));
});
test('release metadata and public notes are consistent',()=>{
 const version=JSON.parse(read('package.json')).version;assert.match(version,/^\d+\.\d+\.\d+$/);assert.equal(JSON.parse(read('src-tauri/tauri.conf.json')).version,version);
 assert.ok(!/easter|q7m4n2|30 clic/i.test(read('src/releaseNotes.ts')));
 assert.equal(signedDb(3,1),'+3.0');assert.equal(signedDb(0,1),'0.0');assert.equal(signedDb(-3,1),'-3.0');
});
