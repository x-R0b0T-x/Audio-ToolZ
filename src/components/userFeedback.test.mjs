import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {normalizeEffectName} from '../utils/effectReview.mjs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('welcome guide names all effects and speaks as ATZ without a Presentation subtitle',()=>{
 const guide=read('Tutorial.tsx'),css=read('interfaceConsistency.css');
 assert.doesNotMatch(guide,/<small>Présentation<\/small>/);
 assert.match(guide,/Je suis là pour vous accompagner\./);
 assert.doesNotMatch(guide,/\bnous\b|on est là|sommes là/i);
 for(const name of ['Z-Delay','Z-Égaliseur','Z-Fondus','Z-Limit/Comp','Z-Pitcher','Z-Reverbe'])assert.ok(guide.includes(name));
 assert.match(css,/\.atz-tuto-head\{[^}]*grid-template-columns:32px minmax\(0,1fr\) 32px/);
 assert.match(css,/\.atz-tuto-head>h2\{[^}]*text-align:center/);
});
test('equalizer keeps its accented capital in the menu and shared renderer',()=>{
 assert.match(read('TopMenuBar.tsx'),/effect\('Z-Égaliseur','eq'\)/);
 for(const name of ['Z-égaliseur','Z-Égaliseur','Égaliseur paramétrique 7 bandes'])assert.equal(normalizeEffectName(name),'Z-Égaliseur');
 assert.match(read('EffectName.tsx'),/import '\.\/interfaceConsistency\.css'/);
});
test('effect titles are centered and reverb fader backgrounds are black',()=>{
 const css=read('interfaceConsistency.css');
 assert.match(css,/#root \.atz-advanced>header\{[^}]*grid-template-columns:80px minmax\(0,1fr\) 80px/);
 assert.match(css,/#root \.atz-advanced>header>h2\{[^}]*text-align:center/);
 assert.match(css,/\.atz-rv-fader-track\{background-color:#000\}/);
 assert.match(css,/::-webkit-slider-runnable-track\{background:#000\}/);
 assert.match(css,/::-moz-range-track\{background:#000\}/);
});
test('help drops the redundant instruction and the changelog records current work',()=>{
 const help=read('EffectHelp.tsx'),notes=read('../releaseNotes.ts');
 assert.doesNotMatch(help,/Cliquez sur une rubrique pour la déplier ou la replier/);
 assert.match(help,/Mes conseils pour cet effet/);
 assert.match(notes,/v1\.7-dev/);assert.match(notes,/Symphonia 0\.6\.1/);assert.match(notes,/fonds noirs/);
});
