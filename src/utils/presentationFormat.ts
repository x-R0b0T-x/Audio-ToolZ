export function signedDb(value:number,digits=1):string{
 const rounded=Number(value.toFixed(digits));
 return `${rounded>0?'+':''}${rounded.toFixed(digits)}`;
}
export function signedDbLabel(text:string):string{
 return text.replace(/(^|\s)(\d+(?:[.,]\d+)?)(?=\s*dB(?:FS)?\b)/g,(full,prefix:string,value:string)=>Number(value.replace(',','.'))>0?`${prefix}+${value}`:full);
}
