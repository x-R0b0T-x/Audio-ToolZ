export function balanceGains(pan){
 const value=Number.isFinite(pan)?Math.max(-1,Math.min(1,pan)):0;
 return [Math.min(1,1-value),Math.min(1,1+value)];
}
export function overviewRange(total,start,length){
 if(!Number.isFinite(total)||total<1)return [0,0];
 const size=Math.max(1,Math.min(total,Math.round(length)));
 const left=Math.max(0,Math.min(total-size,Math.round(start)));
 return [left,left+size];
}
export function overviewZoom(total,start,end,delta){
 const old=end-start;
 const size=Math.max(Math.min(64,total),Math.min(total,Math.round(old*Math.exp(Math.max(-240,Math.min(240,delta))*.0022))));
 return overviewRange(total,(start+end-size)/2,size);
}
export function overviewPan(total,start,length,dx,width,threshold=3){
 if(!Number.isFinite(total)||!Number.isFinite(start)||!Number.isFinite(length)||!Number.isFinite(dx)||!Number.isFinite(width)||width<=0||Math.abs(dx)<threshold)return null;
 return overviewRange(total,start+dx*total/width,length);
}
export function kickPulseAt(sample,rate,kicks){
 if(!Number.isFinite(sample)||!Number.isFinite(rate)||rate<=0||!kicks.length)return 0;
 let low=0,high=kicks.length;
 while(low<high){const mid=(low+high)>>>1;if(kicks[mid]<=sample)low=mid+1;else high=mid;}
 let pulse=0;
 if(low){const age=(sample-kicks[low-1])/rate;if(age>=0&&age<.22)pulse=(1+Math.cos(Math.PI*age/.22))/2;}
 if(low<kicks.length){const ahead=(kicks[low]-sample)/rate;if(ahead<.03)pulse=Math.max(pulse,(1+Math.cos(Math.PI*ahead/.03))/2);}
 return pulse;
}
export function smoothPulse(current,target,elapsed){
 const seconds=Math.max(0,Math.min(.1,elapsed));
 return current+(target-current)*(1-Math.exp(-seconds/(target>current?.018:.065)));
}
