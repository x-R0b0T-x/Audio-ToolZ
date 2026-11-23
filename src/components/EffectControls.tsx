import {signedDbLabel} from '../utils/presentationFormat';
import React, { useEffect, useRef } from 'react';
import {useControlActivity} from '../utils/useControlActivity';
import './knobStates.css';
import { audioEngine } from '../audio/engine';
import type { DelayMode } from '../audio/musicalDelay';

export const EffectMeter: React.FC = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    let frame = 0;
    const hold = [0, 0], times = [0, 0];
    const draw = (now: number) => {
      const canvas = ref.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const dpr = window.devicePixelRatio || 1;
        if (canvas.width !== Math.round(54 * dpr) || canvas.height !== Math.round(164 * dpr)) {
          canvas.width = Math.round(54 * dpr); canvas.height = Math.round(164 * dpr);
        }
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        const style = getComputedStyle(window.document.documentElement);
        const color = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
        ctx.fillStyle = color('--wave-bg', '#080a14'); ctx.fillRect(0, 0, 54, 164);
        const levels = audioEngine.readLiveMeters();
        [levels.leftPeak, levels.rightPeak].forEach((peak, side) => {
          const db = peak > 1e-5 ? Math.max(-60, 20 * Math.log10(peak)) : -60;
          const value = Math.max(0, Math.min(1, (db + 60) / 60));
          if (value >= hold[side] || now - times[side] > 900) { hold[side] = value; times[side] = now; }
          else hold[side] = Math.max(0, hold[side] - 0.015);
          const x = 22 + side * 13;
          for (let i = 0; i < 18; i++) {
            ctx.globalAlpha = i < Math.round(value * 18) ? 1 : 0.4;
            ctx.fillStyle = i < Math.round(value * 18)
              ? i / 18 > 0.85 ? color('--meter-high', '#f43f5e') : i / 18 > 0.65 ? color('--meter-mid', '#fbbf24') : color('--meter-low', '#34d399')
              : color('--border-subtle', '#272f54');
            ctx.fillRect(x, 143 - i * 7.6, 9, 6.1);
          }
          ctx.globalAlpha = 1;
          if (hold[side] > 0.02) { ctx.fillStyle = hold[side] > 0.85 ? color('--meter-high', '#f43f5e') : '#45f882'; ctx.fillRect(x, 149 - hold[side] * 137, 9, 2); }
          ctx.font = '9px monospace'; ctx.fillStyle = color('--text-muted', '#83cba0'); ctx.fillText(side ? 'D' : 'G', x + 1, 161);
        });
        ctx.font = '8px monospace'; ctx.fillStyle = color('--text-muted', '#83cba0');
        [0, -12, -24, -36, -48, -60].forEach((db) => ctx.fillText(String(db), 0, 14 + (-db / 60) * 133));
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={ref} style={{ width: 54, height: 164, flexShrink: 0 }} role="img" aria-label="Niveau de sortie stéréo G/D, de moins 60 à zéro dBFS" />;
};
interface FaderProps {
  label: string; detail?: string; value: number; defaultValue: number;
  min: number; max: number; step: number; display: string; onChange: (value: number) => void;
}
export const Fader: React.FC<FaderProps> = (p) => <div className="flex flex-col items-center gap-2 min-w-0"
  onDoubleClick={(e) => { e.preventDefault(); p.onChange(p.defaultValue); }} title="Double-clic : valeur par défaut">
  <span className="text-xs font-semibold">{p.label}</span><span className="text-[10px] text-[var(--text-muted)]">{p.detail || ' '}</span>
  <div className="flex items-center gap-2">
    <input type="range" aria-label={p.label} min={p.min} max={p.max} step={p.step} value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))} className="studio-fader-vertical cursor-pointer"
      style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 144, width: 28, accentColor: '#45f882' }} />
    <EffectMeter />
  </div><output className="text-xs font-mono-tabular text-[var(--accent-secondary)]">{signedDbLabel(p.display)}</output>
