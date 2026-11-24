export const MASCOT_NAME='ZØNYX';
export const MASCOT_ID='zonyx';
const words=[[65, 84, 88], [65, 84, 90], [90, 48, 78, 89, 88], [90, 79, 78, 89, 88]].map(c=>String.fromCharCode(...c));
const caps=[...new Set([...words,...words.map(w=>w[0]+w.slice(1).toLowerCase())])].sort((a,b)=>b.length-a.length||a.localeCompare(b));
const lower=words.map(w=>w.toLowerCase()).filter(w=>w!==MASCOT_ID);
const legacy=new RegExp(caps.join('|')+'|(?<![A-Za-z0-9])(?:'+lower.join('|')+')','gu');
export const renameLegacyIdentifier=value=>value.replace(legacy,word=>word===word.toLowerCase()?MASCOT_ID:MASCOT_NAME);
const opaque=/(data:[^\s'"<>]*?;base64,[A-Za-z0-9+/_=\r\n-]+|[A-Za-z0-9+/_=-]{120,})/gu;
export const rewriteMascotText=value=>value.split(opaque).map((part,i)=>i%2?part:renameLegacyIdentifier(part)).join('');
export function migrateMascotPreferences(storage){
 const keys=Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(key=>key!==null);let migrated=0;
 for(const oldKey of keys){const key=renameLegacyIdentifier(oldKey);if(key===oldKey)continue;const value=storage.getItem(oldKey);if(value===null)continue;if(storage.getItem(key)===null)storage.setItem(key,value);storage.removeItem(oldKey);migrated++;}
 return migrated;
}
for(const name of ['localStorage','sessionStorage']){try{const storage=globalThis[name];if(storage)migrateMascotPreferences(storage);}catch{/* Keep existing data if access or migration fails */}}
