export function kickTargets(info:{beatSamples:readonly number[];kickSamples:readonly number[]}|null|undefined):readonly number[];
export function createKickMagnet():{reset():void;snap(sample:number,targets:readonly number[],width:number,length:number,total:number,enabled?:boolean,alt?:boolean):number};
