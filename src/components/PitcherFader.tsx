import {positionSpeed,speedPosition} from './finalFeedbackMath.mjs';
import './finalFeedback.css';
type Props={kind:'speed'|'pitch';value:number;onChange:(value:number)=>void};
export function PitcherFader({kind,value,onChange}:Props){
 const speed=kind==='speed',label=speed?'Vitesse':'Hauteur',position=speed?speedPosition(value):(value+12)/24*100;
 const marks=speed?[.5,.6,.7,.8,.9,1,1.2,1.4,1.6,1.8,2]:Array.from({length:25},(_,i)=>i-12);
 const display=speed?`${value.toLocaleString('fr-FR',{maximumFractionDigits:2})} ×`:`${value>0?'+':''}${value} demi-tons`;
 const set=(coordinate:number)=>onChange(speed?Math.round(positionSpeed(coordinate)*100)/100:Math.round(coordinate/100*24-12));
 return <label className="zonyx-pitcher-fader"><span className="zonyx-pitcher-fader-title">{label}</span><div className="zonyx-pitcher-scale" aria-hidden="true">{marks.map(mark=><span key={mark} style={{left:`${speed?speedPosition(mark):(mark+12)/24*100}%`}}><span>{speed?mark.toLocaleString('fr-FR'):`${mark>0?'+':''}${mark}`}</span><i/></span>)}</div><input className="zonyx-pitcher-horizontal" type="range" aria-label={label} aria-valuetext={display} min={0} max={100} step={speed?1:100/24} value={position} data-zonyx-default="50" onChange={e=>set(Number(e.target.value))} onDoubleClick={e=>{e.preventDefault();onChange(speed?1:0);}} onKeyDown={e=>{if(['ArrowUp','ArrowRight','ArrowDown','ArrowLeft'].includes(e.key)){e.preventDefault();const delta=(e.key==='ArrowUp'||e.key==='ArrowRight'?1:-1)*(speed?(e.shiftKey?.01:.05):1);onChange(Math.max(speed?.5:-12,Math.min(speed?2:12,Math.round((value+delta)*100)/100)));}else if(e.key==='Home'||e.key==='End'){e.preventDefault();onChange(e.key==='Home'?(speed?.5:-12):(speed?2:12));}}}/><output>{display}</output></label>;
}
