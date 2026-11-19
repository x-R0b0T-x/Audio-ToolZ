import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PreviewBand } from '../audio/engine';
import { analyzeAudioStats, applyFade, applySpeedAndPitch, applyVolume, clampSelection, formatTimecode, normalizeChannels } from '../audio/dsp';
import { applyCompressorAutoGain, applyFrequencyFilter, applyParametricEq, applySpectralNoiseReduction, captureNoiseProfile, type NoiseProfile, type EqBandConfig, type CompressorAutoGainParams, type SpectralNoiseReductionParams } from '../audio/studioDsp';
import { DEFAULT_STUDIO_PRESETS, type AudioEffectPreset, type EffectChainStep } from '../audio/presets';
import { applyEffectChain } from '../audio/batchProcessor';
import { applyMusicalDelay, DELAY_DIVISIONS, DEFAULT_DIVISION, type DelayMode } from '../audio/musicalDelay';
import type { AudioDocument, EffectModalId, FadeCurve, FadeDirection } from '../audio/types';
import { Fader, Knob } from './EffectControls';

interface EffectModalProps {
  effect: EffectModalId; document: AudioDocument | null; noiseProfile?: NoiseProfile | null;
  onCaptureNoiseProfile?: (profile: NoiseProfile) => void; isPreviewPlaying: boolean;
  onStartPreview: (channels: Float32Array[], sampleRate: number, liveGainDb?: number, bands?: PreviewBand[]) => void;
  onStopPreview: () => void;
  onApply: (channels: Float32Array[], label: string, selection?: { startSample: number; endSample: number }) => void;
  onClose: () => void;
}
const defaults = () => ({
  gain: 0, target: -1, direction: 'in' as FadeDirection, curve: 'scurve' as FadeCurve,
  speed: 1, pitch: 0,
  bands: [
    { type: 'lowshelf', frequency: 120, gainDb: 0, q: 0.7 },
    { type: 'peaking', frequency: 1200, gainDb: 0, q: 0.9 },
    { type: 'highshelf', frequency: 6500, gainDb: 0, q: 0.7 },
  ] as EqBandConfig[],
  filter: 'highpass' as 'highpass' | 'lowpass' | 'notch', frequency: 80, q: 0.707,
  compressor: { thresholdDb: -20, ratio: 3.2, attackMs: 10, releaseMs: 120, autoGain: true, targetPeakDb: -1 } as CompressorAutoGainParams,
  noise: { reductionDb: 14, sensitivity: 1, smoothing: 0.35 } as SpectralNoiseReductionParams,
  division: DEFAULT_DIVISION, mode: 'stereo' as DelayMode, repetitions: 3,
  prefix: [] as EffectChainStep[], preset: '',
});
const titles: Record<Exclude<EffectModalId, null>, string> = {
  volume: 'Volume', normalize: 'Normaliser le niveau', fade: 'Fondus', 'speed-pitch': 'Vitesse et hauteur',
  eq: 'Égaliseur 3 bandes', filter: 'Filtre fréquentiel', compressor: 'Compresseur et gain automatique',
  'noise-reduction': 'Réduction de bruit spectrale', echo: 'Délai synchronisé',
};
const button = 'px-3 py-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-elevated)] text-xs cursor-pointer disabled:opacity-40';
const panel = 'p-4 rounded-xl border border-[var(--border-subtle)] bg-[var(--bg-canvas)]';

export const EffectModal: React.FC<EffectModalProps> = (props) => !props.effect || !props.document ? null :
  <EffectSession key={`${props.document.id}:${props.effect}`} {...props} effect={props.effect} document={props.document} />;

