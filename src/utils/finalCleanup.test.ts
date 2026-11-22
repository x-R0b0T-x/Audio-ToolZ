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
 assert.equal(JSON.parse(read('package.json')).version,'1.6.0');assert.equal(JSON.parse(read('src-tauri/tauri.conf.json')).version,'1.6.0');
 for(const path of ['src/releaseNotes.ts','RELEASE_NOTES_1.6.md'])assert.ok(!/easter|q7m4n2|30 clic/i.test(read(path)));
 assert.equal(signedDb(3,1),'+3.0');assert.equal(signedDb(0,1),'0.0');assert.equal(signedDb(-3,1),'-3.0');
});
