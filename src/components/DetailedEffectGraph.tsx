import React, { useEffect, useMemo, useRef } from 'react';
import { audioEngine } from '../audio/engine';
import { bandsDefault, colors, clamp, coefficients, type Band, type Dynamics, type Trace } from '../audio/advancedDsp';
import { SourceSpectrum, samplePeak } from './effectUiMath';
type Props = {
  eq: boolean; bands: Band[]; source: Float32Array[]; output: Float32Array[] | null;
  rate: number; params: Dynamics; trace: Trace | null;
  onBandChange: (i: number, patch: Partial<Band>) => void;
};
const gainY = (db: number) => 140 - db * 6;
const levelY = (db: number) => 248 - (clamp(db, -60, 0) + 60) * 3.6;
export function DetailedEffectGraph(props: Props) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props); latest.current = props;
  const dragged = useRef<number | null>(null);
  const max = Math.min(20000, props.rate * .45);
  const frequencyX = (f: number) => 40 + 700 * Math.log(f / 20) / Math.log(max / 20);
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      const point = e.target instanceof Element ? e.target.closest('[data-eq-band]') : null;
      const index = dragged.current ?? (point && host.current?.contains(point) ? Number(point.getAttribute('data-eq-band')) : null);
      if (index === null || e.ctrlKey || e.metaKey || e.altKey || !e.deltaY || host.current?.closest('fieldset:disabled,[inert]')) return;
      const p = latest.current;
      if (!p.eq || !p.bands[index]) return;
      e.preventDefault(); e.stopPropagation();
      const factor = e.shiftKey ? 1.025 : 1.15;
      p.onBandChange(index, { q: Number(clamp(p.bands[index].q * factor ** (e.deltaY < 0 ? 1 : -1), .1, 24).toFixed(3)) });
    };
    window.addEventListener('wheel', wheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', wheel, true);
  }, []);
  useEffect(() => {
    let frame = 0, last = 0;
    const fft = new SourceSpectrum();
    const draw = (now: number) => {
      if (now - last >= 33) {
        last = now;
        const node = canvas.current, context = node?.getContext('2d'), p = latest.current;
        if (node && context) {
          const bounds = node.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
          const w = Math.max(1, Math.round(bounds.width * dpr)), h = Math.max(1, Math.round(bounds.height * dpr));
          if (node.width !== w || node.height !== h) { node.width = w; node.height = h; }
          context.setTransform(w / 780, 0, 0, h / 270, 0, 0);
          context.clearRect(0, 0, 780, 270);
          if (audioEngine.isPlaying) {
            const position = audioEngine.getCurrentSample(), columns = Math.max(350, Math.round(w * 700 / 780));
            if (p.eq) {
              const bins = fft.read(p.source, position), maximum = Math.min(20000, p.rate * .45);
              const gradient = context.createLinearGradient(40, 0, 740, 0);
              colors.forEach((color, i) => gradient.addColorStop(i / 6, color));
              context.fillStyle = gradient; context.strokeStyle = gradient; context.lineWidth = .9;
              context.beginPath(); context.moveTo(40, 248);
              for (let px = 0; px <= columns; px++) {
                const f = 20 * (maximum / 20) ** (px / columns), bin = clamp(f * fft.size / p.rate, 0, bins.length - 1);
                const k = Math.floor(bin), fraction = bin - k;
                const amplitude = bins[k] * (1 - fraction) + (bins[Math.min(k + 1, bins.length - 1)] ?? 0) * fraction;
                const db = 20 * Math.log10(Math.max(1e-6, amplitude));
                context.lineTo(40 + px * 700 / columns, 248 - clamp((db + 84) / 84, 0, 1) * 216);
              }
              context.lineTo(740, 248); context.closePath();
              context.globalAlpha = .48; context.fill(); context.globalAlpha = 1; context.stroke();
            } else if (p.output) {
              const span = p.rate * 6, first = position - span;
              const gradient = context.createLinearGradient(0, 32, 0, 248);
              gradient.addColorStop(0, '#ff7251'); gradient.addColorStop(.4, '#ffbc76'); gradient.addColorStop(1, '#fff2d7');
              context.fillStyle = gradient; context.beginPath(); context.moveTo(40, 248);
              for (let px = 0; px <= columns; px++) {
                const start = first + px * span / columns, end = Math.min(position + 1, start + span / columns);
                const peak = samplePeak(p.output, start, end);
                context.lineTo(40 + px * 700 / columns, levelY(20 * Math.log10(Math.max(1e-6, peak))));
              }
              context.lineTo(740, 248); context.closePath(); context.globalAlpha = .9; context.fill(); context.globalAlpha = 1;
              if (p.trace) {
                context.strokeStyle = '#bd93f9'; context.lineWidth = 1.2; context.beginPath();
                for (let px = 0; px <= columns; px++) {
                  const index = Math.floor((first + px * span / columns) / p.trace.hop);
                  const reduction = p.trace.reduction[index] ?? 0, y = 32 + clamp(reduction, 0, 36) * 4;
                  if (px === 0) context.moveTo(40, y); else context.lineTo(40 + px * 700 / columns, y);
                }
                context.stroke();
              }
            }
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, []);
  const curve = useMemo(() => {
    const filters = props.bands.map(b => coefficients(b, props.rate));
    return Array.from({ length: 1025 }, (_, i) => {
      const f = 20 * (max / 20) ** (i / 1024), w = 2 * Math.PI * f / props.rate;
      const c = Math.cos(w), s = Math.sin(w), c2 = Math.cos(2 * w), s2 = Math.sin(2 * w);
      const db = filters.reduce((sum, [b0, b1, b2, a1, a2]) => sum + 10 * Math.log10(Math.max(1e-20,
        ((b0 + b1 * c + b2 * c2) ** 2 + (b1 * s + b2 * s2) ** 2) / Math.max(1e-20, (1 + a1 * c + a2 * c2) ** 2 + (a1 * s + a2 * s2) ** 2))), 0);
      return `${i ? 'L' : 'M'}${40 + i * 700 / 1024},${clamp(gainY(db), 20, 248)}`;
    }).join(' ');
  }, [props.bands, props.rate, max]);
  const move = (i: number, e: React.PointerEvent<SVGCircleElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = e.currentTarget.ownerSVGElement!.getBoundingClientRect();
    props.onBandChange(i, {
      frequency: Math.round(clamp(20 * (max / 20) ** (((e.clientX - r.left) * 780 / r.width - 40) / 700), 20, max)),
      gainDb: Number(clamp((140 - (e.clientY - r.top) * 270 / r.height) / 6, -18, 18).toFixed(1)),
    });
  };
  const lineDb = props.params.mode === 'limiter' ? props.params.ceiling : props.params.threshold;
  return <div ref={host} className="atz-graph detailed"><canvas ref={canvas} aria-hidden="true"/>
    <svg viewBox="0 0 780 270" preserveAspectRatio="none" aria-label={props.eq ? 'Spectre stéréo et réponse de l’égaliseur' : 'Forme d’onde de sortie, seuil et réduction de gain'}>
      {(props.eq ? [-18, -12, -6, 0, 6, 12, 18] : [0, -12, -24, -36, -48, -60]).map(db => <g key={db}>
        <line x1="40" x2="740" y1={props.eq ? gainY(db) : levelY(db)} y2={props.eq ? gainY(db) : levelY(db)} stroke="#5c4b693b"/>
        <text x="3" y={(props.eq ? gainY(db) : levelY(db)) + 4}>{db}</text>
      </g>)}
      {props.eq ? <>
        {[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(f => f <= max).map(f => <g key={f}>
          <line x1={frequencyX(f)} x2={frequencyX(f)} y1="32" y2="248" stroke="#5c4b692b"/>
          <text x={frequencyX(f)} y="265" textAnchor="middle">{f >= 1000 ? `${f / 1000}k` : f}</text>
        </g>)}
        <path d={curve} fill="none" stroke="#eee5fa" strokeWidth="1.8"/>
        {props.bands.map((b, i) => <g key={i}><circle data-eq-band={i} cx={frequencyX(b.frequency)} cy={gainY(b.gainDb)} r="8" fill="var(--bg-surface)" stroke={colors[i]} strokeWidth="1.8"
          role="slider" tabIndex={0} aria-label={`${b.frequency} Hz, gain`} aria-valuemin={-18} aria-valuemax={18} aria-valuenow={b.gainDb} aria-valuetext={`${b.gainDb} dB, Q ${b.q}`}
          onDoubleClick={() => props.onBandChange(i, bandsDefault(props.rate)[i])}
          onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); dragged.current = i; }}
          onPointerMove={e => move(i, e)} onPointerUp={() => { dragged.current = null; }} onPointerCancel={() => { dragged.current = null; }} onLostPointerCapture={() => { dragged.current = null; }}
          onKeyDown={e => {
            if (e.key === 'Home') { e.preventDefault(); props.onBandChange(i, bandsDefault(props.rate)[i]); }
            else if (['ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); props.onBandChange(i, { gainDb: Number(clamp(b.gainDb + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? .1 : .5), -18, 18).toFixed(1)) }); }
            else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); props.onBandChange(i, { frequency: Math.round(clamp(b.frequency * (e.key === 'ArrowRight' ? 1.02 : 1 / 1.02), 20, max)) }); }
          }}/><text x={frequencyX(b.frequency)} y={gainY(b.gainDb) + 3} textAnchor="middle" style={{ fill: colors[i], pointerEvents: 'none' }}>{i + 1}</text></g>)}
      </> : <g>
        <line x1="40" x2="740" y1={levelY(lineDb)} y2={levelY(lineDb)} stroke="#39ff14" strokeWidth="1.4"/>
        <text x="735" y={levelY(lineDb) - 4} textAnchor="end" style={{ fill: '#baffac' }}>{props.params.mode === 'limiter' ? 'Plafond' : 'Seuil'} {lineDb.toFixed(1)} dB</text>
      </g>}
    </svg>
  </div>;
}
