export function createKickMagnet(){
 let held=null;
 return {
  reset(){held=null;},
  snap(sample,targets,width,length,total,enabled=true,alt=false){
   const raw=Math.round(Math.max(0,Math.min(total,sample)));
   if(!enabled||alt||!targets.length||width<=0||length<=0){held=null;return raw;}
   const unit=length/width;
   if(held!==null&&targets.includes(held)&&held>=0&&held<=total&&Math.abs(held-raw)<=12*unit)return held;
   held=null;let distance=7*unit,result=raw;
   for(const target of targets){if(!Number.isFinite(target)||target<0||target>total)continue;const gap=Math.abs(target-raw);if(gap<=distance){distance=gap;result=target;held=target;}}
   return result;
  }
 };
}
export function kickTargets(info){
 if(!info)return [];
 const beats=info.beatSamples||[],kicks=info.kickSamples||[];
 return beats.length?beats.map((beat,index)=>kicks[index]??beat):kicks;
}
