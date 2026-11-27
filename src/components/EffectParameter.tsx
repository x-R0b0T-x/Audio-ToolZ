import {signedDb} from '../utils/presentationFormat';
import React, { useEffect, useRef } from 'react';
import {useControlActivity as useActivity} from '../utils/useControlActivity';
import './knobStates.css';
import {KnobTicks} from './KnobTicks';
import { parameterValue, stepParameter, type ParameterSpec } from './effectUiMath';
import {NumericValue} from './NumericValue';
import {useFineSlider} from './useFineSlider';
type Props = { label: string; value: number; initial: number; spec: ParameterSpec; unit?: string; onChange: (v: number) => void; compact?: boolean; displayValue?:number; onDisplayCommit?:(v:number)=>void };
function useWheel(ref: React.RefObject<HTMLDivElement | null>, action: (direction: number, fine: boolean) => void) {
  const callback = useRef(action); callback.current = action;
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const wheel = (e: WheelEvent) => {
      if(e.target instanceof Element&&e.target.closest('.zonyx-value-entry input'))return;
      const delta = e.deltaY || e.deltaX;
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !delta || node.closest('fieldset:disabled,[inert]')) return;
      e.preventDefault(); callback.current(delta < 0 ? 1 : -1, e.shiftKey);
    };
    node.addEventListener('wheel', wheel, { passive: false }); return () => node.removeEventListener('wheel', wheel);
  }, [ref]);
}
export function EffectParameter(p: Props) {
  const ref = useRef<HTMLDivElement>(null), drag = useRef<{ x: number; y: number; fraction: number } | null>(null), s = p.spec, activity = useActivity();
  const fraction = (v: number) => s.logarithmic ? Math.log(v / s.min) / Math.log(s.max / s.min) : (v - s.min) / (s.max - s.min);
  const setFraction = (v: number) => p.onChange(parameterValue(s.logarithmic ? s.min * (s.max / s.min) ** Math.max(0, Math.min(1, v)) : s.min + (s.max - s.min) * v, s));
  const end = () => { drag.current = null; activity.end(); };
  useWheel(ref, (direction, fine) => { activity.pulse(); p.onChange(stepParameter(p.value, direction, fine, s)); });
  return <div ref={ref} className={`zonyx-parameter${p.compact ? ' compact' : ''}${activity.active ? ' is-adjusting' : ''}`}>
    <span>{p.label}</span><button type="button" onDoubleClick={()=>p.onChange(p.initial)} role="slider" aria-label={p.label} aria-valuemin={s.min} aria-valuemax={s.max} aria-valuenow={p.value} aria-valuetext={`${p.displayValue??p.value} ${p.unit ?? ''}`}
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, fraction: Math.max(0, Math.min(1, fraction(p.value))) }; activity.begin(); }}
      onPointerMove={e => { const d = drag.current; if (d) { const delta = (d.y - e.clientY) + (e.clientX - d.x); d.x = e.clientX; d.y = e.clientY; d.fraction = Math.max(0, Math.min(1, d.fraction + delta / (e.shiftKey ? 1600 : 160))); setFraction(d.fraction); } }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onKeyDown={e => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); activity.pulse(); p.onChange(e.key === 'Home' ? p.initial : e.key === 'End' ? s.max : stepParameter(p.value, ['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1, e.shiftKey, s));
      }}><svg viewBox="0 0 64 64" aria-hidden="true">
        <KnobTicks fraction={fraction(p.value)} count={11} center={32} inner={26} outer={30}/>
        <circle cx="32" cy="32" r="21" fill="#533271" stroke="currentColor" strokeWidth="2"/>
        <line x1="32" y1="19" x2="32" y2="11" stroke="#fff" strokeWidth="3" transform={`rotate(${-135 + fraction(p.value) * 270} 32 32)`}/>
      </svg></button>
    <NumericValue label={p.label} value={p.displayValue??p.value} min={s.min} max={s.max} digits={s.digits} signed={p.unit?.startsWith('dB')} onCommit={v=>{activity.pulse();if(p.onDisplayCommit)p.onDisplayCommit(v);else p.onChange(parameterValue(v,s));}}/>
  </div>;
}
export function EffectGain({ label, value, onChange, disabled=false }: { label: string; value: number; onChange: (v: number) => void; disabled?:boolean }) {
  const ref = useRef<HTMLDivElement>(null), activity = useActivity();
  useWheel(ref, (direction, fine) => { if(disabled)return; activity.pulse(); onChange(stepParameter(value, direction, fine, { min: -18, max: 18, step: .5, fine: .1, digits: 1 })); });
  const slider = useFineSlider({ min: -18, max: 18, value, step: .1, fineStep: .01, disabled, onChange, onStart: activity.begin, onEnd: activity.end });
  return <div ref={ref} className={`zonyx-gain${activity.active ? ' is-adjusting' : ''}${disabled?' is-disabled':''}`} onDoubleClick={() => {if(!disabled)onChange(0);}}>
    <div className="zonyx-fader-track" {...slider} style={{ touchAction: 'none' }}><div className="zonyx-fader-ticks" aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <i key={i} className={i === 6 ? 'zero' : ''} style={{ top: `${i * 100 / 12}%` }}>{i === 6 ? <span>0</span> : null}</i>)}</div>
    <input type="range" disabled={disabled} aria-label={label} aria-orientation="vertical" min={-18} max={18} step={.01} value={value} style={{ '--zonyx-f': (value + 18) / 36, pointerEvents: 'none' } as React.CSSProperties} onKeyDown={activity.pulse} onChange={e => onChange(Number(e.target.value))}/></div><output>{signedDb(value,1)}</output>
  </div>;
}
