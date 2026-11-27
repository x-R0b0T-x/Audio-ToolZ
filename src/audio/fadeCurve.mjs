const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const FADE_GAP=.02;
export const FADE_MAX_POINTS=12;
export const FADE_PRESETS=Object.freeze({
 linear:()=>({points:[]}),
 exponential:()=>({points:[{x:.5,y:.2}]}),
 scurve:()=>({points:[{x:.25,y:.12},{x:.5,y:.5},{x:.75,y:.88}]}),
});
export const defaultFade=()=>FADE_PRESETS.scurve();
export const fadeNodes=shape=>[{x:0,y:0},...shape.points,{x:1,y:1}];
export function normalizeFade(shape){
 const src=[...(shape?.points??[])].filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)).sort((a,b)=>a.x-b.x),points=[];
 let px=0,py=0;
 for(const p of src){const x=clamp(p.x,px+FADE_GAP,1-FADE_GAP);if(x<px+FADE_GAP||x>1-FADE_GAP)continue;const y=clamp(p.y,py,1);points.push({x,y});px=x;py=y;}
 return {points};
}
function edgeSlope(h0,h1,d0,d1){
 let m=((2*h0+h1)*d0-h0*d1)/(h0+h1);
 if(Math.sign(m)!==Math.sign(d0))m=0;
 else if(Math.sign(d0)!==Math.sign(d1)&&Math.abs(m)>3*Math.abs(d0))m=3*d0;
 return m;
}
function slopes(nodes){
 const n=nodes.length,h=[],d=[];
 for(let i=0;i<n-1;i++){h[i]=nodes[i+1].x-nodes[i].x;d[i]=(nodes[i+1].y-nodes[i].y)/h[i];}
 const m=new Array(n).fill(0);
 if(n===2){m[0]=m[1]=d[0];return {h,m};}
 for(let i=1;i<n-1;i++){
  if(d[i-1]*d[i]<=0){m[i]=0;continue;}
  const w1=2*h[i]+h[i-1],w2=h[i]+2*h[i-1];
  m[i]=(w1+w2)/(w1/d[i-1]+w2/d[i]);
 }
 m[0]=edgeSlope(h[0],h[1],d[0],d[1]);
 m[n-1]=edgeSlope(h[n-2],h[n-3],d[n-2],d[n-3]);
 return {h,m};
}
function hermite(a,b,h,m0,m1,x){
 const t=clamp((x-a.x)/h,0,1),t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*a.y+(t3-2*t2+t)*h*m0+(-2*t3+3*t2)*b.y+(t3-t2)*h*m1;
}
export function fadeGainIn(shape,x){
 const nodes=fadeNodes(shape),{h,m}=slopes(nodes),p=clamp(x,0,1);let i=0;
 while(i<nodes.length-2&&p>nodes[i+1].x)i++;
 return clamp(hermite(nodes[i],nodes[i+1],h[i],m[i],m[i+1],p),0,1);
}
export const fadeGain=(shape,direction,x)=>fadeGainIn(shape,direction==='out'?1-x:x);
export function addFadePoint(shape,x,y){
 if(shape.points.length>=FADE_MAX_POINTS)return shape;
 const nodes=fadeNodes(shape),px=clamp(x,FADE_GAP,1-FADE_GAP);
 if(nodes.some(n=>Math.abs(n.x-px)<FADE_GAP))return shape;
 let i=0;while(i<nodes.length-2&&px>nodes[i+1].x)i++;
 const points=[...shape.points];
 points.splice(i,0,{x:px,y:clamp(y,nodes[i].y,nodes[i+1].y)});
 return normalizeFade({points});
}
export function moveFadePoint(shape,index,x,y){
 if(!shape.points[index])return shape;
 const nodes=fadeNodes(shape),prev=nodes[index],next=nodes[index+2];
 return {points:shape.points.map((p,i)=>i===index?{x:clamp(x,prev.x+FADE_GAP,next.x-FADE_GAP),y:clamp(y,prev.y,next.y)}:p)};
}
export function removeFadePoint(shape,index){
 if(!shape.points[index])return shape;
 return normalizeFade({points:shape.points.filter((_,i)=>i!==index)});
}
export function bendFadePoint(shape,index,amount){
 if(index<0||index>=shape.points.length)return shape;
 const nodes=fadeNodes(shape),prev=nodes[index],next=nodes[index+2],point=shape.points[index];
 return {points:shape.points.map((p,i)=>i===index?{x:point.x,y:clamp(point.y+amount*(next.y-prev.y),prev.y,next.y)}:p)};
}
export function fadeGains(shape,direction,length){
 const gains=new Float32Array(length);if(!length)return gains;
 const nodes=fadeNodes(shape),{h,m}=slopes(nodes),last=length-1;let seg=0;
 for(let j=0;j<length;j++){
  const x=last>0?j/last:1;
  while(seg<nodes.length-2&&x>nodes[seg+1].x)seg++;
  gains[direction==='out'?last-j:j]=clamp(hermite(nodes[seg],nodes[seg+1],h[seg],m[seg],m[seg+1],x),0,1);
 }
 return gains;
}
export function applyFadeShape(channels,direction,shape){
 const n=channels[0]?.length??0,gains=fadeGains(normalizeFade(shape),direction,n);
 return channels.map(c=>{const out=new Float32Array(c.length);for(let i=0;i<c.length;i++)out[i]=c[i]*gains[i];return out;});
}
