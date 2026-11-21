import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';
import { bandsDefault, colors, clamp, coefficients, type Band, type Dynamics, type Trace } from '../audio/advancedDsp';
import { SourceSpectrum, samplePeak } from './effectUiMath';
import { EffectParameter } from './EffectParameter';
type Props = { eq: boolean; bands: Band[]; source: Float32Array[]; output: Float32Array[] | null; rate: number; params: Dynamics; trace: Trace | null; onBandChange: (i: number, patch: Partial<Band>) => void };
type Column = { time: number; peak: number; shade: string; reduction: number };
const gainY = (db: number) => 140 - db * 6;
const levelY = (db: number) => 248 - (clamp(db, -12, 0) + 12) * 18;
export function DetailedEffectGraph(props: Props) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [scroll, setScroll] = useState(0), speed = useRef(0); speed.current = scroll;
  const latest = useRef(props); latest.current = props;
  const dragged = useRef<number | null>(null);
  const max = Math.min(20000, props.rate * .45);
  const frequencyX = (f: number) => 40 + 700 * Math.log(f / 20) / Math.log(max / 20);
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      const point = e.target instanceof Element ? e.target.closest('[data-eq-band]') : null;
      const index = dragged.current ?? (point && host.current?.contains(point) ? Number(point.getAttribute('data-eq-band')) : null);
      if (index === null || e.ctrlKey || e.metaKey || e.altKey || !e.deltaY || host.current?.closest('fieldset:disabled,[inert]')) return;
      const p = latest.current; if (!p.eq || !p.bands[index]) return;
      e.preventDefault(); e.stopPropagation();
      p.onBandChange(index, { q: Number(clamp(p.bands[index].q * (e.shiftKey ? 1.025 : 1.15) ** (e.deltaY < 0 ? 1 : -1), .1, 24).toFixed(3)) });
    };
    window.addEventListener('wheel', wheel, { capture: true, passive: false });
    return () => window.removeEventListener('wheel', wheel, true);
  }, []);
  useEffect(() => {
    let frame = 0, last = 0, time = 0, previous: number | null = null;
    const fft = new SourceSpectrum(), history: Column[] = [];
    const wrapped = [new Float32Array(fft.size), new Float32Array(fft.size)];
    const spectrum = (channels: Float32Array[], position: number) => {
      const length = channels[0]?.length ?? 0;
      if (!length || position >= fft.size) return fft.read(channels, position);
      const count = Math.min(2, channels.length);
      for (let c = 0; c < count; c++) for (let i = 0; i < fft.size; i++) wrapped[c][i] = channels[c][((Math.floor(position) - fft.size + i) % length + length) % length];
      return fft.read(wrapped.slice(0, count), fft.size);
    };
    const draw = (now: number) => {
      if (now - last >= 33) {
        const elapsed = last ? Math.min(.25, (now - last) / 1000) : 0; last = now;
        const node = canvas.current, ctx = node?.getContext('2d'), p = latest.current;
        if (node && ctx) {
          const bounds = node.getBoundingClientRect(), dpr = Math.min(3, window.devicePixelRatio || 1);
          const w = Math.max(1, Math.round(bounds.width * dpr)), h = Math.max(1, Math.round(bounds.height * dpr));
          if (node.width !== w || node.height !== h) { node.width = w; node.height = h; }
          ctx.setTransform(w / 780, 0, 0, h / 270, 0, 0);
          const playing = audioEngine.isPlaying, position = audioEngine.getCurrentSample();
          if (p.eq) {
            if (playing) {
              ctx.clearRect(0, 0, 780, 270);
              const bins = spectrum(p.source, position), maximum = Math.min(20000, p.rate * .45), columns = Math.min(1400, Math.max(350, Math.round(w * 700 / 780)));
              for (let px = 0; px < columns; px++) {
                const f = 20 * (maximum / 20) ** (px / columns), bin = clamp(f * fft.size / p.rate, 0, bins.length - 1), k = Math.floor(bin), fraction = bin - k;
                const amplitude = bins[k] * (1 - fraction) + bins[Math.min(k + 1, bins.length - 1)] * fraction;
                const strength = clamp((20 * Math.log10(Math.max(1e-6, amplitude)) + 84) / 84, 0, 1);
                ctx.fillStyle = `hsl(271 58% ${83 - strength * 43}%)`;
                ctx.fillRect(40 + px * 700 / columns, 248 - strength * 216, 700 / columns + .5, strength * 216);
              }
            }
          } else {
            if (playing && p.output) {
              time += elapsed;
              const length = p.output[0]?.length ?? 0;
              const start = previous ?? Math.max(0, position - p.rate / 30);
              const peak = length <= elapsed * p.rate ? samplePeak(p.output, 0, length) : position >= start ? samplePeak(p.output, start, position + 1) : Math.max(samplePeak(p.output, start, length), samplePeak(p.output, 0, position + 1));
              const bins = spectrum(p.output, position), energy = [0, 0, 0];
              for (let k = 1; k < bins.length; k++) { const f = k * p.rate / fft.size; energy[f < 250 ? 0 : f < 4000 ? 1 : 2] += bins[k] ** 2; }
              const total = energy[0] + energy[1] + energy[2];
              const brightness = total > 1e-15 ? (energy[0] * 38 + energy[1] * 59 + energy[2] * 80) / total : 59;
              const index = p.trace ? Math.floor(position / p.trace.hop) : 0;
              history.push({ time, peak, shade: `hsl(271 58% ${brightness}%)`, reduction: p.trace?.reduction[index] ?? 0 });
              while (history.length && history[0].time < time - 50) history.shift();
              previous = position;
            } else previous = null;
            ctx.clearRect(0, 0, 780, 270);
            const span = 6 / 2 ** speed.current;
            ctx.save(); ctx.beginPath(); ctx.rect(40, 32, 700, 216); ctx.clip();
            for (let i = 0; i < history.length; i++) {
              const row = history[i], next = history[i + 1]?.time ?? time;
              const x = 740 - (time - row.time) * 700 / span, right = 740 - (time - next) * 700 / span;
              if (right < 40) continue;
              const y = levelY(20 * Math.log10(Math.max(1e-6, row.peak)));
              ctx.fillStyle = row.shade; ctx.fillRect(x, y, Math.max(1, right - x + .5), 248 - y);
            }
            ctx.beginPath(); ctx.strokeStyle = '#eee0ff'; ctx.lineWidth = 1.3;
            let started = false;
            for (const row of history) {
              const x = 740 - (time - row.time) * 700 / span; if (x < 40) continue;
              const y = 32 + clamp(row.reduction, 0, 12) * 18;
              if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
            }
            ctx.stroke(); ctx.restore();
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
      const db = filters.reduce((sum, [b0, b1, b2, a1, a2]) => sum + 10 * Math.log10(Math.max(1e-20, ((b0 + b1 * c + b2 * c2) ** 2 + (b1 * s + b2 * s2) ** 2) / Math.max(1e-20, (1 + a1 * c + a2 * c2) ** 2 + (a1 * s + a2 * s2) ** 2))), 0);
      return `${i ? 'L' : 'M'}${40 + i * 700 / 1024},${clamp(gainY(db), 20, 248)}`;
    }).join(' ');
  }, [props.bands, props.rate, max]);
  const move = (i: number, e: React.PointerEvent<HTMLButtonElement>) => {
    if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
    const r = host.current!.getBoundingClientRect();
    props.onBandChange(i, { frequency: Math.round(clamp(20 * (max / 20) ** (((e.clientX - r.left) * 780 / r.width - 40) / 700), 20, max)), gainDb: Number(clamp((140 - (e.clientY - r.top) * 270 / r.height) / 6, -18, 18).toFixed(1)) });
  };
  const lineDb = props.params.mode === 'limiter' ? props.params.ceiling : props.params.threshold;
  return <div className="atz-graph-block"><div ref={host} className="atz-graph detailed"><canvas ref={canvas} aria-hidden="true"/>
    <svg viewBox="0 0 780 270" preserveAspectRatio="none" aria-label={props.eq ? 'Spectre stéréo et réponse de l’égaliseur' : 'Historique de sortie de 0 à moins 12 dBFS et réduction de gain'}>
      {(props.eq ? [-18, -12, -6, 0, 6, 12, 18] : [0, -2, -4, -6, -8, -10, -12]).map(db => <g key={db}><line x1="40" x2="740" y1={props.eq ? gainY(db) : levelY(db)} y2={props.eq ? gainY(db) : levelY(db)} stroke="#5c4b6950"/><text x="3" y={(props.eq ? gainY(db) : levelY(db)) + 4}>{db}</text></g>)}
      {props.eq ? <>{[20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000].filter(f => f <= max).map(f => <g key={f}><line x1={frequencyX(f)} x2={frequencyX(f)} y1="32" y2="248" stroke="#5c4b6935"/><text x={frequencyX(f)} y="265" textAnchor="middle">{f >= 1000 ? `${f / 1000}k` : f}</text></g>)}<path d={curve} fill="none" stroke="#fff" strokeWidth="1.8"/></> : lineDb >= -12 && <line x1="40" x2="740" y1={levelY(lineDb)} y2={levelY(lineDb)} stroke="#39ff14" strokeWidth="1.4"/>}
    </svg>
    {!props.eq && <span className="atz-graph-caption">{props.params.mode === 'limiter' ? 'Plafond' : 'Seuil'} {lineDb.toFixed(1)} dBFS</span>}
    {props.eq && props.bands.map((b, i) => <button type="button" key={i} data-eq-band={i} className="atz-eq-point" style={{ left: `${frequencyX(b.frequency) / 780 * 100}%`, top: `${gainY(b.gainDb) / 270 * 100}%`, borderColor: colors[i] }} role="slider" aria-label={`Bande ${i + 1}, ${b.frequency} Hz, gain`} aria-valuemin={-18} aria-valuemax={18} aria-valuenow={b.gainDb} aria-valuetext={`${b.gainDb} dB, Q ${b.q}`}
      onDoubleClick={() => props.onBandChange(i, bandsDefault(props.rate)[i])}
      onPointerDown={e => { if (e.button !== 0) return; e.preventDefault(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId); dragged.current = i; }} onPointerMove={e => move(i, e)} onPointerUp={() => { dragged.current = null; }} onPointerCancel={() => { dragged.current = null; }} onLostPointerCapture={() => { dragged.current = null; }}
      onKeyDown={e => {
        if (e.key === 'Home') { e.preventDefault(); props.onBandChange(i, bandsDefault(props.rate)[i]); }
        else if (['ArrowUp', 'ArrowDown'].includes(e.key)) { e.preventDefault(); props.onBandChange(i, { gainDb: Number(clamp(b.gainDb + (e.key === 'ArrowUp' ? 1 : -1) * (e.shiftKey ? .1 : .5), -18, 18).toFixed(1)) }); }
        else if (['ArrowLeft', 'ArrowRight'].includes(e.key)) { e.preventDefault(); props.onBandChange(i, { frequency: Math.round(clamp(b.frequency * (e.key === 'ArrowRight' ? 1.02 : 1 / 1.02), 20, max)) }); }
      }}>{i + 1}</button>)}
    </div>{!props.eq && <div className="atz-scroll-toolbar"><EffectParameter label="Défilement" value={scroll} initial={0} spec={{ min: -3, max: 3, step: .25, fine: .05, digits: 2 }} onChange={setScroll}/><p>0 : référence · Gauche : plus lent · Droite : plus rapide<br/>Violet foncé : graves · Moyen : médiums · Clair : aigus<br/>Trait blanc : réduction de gain (0–12 dB, depuis le haut). Sortie : crêtes d’échantillons, pas true peak.</p></div>}</div>;
}
