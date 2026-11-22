const green=(a,i)=>a[i+3]>32&&a[i+1]>90&&a[i+1]>a[i]*1.3&&a[i+1]>a[i+2]*1.15;
export function isolateGreenRing(rgba,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<8||height<8||rgba.length!==width*height*4)return null;
 const all=[];for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(green(rgba,(y*width+x)*4))all.push([x,y]);
 if(all.length<24)return null;
 const stride=Math.max(1,Math.ceil(all.length/1400)),points=all.filter((_,i)=>i%stride===0),tolerance=Math.max(1.5,Math.min(width,height)*.012);
 let seed=731,best=null,bestScore=0;
 const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};
 for(let n=0;n<240;n++){
  const [ax,ay]=points[Math.floor(random()*points.length)],[bx,by]=points[Math.floor(random()*points.length)],[dx,dy]=points[Math.floor(random()*points.length)];
  const d=2*(ax*(by-dy)+bx*(dy-ay)+dx*(ay-by));if(Math.abs(d)<1e-6)continue;
  const aa=ax*ax+ay*ay,bb=bx*bx+by*by,dd=dx*dx+dy*dy;
  const cx=(aa*(by-dy)+bb*(dy-ay)+dd*(ay-by))/d,cy=(aa*(dx-bx)+bb*(ax-dx)+dd*(bx-ax))/d,radius=Math.hypot(ax-cx,ay-cy);
  if(cx<0||cx>=width||cy<0||cy>=height||radius<Math.min(width,height)*.16||radius>Math.min(width,height)*.75)continue;
  let count=0;const bins=new Set();
  for(const [x,y] of points)if(Math.abs(Math.hypot(x-cx,y-cy)-radius)<=tolerance){count++;bins.add(Math.floor((Math.atan2(y-cy,x-cx)+Math.PI)*32/(2*Math.PI)));}
  const score=count*Math.min(1,bins.size/20);
  if(bins.size>=10&&count>=Math.max(20,points.length*.08)&&score>bestScore){bestScore=score;best={cx,cy,radius};}
 }
 if(!best)return null;
 const band=tolerance*1.8,alpha=new Uint8ClampedArray(width*height);let ringN=0,ringG=0,innerN=0,innerG=0;
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=(y*width+x)*4,delta=Math.hypot(x-best.cx,y-best.cy)-best.radius,g=green(rgba,i);
  if(Math.abs(delta)<=band){ringN++;if(g){ringG++;alpha[y*width+x]=Math.round(rgba[i+3]*Math.min(1,(rgba[i+1]-Math.max(rgba[i],rgba[i+2]))/120));}}
  else if(Math.abs(delta+band*3)<=band){innerN++;if(g)innerG++;}
 }
 if(!ringN||ringG/ringN<.12||(innerN&&innerG/innerN>ringG/ringN*.8))return null;
 return {...best,alpha};
}
