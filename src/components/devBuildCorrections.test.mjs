import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=name=>readFileSync(new URL(name,import.meta.url),'utf8');
test('help keeps fixed dimensions, centered effect titles and a shared green accent',()=>{
 const help=read('EffectHelp.tsx'),css=read('effectHelp.css');
 assert.match(help,/Math\.min\(680/);assert.match(help,/Math\.min\(560/);
 assert.match(help,/if\(!next\.delete\(index\)\)next\.add\(index\)/);
 assert.match(help,/setPointerCapture/);assert.match(help,/Besoin d’aide/);
 assert.doesNotMatch(help,/title="Aide"/);
 assert.match(help,/<h2[^>]*><EffectName name=\{content\.title\}\/><\/h2>/);
 assert.doesNotMatch(help,/L’aide d’ZØNYX\s*·/);
 assert.match(css,/\.zonyx-help-bar\{[^}]*grid-template-columns:36px minmax\(0,1fr\) 36px/);
 assert.match(css,/\.zonyx-help-bar h2\{[^}]*text-align:center;[^}]*font-weight:700/);
 assert.match(css,/--zonyx-help-green:var\(--accent-secondary,#39ff14\)/);
 assert.match(css,/scrollbar-color:var\(--zonyx-help-green\)/);
 assert.match(css,/\.zonyx-help-topic \.zonyx-help-link\{[^}]*color:var\(--zonyx-help-green\)/);
 assert.match(css,/\.zonyx-help-dialog\{[^}]*box-shadow:0 0 8px var\(--zonyx-help-green\)/);
 assert.doesNotMatch(css,/#9bff82/i);
 assert.match(css,/font-size:28px!important/);
});
test('reverb never restarts playback on a knob movement and keeps full tail on apply',()=>{
 const reverb=read('ReverbModal.tsx');
 assert.match(reverb,/replacePreviewAudio/);assert.doesNotMatch(reverb,/audioEngine\.play\(/);
 assert.doesNotMatch(reverb,/Préécouter avec la queue/);assert.match(reverb,/r=\{16\+settings\.size\*\.7\}/);
 assert.match(reverb,/for\(let i=end-start;i<r\.channels\[c\]\.length;i\+\+\)/);
});
test('web and desktop titles point to the dev build',()=>{
 assert.match(read('../main.tsx'),/Audio ToolZ v1\.7-dev/);
 const config=JSON.parse(read('../../src-tauri/tauri.conf.json'));
 assert.equal(config.app.windows[0].title,'Audio ToolZ v1.7-dev');
});
