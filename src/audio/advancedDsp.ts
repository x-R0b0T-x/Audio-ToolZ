import {sections,bandResponse,filterAudio,type EqBand} from './effectsModel.mjs';
export type Band=EqBand;
export const colors = ['#a65de0','#df69b3','#df8762','#d6cb65','#84c866','#61bcb5','#6499df'];
export const frequencies = [63,136,294,632,1363,2936,6324];
export const clamp = (v:number,a:number,b:number) => Math.max(a,Math.min(b,v));
export const bandsDefault = (rate:number):Band[] => frequencies.map(f=>({frequency:Math.min(f,Math.floor(rate*.45)),gainDb:0,q:1,type:'peaking' as const,order:2 as const}));
export function coefficients(b:Band,rate:number){return sections(b,rate)[0]??[1,0,0,0,0];}
export function response(bands:Band[],rate:number,f:number){return bandResponse(bands,rate,f);}
export function equalize(source:Float32Array[],rate:number,bands:Band[]){return filterAudio(source,rate,bands);}
export const CEILING_RANGE={min:-18,max:12} as const;
export type Dynamics = { mode:'limiter'|'compressor';input:number;ceiling:number;threshold:number;ratio:number;knee:number;attack:number;release:number;makeup:number };
export const dynamicsDefault = (mode:Dynamics['mode']='limiter'):Dynamics => ({mode,input:0,ceiling:0,threshold:-6,ratio:4,knee:6,attack:1,release:120,makeup:0});
export type Trace = { input:Float32Array;output:Float32Array;reduction:Float32Array;hop:number };
export function dynamics(source:Float32Array[],rate:number,p:Dynamics) {
 const n=source[0]?.length??0;
 if(!Number.isFinite(rate)||rate<1||source.some(ch=>ch.length!==n)||Object.entries(p).some(([k,v])=>k!=='mode'&&!Number.isFinite(v)))throw new Error('Paramètres audio invalides');
 const out=source.map(()=>new Float32Array(n)),peak=new Float32Array(n),hop=256;
 const trace:Trace={input:new Float32Array(Math.ceil(n/hop)),output:new Float32Array(Math.ceil(n/hop)),reduction:new Float32Array(Math.ceil(n/hop)),hop};
 const input=10**(clamp(p.input,-24,24)/20),makeup=p.mode==='compressor'?10**(clamp(p.makeup,-24,24)/20):1,ceiling=10**(clamp(p.ceiling,CEILING_RANGE.min,CEILING_RANGE.max)/20);
 for(let i=0;i<n;i++)for(const ch of source)peak[i]=Math.max(peak[i],Math.abs(ch[i]*input));
 const ahead=p.mode==='limiter'?Math.ceil(rate*.005):0,q=new Int32Array(ahead+2),size=q.length;
 let head=0,tail=0,next=0,dbGain=0;
 const attack=p.attack<=0?0:Math.exp(-1/Math.max(1,clamp(p.attack,0,100)*rate/1000)),release=Math.exp(-1/Math.max(1,clamp(p.release,10,2000)*rate/1000));
 for(let i=0;i<n;i++){
  while(head!==tail&&q[head]<i)head=(head+1)%size;
  while(next<Math.min(n,i+ahead+1)){while(head!==tail&&peak[q[(tail-1+size)%size]]<=peak[next])tail=(tail-1+size)%size;q[tail]=next++;tail=(tail+1)%size;}
  const level=peak[q[head]],db=20*Math.log10(Math.max(1e-12,level)),over=db-clamp(p.threshold,-60,0),knee=clamp(p.knee,0,24),slope=1/clamp(p.ratio,1,20)-1;
  let target=0;
  if(p.mode==='limiter')target=Math.min(0,20*Math.log10(ceiling/Math.max(1e-12,level)));
  else if(knee>0&&over>-knee/2&&over<knee/2)target=slope*(over+knee/2)**2/(2*knee);
  else if(over>=knee/2)target=slope*over;
  const smoothing=target<dbGain?attack:release;dbGain=smoothing*dbGain+(1-smoothing)*target;
  let gain=10**(dbGain/20);
  // Linked sample-peak safety, not an oversampled true-peak limiter.
  gain=Math.min(gain,ceiling/Math.max(1e-12,peak[i]*makeup));
  const bin=Math.floor(i/hop);trace.input[bin]=Math.max(trace.input[bin],peak[i]);trace.reduction[bin]=Math.max(trace.reduction[bin],-20*Math.log10(Math.max(1e-12,gain)));
  for(let c=0;c<out.length;c++){out[c][i]=source[c][i]*input*gain*makeup;trace.output[bin]=Math.max(trace.output[bin],Math.abs(out[c][i]));}
 }return {channels:out,trace};
}
