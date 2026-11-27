const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
export const FADE_GAP=.02;
export const FADE_PRESETS=Object.freeze({
 linear:()=>({points:[],tensions:[0]}),
 exponential:()=>({points:[],tensions:[.6]}),
 scurve:()=>({points:[{x:.5,y:.5}],tensions:[.5,-.5]}),
});
export const defaultFade=()=>FADE_PRESETS.scurve();
export function tensionShape(u,t){const k=2**(3*Math.abs(t));return t>=0?u**k:1-(1-u)**k;}
export function tensionFromMid(v){const m=clamp(v,.02,.98),k=m<=.5?Math.log(m)/Math.log(.5):Math.log(1-m)/Math.log(.5),t=Math.log2(Math.max(1,k))/3;return clamp(m<=.5?t:-t,-1,1);}
export const fadeNodes=shape=>[{x:0,y:0},...shape.points,{x:1,y:1}];
export function normalizeFade(shape){
 const src=[...(shape?.points??[])].filter(p=>Number.isFinite(p?.x)&&Number.isFinite(p?.y)).sort((a,b)=>a.x-b.x),points=[];
 let px=0,py=0;
 for(const p of src){const x=clamp(p.x,px+FADE_GAP,1-FADE_GAP);if(x<px+FADE_GAP||x>1-FADE_GAP)continue;const y=clamp(p.y,py,1);points.push({x,y});px=x;py=y;}
 const tensions=Array.from({length:points.length+1},(_,i)=>clamp(Number.isFinite(shape?.tensions?.[i])?shape.tensions[i]:0,-1,1));
 return {points,tensions};
}
export function fadeGainIn(shape,x){
 const nodes=fadeNodes(shape),p=clamp(x,0,1);let i=0;
 while(i<nodes.length-2&&p>nodes[i+1].x)i++;
 const a=nodes[i],b=nodes[i+1],u=b.x>a.x?(p-a.x)/(b.x-a.x):1;
 return a.y+(b.y-a.y)*tensionShape(clamp(u,0,1),shape.tensions[i]??0);
}
export const fadeGain=(shape,direction,x)=>fadeGainIn(shape,direction==='out'?1-x:x);
export function addFadePoint(shape,x,y){
 const nodes=fadeNodes(shape),px=clamp(x,FADE_GAP,1-FADE_GAP);
 if(nodes.some(n=>Math.abs(n.x-px)<FADE_GAP))return shape;
 let i=0;while(i<nodes.length-2&&px>nodes[i+1].x)i++;
 const py=clamp(y,nodes[i].y,nodes[i+1].y),t=shape.tensions[i]??0,points=[...shape.points];
 points.splice(i,0,{x:px,y:py});
 const tensions=[...shape.tensions];tensions.splice(i,1,t,t);
 return normalizeFade({points,tensions});
}
export function moveFadePoint(shape,index,x,y){
 if(!shape.points[index])return shape;
 const nodes=fadeNodes(shape),prev=nodes[index],next=nodes[index+2];
 const points=shape.points.map((p,i)=>i===index?{x:clamp(x,prev.x+FADE_GAP,next.x-FADE_GAP),y:clamp(y,prev.y,next.y)}:p);
 return {points,tensions:shape.tensions};
}
export function removeFadePoint(shape,index){
 if(!shape.points[index])return shape;
 const points=shape.points.filter((_,i)=>i!==index),tensions=[...shape.tensions];
 tensions.splice(index,2,((tensions[index]??0)+(tensions[index+1]??0))/2);
 return normalizeFade({points,tensions});
}
export function setFadeTension(shape,index,t){
 if(index<0||index>=shape.tensions.length)return shape;
 return {points:shape.points,tensions:shape.tensions.map((v,i)=>i===index?clamp(t,-1,1):v)};
}
export function fadeGains(shape,direction,length){
 const gains=new Float32Array(length);if(!length)return gains;
 const nodes=fadeNodes(shape),last=length-1;let seg=0;
 for(let j=0;j<length;j++){
  const x=last>0?j/last:1;
  while(seg<nodes.length-2&&x>nodes[seg+1].x)seg++;
  const a=nodes[seg],b=nodes[seg+1],u=b.x>a.x?(x-a.x)/(b.x-a.x):1;
  gains[direction==='out'?last-j:j]=a.y+(b.y-a.y)*tensionShape(clamp(u,0,1),shape.tensions[seg]??0);
 }
 return gains;
}
export function applyFadeShape(channels,direction,shape){
 const n=channels[0]?.length??0,gains=fadeGains(normalizeFade(shape),direction,n);
 return channels.map(c=>{const out=new Float32Array(c.length);for(let i=0;i<c.length;i++)out[i]=c[i]*gains[i];return out;});
}
