import React, { useEffect, useMemo, useRef, useState } from 'react';
import { audioEngine, type PreviewBand } from '../audio/engine';
import type { AudioDocument } from '../audio/types';
import { targetRange } from '../audio/effectsModel.mjs';
import { applySpectralNoiseReduction, captureNoiseProfile, type NoiseProfile } from '../audio/studioDsp';
import { EffectPanel } from './EffectPanel';
import { EffectParameter } from './EffectParameter';
import './denoiser.css';
type Props = {
  document: AudioDocument; profile: NoiseProfile | null; onProfile: (profile: NoiseProfile) => void;
  onStartPreview: (channels: Float32Array[], rate: number, gain?: number, bands?: PreviewBand[]) => void;
  onApply: (channels: Float32Array[], label: string) => void; onClose: () => void;
};
const WINDOW_SECONDS = 8, PAD = 4096;
const SW = 520, SH = 190, SL = 10, ST = 10, SPW = 500, SPH = 170;
export function DenoiserModal(p: Props) {
  const doc = p.document, rate = doc.sampleRate;
  const [reduction, setReduction] = useState(0), [sens, setSens] = useState(100), [touched, setTouched] = useState(false);
  const [profile, setProfile] = useState<NoiseProfile | null>(p.profile), [applying, setApplying] = useState(false), [capturing, setCapturing] = useState(false), [error, setError] = useState('');
  const range = useMemo(() => { const r = targetRange(doc.selection, doc.channels[0]?.length ?? 0); return { start: r.start, end: r.end }; }, [doc]);
  const source = useMemo(() => doc.channels.map(c => c.subarray(range.start, range.end)), [doc, range]);
  const n = source[0]?.length ?? 0;
  const callbacks = useRef(p); callbacks.current = p;
  const live = useRef({ reduction, sens, profile }); live.current = { reduction, sens, profile };
  const win = useRef({ from: 0, to: 0 });
  const outRef = useRef<SVGPathElement>(null), origRef = useRef<SVGPathElement>(null), hintRef = useRef<SVGTextElement>(null);
  const windowAround = () => {
    const at = Math.max(0, Math.min(n, Math.floor(audioEngine.getCurrentSample() - range.start)));
    return { from: Math.max(0, at - Math.round(rate * .25)), to: Math.min(n, at + Math.round(rate * WINDOW_SECONDS)) };
  };
  const render = (from: number, to: number, l: { reduction: number; sens: number; profile: NoiseProfile }) => {
    const lead = Math.max(0, from - PAD), end = Math.min(n, to + PAD);
    const part = applySpectralNoiseReduction(source.map(c => c.subarray(lead, end)), 0, end - lead, l.profile, { reductionDb: l.reduction, sensitivity: l.sens / 100, smoothing: .35 });
    const fade = Math.max(1, Math.min(Math.round(rate * .02), (to - from) >> 1));
    return source.map((c, k) => {
      const o = new Float32Array(c), q = part[k];
      for (let i = from; i < to; i++) {
        let w = 1;
        if (from > 0 && i < from + fade) w = Math.min(w, (i - from) / fade);
        if (to < n && i > to - fade) w = Math.min(w, (to - i) / fade);
        o[i] = c[i] * (1 - w) + q[i - lead] * w;
      }
      return o;
    });
  };
  const push = (from: number, to: number) => {
    const l = live.current;
    if (!n || !l.profile) return;
    try {
      if (l.reduction <= 0) { win.current = { from: 0, to: n }; callbacks.current.onStartPreview(source, rate); return; }
      win.current = { from, to };
      callbacks.current.onStartPreview(render(from, to, { reduction: l.reduction, sens: l.sens, profile: l.profile }), rate);
      setError('');
    } catch (e) { setError(String(e)); }
  };
  useEffect(() => {
    if (!touched || !profile || !n) return;
    const timer = window.setTimeout(() => { const w = windowAround(); push(w.from, w.to); }, 50);
    return () => window.clearTimeout(timer);
  }, [reduction, sens, profile, touched, source, n]);
  useEffect(() => {
    if (!n) return;
    const timer = window.setInterval(() => {
      const w = win.current;
      if (!audioEngine.isPlaying || !live.current.profile || !live.current.reduction || (w.from <= 0 && w.to >= n)) return;
      const at = audioEngine.getCurrentSample() - range.start, span = w.to - w.from;
      if (span > 0 && (at >= w.from + span * .5 || at < w.from - 1)) { const next = windowAround(); push(next.from, next.to); }
    }, 400);
    return () => window.clearInterval(timer);
  }, [source, n, range.start]);
  useEffect(() => {
    let frame = 0;
    const center = ST + SPH / 2, amp = SPH / 2 - 6;
    const draw = () => {
      const playing = audioEngine.isPlaying, out = outRef.current, orig = origRef.current;
      if (out && orig) {
        if (!playing) { out.setAttribute('d', ''); orig.setAttribute('d', ''); }
        else {
          const snap = audioEngine.readWaveformSnapshot(), m = snap.length;
          let d = '';
          for (let i = 0; i < m; i += 2) d += `${i ? 'L' : 'M'}${(SL + SPW * i / (m - 1)).toFixed(1)} ${(center - Math.max(-1, Math.min(1, snap[i])) * amp).toFixed(1)}`;
          out.setAttribute('d', d);
          const pos = Math.floor(audioEngine.getCurrentSample() - range.start), ch = source[0];
          let o = '';
          if (ch && pos >= m && pos <= ch.length) for (let i = 0; i < m; i += 2) o += `${i ? 'L' : 'M'}${(SL + SPW * i / (m - 1)).toFixed(1)} ${(center - Math.max(-1, Math.min(1, ch[pos - m + i] ?? 0)) * amp).toFixed(1)}`;
          orig.setAttribute('d', o);
        }
      }
      hintRef.current?.setAttribute('fill-opacity', playing ? '0' : '.7');
      frame = requestAnimationFrame(draw);
    };
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, [source, range.start]);
  const capture = () => {
    if (!n || capturing) return;
    setCapturing(true); setError('');
    window.setTimeout(() => {
      try { const next = captureNoiseProfile(source, rate, 0, n); callbacks.current.onProfile(next); setProfile(next); }
      catch (e) { setError(String(e)); }
      setCapturing(false);
    }, 30);
  };
  const canApply = !!profile && touched && reduction > 0 && !applying && !!n;
  const apply = () => {
    if (!canApply) return;
    setApplying(true);
    window.setTimeout(() => {
      try {
        const l = live.current;
        const segment = applySpectralNoiseReduction(source, 0, n, l.profile!, { reductionDb: l.reduction, sensitivity: l.sens / 100, smoothing: .35 });
        callbacks.current.onApply(segment.map((s, i) => { const full = new Float32Array(doc.channels[i] ?? doc.channels[0]); full.set(s, range.start); return full; }), 'Z-Denoiser');
      } catch (e) { setError(String(e)); setApplying(false); }
    }, 40);
  };
  const grid = Array.from({ length: 9 }, (_, i) => `M${SL + (i + 1) * 50} ${ST}V${ST + SPH}`).concat(Array.from({ length: 3 }, (_, j) => `M${SL} ${ST + SPH * (j + 1) / 4}H${SL + SPW}`)).join(' ');
  return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-denoiser" minWidth={640} minHeight={440} role="dialog" aria-modal="true" aria-labelledby="denoiser-title">
    <header><h2 id="denoiser-title">Z-Denoiser</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
    <main><fieldset className="zonyx-effect-body" disabled={applying}><div className="zonyx-dn">
      <svg className="zonyx-dn-scope" viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Forme d’onde du son en lecture">
        <rect x={SL} y={ST} width={SPW} height={SPH} fill="var(--wave-bg)" stroke="#bd93f9" />
        <path d={grid} fill="none" stroke="#fff" strokeOpacity=".22" strokeWidth="1" />
        <path ref={origRef} fill="none" stroke="#bd93f9" strokeOpacity=".75" strokeWidth="1.4" strokeLinejoin="round" />
        <path ref={outRef} fill="none" stroke="#39ff14" strokeWidth="2" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 3px #39ff14)' }} />
        <text ref={hintRef} x={SL + SPW / 2} y={ST + SPH / 2 + 4} fill="#fff" fillOpacity=".7" fontSize="13" textAnchor="middle">Lancez la lecture pour voir l’onde</text>
      </svg>
      <div className="zonyx-dn-legend"><span className="clean"><i />Son nettoyé</span><span className="source"><i />Son d’origine</span></div>
      <div className="zonyx-dn-row">
        <div className="zonyx-dn-profile" data-ready={!!profile}>
          <strong>{profile ? 'Profil de bruit actif' : 'Aucun profil de bruit'}</strong>
          <span>{profile ? 'Le profil reste en mémoire pour les prochains traitements.' : 'Sélectionnez un passage de bruit seul dans la piste avant d’ouvrir l’effet : le profil est calculé sur cette sélection.'}</span>
          <button type="button" disabled={!n || capturing} aria-busy={capturing} onClick={capture}>{capturing ? 'Analyse…' : profile ? 'Recapturer le profil' : 'Capturer le profil'}</button>
        </div>
        <EffectParameter label="Atténuation" value={reduction} initial={0} spec={{ min: 0, max: 36, step: 1, fine: .1, digits: 0 }} unit="dB" onChange={v => { setTouched(true); setReduction(v); }} />
        <EffectParameter label="Sensibilité" value={sens} initial={100} spec={{ min: 20, max: 300, step: 5, fine: 1, digits: 0 }} unit="%" onChange={v => { setTouched(true); setSens(v); }} />
      </div>
      {error && <p role="alert">{error}</p>}
    </div></fieldset></main>
    <footer><span role="status">{applying ? 'Application…' : ''}</span><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!canApply}>Appliquer</button></footer>
  </EffectPanel></div>;
}