</div>;
interface KnobProps { label: string; value: number; min?: number; max: number; step?: number; ticks?: number; defaultValue: number; display: string; onChange: (value: number) => void; small?: boolean; disabled?: boolean; }
export const Knob: React.FC<KnobProps> = (p) => {
  const drag = useRef<{ x: number; y: number; value: number } | null>(null);
  const activity=useControlActivity();
  const min = p.min ?? 0;
  const range = Math.max(1, p.max - min);
  const set = (v: number) => { if (!p.disabled) { activity.pulse(); p.onChange(Math.round(Math.max(min, Math.min(p.max, v)))); } };
  const fraction = (p.value - min) / range;
  const angle = -135 + fraction * 270;
  const tickCount = p.ticks ?? (Math.min(20, range) + 1);
  const bipolar = min < 0 && p.max > 0;
  const keyStep = p.step ?? 1;
  const pixelsPerUnit = Math.max(0.65, 110 / range);
  return <div className={`atz-knob flex flex-col items-center gap-2 min-w-0${activity.active ? ' is-adjusting' : ''}`} style={{ opacity: p.disabled ? 0.4 : 1 }}
    onDoubleClick={() => set(p.defaultValue)}>
    <span className="text-xs font-semibold">{p.label}</span>
    <div role="slider" tabIndex={p.disabled ? -1 : 0} aria-disabled={p.disabled} aria-label={p.label} aria-valuemin={min} aria-valuemax={p.max} aria-valuenow={p.value} aria-valuetext={p.display}
      style={{ touchAction: 'none', cursor: p.disabled ? 'default' : 'ns-resize' }}
      onPointerDown={(e) => { if (p.disabled || e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, value: p.value }; activity.begin(); }}
      onPointerMove={(e) => { const d = drag.current; if (d) set(d.value + ((d.y - e.clientY) + (e.clientX - d.x)) / pixelsPerUnit); }}
      onPointerUp={() => { drag.current = null; activity.end(); }} onPointerCancel={() => { drag.current = null; activity.end(); }} onLostPointerCapture={() => { drag.current = null; activity.end(); }}
      onKeyDown={(e) => {
        if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
          e.preventDefault();
          set(e.key === 'Home' ? min : e.key === 'End' ? p.max : p.value + (e.key === 'ArrowUp' || e.key === 'ArrowRight' ? keyStep : -keyStep));
        }
      }}>
      <svg width={p.small ? 72 : 100} height={p.small ? 72 : 100} viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: tickCount }, (_, i) => {
          const tickFraction = i / Math.max(1, tickCount - 1);
          const a = (-135 + tickFraction * 270) * Math.PI / 180;
          const active = bipolar
            ? (tickCount === 3
              ? (i === 1 && p.value === 0) || (i === 0 && p.value < 0) || (i === 2 && p.value > 0)
              : fraction <= 0.5 ? (tickFraction >= fraction - 0.02 && tickFraction <= 0.51) : (tickFraction >= 0.49 && tickFraction <= fraction + 0.02))
            : tickFraction <= fraction + 1e-6;
          return <line key={i} x1={50 + Math.sin(a) * 38} y1={50 - Math.cos(a) * 38} x2={50 + Math.sin(a) * 45} y2={50 - Math.cos(a) * 45} stroke="#39ff14" opacity={active?1:.75} strokeWidth={tickCount === 3 && i === 1 ? '2.5' : '2'} />;
        })}
        <circle cx="50" cy="50" r="31" fill="#3d2466" stroke="#bd93f9" strokeWidth="2" />
        <circle cx="50" cy="50" r="27" fill="#7043aa" stroke="#8b5ec6" />
        <line x1="50" y1="29" x2="50" y2="22" stroke="#45f882" strokeWidth="3.5" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
      </svg>
    </div><output className="text-[11px] text-center text-[var(--accent-secondary)]">{signedDbLabel(p.display)}</output>
  </div>;
};
const modes: DelayMode[] = ['mono', 'stereo', 'ping-pong', 'off'];
export const DelayModeSwitch: React.FC<{ value: DelayMode; onChange: (mode: DelayMode) => void }> = ({ value, onChange }) => {
  const index = modes.indexOf(value);
  const updateAt = (element: HTMLElement, y: number) => {
    const box = element.getBoundingClientRect();
    onChange(modes[Math.max(0, Math.min(3, Math.round(((y - box.top - 14) / Math.max(1, box.height - 28)) * 3)))]);
  };
  return <div className="flex justify-center items-center gap-3" onDoubleClick={() => onChange('off')}>
    <div role="slider" tabIndex={0} aria-label="Mode du délai" aria-orientation="vertical" aria-valuemin={0} aria-valuemax={3} aria-valuenow={index} aria-valuetext={value}
      className="atz-delay-switch" style={{ position: 'relative', width: 28, height: 124, borderRadius: 12, background: '#191322', border: '1px solid #9368c8', touchAction: 'none', cursor: 'ns-resize' }}
      onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); updateAt(e.currentTarget, e.clientY); }}
      onPointerMove={(e) => { if (e.currentTarget.hasPointerCapture(e.pointerId)) updateAt(e.currentTarget, e.clientY); }}
      onKeyDown={(e) => { if (['ArrowUp', 'ArrowDown', 'Home', 'End'].includes(e.key)) { e.preventDefault(); onChange(modes[e.key === 'Home' ? 0 : e.key === 'End' ? 3 : Math.max(0, Math.min(3, index + (e.key === 'ArrowDown' ? 1 : -1)))]); } }}>
      <span aria-hidden="true" style={{ position: 'absolute', left: 3, right: 3, height: 22, top: 3 + index * 32, borderRadius: 7, background: '#39ff14', border: '1px solid #9eff8a', boxShadow: '0 0 8px rgba(57, 255, 20, 0.55)', pointerEvents: 'none' }}>
        <span style={{ position: 'absolute', left: 4, right: 4, top: 9, height: 2, background: '#13151c' }} />
      </span>
    </div>
    <div role="group" aria-label="Positions du sélecteur" className="flex flex-col justify-between" style={{ height: 124 }}>
      {modes.map((mode, i) => <button type="button" key={mode} aria-pressed={value === mode} onClick={() => onChange(mode)} className="px-2 text-xs rounded" style={{ color: value === mode ? '#45f882' : 'var(--text-muted)', height: 28 }}>{['Mono', 'Stéréo', 'Ping-pong', 'Off'][i]}</button>)}
    </div>
  </div>;
};
