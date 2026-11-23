export type PeakRow={seconds:number;input:number;output:number;reduction:number};
export class PeakTrail{
 private rows:PeakRow[]=[];
 private seconds=0;
 clear(){this.rows=[];this.seconds=0;}
 append(input:Float32Array[],output:Float32Array[]|null,start:number,count:number,rate:number,offset=0,reduction?:Float32Array,hop=256,traceOffset=offset,direction=1){
  const total=input[0]?.length??0,n=Math.max(0,Math.floor(count));if(!total||!n||rate<=0)return;
  let inputPeak=0,outputPeak=0,cut=0;
  for(let k=0;k<n;k++){
   const sample=Math.floor(start)+k*direction;if(sample<0||sample>=total)continue;
   const relative=sample-offset;
   for(let c=0;c<Math.min(2,input.length);c++){
    const raw=input[c][sample]??0,processed=output?.[c]??output?.[0];
    const value=processed&&relative>=0&&relative<processed.length?processed[relative]:raw;
    inputPeak=Math.max(inputPeak,Math.abs(raw));outputPeak=Math.max(outputPeak,Math.abs(value));
   }
   const index=Math.floor((sample-traceOffset)/Math.max(1,hop));cut=Math.max(cut,reduction?.[index]??0);
  }
  const row={seconds:n/rate,input:inputPeak,output:outputPeak,reduction:Math.max(0,cut)};
  this.rows.push(row);this.seconds+=row.seconds;
  while(this.seconds>50&&this.rows.length>1)this.seconds-=this.rows.shift()!.seconds;
 }
 read(span:number){let elapsed=0,index=this.rows.length;while(index>0&&elapsed<span)elapsed+=this.rows[--index].seconds;return this.rows.slice(index);}
}
export function restartAfterLoop(looping:boolean,point:number,start:number,end:number,nearBoundary=false){return looping&&end>start&&point>end&&!nearBoundary;}
