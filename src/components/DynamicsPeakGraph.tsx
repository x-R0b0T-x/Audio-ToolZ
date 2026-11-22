import React,{useEffect,useRef} from 'react';
import {audioEngine} from '../audio/engine';
import type {Dynamics,Trace} from '../audio/advancedDsp';
import {PeakTrail} from '../utils/peakTrail';
import {signedDb} from '../utils/presentationFormat';
type Props={original:Float32Array[];output:Float32Array[]|null;offset:number;rate:number;params:Dynamics;trace:Trace|null;scroll:number};
type Session={start:number;segmentLength:number;originalLoop:boolean;previewChannels:Float32Array[]};
export function DynamicsPeakGraph(props:Props){
 const canvas=useRef<HTMLCanvasElement>(null),latest=useRef(props);latest.current=props;
 useEffect(()=>{
  const history=new PeakTrail();let frame=0,last:number|null=null,previousSource:Float32Array[]|null=null;
  const db=(peak:number)=>20*Math.log10(Math.max(1e-9,peak));
  const draw=()=>{
   const p=latest.current,node=canvas.current,ctx=node?.getContext('2d');
   if(node&&ctx){
    if(previousSource!==p.original){history.clear();last=null;previousSource=p.original;}
    const session=(audioEngine as typeof audioEngine&{effectPreviewSession?:Session}).effectPreviewSession;
    const pos=Math.floor(audioEngine.getCurrentSample()),playing=audioEngine.isPlaying;
    const output=session?.previewChannels??p.output,offset=session?0:p.offset;
    const append=(start:number,count:number,direction=1)=>history.append(p.original,output,start,Math.min(count,Math.ceil(p.rate*.25)),p.rate,offset,p.trace?.reduction,p.trace?.hop??256,p.offset,direction);
    if(playing){
     if(last===null)append(Math.max(0,pos-Math.ceil(p.rate/60)),Math.min(pos,Math.ceil(p.rate/60)));
     else if(pos>=last&&pos-last<=p.rate*.25)append(last,pos-last);
     else if(pos<last&&session?.originalLoop&&last>=session.start&&last<session.start+session.segmentLength&&pos>=session.start){append(last,session.start+session.segmentLength-last);append(session.start,pos-session.start);}
     else if(pos<last&&last-pos<=p.rate*.25)append(last,last-pos,-1);
     else history.clear();
     last=pos;
    }else last=null;
    const r=node.getBoundingClientRect(),dpr=window.devicePixelRatio||1;
    if(node.width!==Math.round(r.width*dpr)||node.height!==Math.round(r.height*dpr)){node.width=Math.round(r.width*dpr);node.height=Math.round(r.height*dpr);}
    ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,r.width,r.height);
    const left=50,top=60,width=Math.max(1,r.width-left-12),height=Math.max(1,r.height-top-24),minimum=-18,maximum=12,span=6/2**p.scroll;
    const y=(value:number)=>top+(maximum-Math.max(minimum,Math.min(maximum,value)))/(maximum-minimum)*height;
    ctx.font='11px system-ui';ctx.textBaseline='alphabetic';
    for(let value=minimum;value<=maximum;value+=3){ctx.fillStyle='#fff';ctx.fillText(signedDb(value,0),5,y(value)+4);ctx.fillStyle='#ffffff18';ctx.fillRect(left,y(value),width,1);}
    const rows=history.read(span),seconds=rows.reduce((sum,row)=>sum+row.seconds,0),recent=rows[rows.length-1];
    ctx.save();ctx.beginPath();ctx.rect(left,top,width,height);ctx.clip();
    const curve=(key:'input'|'output'|'reduction',color:string,fill=false)=>{
     let time=-seconds;ctx.beginPath();
     rows.forEach((row,index)=>{time+=row.seconds;const x=left+width*(1+time/span),value=key==='reduction'?-row[key]:db(row[key]);if(index===0)ctx.moveTo(x,y(value));else ctx.lineTo(x,y(value));});
     ctx.strokeStyle=color;ctx.lineWidth=key==='output'?1.8:1.2;ctx.stroke();
     if(fill&&rows.length){ctx.lineTo(left+width,y(minimum));ctx.lineTo(left+width*(1-seconds/span),y(minimum));ctx.closePath();ctx.fillStyle='#b566ff28';ctx.fill();}
    };
    curve('output','#c985ff',true);curve('input','#f5f5f5');curve('reduction','#85eaff');
    const line=(value:number,color:string,dashed=false)=>{if(value<minimum||value>maximum)return;ctx.strokeStyle=color;ctx.lineWidth=1.4;ctx.setLineDash(dashed?[5,4]:[]);ctx.beginPath();ctx.moveTo(left,y(value));ctx.lineTo(left+width,y(value));ctx.stroke();ctx.setLineDash([]);};
    line(p.params.input,'#ffb45e');line(p.params.ceiling,'#39ff14');if(p.params.mode==='compressor')line(p.params.threshold,'#66aaff',true);
    ctx.restore();
    const peakText=(value:number|undefined)=>value&&value>0?signedDb(db(value),1):'−∞';
    ctx.fillStyle='#f5f5f5';ctx.fillText(`Entrée ${peakText(recent?.input)} dBFS`,left,13);
    ctx.fillStyle='#c985ff';ctx.fillText(`Sortie ${peakText(recent?.output)} dBFS`,left+width*.42,13);
    ctx.fillStyle='#85eaff';ctx.fillText(`Réduction ${signedDb(-(recent?.reduction??0),1)} dB`,left,29);
    ctx.fillStyle='#39ff14';ctx.textAlign='right';ctx.fillText(`Plafond ${signedDb(p.params.ceiling,1)} dBFS`,left+width,29);ctx.textAlign='left';
    ctx.fillStyle='#ffb45e';ctx.fillText(`Gain ${signedDb(p.params.input,1)} dB`,left,46);
    if(p.params.mode==='compressor'){ctx.fillStyle='#66aaff';ctx.textAlign='right';ctx.fillText(`Seuil ${signedDb(p.params.threshold,1)} dBFS${p.params.threshold<minimum?' ↓ hors échelle':''}`,left+width,46);ctx.textAlign='left';}
    ctx.fillStyle='#fff';ctx.fillText(`−${span.toFixed(2)} s`,left,r.height-5);ctx.textAlign='right';ctx.fillText('0 s',left+width,r.height-5);ctx.textAlign='left';
   }
   frame=requestAnimationFrame(draw);
  };
  frame=requestAnimationFrame(draw);return()=>cancelAnimationFrame(frame);
 },[]);
 return <div className="atz-graph-block"><div className="atz-graph detailed"><canvas ref={canvas} role="img" aria-label="Crêtes d’entrée et de sortie, réduction de gain, seuil et plafond en temps réel"/></div></div>;
}
