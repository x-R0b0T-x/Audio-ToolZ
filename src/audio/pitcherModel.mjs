export function validatePitcher(channels,sampleRate,speed,pitch){
 if(!Number.isFinite(speed)||speed<.5||speed>2||!Number.isFinite(pitch)||pitch< -12||pitch>12)throw Error('Paramètres Z-Pitcher hors limites');
 const length=channels[0]?.length??0;
 if(!channels.length||channels.some(c=>!(c instanceof Float32Array)||c.length!==length)||!Number.isFinite(sampleRate)||sampleRate<=0)throw Error('Audio Z-Pitcher invalide');
 if(channels.some(c=>c.some(v=>!Number.isFinite(v))))throw Error('Échantillon Z-Pitcher invalide');
 return length?Math.max(1,Math.round(length/speed)):0;
}
export function splicePitcher(original,segment,start,end){
 const total=original[0]?.length??0,size=segment[0]?.length??0;
 if(!original.length||original.length!==segment.length||original.some(c=>c.length!==total)||segment.some(c=>c.length!==size)||!Number.isInteger(start)||!Number.isInteger(end)||start<0||end<start||end>total)throw Error('Sélection Z-Pitcher invalide');
 const channels=original.map((c,i)=>{const out=new Float32Array(total-(end-start)+size);out.set(c.subarray(0,start));out.set(segment[i],start);out.set(c.subarray(end),start+size);return out;});
 return {channels,selection:{startSample:start,endSample:start+size}};
}
