export function waveLevel(playing,left,right){
  if(!playing||!Number.isFinite(left)||!Number.isFinite(right))return 0;
  const l=Math.max(0,left),r=Math.max(0,right),rms=Math.sqrt((l*l+r*r)/2);
  return rms<=.0001?0:Math.min(1,rms*2.5);
}
export function waveOffset(x,width,phase,level){
  if(!Number.isFinite(x)||!Number.isFinite(width)||!Number.isFinite(phase)||!Number.isFinite(level)||width<=0||x<=0||x>=width||level<=0)return 0;
  const envelope=Math.min(1,x/18)*Math.pow(1-x/width,.65);
  return 12*Math.min(1,level)*envelope*(.8*Math.sin(x/105*Math.PI*2-phase)+.2*Math.sin(x/47*Math.PI*2-phase*1.3));
}
