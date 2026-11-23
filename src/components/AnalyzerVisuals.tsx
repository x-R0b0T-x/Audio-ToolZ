import React from 'react';
import type {VisualAnalyzerMode} from '../audio/types';
import {audioEngine} from '../audio/engine';
import './analyzerVisuals.css';
export const analyzerModes:ReadonlyArray<readonly [VisualAnalyzerMode,string]>=[['oscilloscope','Oscilloscope'],['spectrum','Spectre'],['colored-waveform','Waveforme colorée'],['vectorscope','Vectorscope stéréo'],['spectrogram','Spectrogramme'],['vu-meter','Vumètre à aiguille']];
export function AnalyzerSelect({mode,onChange}:{mode:VisualAnalyzerMode;onChange:(mode:VisualAnalyzerMode)=>void}){
  return <select data-atz-control="visual-mode" aria-label="Visualisation audio" className="atz-analyzer-select" value={mode} onDoubleClick={()=>onChange('oscilloscope')} onChange={event=>{const selected=analyzerModes.find(([id])=>id===event.target.value);if(selected)onChange(selected[0]);}}>{analyzerModes.map(([id,label],index)=><option key={id} value={id}>{index+1}. {label}</option>)}</select>;
}
export function rmsDb(samples:Float32Array):number{
  if(!samples.length)return -60;
  let sum=0;for(const sample of samples)sum+=Number.isFinite(sample)?sample*sample:0;
  return Math.max(-60,Math.min(0,20*Math.log10(Math.max(1e-6,Math.sqrt(sum/samples.length)))));
}
export function smoothNeedle(previous:number,target:number,elapsed:number):number{
  const amount=1-Math.exp(-Math.max(0,Math.min(100,elapsed))/300);
  return previous+(target-previous)*amount;
}
type State={time:number;column:number;needles:number[];history:HTMLCanvasElement};
const states=new WeakMap<HTMLCanvasElement,State>();
export function drawExtraAnalyzer(ctx:CanvasRenderingContext2D,w:number,h:number,mode:VisualAnalyzerMode,running:boolean):boolean{
  if(!['vectorscope','spectrogram','vu-meter'].includes(mode))return false;
  const now=performance.now();
  let state=states.get(ctx.canvas);
  if(!state){state={time:now-16,column:-Infinity,needles:[0,0],history:document.createElement('canvas')};states.set(ctx.canvas,state);}
  const elapsed=now-state.time;state.time=now;
  const stereo=audioEngine.readStereoWaveformSnapshots();
  ctx.save();ctx.lineWidth=1;ctx.font='9px system-ui';
  if(mode==='vectorscope'){
    const cx=w/2,cy=h/2,r=Math.max(1,h/2-12);
    ctx.strokeStyle='#b34dff55';ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
    ctx.fillStyle='#fff';ctx.fillText('G',cx-r-12,cy+3);ctx.fillText('D',cx+r+5,cy+3);ctx.fillText('M',cx-3,cy-r-3);
    if(running){
      ctx.beginPath();
      const n=Math.min(stereo.left.length,stereo.right.length),step=Math.max(1,Math.floor(n/512));
      for(let i=0;i<n;i+=step){const l=stereo.left[i]||0,rr=stereo.right[i]||0,x=cx+(l-rr)*r/2,y=cy-(l+rr)*r/2;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}
      ctx.strokeStyle='#39ff14';ctx.shadowColor='#b34dff';ctx.shadowBlur=3;ctx.stroke();
    }
  }else if(mode==='spectrogram'){
    const history=state.history,width=Math.max(1,Math.round(w)),height=Math.max(1,Math.round(h));
    if(history.width!==width||history.height!==height){history.width=width;history.height=height;}
    const paint=history.getContext('2d');
    if(paint&&running&&now-state.column>=40){
      state.column=now;paint.drawImage(history,-1,0);paint.fillStyle='#080a14';paint.fillRect(width-1,0,1,height);
      const spectrum=audioEngine.readStereoSpectrumSnapshots();
      const n=Math.min(spectrum.left.length,spectrum.right.length);
      for(let y=0;y<height;y++){
        const bin=Math.min(n-1,Math.max(0,Math.floor(Math.pow(Math.max(2,n),1-y/height))-1));
        const level=n?Math.max(spectrum.left[bin]||0,spectrum.right[bin]||0)/255:0;
        if(level<.02)continue;
        paint.fillStyle=`rgba(${Math.round(57+122*level)},${Math.round(255-178*level)},${Math.round(20+235*level)},${level})`;
        paint.fillRect(width-1,y,1,1);
      }
    }
    ctx.drawImage(history,0,0,w,h);ctx.fillStyle='#fff';ctx.fillText('Fréquences ↑',6,12);
  }else{
    const channels=[stereo.left,stereo.right],colors=['#39ff14','#b34dff'];
    for(let side=0;side<2;side++){
      const pane=w/2,cx=pane*(side+.5),cy=h-9,r=Math.max(1,Math.min(pane*.42,h*.78));
      const target=running?Math.max(0,(rmsDb(channels[side])+48)/48):0;
      state.needles[side]=smoothNeedle(state.needles[side],target,elapsed);
      ctx.shadowBlur=0;ctx.strokeStyle=colors[side]+'88';ctx.beginPath();ctx.arc(cx,cy,r,-5*Math.PI/6,-Math.PI/6);ctx.stroke();
      for(let tick=0;tick<=4;tick++){
        const angle=(-150+30*tick)*Math.PI/180;
        ctx.strokeStyle='#ffffffaa';ctx.beginPath();ctx.moveTo(cx+Math.cos(angle)*(r-5),cy+Math.sin(angle)*(r-5));ctx.lineTo(cx+Math.cos(angle)*r,cy+Math.sin(angle)*r);ctx.stroke();
        ctx.fillStyle='#fff';ctx.fillText(String(-48+12*tick),cx+Math.cos(angle)*(r-15)-6,cy+Math.sin(angle)*(r-15));
      }
      const angle=(-150+120*state.needles[side])*Math.PI/180;
      ctx.strokeStyle=colors[side];ctx.lineWidth=2;ctx.shadowColor=colors[side];ctx.shadowBlur=4;ctx.beginPath();ctx.moveTo(cx,cy);ctx.lineTo(cx+Math.cos(angle)*(r-3),cy+Math.sin(angle)*(r-3));ctx.stroke();ctx.lineWidth=1;ctx.shadowBlur=0;
      ctx.fillStyle='#fff';ctx.fillText(`${side===0?'G':'D'} · RMS dBFS`,cx-32,14);
    }
  }
  ctx.restore();return true;
}
