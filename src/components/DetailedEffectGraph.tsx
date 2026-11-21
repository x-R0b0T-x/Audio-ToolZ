import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine } from '../audio/engine';
import { bandsDefault, colors, clamp, response, type Band, type Dynamics, type Trace } from '../audio/advancedDsp';
import { SourceSpectrum } from './effectUiMath';
import { EffectParameter } from './EffectParameter';
import { EffectWaveHistory } from './effectWaveHistory';
type Props = { eq: boolean; bands: Band[]; source: Float32Array[]; output: Float32Array[] | null; rate: number; params: Dynamics; trace: Trace | null; onBandChange: (i: number, patch: Partial<Band>) => void };
/* Le graphique de l'égaliseur est dessiné en pixels réels (aucune déformation) :
   les points restent ronds et les textes gardent leurs proportions à toute taille de fenêtre. */
const MARGIN = { l: 50, r: 20, t: 16, b: 34 };
type Size = { w: number; h: number };
const geometry = (s: Size, max: number) => {
  const w = Math.max(1, s.w - MARGIN.l - MARGIN.r), h = Math.max(1, s.h - MARGIN.t - MARGIN.b), span = Math.log(max / 20);
  return {
    w, h, l: MARGIN.l, t: MARGIN.t,
    fx: (f: number) => MARGIN.l + w * Math.log(f / 20) / span,
    gy: (db: number) => MARGIN.t + h * (18 - db) / 36,
    freqAt: (x: number) => 20 * Math.exp(span * (x - MARGIN.l) / w),
    dbAt: (y: number) => 18 - 36 * (y - MARGIN.t) / h,
  };
};
const GRID_FREQUENCIES = [20, 50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000];
/* Spectre : plus une fréquence est forte, plus le violet est clair et lumineux ; plus elle est faible, plus il est sombre. */
const spectrumShade = (level: number) => `hsl(272 72% ${(22 + 58 * level).toFixed(1)}%)`;
export function DetailedEffectGraph(props: Props) {
  const host = useRef<HTMLDivElement>(null), canvas = useRef<HTMLCanvasElement>(null), latest = useRef(props); latest.current = props;
  const [scroll, setScroll] = useState(0), speed = useRef(0); speed.current = scroll;
  const [size, setSize] = useState<Size>({ w: 780, h: 270 }), sizeRef = useRef(size); sizeRef.current = size;
  const max = Math.min(20000, props.rate * .45), geo = geometry(size, max);
  const curve = useMemo(() => {
    const g = geometry(size, max), n = Math.max(120, Math.round(g.w / 2));
    return Array.from({ length: n + 1 }, (_, i) => `${i ? 'L' : 'M'}${(g.l + g.w * i / n).toFixed(1)},${clamp(g.gy(response(props.bands, props.rate, 20 * (max / 20) ** (i / n))), g.t, g.t + g.h).toFixed(1)}`).join(' ');
  }, [props.bands, props.rate, max, size]);
  useEffect(() => {
    const node = host.current; if (!node) return;
    const read = () => { const w = Math.max(1, Math.round(node.clientWidth)), h = Math.max(1, Math.round(node.clientHeight)); setSize(old => old.w === w && old.h === h ? old : { w, h }); };
    read(); const observer = new ResizeObserver(read); observer.observe(node); return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const wheel = (e: WheelEvent) => {
      const point = e.target instanceof Element ? e.target.closest('[data-eq-band]') : null;
      if (!point || !host.current?.contains(point) || e.ctrlKey || e.metaKey || e.altKey || host.current.closest('fieldset:disabled,[inert]')) return;
      const p = latest.current, i = Number(point.getAttribute('data-eq-band')); if (!e.deltaY || !p.bands[i]) return;
      e.preventDefault(); p.onBandChange(i, { q: Number(clamp(p.bands[i].q * (e.shiftKey ? 1.025 : 1.15) ** (e.deltaY < 0 ? 1 : -1), .1, 24).toFixed(3)) });
    };
    const node = host.current; node?.addEventListener('wheel', wheel, { passive: false }); return () => node?.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => {
    let frame = 0, last = 0, previous: number | null = null, history: EffectWaveHistory | null = null, lastKey = '', smooth = new Float32Array(0);
    const fft = new SourceSpectrum();
    const draw = (now: number) => {
      if (now - last >= 30) {
        const dt = last ? (now - last) / 1000 : 0; last = now;
        const node = canvas.current, ctx = node?.getContext('2d'), p = latest.current;
        if (node && ctx) {
          const r = node.getBoundingClientRect(), dpr = window.devicePixelRatio || 1;
          const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
          if (node.width !== w || node.height !== h) { node.width = w; node.height = h; }
          const playing = audioEngine.isPlaying, pos = Math.floor(audioEngine.getCurrentSample());
          if (p.eq) {
            const top = Math.min(20000, p.rate * .45), g = geometry(sizeRef.current, top), key = `${pos}|${w}|${h}|${g.w}|${g.h}`;
            if (playing || key !== lastKey) {
              lastKey = key;
              ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
              const bins = fft.read(p.source, pos), columns = Math.max(1, Math.floor(g.w * dpr)), colWidth = g.w / columns, base = g.t + g.h;
              if (smooth.length !== columns) smooth = new Float32Array(columns);
              const level = new Float32Array(columns);
              for (let x = 0; x < columns; x++) {
                const f = 20 * (top / 20) ** ((x + .5) / columns), bin = clamp(f * fft.size / p.rate, 0, bins.length - 2), k = Math.floor(bin), fraction = bin - k;
                const amplitude = bins[k] * (1 - fraction) + bins[k + 1] * fraction;
                const v = clamp((20 * Math.log10(Math.max(1e-6, amplitude)) + 84) / 84, 0, 1);
                smooth[x] = v >= smooth[x] ? v : smooth[x] * .8 + v * .2; level[x] = smooth[x];
                ctx.fillStyle = spectrumShade(level[x]); ctx.fillRect(g.l + x * colWidth, base - level[x] * g.h, colWidth + .35, level[x] * g.h);
              }
              ctx.beginPath(); ctx.strokeStyle = 'hsl(272 100% 90% / .9)'; ctx.lineWidth = 1.2; ctx.lineJoin = 'round';
              for (let x = 0; x < columns; x++) { const px = g.l + (x + .5) * colWidth, py = base - level[x] * g.h; if (x) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
              ctx.stroke();
            }
          } else {
            const output = p.output, length = output?.[0]?.length ?? 0;
            if (output && length) {
              const channels = Math.min(2, output.length);
              if (!history || history.rate !== p.rate || history.channels !== channels) { history = new EffectWaveHistory(p.rate, channels); previous = null; }
              if (playing) {
                let count = previous === null ? Math.min(pos, Math.round(p.rate / 30)) : (pos - previous + length) % length;
                if (dt * p.rate >= length && previous !== null) count += Math.max(0, Math.round((dt * p.rate - count) / length)) * length;
                if (dt > .5) count = Math.min(count, Math.round(p.rate * .25));
                count = Math.min(count, history.capacity);
                history.append(output, pos - count, count, p.trace?.reduction, p.trace?.hop ?? 256); previous = pos;
              } else previous = null;
            }
            ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
            const left = 65, top = 38, width = Math.max(1, r.width - left - 12), height = Math.max(1, r.height - top - 22), span = 6 / 2 ** speed.current;
            ctx.font = '11px system-ui'; ctx.fillStyle = '#fff';
            const meterY = (db: number) => top + clamp(-db / 12, 0, 1) * height;
            [0,-2,-4,-6,-8,-10,-12].forEach(db => { const y = meterY(db); ctx.fillText(String(db), 2, y + 4); ctx.fillRect(29, y, 5, 1); });
            ctx.fillText('dBFS', 2, 13);
            let peak = 0;
            if (output && length) for (const ch of output) for (let i = Math.max(0, pos - 2048); i < Math.min(length, pos + 1); i++) peak = Math.max(peak, Math.abs(ch[i]));
            const y = meterY(20 * Math.log10(Math.max(1e-6, peak)));
            ctx.fillStyle = '#c39aff'; ctx.fillRect(37, y, 9, top + height - y);
            const db = p.params.mode === 'limiter' ? p.params.ceiling : p.params.threshold;
            if (db >= -12) { ctx.fillStyle = '#39ff14'; ctx.fillRect(34, meterY(db), 15, 1); }
            if (history && history.total) {
              const buckets = Math.max(1, Math.floor(width * dpr)), data = history.read(span, buckets), visible = Math.min(1, data.count / (span * p.rate)), plotW = width * visible, x0 = left + width - plotW;
              const laneH = height / history.channels;
              ctx.save(); ctx.beginPath(); ctx.rect(left, top, width, height); ctx.clip();
              for (let c = 0; c < history.channels; c++) {
                const mid = top + (c + .5) * laneH, scale = laneH * .44, samples = data.samples[c];
                ctx.save(); ctx.beginPath(); ctx.rect(left, top + c * laneH, width, laneH); ctx.clip();
                ctx.strokeStyle = '#ffffff26'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(left, mid); ctx.lineTo(left + width, mid); ctx.stroke();
                if (data.count <= buckets * 2) {
                  ctx.strokeStyle = '#dfbaff'; ctx.lineWidth = 1.4; ctx.beginPath();
                  for (let i = 0; i < samples.length; i++) { const x = x0 + i / Math.max(1, samples.length - 1) * plotW, y = mid - samples[i] * scale; if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y); } ctx.stroke();
                } else for (let i = 0; i < buckets; i++) {
                  const s0 = Math.floor(i * data.count / buckets), s1 = Math.max(s0 + 1, Math.floor((i + 1) * data.count / buckets));
                  let tone = 0, n = 0;
                  for (let s = s0; s < s1; s += Math.max(1, Math.floor((s1 - s0) / 32))) { tone += data.tones[s]; n++; }
                  ctx.fillStyle = `hsl(273 80% ${tone / Math.max(1,n)}%)`;
                  const pair = data.peaks[c][i]; ctx.fillRect(x0 + i / buckets * plotW, mid - pair.max * scale, Math.max(1 / dpr, plotW / buckets), Math.max(1 / dpr, (pair.max - pair.min) * scale));
                }
                ctx.restore(); ctx.fillStyle = '#fff'; ctx.fillText(history.channels === 1 ? 'Mono' : c ? 'D' : 'G', left + 3, top + c * laneH + 12);
              }
              ctx.restore();
              ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath();
              for (let i = 0; i < buckets; i++) {
                const s0 = Math.floor(i * data.count / buckets), s1 = Math.min(data.count, Math.max(s0 + 1, Math.floor((i + 1) * data.count / buckets)));
                let reduction = 0; for (let s = s0; s < s1; s += Math.max(1, Math.floor((s1 - s0) / 128))) reduction = Math.max(reduction, data.reductions[s] / 10);
                const x = x0 + i / buckets * plotW, y = 19 + Math.min(12, reduction) / 12 * 14; if (i) ctx.lineTo(x,y); else ctx.moveTo(x,y);
              } ctx.stroke();
              ctx.fillStyle = '#fff'; ctx.fillText(`−${span.toFixed(2)} s`, left, r.height - 5); ctx.fillText('0 s', left + width - 18, r.height - 5);
            }
          }
        }
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw); return () => cancelAnimationFrame(frame);
  }, []);
  return <div className="atz-graph-block"><div ref={host} className="atz-graph detailed"><canvas ref={canvas} aria-hidden="true"/>
    {props.eq ? <svg width={size.w} height={size.h} viewBox={`0 0 ${size.w} ${size.h}`} aria-label="Spectre et réponse de l’égaliseur">{[-18,-12,-6,0,6,12,18].map(db => <g key={db}><line x1={geo.l} x2={geo.l+geo.w} y1={geo.gy(db)} y2={geo.gy(db)} stroke={db===0?'#ffffff40':'#ffffff22'}/><text x={geo.l-9} y={geo.gy(db)+4.5} textAnchor="end">{db}</text></g>)}{GRID_FREQUENCIES.filter(f=>f<=max).map(f=><g key={f}><line x1={geo.fx(f)} x2={geo.fx(f)} y1={geo.t} y2={geo.t+geo.h} stroke="#ffffff15"/><text x={geo.fx(f)} y={geo.t+geo.h+21} textAnchor="middle">{f>=1000?`${f/1000}k`:f}</text></g>)}<path d={curve} fill="none" stroke="#fff" strokeWidth="2" strokeLinejoin="round"/></svg> : <span className="atz-graph-caption">{props.params.mode === 'limiter' ? 'Plafond' : 'Seuil'} {(props.params.mode === 'limiter' ? props.params.ceiling : props.params.threshold).toFixed(1)} dBFS</span>}
    {props.eq && props.bands.map((b,i)=><button type="button" key={i} data-eq-band={i} className="atz-eq-point" style={{left:geo.fx(b.frequency),top:geo.gy(b.gainDb),borderColor:colors[i]}} role="slider" aria-label={`Bande ${i+1}, gain`} aria-valuemin={-18} aria-valuemax={18} aria-valuenow={b.gainDb}
      onDoubleClick={()=>props.onBandChange(i,bandsDefault(props.rate)[i])}
      onPointerDown={e=>{if(e.button===0){e.preventDefault();e.currentTarget.focus();e.currentTarget.setPointerCapture(e.pointerId);}}}
      onPointerMove={e=>{if(!e.currentTarget.hasPointerCapture(e.pointerId))return;const node=host.current!,r=node.getBoundingClientRect(),g=geometry(sizeRef.current,max);props.onBandChange(i,{frequency:Math.round(clamp(g.freqAt(e.clientX-r.left-node.clientLeft),20,max)),gainDb:Number(clamp(g.dbAt(e.clientY-r.top-node.clientTop),-18,18).toFixed(1))});}}
      onKeyDown={e=>{if(e.key==='Home'){e.preventDefault();props.onBandChange(i,bandsDefault(props.rate)[i]);}else if(['ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();props.onBandChange(i,{gainDb:Number(clamp(b.gainDb+(e.key==='ArrowUp'?1:-1)*(e.shiftKey ? .1 : .5),-18,18).toFixed(1))});}else if(['ArrowLeft','ArrowRight'].includes(e.key)){e.preventDefault();props.onBandChange(i,{frequency:Math.round(clamp(b.frequency*(e.key==='ArrowRight'?1.02:1/1.02),20,max))});}}}>{i+1}</button>)}
    </div>{!props.eq&&<div className="atz-scroll-toolbar"><EffectParameter label="Défilement" value={scroll} initial={0} spec={{min:-3,max:3,step:.25,fine:.05,digits:2}} onChange={setScroll}/><p>Graves : violet sombre · Médiums : violet · Aigus : lilas clair<br/>Waveform linéaire G/D · Vumètre : 0 à −12 dBFS · Trait blanc : réduction 0–12 dB<br/>0 : défilement de référence · Molette · Double-clic : remise à zéro</p></div>}</div>;
}
