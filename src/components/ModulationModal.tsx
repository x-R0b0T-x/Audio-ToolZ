import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { PreviewBand } from '../audio/engine';
import type { AudioDocument } from '../audio/types';
import { targetRange } from '../audio/effectsModel.mjs';
import { DELAY_DIVISIONS } from '../audio/musicalDelay';
import { applyModulation, delayRangeMs, type ModulationSettings } from '../audio/modulationDsp';
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
export function ModulationModal(p: Props) {
  const kind = p.effect, doc = p.document, initial = START[kind], label = kind === 'chorus' ? 'Z-Chorus' : 'Z-Flanger';
  const [s, setS] = useState<State>({ ...initial }), [touched, setTouched] = useState(false);
  const change = (patch: Partial<State>) => { setTouched(true); setS(old => ({ ...old, ...patch })); };
  const callbacks = useRef(p); callbacks.current = p;
  const range = useMemo(() => { const r = targetRange(doc.selection, doc.channels[0]?.length ?? 0); return { start: r.start, end: r.end }; }, [doc]);
  const source = useMemo(() => doc.channels.map(ch => ch.subarray(range.start, range.end)), [doc, range]);
  const n = source[0]?.length ?? 0, bpm = doc.bpmInfo?.bpm ?? 0, canSync = Number.isFinite(bpm) && bpm > 0, synced = s.sync && canSync;
  const rateHz = synced ? 1 / (60 / bpm * DELAY_DIVISIONS[s.division].beats) : s.rate;
  const settings = useMemo<ModulationSettings>(() => ({ kind, rateHz, depth: s.depth / 100, delayMs: s.delay, feedback: s.feedback / 100, voices: s.voices, spread: s.spread / 100, mix: s.mix / 100, throughZero: s.throughZero }), [kind, rateHz, s]);
  useEffect(() => {
    if (!n) return;
    const timer = window.setTimeout(() => { callbacks.current.onStartPreview(applyModulation(source, doc.sampleRate, settings), doc.sampleRate); }, 60);
    return () => window.clearTimeout(timer);
  }, [source, doc.sampleRate, settings, n]);
  const apply = () => {
    if (!n || !touched) return;
    const out = applyModulation(source, doc.sampleRate, settings);
    callbacks.current.onApply(out.map((segment, i) => { const full = new Float32Array(doc.channels[i]); full.set(segment, range.start); return full; }), label);
  };
  const [lo, hi] = delayRangeMs(settings);
  const path = Array.from({ length: 101 }, (_, i) => `${i ? 'L' : 'M'}${(10 + i * 2.6).toFixed(1)} ${(45 - Math.sin(i / 100 * 2 * 2 * Math.PI) * 30).toFixed(1)}`).join(' ');
  const par = (key: 'rate' | 'depth' | 'delay' | 'feedback' | 'spread' | 'mix', name: string, min: number, max: number, step: number, fine: number, digits: number, unit: string, logarithmic = false) =>
    <EffectParameter label={name} value={s[key]} initial={initial[key]} spec={{ min, max, step, fine, digits, logarithmic }} unit={unit} onChange={v => change({ [key]: v })} />;
  return <div className="zonyx-advanced-backdrop"><EffectPanel className="zonyx-advanced zonyx-legacy zonyx-modulation" minWidth={640} minHeight={360} role="dialog" aria-modal="true" aria-labelledby="modulation-title">
    <header><h2 id="modulation-title">{label}</h2><button type="button" aria-label="Fermer" onClick={p.onClose}>×</button></header>
    <main><div className="zonyx-mod">
      <svg className="zonyx-mod-scope" viewBox="0 0 280 90" role="img" aria-label="Oscillateur qui fait varier le retard"><rect x="10" y="10" width="260" height="70" fill="var(--wave-bg)" stroke="var(--border-subtle)" /><line x1="10" x2="270" y1="45" y2="45" stroke="var(--border-subtle)" /><path d={path} fill="none" stroke="currentColor" strokeWidth="2" /></svg>
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
    </div></main>
    <footer><button type="button" onClick={p.onClose}>Annuler</button><button type="button" onClick={apply} disabled={!n || !touched}>Appliquer</button></footer>
  </EffectPanel></div>;
}
