export function loopBoundaryHit(x:number,left:number,right:number,start:number,end:number,a:number,b:number):'resize-start'|'resize-end'|null{
  if(b<=a||right<=left||end<=start)return null;
  const px=(sample:number)=>left+(sample-start)*(right-left)/(end-start);
  const distance=(position:number)=>position>=left&&position<=right?Math.abs(x-position):Infinity;
  const d0=distance(px(a)),d1=distance(px(b));
  return Math.min(d0,d1)>9?null:d1<d0?'resize-end':'resize-start';
}
