export const ROBOT_PULSE_SCALE=1.7;
const FULL={left:0,top:0,width:1,height:1};
function usable(b){
 return Boolean(b)&&[b.left,b.top,b.width,b.height].every(Number.isFinite)&&b.width>0&&b.height>0&&b.left>=0&&b.top>=0&&b.left+b.width<=1.000001&&b.top+b.height<=1.000001;
}
export function alphaBounds(data,width,height,threshold=24){
 if(!data||!Number.isFinite(width)||!Number.isFinite(height)||width<1||height<1||data.length<width*height*4)return {...FULL};
 let minX=width,minY=height,maxX=-1,maxY=-1;
 for(let y=0;y<height;y++){
  const row=y*width*4;
  for(let x=0;x<width;x++){
   if(data[row+x*4+3]>threshold){if(x<minX)minX=x;if(x>maxX)maxX=x;if(y<minY)minY=y;if(y>maxY)maxY=y;}
  }
 }
 if(maxX<minX||maxY<minY)return {...FULL};
 return {left:minX/width,top:minY/height,width:(maxX-minX+1)/width,height:(maxY-minY+1)/height};
}
export function fitRobot(bounds,targetHeight,slotWidth,pulse=ROBOT_PULSE_SCALE){
 const b=usable(bounds)?bounds:FULL;
 if(!(targetHeight>0)||!(slotWidth>0))return {size:120,dx:0,dy:0,ox:50,oy:50,room:24};
 const size=Math.max(48,Math.min(420,Math.min(targetHeight/b.height,slotWidth/b.width)));
 const cx=b.left+b.width/2,cy=b.top+b.height/2;
 return {size,dx:(.5-cx)*size,dy:(.5-cy)*size,ox:cx*100,oy:cy*100,room:Math.ceil(Math.max(0,(pulse-1)/2)*b.height*size)+6};
}
