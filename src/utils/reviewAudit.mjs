import {rewriteMascotText} from './mascotIdentity.mjs';
import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const files=tracked.filter(p=>/\.(?:[cm]?js|tsx?|css|html|json|rs|toml|md|ya?ml)$/i.test(p)&&!/(?:^|\/)(?:node_modules|target|dist)\//.test(p)&&!/(?:package-lock\.json|Cargo\.lock)$/.test(p)).filter(p=>!p.startsWith('.github/')&&!/(?:^|\/)(?:vendor|third_party)\//.test(p));
const robotTypos=[],colors=[];
for(const path of files){const lines=readFileSync(path,'utf8').split(/\r?\n/);for(let i=0;i<lines.length;i++){if(rewriteMascotText(lines[i])!==lines[i])robotTypos.push({path,line:i+1,text:lines[i].trim()});if(/\.(?:css|tsx?|[cm]?js)$/.test(path)){const values=[...lines[i].matchAll(/#(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})\b/gi)].map(m=>m[0].toLowerCase());if(values.length)colors.push({path,line:i+1,values:[...new Set(values)]});}}}
mkdirSync('audit-output',{recursive:true});
const report={filesScanned:files.length,robotTypos,colors,note:'Color inventory for review; analyzer, meter, warning and record colors are not automatically replaced.'};
writeFileSync('audit-output/review-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({filesScanned:files.length,robotTypos:robotTypos.length,colorLocations:colors.length}));
const escapeData=value=>String(value).replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A');
const escapeProperty=value=>escapeData(value).replace(/:/g,'%3A').replace(/,/g,'%2C');
for(const entry of robotTypos){
 console.error(`${entry.path}:${entry.line}: nom du robot attendu : ZØNYX\n${entry.text}`);
 if(process.env.GITHUB_ACTIONS==='true')console.error(`::error file=${escapeProperty(entry.path)},line=${entry.line},title=Robot spelling::${escapeData(`Nom attendu : ZØNYX. Ligne detectee : ${entry.text}`)}`);
}
if(robotTypos.length){console.error('Audit bloque : corriger les lignes ci-dessus. Rapport complet : audit-output/review-audit.json');process.exitCode=1;}
