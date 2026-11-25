import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import assert from 'node:assert/strict';
const server=spawn(process.execPath,['node_modules/vite/bin/vite.js','--host','127.0.0.1','--port','4179','--strictPort'],{stdio:'inherit'});
let browser;
try{
 let available=false;
 for(let i=0;i<120;i++){try{const response=await fetch('http://127.0.0.1:4179/');if(response.ok){available=true;break;}}catch{}await new Promise(r=>setTimeout(r,500));}
 assert.ok(available,'Vite test server unavailable');
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage();
 const config=JSON.parse(readFileSync('src-tauri/tauri.conf.json','utf8'));
 await page.route('http://127.0.0.1:4179/',route=>route.fulfill({status:200,contentType:'text/html',headers:{'Content-Security-Policy':config.app.security.csp},body:'<!doctype html><title>Signalsmith runtime validation</title>'}));
 await page.goto('http://127.0.0.1:4179/');
 const results=await page.evaluate(async()=>{
  const {renderSignalsmith}=await import('/src/audio/signalsmithPitcher.ts');
  const rate=48000,length=rate*2,left=Float32Array.from({length},(_,i)=>.3*Math.sin(2*Math.PI*440*i/rate)),right=Float32Array.from({length},(_,i)=>.2*Math.sin(2*Math.PI*660*i/rate));
  const records=[];
  for(const speed of [.5,1,2])for(const pitch of [-12,0,12]){
   const output=await renderSignalsmith([left,right],rate,speed,pitch);
   const metrics=output.map(c=>{const start=Math.floor(c.length*.3),end=Math.floor(c.length*.7);let crossings=0,energy=0;for(let i=start;i<end;i++){energy+=c[i]*c[i];if(i>start&&c[i-1]<=0&&c[i]>0)crossings++;}return {length:c.length,finite:c.every(Number.isFinite),rms:Math.sqrt(energy/(end-start)),frequency:crossings*rate/(end-start)};});
   records.push({speed,pitch,metrics});
  }
  const aborted=new AbortController();aborted.abort();let cancelled=false;
  try{await renderSignalsmith([left],rate,1,0,aborted.signal);}catch(e){cancelled=e.name==='AbortError';}
  return {records,cancelled,sourcePreserved:left.every((v,i)=>v===Math.fround(.3*Math.sin(2*Math.PI*440*i/rate)))};
 });
 for(const record of results.records){
  record.metrics.forEach((m,i)=>{assert.equal(m.length,Math.round(96000/record.speed));assert.ok(m.finite);assert.ok(m.rms>.01,'Rendered silence');const expected=(i?660:440)*2**(record.pitch/12);assert.ok(Math.abs(m.frequency-expected)/expected<.06,`Wrong pitch: ${JSON.stringify(record)}`);});
 }
 assert.ok(results.cancelled);assert.ok(results.sourcePreserved);
 mkdirSync('audit-output',{recursive:true});
 writeFileSync('audit-output/signalsmith-runtime.json',JSON.stringify({engine:'signalsmith-stretch@1.3.2',validation:'passed',environment:'headless Chromium on Windows; application CSP enforced; WebView2 listening review still required',...results},null,2)+'\n');
}finally{await browser?.close();server.kill();}
