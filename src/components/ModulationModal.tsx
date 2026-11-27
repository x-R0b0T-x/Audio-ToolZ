import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine, type PreviewBand } from '../audio/engine';
import type { AudioDocument } from '../audio/types';
import { targetRange } from '../audio/effectsModel.mjs';
import { DELAY_DIVISIONS } from '../audio/musicalDelay';
import { delayRangeMs, type ModulationSettings } from '../audio/modulationDsp';
import { EffectPanel } from './EffectPanel';
import { EffectParameter } from './EffectParameter';
import { Knob } from './EffectControls';
import './modulation.css';
type Kind = 'chorus' | 'flanger';
type Props = { effect: Kind; document: AudioDocument; onStartPreview: (channels: Float32Array[], rate: number, gain?: number, bands?: PreviewBand[]) => void; onApply: (channels: Float32Array[], label: string) => void; onClose: () => void };
const BAR = Math.max(0, DELAY_DIVISIONS.findIndex(d => Math.abs(d.beats - 4) < 1e-9));
const START = {
  chorus: { rate: .8, depth: 50, delay: 15, feedback: 0, voices: 2, spread: 50, mix: 0, throughZero: false, sync: false, division: BAR },
  flanger: { rate: .3, depth: 70, delay: 2, feedback: 50, voices: 1, spread: 50, mix: 0, throughZero: false, sync: false, division: BAR },
};
type State = typeof START.chorus;
type Request = { id: number; settings: ModulationSettings; from: number; to: number };
const WINDOW_SECONDS = 12;
const SW = 520, SH = 170, SL = 10, ST = 10, SPW = 500, SPH = 150, WINDOW = 4;
function ModulationScope({ kind, settings }: { kind: Kind; settings: ModulationSettings }) {
  const live = useRef(settings); live.current = settings;
  const lines = useRef<(SVGPathElement | null)[]>([]);
  const half = kind === 'chorus' ? 15 : 10;
  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches, begin = performance.now(), center = ST + SPH / 2, reach = SPH / 2 - 8;
    let frame = 0;
    const draw = (now: number) => {
      const s = live.current, [lo, hi] = delayRangeMs(s), amp = (hi - lo) / 2, count = kind === 'chorus' ? Math.max(1, Math.min(4, Math.round(s.voices))) : 1, time = reduced ? 0 : (now - begin) / 1000;
      for (let v = 0; v < 4; v++) {
        const el = lines.current[v]; if (!el) continue;
        if (v >= count) { el.setAttribute('d', ''); continue; }
        let d = '';
        for (let i = 0; i <= 200; i++) {
          const u = i / 200, t = time - (1 - u) * WINDOW, delta = amp * Math.sin(2 * Math.PI * s.rateHz * t + 2 * Math.PI * v / count), y = center - Math.max(-1, Math.min(1, delta / half)) * reach;
          d += `${i ? 'L' : 'M'}${(SL + u * SPW).toFixed(1)} ${y.toFixed(1)}`;
        }
        el.setAttribute('d', d); el.style.opacity = String(.4 + .6 * s.mix);
      }
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [kind, half]);
  const grid = Array.from({ length: 9 }, (_, i) => `M${SL + (i + 1) * 50} ${ST}V${ST + SPH}`).concat(Array.from({ length: 2 }, (_, j) => `M${SL} ${ST + (j + 1) * 50}H${SL + SPW}`)).join(' ');
  return <svg className="zonyx-mod-scope" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Oscillateur qui fait varier le retard autour de sa valeur de base">
    <rect x={SL} y={ST} width={SPW} height={SPH} fill="var(--wave-bg)" stroke="#bd93f9" />
    <path d={grid} fill="none" stroke="#fff" strokeOpacity=".2" strokeWidth="1" />
    {[0, 1, 2, 3].map(v => <path key={v} ref={el => { lines.current[v] = el; }} fill="none" stroke="#39ff14" strokeWidth={v ? 1.6 : 2.6} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 3px #39ff14)' }} />)}
    <text x={SL + 6} y={ST + 14} fill="#fff" fillOpacity=".7" fontSize="11">{`+${half} ms`}</text>
    <text x={SL + 6} y={ST + SPH - 6} fill="#fff" fillOpacity=".7" fontSize="11">{`−${half} ms`}</text>
    <text x={SL + SPW - 6} y={ST + SPH - 6} fill="#fff" fillOpacity=".7" fontSize="11" textAnchor="end">maintenant</text>
  </svg>;
}
export function ModulationModal(p: Props) {
  const kind = p.effect, doc = p.document, initial = START[kind], label = kind === 'chorus' ? 'Z-Chorus' : 'Z-Flanger';
  const [s, setS] = useState<State>({ ...initial }), [touched, setTouched] = useState(false);
  const [pending, setPending] = useState(true), [applying, setApplying] = useState(false), [error, setError] = useState('');
  const change = (patch: Partial<State>) => { setTouched(true); setS(old => ({ ...old, ...patch })); };
  const callbacks = useRef(p); callbacks.current = p;
  const range = useMemo(() => { const r = targetRange(doc.selection, doc.channels[0]?.length ?? 0); return { start: r.start, end: r.end }; }, [doc]);
  const source = useMemo(() => doc.channels.map(ch => ch.subarray(range.start, range.end)), [doc, range]);
  const n = source[0]?.length ?? 0, bpm = doc.bpmInfo?.bpm ?? 0, canSync = Number.isFinite(bpm) && bpm > 0, synced = s.sync && canSync;
  const rateHz = synced ? 1 / (60 / bpm * DELAY_DIVISIONS[s.division].beats) : s.rate;
  const settings = useMemo<ModulationSettings>(() => ({ kind, rateHz, depth: s.depth / 100, delayMs: s.delay, feedback: s.feedback / 100, voices: s.voices, spread: s.spread / 100, mix: s.mix / 100, throughZero: s.throughZero }), [kind, rateHz, s]);
  const latestSettings = useRef(settings); latestSettings.current = settings;
  const worker = useRef<Worker | null>(null), busy = useRef(false), wanted = useRef<Request | null>(null), serial = useRef(0), applyId = useRef(-1), win = useRef({ from: 0, to: 0 });
  const commit = useRef((channels: Float32Array[]) => { void channels; });
  commit.current = channels => callbacks.current.onApply(channels.map((segment, i) => { const full = new Float32Array(doc.channels[i]); full.set(segment, range.start); return full; }), label);
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
    try { w = new Worker(new URL('../audio/modulation.worker.ts', import.meta.url), { type: 'module' }); }
    catch (e) { setError(String(e)); setPending(false); return; }
    worker.current = w; busy.current = false;
    const copy = source.map(c => new Float32Array(c));
    w.postMessage({ kind: 'init', channels: copy, sampleRate: doc.sampleRate }, copy.map(c => c.buffer as ArrayBuffer));
    w.onmessage = (e: MessageEvent<{ id: number; channels?: Float32Array[]; from?: number; to?: number; error?: string }>) => {
      busy.current = false; const r = e.data;
      if (r.error || !r.channels) { setError(r.error ?? 'Échec du traitement audio.'); setPending(false); setApplying(false); return; }
      if (r.id === applyId.current) { applyId.current = -1; commit.current(r.channels); return; }
      if (r.id !== serial.current) { dispatch(); return; }
      win.current = { from: r.from ?? 0, to: r.to ?? n }; setError(''); setPending(false);
      callbacks.current.onStartPreview(r.channels, doc.sampleRate);
    };
    w.onerror = () => { busy.current = false; setError('Échec du traitement audio. Fermez puis rouvrez cet effet.'); setPending(false); setApplying(false); };
    return () => { w.terminate(); if (worker.current === w) worker.current = null; busy.current = false; };
  }, [source, doc.sampleRate, n]);
  useEffect(() => {
    if (!n || applyId.current >= 0) return;
    const id = ++serial.current; setPending(true);
    wanted.current = { id, settings, ...windowAround() };
    const timer = window.setTimeout(dispatch, 60);
    return () => window.clearTimeout(timer);
  }, [source, doc.sampleRate, settings, n]);
  useEffect(() => {
    if (!n) return;
    const timer = window.setInterval(() => {
      const w = win.current;
      if (!audioEngine.isPlaying || busy.current || applyId.current >= 0 || (w.from <= 0 && w.to >= n)) return;
      const at = audioEngine.getCurrentSample() - range.start, span = w.to - w.from;
      if (at >= w.from + span * .5 || at < w.from - 1) { const id = ++serial.current; wanted.current = { id, settings: latestSettings.current, ...windowAround() }; dispatch(); }
    }, 400);
    return () => window.clearInterval(timer);
  }, [n, range.start, doc.sampleRate]);
  const apply = () => {
    if (!n || !touched || pending || applying || error) return;
    setApplying(true);
    const id = ++serial.current; applyId.current = id;
    wanted.current = { id, settings: latestSettings.current, from: 0, to: n }; dispatch();
  };
  const [lo, hi] = delayRangeMs(settings);
  const par = (key: 'rate' | 'depth' | 'delay' | 'feedback' | 'spread' | 'mix', name: string, min: number, max: number, step: number, fine: number, digits: number, unit: string, logarithmic = false) =>
    <EffectParameter label={name} value={s[key]} initial={initial[key]} spec={{ min, max, step, fine, digits, logarithmic }} unit={unit} onChange={v => change({ [key]: v })} />;
  return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-modulation" minWidth={640} minHeight={400} role="dialog" aria-modal="true" aria-labelledby="modulation-title">
    <header><h2 id="modulation-title">{label}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
    <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-mod">
      <ModulationScope kind={kind} settings={settings} />
      <output className="zonyx-hint" aria-live="off">{`Retard ${lo.toFixed(2)} à ${hi.toFixed(2)} ms · Oscillateur ${rateHz.toFixed(2)} Hz`}</output>
      <div className="zonyx-mod-row">
        {synced ? <Knob label="Temps" value={s.division} max={DELAY_DIVISIONS.length - 1} defaultValue={BAR} display={DELAY_DIVISIONS[s.division].label} onChange={division => change({ division })} /> : par('rate', 'Vitesse', .05, 10, .1, .01, 2, 'Hz', true)}
        <button type="button" className="zonyx-mod-toggle" aria-pressed={synced} disabled={!canSync} title={canSync ? `BPM déjà détecté : ${bpm.toFixed(1)}` : 'Détectez d’abord le BPM dans Audio ToolZ (Ctrl+B).'} onClick={() => change({ sync: !s.sync })}>Tempo</button>
        {par('depth', 'Profondeur', 0, 100, 1, .1, 0, '%')}
        {kind === 'chorus' ? par('delay', 'Retard', 5, 30, .5, .1, 1, 'ms') : par('delay', 'Retard', .1, 10, .1, .01, 2, 'ms')}
        {kind === 'flanger' && par('feedback', 'Réinjection', -95, 95, 1, .1, 0, '%')}
        {kind === 'chorus' && <Knob small label="Voix" value={s.voices} min={1} max={4} ticks={4} defaultValue={2} display={String(s.voices)} onChange={voices => change({ voices })} />}
        {par('spread', 'Largeur stéréo', 0, 100, 1, .1, 0, '%')}
        {par('mix', 'Mix', 0, 100, 1, .1, 0, '%')}
        {kind === 'flanger' && <button type="button" className="zonyx-mod-toggle" aria-pressed={s.throughZero} onClick={() => change({ throughZero: !s.throughZero })}>Through-zero</button>}
      </div>
      {error && <p role="alert">{error}</p>}
    </div></fieldset></main>
    <footer><span role="status">{applying ? 'Application…' : pending && touched ? 'Calcul…' : ''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n || !touched || pending || applying || !!error}>Appliquer</button></footer>
  </EffectPanel></div>;
}
