import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine, type PreviewBand } from '../audio/engine';
import type { AudioDocument } from '../audio/types';
import { targetRange } from '../audio/effectsModel.mjs';
import { isTransientNeutral, type TransientSettings } from '../audio/transientDsp';
import { EffectPanel } from './EffectPanel';
import { EffectParameter } from './EffectParameter';
import './modulation.css';
import './transient.css';
type Props = { document: AudioDocument; onStartPreview: (channels: Float32Array[], rate: number, gain?: number, bands?: PreviewBand[]) => void; onApply: (channels: Float32Array[], label: string) => void; onClose: () => void };
type Request = { id: number; settings: TransientSettings; from: number; to: number };
type Rendered = { channels: Float32Array[]; from: number; to: number };
const START = { attack: 0, sustain: 0, sens: 50, inDb: 0, outDb: 0, mix: 100, auto: false, linked: false, listen: false };
type State = typeof START;
const LABEL = 'Z-Transient', WINDOW_SECONDS = 8, DEFAULT_SPAN = 4000;
const W = 760, H = 320, LANE = 96, STRIP_Y = 212, STRIP_H = 104;
const VIOLET = '#b34dff', GREEN = '#39ff14', STEPS = [1, 2, 5, 10, 20, 50, 100, 200, 500, 1000];
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
function TransientGraph({ source, rendered, rangeStart, rate, span, onZoom, onReset }: { source: Float32Array[]; rendered: React.MutableRefObject<Rendered | null>; rangeStart: number; rate: number; span: number; onZoom: (factor: number) => void; onReset: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null), live = useRef({ source, rangeStart, rate, span }); live.current = { source, rangeStart, rate, span };
  const peak = useMemo(() => { const l = source[0]; let best = 0, pos = 0; if (l) for (let i = 0; i < l.length; i += 16) { const a = Math.abs(l[i]); if (a > best) { best = a; pos = i; } } return pos; }, [source]);
  const peakRef = useRef(peak); peakRef.current = peak;
  const zoom = useRef(onZoom); zoom.current = onZoom;
  useEffect(() => {
    const node = canvas.current; if (!node) return;
    const wheel = (e: WheelEvent) => { if (!e.deltaY) return; e.preventDefault(); zoom.current(e.deltaY < 0 ? 1 / 1.25 : 1.25); };
    node.addEventListener('wheel', wheel, { passive: false });
    return () => node.removeEventListener('wheel', wheel);
  }, []);
  useEffect(() => {
    const cv = canvas.current, ctx = cv?.getContext('2d'); if (!cv || !ctx) return;
    const dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--wave-bg').trim() || '#080a14';
    let frame = 0, last = 0;
    const draw = (now: number) => {
      frame = requestAnimationFrame(draw);
      if (now - last < 33) return;
      last = now;
      const { source: src, rangeStart: rs, rate: sr, span: ms } = live.current, left = src[0];
      if (!left || !left.length) return;
      const right = src[1] ?? left, buf = rendered.current, total = left.length, sp = Math.max(64, Math.min(total, Math.round(sr * ms / 1000)));
      const at = audioEngine.isPlaying ? Math.floor(audioEngine.getCurrentSample() - rs) : peakRef.current;
      const start = Math.max(0, Math.min(total - sp, Math.round(at - sp * .25)));
      ctx.globalAlpha = 1; ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
      const stepMs = STEPS.find(v => v >= ms / 8) ?? 1000, stepS = sr * stepMs / 1000;
      ctx.font = '11px "Segoe UI", sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 1;
      for (let m = Math.ceil((start - at) / stepS); at + m * stepS <= start + sp; m++) {
        const x = (at + m * stepS - start) / sp * W;
        ctx.strokeStyle = 'rgba(255,255,255,.14)'; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, STRIP_Y + STRIP_H); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.fillText(`${Math.round(m * stepMs)} ms`, Math.min(W - 24, Math.max(24, x)), STRIP_Y - 4);
      }
      const peaks = new Float32Array(W), peaksP = new Float32Array(W);
      [left, right].forEach((orig, li) => {
        const proc = buf ? (buf.channels[li] ?? buf.channels[0]) : null, top = li ? LANE + 6 : 2, mid = top + LANE / 2, amp = LANE / 2 - 2, color = li ? GREEN : VIOLET, lane = new Float32Array(W);
        ctx.fillStyle = color;
        for (let x = 0; x < W; x++) {
          const i0 = start + Math.floor(x * sp / W), i1 = Math.min(total, start + Math.floor((x + 1) * sp / W) + 1);
          let omx = 0, omn = 0;
          for (let i = i0; i < i1; i++) { const v = orig[i]; if (v > omx) omx = v; if (v < omn) omn = v; }
          ctx.globalAlpha = .3; ctx.fillRect(x, mid - Math.min(1, omx) * amp, 1, (Math.min(1, omx) - Math.max(-1, omn)) * amp + 1);
          const oa = Math.max(omx, -omn); if (oa > peaks[x]) peaks[x] = oa;
          lane[x] = oa;
          if (proc && buf && i0 >= buf.from && i1 <= buf.to) {
            let pmx = 0, pmn = 0;
            for (let i = i0; i < i1; i++) { const v = proc[i]; if (v > pmx) pmx = v; if (v < pmn) pmn = v; }
            ctx.globalAlpha = .95; ctx.fillRect(x, mid - Math.min(1, pmx) * amp, 1, (Math.min(1, pmx) - Math.max(-1, pmn)) * amp + 1);
            const pa = Math.max(pmx, -pmn); if (pa > peaksP[x]) peaksP[x] = pa;
            lane[x] = pa;
          }
        }
        ctx.globalAlpha = 1; ctx.strokeStyle = 'rgba(255,255,255,.18)'; ctx.beginPath(); ctx.moveTo(0, mid); ctx.lineTo(W, mid); ctx.stroke();
        ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.lineWidth = 1;
        for (const sign of [-1, 1]) {
          let e = 0; ctx.beginPath();
          for (let x = 0; x < W; x++) { e = Math.max(lane[x], e * .92); const y = mid + sign * Math.min(1, e) * amp; if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y); }
          ctx.stroke();
        }
        ctx.fillStyle = 'rgba(255,255,255,.7)'; ctx.textAlign = 'left'; ctx.fillText(li ? 'D' : 'G', 6, top + 13); ctx.textAlign = 'center';
      });
      const sMid = STRIP_Y + STRIP_H / 2, half = STRIP_H / 2 - 6;
      ctx.textAlign = 'left';
      for (const v of [12, 6, 0, -6, -12]) {
        const y = sMid - v / 12 * half;
        ctx.strokeStyle = v === 0 ? 'rgba(255,255,255,.35)' : 'rgba(255,255,255,.12)'; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,.6)'; ctx.fillText(`${v > 0 ? '+' : v < 0 ? '−' : ''}${Math.abs(v)} dB`, 6, v === 12 ? y + 12 : y - 3);
      }
      ctx.textAlign = 'right'; ctx.fillText('Gain appliqué', W - 8, STRIP_Y + 14); ctx.textAlign = 'center';
      ctx.strokeStyle = GREEN; ctx.lineWidth = 1.6; ctx.shadowColor = GREEN; ctx.shadowBlur = 4; ctx.beginPath();
      for (let x = 0; x < W; x++) {
        const g = peaks[x] > .002 && peaksP[x] > 0 ? clamp(20 * Math.log10((peaksP[x] + 1e-5) / (peaks[x] + 1e-5)), -12, 12) : 0, y = sMid - g / 12 * half;
        if (x) ctx.lineTo(x, y); else ctx.moveTo(x, y);
      }
      ctx.stroke(); ctx.shadowBlur = 0; ctx.lineWidth = 1.5;
      const px = (at - start) / sp * W;
      if (px >= 0 && px <= W) { ctx.strokeStyle = GREEN; ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, STRIP_Y + STRIP_H); ctx.stroke(); }
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [rendered]);
  return <div className="zonyx-trans-graph"><canvas ref={canvas} onDoubleClick={onReset} title="Molette : zoom. Double-clic : retour à 4000 ms." role="img" aria-label="Forme d’onde stéréo, gauche en violet et droite en vert : signal d’origine pâle, signal traité plein, enveloppe en blanc, gain appliqué en vert dessous, curseur de lecture" /></div>;
}
export function TransientModal(p: Props) {
  const doc = p.document;
  const [s, setS] = useState<State>({ ...START }), [span, setSpan] = useState(DEFAULT_SPAN);
  const [pending, setPending] = useState(true), [applying, setApplying] = useState(false), [error, setError] = useState('');
  const change = (patch: Partial<State>) => setS(old => ({ ...old, ...patch }));
  const callbacks = useRef(p); callbacks.current = p;
  const range = useMemo(() => { const r = targetRange(doc.selection, doc.channels[0]?.length ?? 0); return { start: r.start, end: r.end }; }, [doc]);
  const source = useMemo(() => doc.channels.map(ch => ch.subarray(range.start, range.end)), [doc, range]);
  const n = source[0]?.length ?? 0;
  const settings = useMemo<TransientSettings>(() => ({ attack: s.attack / 100, sustain: s.sustain / 100, sensitivity: s.sens / 100, inputDb: s.inDb, outputDb: s.outDb, mix: s.mix / 100, autoGain: s.auto, linked: s.linked, listen: s.listen }), [s]);
  const neutral = isTransientNeutral(settings), latest = useRef(settings); latest.current = settings;
  const rendered = useRef<Rendered | null>(null);
  const worker = useRef<Worker | null>(null), busy = useRef(false), wanted = useRef<Request | null>(null), serial = useRef(0), shown = useRef(0), applyId = useRef(-1), win = useRef({ from: 0, to: 0 });
  const commit = useRef((channels: Float32Array[]) => { void channels; });
  commit.current = channels => callbacks.current.onApply(channels.map((segment, i) => { const full = new Float32Array(doc.channels[Math.min(i, doc.channels.length - 1)]); full.set(segment, range.start); return full; }), LABEL);
  const windowAround = () => {
    const rate = doc.sampleRate, at = Math.max(0, Math.min(n, Math.floor(audioEngine.getCurrentSample() - range.start)));
    return { from: Math.max(0, at - rate), to: Math.min(n, at + rate * WINDOW_SECONDS) };
  };
  const dispatch = () => {
    const request = wanted.current;
    if (!worker.current || busy.current || !request) return;
    busy.current = true; worker.current.postMessage({ kind: 'render', ...request });
  };
  useEffect(() => {
    if (!n) return;
    let w: Worker;
    try { w = new Worker(new URL('../audio/transient.worker.ts', import.meta.url), { type: 'module' }); }
    catch (e) { setError(String(e)); setPending(false); return; }
    worker.current = w; busy.current = false;
    const copy = source.map(c => new Float32Array(c));
    w.postMessage({ kind: 'init', channels: copy, sampleRate: doc.sampleRate }, copy.map(c => c.buffer as ArrayBuffer));
    w.onmessage = (e: MessageEvent<{ id: number; channels?: Float32Array[]; from?: number; to?: number; error?: string }>) => {
      busy.current = false; const r = e.data;
      if (r.error || !r.channels) { setError(r.error ?? 'Échec du traitement audio.'); setPending(false); setApplying(false); return; }
      if (r.id === applyId.current) { applyId.current = -1; commit.current(r.channels); return; }
      if (r.id < shown.current) { dispatch(); return; }
      shown.current = r.id;
      rendered.current = { channels: r.channels, from: r.from ?? 0, to: r.to ?? n };
      if (r.id === serial.current) { win.current = { from: r.from ?? 0, to: r.to ?? n }; setError(''); setPending(false); }
      callbacks.current.onStartPreview(r.channels, doc.sampleRate);
      if (r.id !== serial.current) dispatch();
    };
    w.onerror = () => { busy.current = false; setError('Échec du traitement audio. Fermez puis rouvrez cet effet.'); setPending(false); setApplying(false); };
    return () => { w.terminate(); if (worker.current === w) worker.current = null; busy.current = false; };
  }, [source, doc.sampleRate, n]);
  useEffect(() => {
    if (!n || applyId.current >= 0) return;
    const id = ++serial.current; setPending(true);
    wanted.current = { id, settings, ...windowAround() };
    const timer = window.setTimeout(dispatch, busy.current ? 0 : 10);
    return () => window.clearTimeout(timer);
  }, [source, doc.sampleRate, settings, n]);
  useEffect(() => {
    if (!n) return;
    const timer = window.setInterval(() => {
      const w = win.current;
      if (!audioEngine.isPlaying || busy.current || applyId.current >= 0 || (w.from <= 0 && w.to >= n)) return;
      const at = audioEngine.getCurrentSample() - range.start, length = w.to - w.from;
      if (at >= w.from + length * .5 || at < w.from - 1) { const id = ++serial.current; wanted.current = { id, settings: latest.current, ...windowAround() }; dispatch(); }
    }, 300);
    return () => window.clearInterval(timer);
  }, [n, range.start, doc.sampleRate]);
  const apply = () => {
    if (!n || neutral || pending || applying || error) return;
    setApplying(true);
    const id = ++serial.current; applyId.current = id;
    wanted.current = { id, settings: { ...latest.current, listen: false }, from: 0, to: n }; dispatch();
  };
  const par = (key: 'attack' | 'sustain' | 'sens' | 'inDb' | 'outDb' | 'mix', name: string, min: number, max: number, step: number, fine: number, digits: number, unit: string) =>
    <EffectParameter label={name} value={s[key]} initial={START[key]} spec={{ min, max, step, fine, digits, logarithmic: false }} unit={unit} onChange={v => change({ [key]: v })} />;
  return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-transient" minWidth={820} minHeight={720} role="dialog" aria-modal="true" aria-labelledby="transient-title">
    <header><h2 id="transient-title">{LABEL}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
    <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-trans">
      <TransientGraph source={source} rendered={rendered} rangeStart={range.start} rate={doc.sampleRate} span={span} onZoom={f => setSpan(v => clamp(Math.round(v * f), 20, DEFAULT_SPAN))} onReset={() => setSpan(DEFAULT_SPAN)} />
      <div className="zonyx-trans-knobs">
        <div className="zonyx-trans-group">{par('attack', 'Attaque', -100, 100, 1, .1, 0, '%')}{par('sustain', 'Sustain', -100, 100, 1, .1, 0, '%')}{par('sens', 'Sensibilité', 0, 100, 1, .1, 0, '%')}</div>
        <i className="zonyx-trans-sep" aria-hidden="true" />
        <div className="zonyx-trans-group">{par('inDb', 'Entrée', -24, 24, .5, .1, 1, 'dB')}{par('outDb', 'Sortie', -24, 24, .5, .1, 1, 'dB')}</div>
        <i className="zonyx-trans-sep" aria-hidden="true" />
        <div className="zonyx-trans-group">{par('mix', 'Mix', 0, 100, 1, .1, 0, '%')}</div>
      </div>
      <div className="zonyx-trans-flags">
        <button type="button" className="zonyx-mod-toggle" aria-pressed={s.auto} title="Compense automatiquement le changement de volume" onClick={() => change({ auto: !s.auto })}>Auto gain</button>
        <button type="button" className="zonyx-mod-toggle" aria-pressed={s.linked} title="Mono : une seule détection pour les deux canaux, l’image stéréo est préservée. Stéréo : chaque canal est traité séparément." onClick={() => change({ linked: !s.linked })}>{s.linked ? 'Détection mono' : 'Détection stéréo'}</button>
        <button type="button" className="zonyx-mod-toggle" aria-pressed={s.listen} title="Écouter uniquement ce que l’effet ajoute ou retire" onClick={() => change({ listen: !s.listen })}>Écouter la différence</button>
      </div>
      {error && <p role="alert">{error}</p>}
    </div></fieldset></main>
    <footer><span role="status">{applying ? 'Application…' : pending && !neutral ? 'Calcul…' : ''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n || neutral || pending || applying || !!error}>Appliquer</button></footer>
  </EffectPanel></div>;
}