type SessionProps = EffectModalProps & { effect: Exclude<EffectModalId, null>; document: AudioDocument };
const EffectSession: React.FC<SessionProps> = ({ effect, document: doc, noiseProfile, onStartPreview, onApply, onClose }) => {
  const [c, set] = useState(defaults);
  const change = (patch: Partial<ReturnType<typeof defaults>>) => set((old) => ({ ...old, ...patch }));
  const callback = useRef(onStartPreview); callback.current = onStartPreview;
  const range = useMemo(() => clampSelection(doc.selection, doc.channels[0]?.length ?? 0), [doc]);
  const start = range.startSample, end = range.endSample, selected = end > start;
  const bpm = doc.bpmInfo?.bpm ?? 0;
  const tempoAvailable = Number.isFinite(bpm) && bpm > 0;
  const blocked = effect === 'echo' && c.repetitions > 0 && !tempoAvailable;
  const source = useMemo(() => doc.channels.map((ch) => ch.subarray(start, end)), [doc, start, end]);
  const prepared = useMemo(() => c.prefix.length ? applyEffectChain(source, doc.sampleRate, c.prefix, noiseProfile ?? undefined) : source,
    [source, doc.sampleRate, c.prefix, noiseProfile]);
  const stats = useMemo(() => selected && effect === 'normalize' ? analyzeAudioStats(doc.channels, doc.sampleRate, start, end) : null,
    [doc, start, end, selected, effect]);
  const label = effect === 'echo' ? `Délai ${DELAY_DIVISIONS[c.division].label}, ${c.mode}, ${c.repetitions} répétition(s)`
    : c.preset || titles[effect];
  const processSegment = () => {
    const n = prepared[0]?.length ?? 0;
    switch (effect) {
      case 'volume': return applyVolume(prepared, 0, n, c.gain);
      case 'normalize': return normalizeChannels(prepared, 0, n, c.target).channels;
      case 'fade': return applyFade(prepared, 0, n, c.direction, c.curve);
      case 'eq': return applyParametricEq(prepared, doc.sampleRate, 0, n, c.bands);
      case 'filter': return applyFrequencyFilter(prepared, doc.sampleRate, 0, n, c.filter, c.frequency, c.q);
      case 'compressor': return applyCompressorAutoGain(prepared, doc.sampleRate, 0, n, c.compressor);
      case 'noise-reduction': return applySpectralNoiseReduction(prepared, 0, n,
        noiseProfile ?? captureNoiseProfile(prepared, doc.sampleRate, 0, n), c.noise);
      case 'echo': return blocked ? prepared : applyMusicalDelay(prepared, doc.sampleRate, bpm, c.division, c.mode, c.repetitions);
      default: return prepared;
    }
  };
  useEffect(() => {
    if (!selected) return;
    if (effect === 'volume') { callback.current(prepared, doc.sampleRate, c.gain); return; }
    if (effect === 'eq' || effect === 'filter') {
      const bands: PreviewBand[] = effect === 'eq' ? c.bands : [{ type: c.filter, frequency: c.frequency, q: c.q }];
      const prefixBands: PreviewBand[] = c.prefix.flatMap((step) => step.kind === 'filter' ? [{ type: step.filterKind, frequency: step.frequency, q: step.q }] : []);
      callback.current(source, doc.sampleRate, undefined, [...prefixBands, ...bands]); return;
    }
    const timer = window.setTimeout(() => {
      if (effect === 'speed-pitch') {
        const result = applySpeedAndPitch(doc.channels, doc.sampleRate, start, end, c.speed, c.pitch, true);
        callback.current(result.channels.map((ch) => ch.subarray(result.selection.startSample, result.selection.endSample)), doc.sampleRate);
      } else callback.current(processSegment(), doc.sampleRate);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [effect, doc, c, prepared, noiseProfile, selected, blocked]);

  const loadPreset = (preset: AudioEffectPreset) => {
    const next = defaults(); next.preset = preset.name;
    next.prefix = preset.steps.filter((step) => step.kind !== effect);
    for (const step of preset.steps) {
      if (step.kind !== effect) continue;
      if (step.kind === 'eq') next.bands = step.bands.map((band) => ({ ...band }));
      if (step.kind === 'filter') { next.filter = step.filterKind; next.frequency = step.frequency; next.q = step.q ?? 0.707; }
      if (step.kind === 'compressor') next.compressor = { ...step.params };
      if (step.kind === 'noise-reduction') next.noise = { ...step.params };
    }
    set(next);
  };
  const confirm = () => {
    if (!selected || blocked) return;
    if (effect === 'speed-pitch') {
      const result = applySpeedAndPitch(doc.channels, doc.sampleRate, start, end, c.speed, c.pitch, true);
      onApply(result.channels, label, result.selection); return;
    }
    const processed = processSegment();
    const full = doc.channels.map((ch, index) => { const copy = new Float32Array(ch); copy.set(processed[index], start); return copy; });
    onApply(full, label);
  };
  const fader = (name: string, value: number, initial: number, min: number, max: number, step: number, display: string, onChange: (v: number) => void) =>
    <Fader label={name} value={value} defaultValue={initial} min={min} max={max} step={step} display={display} onChange={onChange} />;

  return <div role="dialog" aria-modal="true" aria-labelledby="effect-modal-title" className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 select-none">
    <div className="w-full max-w-xl max-h-[95vh] flex flex-col rounded-xl border border-[var(--border-strong)] bg-[var(--bg-surface)] text-[var(--text-primary)] shadow-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)]">
        <div><h2 id="effect-modal-title" className="text-sm font-semibold">{titles[effect]}</h2>
          <p className="text-[11px] text-[var(--text-muted)]">{selected ? `Sélection : ${formatTimecode(start / doc.sampleRate)} → ${formatTimecode(end / doc.sampleRate)} — Écoute directe` : 'Sélectionnez une zone audio.'}</p></div>
        <button type="button" aria-label="Fermer" onClick={onClose} className={button}><X size={16} /></button>
      </div>
      <div className="p-5 space-y-4 overflow-y-auto">
        <div className="flex flex-wrap gap-2">
          {DEFAULT_STUDIO_PRESETS.filter((p) => p.category === effect && effect !== 'echo').map((p) =>
            <button type="button" key={p.id} className={button} disabled={!selected} title={p.description} onClick={() => loadPreset(p)}>Préréglage : {p.name}</button>)}
          {effect === 'echo' && <button type="button" className={button} onClick={() => change({ division: DEFAULT_DIVISION, mode: 'stereo', repetitions: 3 })}>Préréglage : croche synchronisée</button>}
        </div>
        {effect === 'echo' && <div className={panel}>
          <p className="text-xs text-center mb-3">{tempoAvailable ? `${bpm.toFixed(1)} BPM détectés` : 'BPM non détecté : fermez puis utilisez Ctrl+B. Aucun tempo arbitraire.'}</p>
          <div className="grid grid-cols-3 gap-2">
            <Knob label="Division" value={c.division} max={DELAY_DIVISIONS.length - 1} defaultValue={DEFAULT_DIVISION} display={DELAY_DIVISIONS[c.division].label} onChange={(v) => change({ division: v })} />
            <Knob label="Mode" value={(['mono', 'stereo', 'ping-pong'] as DelayMode[]).indexOf(c.mode)} max={2} defaultValue={1} display={c.mode === 'stereo' ? 'Stéréo' : c.mode === 'mono' ? 'Mono' : 'Ping-pong'} onChange={(v) => change({ mode: (['mono', 'stereo', 'ping-pong'] as DelayMode[])[v] })} />
            <Knob label="Répétitions" value={c.repetitions} max={16} defaultValue={3} display={c.repetitions === 0 ? '0 — aucun écho' : String(c.repetitions)} onChange={(v) => change({ repetitions: v })} />
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-3">Les répétitions restent dans la sélection. Double-clic : valeur par défaut. {doc.channels.length < 2 && 'Source mono : les modes spatiaux restent mono.'}</p>
        </div>}
        {effect === 'eq' && <div className={`grid grid-cols-3 gap-3 ${panel}`}>
          {c.bands.map((b, index) => <Fader key={index} label={['Graves', 'Médiums', 'Aigus'][index] || `Bande ${index + 1}`} detail={`${b.frequency} Hz`} value={b.gainDb} defaultValue={0} min={-12} max={12} step={0.1} display={`${b.gainDb.toFixed(1)} dB`} onChange={(v) => change({ bands: c.bands.map((band, i) => i === index ? { ...band, gainDb: v } : band) })} />)}
        </div>}
        {effect === 'volume' && <div className={panel}>{fader('Gain', c.gain, 0, -24, 24, 0.5, `${c.gain.toFixed(1)} dB`, (v) => change({ gain: v }))}</div>}
        {effect === 'normalize' && <div className={panel}>{fader('Pic cible', c.target, -1, -12, 0, 0.5, `${c.target.toFixed(1)} dBFS`, (v) => change({ target: v }))}
          {stats && <p className="text-xs text-center mt-3">Pic actuel : {stats.peakDb.toFixed(1)} dBFS</p>}</div>}
        {effect === 'filter' && <div className="space-y-3"><div className="flex gap-2">
          {(['highpass', 'lowpass', 'notch'] as const).map((kind, i) => <button type="button" key={kind} className={button} aria-pressed={c.filter === kind} onClick={() => change({ filter: kind, frequency: [80, 8000, 50][i], q: kind === 'notch' ? 8 : 0.707 })}>{['Passe-haut', 'Passe-bas', 'Coupe-bande'][i]}</button>)}
          </div><div className={panel}>{fader('Fréquence', c.frequency, 80, 30, 16000, 1, `${c.frequency} Hz`, (v) => change({ frequency: v }))}</div></div>}
        {effect === 'compressor' && <div className={`grid grid-cols-2 gap-4 ${panel}`}>
          {fader('Seuil', c.compressor.thresholdDb, -20, -40, -2, 1, `${c.compressor.thresholdDb} dBFS`, (v) => change({ compressor: { ...c.compressor, thresholdDb: v } }))}
          {fader('Ratio', c.compressor.ratio, 3.2, 1.2, 10, 0.1, `${c.compressor.ratio.toFixed(1)} : 1`, (v) => change({ compressor: { ...c.compressor, ratio: v } }))}
        </div>}
        {effect === 'noise-reduction' && <div className={panel}>{fader('Atténuation', c.noise.reductionDb, 14, 0, 36, 1, `${c.noise.reductionDb} dB`, (v) => change({ noise: { ...c.noise, reductionDb: v } }))}</div>}
        {effect === 'speed-pitch' && <div className={`grid grid-cols-2 gap-4 ${panel}`}>
          {fader('Vitesse', c.speed, 1, 0.5, 2, 0.05, `${c.speed.toFixed(2)}x`, (v) => change({ speed: v }))}
          {fader('Hauteur', c.pitch, 0, -12, 12, 1, `${c.pitch} demi-tons`, (v) => change({ pitch: v }))}
        </div>}
        {effect === 'fade' && <div className="space-y-3">
          <div className="flex gap-2">{(['in', 'out'] as const).map((v) => <button type="button" className={button} key={v} aria-pressed={c.direction === v} onClick={() => change({ direction: v })}>{v === 'in' ? 'Entrée' : 'Sortie'}</button>)}</div>
          <div className="flex gap-2">{(['linear', 'exponential', 'scurve'] as const).map((v, i) => <button type="button" className={button} key={v} aria-pressed={c.curve === v} onClick={() => change({ curve: v })}>{['Linéaire', 'Exponentielle', 'Courbe en S'][i]}</button>)}</div>
        </div>}
      </div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <button type="button" className={button} onClick={onClose}>Annuler</button>
        <button type="button" className={button} disabled={!selected || blocked} onClick={confirm}>Appliquer</button>
      </div>
    </div>
  </div>;
};
