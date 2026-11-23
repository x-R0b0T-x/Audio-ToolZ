export function balanceGains(pan:number):[number,number];
export function overviewRange(total:number,start:number,length:number):[number,number];
export function overviewZoom(total:number,start:number,end:number,delta:number):[number,number];
export function overviewPan(total:number,start:number,length:number,dx:number,width:number,threshold?:number):[number,number]|null;
export function kickPulseAt(sample:number,rate:number,kicks:readonly number[]):number;
export function smoothPulse(current:number,target:number,elapsed:number):number;
