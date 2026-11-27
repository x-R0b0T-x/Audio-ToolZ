import {removeClicks} from '../../src/audio/declick.mjs';
import {mkdirSync,writeFileSync,appendFileSync} from 'node:fs';
const RATE=44100,WIDTHS=[1,1,2,3,4,6,8,12,20,40,80,150];
function rng(seed){return()=>{seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function music(seconds){
 const n=Math.round(RATE*seconds),r=rng(1),x=new Float32Array(n);
 for(let i=0;i<n;i++){const t=i/RATE,env=.6+.4*Math.sin(2*Math.PI*.7*t);
  x[i]=env*(.25*Math.sin(2*Math.PI*220*t)+.18*Math.sin(2*Math.PI*330*t+1)+.12*Math.sin(2*Math.PI*440*t+2)+.08*Math.sin(2*Math.PI*1320*t)+.05*Math.sin(2*Math.PI*3100*t))+.002*(r()-.5);}
 return x;
}
function wav(samples){
 const n=samples.length,b=Buffer.alloc(44+n*2);
 b.write('RIFF',0);b.writeUInt32LE(36+n*2,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);
 b.writeUInt32LE(RATE,24);b.writeUInt32LE(RATE*2,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(n*2,40);
 for(let i=0;i<n;i++)b.writeInt16LE(Math.round(Math.max(-1,Math.min(1,samples[i]))*32767),44+i*2);
 return b;
}
const clean=music(6),dirty=Float32Array.from(clean),r=rng(7),positions=[];
WIDTHS.forEach((w,k)=>{
 const p0=Math.floor((k+1)*clean.length/(WIDTHS.length+1)),sign=r()<.5?-1:1;positions.push([p0,w]);
 if(k%2===0)for(let i=0;i<w;i++)dirty[p0+i]+=.8*(r()-.5)*2*.6+sign*.2;
 else for(let i=0;i<w;i++)dirty[p0+i]+=sign*(.35+.4*r())*Math.exp(-i/(w*.25+.5));
});
const started=performance.now(),result=removeClicks([dirty],RATE,{tolerance:1000}),elapsed=performance.now()-started,repaired=result.channels[0];
const peak=(a,from,to)=>{let m=0;for(let i=from;i<to;i++)m=Math.max(m,Math.abs(a[i]-clean[i]));return m;};
const rows=positions.map(([p0,w])=>{const before=peak(dirty,p0-5,p0+w+25),after=peak(repaired,p0-5,p0+w+25);return {width:w,ms:+(w/RATE*1000).toFixed(2),before:+before.toFixed(4),after:+after.toFixed(4),reductionDb:+(20*Math.log10(before/Math.max(after,1e-6))).toFixed(1)};});
const cleanRun=removeClicks([clean],RATE);
const report={sampleRate:RATE,seconds:6,regionsRepaired:result.clicks.length,falsePositivesOnCleanAudio:cleanRun.clicks.length,processingMs:+elapsed.toFixed(0),rows};
mkdirSync('declick-report',{recursive:true});
writeFileSync('declick-report/report.json',JSON.stringify(report,null,2));
writeFileSync('declick-report/1-avec-clics.wav',wav(dirty));
writeFileSync('declick-report/2-repare.wav',wav(repaired));
writeFileSync('declick-report/3-original-sans-clics.wav',wav(clean));
const lines=['## Z-Clics : mesures sur un signal de test','',`Régions réparées : ${report.regionsRepaired} (douze clics injectés). Fausses détections sur un signal propre : ${report.falsePositivesOnCleanAudio}. Temps de calcul pour 6 s : ${report.processingMs} ms.`,'','| Largeur (échantillons) | Durée (ms) | Écart avant | Écart après | Réduction (dB) |','|---|---|---|---|---|',...rows.map(x=>`| ${x.width} | ${x.ms} | ${x.before} | ${x.after} | ${x.reductionDb} |`),'','Les trois fichiers WAV du test sont dans l’artefact : avec clics, réparé, original.'];
console.log(lines.join('\n'));
if(process.env.GITHUB_STEP_SUMMARY)appendFileSync(process.env.GITHUB_STEP_SUMMARY,lines.join('\n')+'\n');
if(report.falsePositivesOnCleanAudio!==0||rows.some(x=>x.after>=x.before*.5)){console.error('Z-Clics : mesures hors limites');process.exitCode=1;}
