import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import os from 'node:os';
import {copyFileSync,cpSync,mkdirSync,mkdtempSync,readFileSync,rmSync,writeFileSync,existsSync} from 'node:fs';
const source=readFileSync(new URL('../../vite.config.ts',import.meta.url),'utf8');
function config(root,command='build'){
 const body=source.replace(/^import[^\n]*;\r?\n/gm,'').replace('export default defineConfig','return defineConfig');
 return new Function('tailwindcss','react','path','copyFileSync','cpSync','mkdirSync','defineConfig','__dirname',body)(()=>({}),()=>({}),path,copyFileSync,cpSync,mkdirSync,callback=>callback({command}),root);
}
function fixture(callback){
 const root=mkdtempSync(path.join(os.tmpdir(),'audio-toolz-bpm-assets-'));
 try{mkdirSync(path.join(root,'public'),{recursive:true});for(const icon of ['icon.ico','icon.png'])writeFileSync(path.join(root,'public',icon),'test-icon');callback(root);}finally{rmSync(root,{recursive:true,force:true});}
}
test('build plugin copies complete local BPM runtime tree byte for byte',()=>fixture(root=>{
 const assets={'worker.js':'self.onmessage=()=>{};','essentia/essentia-wasm.web.js':'wasm-loader','essentia/essentia.js-core.js':'core','aubio/aubio.js':'inline-wasm-loader','aubio/aubio.wasm':Buffer.from([0,97,115,109,1,0,0,0]),'manifest.json':'[]','NOTICE.txt':'licenses','essentia/LICENSE':'license-text'};
 for(const [name,data] of Object.entries(assets)){const file=path.join(root,'public/third_party/bpm',name);mkdirSync(path.dirname(file),{recursive:true});writeFileSync(file,data);}
 writeFileSync(path.join(root,'public','unrelated-large-file.bin'),'must-not-ship');
 const output=path.join(root,'dist');const build=config(root);assert.equal(build.publicDir,false);
 build.plugins.find(plugin=>plugin.name==='audio-toolz-runtime-icons').writeBundle({dir:output});
 for(const name of Object.keys(assets))assert.deepEqual(readFileSync(path.join(output,'third_party/bpm',name)),readFileSync(path.join(root,'public/third_party/bpm',name)));
 for(const icon of ['icon.ico','icon.png'])assert.equal(readFileSync(path.join(output,icon),'utf8'),'test-icon');
 assert.equal(existsSync(path.join(output,'unrelated-large-file.bin')),false);
}));
test('missing BPM runtime fails the production copy instead of silently omitting it',()=>fixture(root=>{
 const plugin=config(root).plugins.find(item=>item.name==='audio-toolz-runtime-icons');
 assert.throws(()=>plugin.writeBundle({dir:path.join(root,'dist')}),{code:'ENOENT'});
}));
test('development public directory and relative base are preserved',()=>fixture(root=>{
 assert.equal(config(root,'serve').publicDir,'public');assert.equal(config(root).base,'./');
}));
