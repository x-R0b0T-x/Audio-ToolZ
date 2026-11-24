import {execFileSync} from 'node:child_process';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
const tracked=execFileSync('git',['ls-files','-z'],{encoding:'utf8'}).split('\0').filter(Boolean);
const files=tracked.filter(p=>/\.(?:[cm]?js|tsx?|css|html|json|rs|toml|md|ya?ml)$/i.test(p)&&!/(?:^|\/)(?:node_modules|target|dist)\//.test(p)&&!/(?:package-lock\.json|Cargo\.lock)$/.test(p));
const typo=new RegExp('\\b'+String.fromCharCode(65,84,88)+'\\b','gu'),robotTypos=[],colors=[];
for(const path of files){const lines=readFileSync(path,'utf8').split(/\r?\n/);for(let i=0;i<lines.length;i++){typo.lastIndex=0;if(typo.test(lines[i]))robotTypos.push({path,line:i+1,text:lines[i].trim()});if(/\.(?:css|tsx?|[cm]?js)$/.test(path)){const values=[...lines[i].matchAll(/#(?:[a-f\d]{8}|[a-f\d]{6}|[a-f\d]{4}|[a-f\d]{3})\b/gi)].map(m=>m[0].toLowerCase());if(values.length)colors.push({path,line:i+1,values:[...new Set(values)]});}}}
mkdirSync('audit-output',{recursive:true});
const report={filesScanned:files.length,robotTypos,colors,note:'Color inventory for review; analyzer, meter, warning and record colors are not automatically replaced.'};
writeFileSync('audit-output/review-audit.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({filesScanned:files.length,robotTypos:robotTypos.length,colorLocations:colors.length}));
if(robotTypos.length)process.exitCode=1;
