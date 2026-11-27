import {useRef} from 'react';
import type React from 'react';
type Options={min:number;max:number;value:number;step:number;fineStep:number;disabled?:boolean;onChange:(v:number)=>void;onStart?:()=>void;onEnd?:()=>void};
export const roundTo=(v:number,step:number)=>Number((Math.round(v/step)*step).toFixed(6));
export function useFineSlider(o:Options){
 const drag=useRef<{y:number;acc:number}|null>(null);
 const end=()=>{if(drag.current){drag.current=null;o.onEnd?.();}};
 return {
  onPointerDown:(e:React.PointerEvent<HTMLElement>)=>{if(o.disabled||e.button!==0)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);e.currentTarget.querySelector('input')?.focus();drag.current={y:e.clientY,acc:o.value};o.onStart?.();},
  onPointerMove:(e:React.PointerEvent<HTMLElement>)=>{const d=drag.current;if(!d)return;const h=e.currentTarget.getBoundingClientRect().height||144,dy=d.y-e.clientY;d.y=e.clientY;d.acc=Math.max(o.min,Math.min(o.max,d.acc+dy/h*(o.max-o.min)*(e.shiftKey?.1:1)));o.onChange(Math.max(o.min,Math.min(o.max,roundTo(d.acc,e.shiftKey?o.fineStep:o.step))));},
  onPointerUp:end,onPointerCancel:end,onLostPointerCapture:end,
 };
}
