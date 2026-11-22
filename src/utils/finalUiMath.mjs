export function beatPulse(sample,bpm,rate,origin=0){
 if(!Number.isFinite(sample)||!Number.isFinite(bpm)||bpm<=0||!Number.isFinite(rate)||rate<=0||!Number.isFinite(origin))return 0;
 const phase=((((sample-origin)*bpm/(rate*60))%1)+1)%1;
 return (1+Math.cos(phase*2*Math.PI))/2;
}
export function loopSelection(point,end){return {startSample:point,endSample:point<end?end:point};}
