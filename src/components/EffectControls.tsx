import React, { useEffect, useRef } from 'react';
import { audioEngine } from '../audio/engine';

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
          if (hold[side] > 0.02) { ctx.fillStyle = hold[side] > 0.85 ? color('--meter-high', '#f43f5e') : '#ffffff'; ctx.fillRect(x, 149 - hold[side] * 137, 9, 2); }
          ctx.font = '9px monospace'; ctx.fillStyle = color('--text-muted', '#6c76a3'); ctx.fillText(side ? 'D' : 'G', x + 1, 161);
        });
        ctx.font = '8px monospace'; ctx.fillStyle = color('--text-muted', '#6c76a3');
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
export const Fader: React.FC<FaderProps> = (p) => <div className="flex flex-col items-center gap-2 min-w-0">
  <span className="text-xs font-semibold">{p.label}</span><span className="text-[10px] text-[var(--text-muted)]">{p.detail || ' '}</span>
  <div className="flex items-center gap-2" onDoubleClick={(e) => { e.preventDefault(); p.onChange(p.defaultValue); }} title="Double-clic : valeur par défaut">
    <input type="range" aria-label={p.label} min={p.min} max={p.max} step={p.step} value={p.value}
      onChange={(e) => p.onChange(Number(e.target.value))} className="studio-fader-vertical cursor-pointer"
      style={{ writingMode: 'vertical-lr', direction: 'rtl', height: 144, width: 28, accentColor: '#45f882' }} />
    <EffectMeter />
  </div><output className="text-xs font-mono-tabular text-[var(--accent-secondary)]">{p.display}</output>
</div>;

interface KnobProps { label: string; value: number; max: number; defaultValue: number; display: string; onChange: (value: number) => void; }
export const Knob: React.FC<KnobProps> = (p) => {
  const drag = useRef<{ x: number; y: number; value: number } | null>(null);
  const set = (v: number) => p.onChange(Math.max(0, Math.min(p.max, Math.round(v))));
  const angle = -135 + p.value / Math.max(1, p.max) * 270;
  return <div className="flex flex-col items-center gap-2 min-w-0">
    <span className="text-xs font-semibold">{p.label}</span>
    <div role="slider" tabIndex={0} aria-label={p.label} aria-valuemin={0} aria-valuemax={p.max} aria-valuenow={p.value} aria-valuetext={p.display}
      title="Glisser pour régler ; double-clic : valeur par défaut" style={{ touchAction: 'none', cursor: 'ns-resize' }}
      onPointerDown={(e) => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, value: p.value }; }}
      onPointerMove={(e) => { const d = drag.current; if (d) set(d.value + ((d.y - e.clientY) + (e.clientX - d.x)) / 5); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onDoubleClick={() => set(p.defaultValue)} onKeyDown={(e) => {
        if (['ArrowUp', 'ArrowRight', 'ArrowDown', 'ArrowLeft', 'Home', 'End'].includes(e.key)) {
          e.preventDefault(); set(e.key === 'Home' ? 0 : e.key === 'End' ? p.max : p.value + (e.key === 'ArrowUp' || e.key === 'ArrowRight' ? 1 : -1));
        }
      }}>
      <svg width="100" height="100" viewBox="0 0 100 100" aria-hidden="true">
        {Array.from({ length: p.max + 1 }, (_, i) => {
          const a = (-135 + i / Math.max(1, p.max) * 270) * Math.PI / 180;
          return <line key={i} x1={50 + Math.sin(a) * 38} y1={50 - Math.cos(a) * 38} x2={50 + Math.sin(a) * 45} y2={50 - Math.cos(a) * 45} stroke={i <= p.value ? '#45f882' : 'var(--text-muted)'} strokeWidth="2" />;
        })}
        <circle cx="50" cy="50" r="30" fill="var(--bg-elevated)" stroke="var(--border-strong)" strokeWidth="2" />
        <line x1="50" y1="50" x2="50" y2="25" stroke="#45f882" strokeWidth="3" strokeLinecap="round" transform={`rotate(${angle} 50 50)`} />
      </svg>
    </div><output className="text-[11px] text-center text-[var(--accent-secondary)]">{p.display}</output>
  </div>;
};
