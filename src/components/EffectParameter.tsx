import React, { useEffect, useRef, useState } from 'react';
import { parameterValue, stepParameter, type ParameterSpec } from './effectUiMath';
type Props = { label: string; value: number; initial: number; spec: ParameterSpec; unit?: string; onChange: (v: number) => void; compact?: boolean };
function useActivity() {
  const [active, setActive] = useState(false), timer = useRef<ReturnType<typeof setTimeout> | null>(null), held = useRef(false);
  const clear = () => { if (timer.current !== null) clearTimeout(timer.current); };
  useEffect(() => () => clear(), []);
  return { active, begin: () => { clear(); held.current = true; setActive(true); }, end: () => { held.current = false; clear(); setActive(false); }, pulse: () => { clear(); setActive(true); if (!held.current) timer.current = setTimeout(() => setActive(false), 180); } };
}
function useWheel(ref: React.RefObject<HTMLDivElement | null>, action: (direction: number, fine: boolean) => void) {
  const callback = useRef(action); callback.current = action;
  useEffect(() => {
    const node = ref.current; if (!node) return;
    const wheel = (e: WheelEvent) => {
      if (e.defaultPrevented || e.ctrlKey || e.metaKey || e.altKey || !e.deltaY || node.closest('fieldset:disabled,[inert]')) return;
      e.preventDefault(); callback.current(e.deltaY < 0 ? 1 : -1, e.shiftKey);
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
  return <div ref={ref} className={`atz-parameter${p.compact ? ' compact' : ''}${activity.active ? ' is-adjusting' : ''}`} onDoubleClick={() => p.onChange(p.initial)}>
    <span>{p.label}</span><button type="button" role="slider" aria-label={p.label} aria-valuemin={s.min} aria-valuemax={s.max} aria-valuenow={p.value} aria-valuetext={`${p.value} ${p.unit ?? ''}`} title="Glisser ou molette · Maj : réglage fin · Double-clic : valeur initiale"
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, fraction: fraction(p.value) }; activity.begin(); }}
      onPointerMove={e => { const d = drag.current; if (d) setFraction(d.fraction + (d.y - e.clientY + e.clientX - d.x) / (e.shiftKey ? 1600 : 160)); }}
      onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}
      onKeyDown={e => {
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return;
        e.preventDefault(); activity.pulse(); p.onChange(e.key === 'Home' ? p.initial : e.key === 'End' ? s.max : stepParameter(p.value, ['ArrowUp', 'ArrowRight'].includes(e.key) ? 1 : -1, e.shiftKey, s));
      }}><svg viewBox="0 0 64 64" aria-hidden="true">
        {Array.from({ length: 11 }, (_, i) => { const a = (-135 + i * 27) * Math.PI / 180; return <line key={i} x1={32 + 26 * Math.sin(a)} y1={32 - 26 * Math.cos(a)} x2={32 + 30 * Math.sin(a)} y2={32 - 30 * Math.cos(a)} stroke="currentColor"/>; })}
        <circle cx="32" cy="32" r="21" fill="#533271" stroke="currentColor" strokeWidth="2"/>
        <line x1="32" y1="19" x2="32" y2="11" stroke="#fff" strokeWidth="3" transform={`rotate(${-135 + fraction(p.value) * 270} 32 32)`}/>
      </svg></button>
    <input type="number" aria-label={`${p.label} valeur`} min={s.min} max={s.max} step={s.fine} value={p.value} onChange={e => { if (e.target.value !== '') { activity.pulse(); p.onChange(parameterValue(Number(e.target.value), s)); } }}/>
  </div>;
}
export function EffectGain({ label, value, onChange, disabled=false }: { label: string; value: number; onChange: (v: number) => void; disabled?:boolean }) {
  const ref = useRef<HTMLDivElement>(null), activity = useActivity();
  useWheel(ref, (direction, fine) => { if(disabled)return; activity.pulse(); onChange(stepParameter(value, direction, fine, { min: -18, max: 18, step: .5, fine: .1, digits: 1 })); });
  return <div ref={ref} className={`atz-gain${activity.active ? ' is-adjusting' : ''}${disabled?' is-disabled':''}`} onDoubleClick={() => {if(!disabled)onChange(0);}}>
    <div className="atz-fader-track"><div className="atz-fader-ticks" aria-hidden="true">{Array.from({ length: 13 }, (_, i) => <i key={i} className={i === 6 ? 'zero' : ''} style={{ top: `${i * 100 / 12}%` }}>{i === 6 ? <span>0</span> : null}</i>)}</div>
    <input type="range" disabled={disabled} aria-label={label} aria-orientation="vertical" min={-18} max={18} step={.1} value={value} style={{ '--atz-f': (value + 18) / 36 } as React.CSSProperties} onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); activity.begin(); }} onPointerUp={activity.end} onPointerCancel={activity.end} onLostPointerCapture={activity.end} onKeyDown={activity.pulse} onChange={e => onChange(Number(e.target.value))}/></div><output>{value.toFixed(1)}</output>
  </div>;
}
