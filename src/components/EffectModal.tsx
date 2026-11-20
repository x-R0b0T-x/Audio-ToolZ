import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import type { PreviewBand } from '../audio/engine';
import { analyzeAudioStats, applyFade, applySpeedAndPitch, applyVolume, clampSelection, computeFadeGain, formatTimecode, normalizeChannels } from '../audio/dsp';
import { applyCompressorAutoGain, applyFrequencyFilter, applyParametricEq, applySpectralNoiseReduction, captureNoiseProfile, type NoiseProfile, type EqBandConfig, type CompressorAutoGainParams, type SpectralNoiseReductionParams } from '../audio/studioDsp';
import { applyMusicalDelay, DELAY_DIVISIONS, DEFAULT_DIVISION, type DelayMode } from '../audio/musicalDelay';
import type { AudioDocument, EffectModalId, FadeCurve, FadeDirection } from '../audio/types';
import { Fader, Knob, DelayModeSwitch } from './EffectControls';
interface EffectModalProps {
  effect: EffectModalId; document: AudioDocument | null; noiseProfile?: NoiseProfile | null;
  onCaptureNoiseProfile?: (profile: NoiseProfile) => void; isPreviewPlaying: boolean;
  onStartPreview: (channels: Float32Array[], sampleRate: number, liveGainDb?: number, bands?: PreviewBand[]) => void;
  onStopPreview: () => void;
  onApply: (channels: Float32Array[], label: string, selection?: { startSample: number; endSample: number }) => void;
  onClose: () => void;
}
const defaults = () => ({
  gain: 0, target: -1, direction: 'in' as FadeDirection, curve: 'scurve' as FadeCurve, speed: 1, pitch: 0,
  bands: [
    { type: 'lowshelf', frequency: 120, gainDb: 0, q: 0.7 },
    { type: 'peaking', frequency: 1200, gainDb: 0, q: 0.9 },
    { type: 'highshelf', frequency: 6500, gainDb: 0, q: 0.7 },
  ] as EqBandConfig[],
  filter: 'highpass' as 'highpass' | 'lowpass' | 'notch', frequency: 80, q: 0.707,
  compressor: { thresholdDb: -20, ratio: 3.2, attackMs: 10, releaseMs: 120, autoGain: true, targetPeakDb: -1 } as CompressorAutoGainParams,
  noise: { reductionDb: 14, sensitivity: 1, smoothing: 0.35 } as SpectralNoiseReductionParams,
  division: DEFAULT_DIVISION, mode: 'off' as DelayMode, repetitions: 0, wet: 0, pan: 0,
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
const EffectSession: React.FC<SessionProps> = ({ effect, document: doc, noiseProfile, onCaptureNoiseProfile, onStartPreview, onApply, onClose }) => {
  const [c, set] = useState(defaults);
  const change = (patch: Partial<ReturnType<typeof defaults>>) => set((old) => ({ ...old, ...patch }));
  const callback = useRef(onStartPreview); callback.current = onStartPreview;
  const range = useMemo(() => clampSelection(doc.selection, doc.channels[0]?.length ?? 0), [doc]);
  const start = range.startSample, end = range.endSample, selected = end > start;
  const bpm = doc.bpmInfo?.bpm ?? 0;
  const tempoAvailable = Number.isFinite(bpm) && bpm > 0;
  const blocked = effect === 'echo' && c.mode !== 'off' && c.repetitions > 0 && c.wet > 0 && !tempoAvailable;
  const source = useMemo(() => doc.channels.map((ch) => ch.subarray(start, end)), [doc, start, end]);
  const stats = useMemo(() => selected && effect === 'normalize' ? analyzeAudioStats(doc.channels, doc.sampleRate, start, end) : null, [doc, start, end, selected, effect]);
  const label = effect === 'echo' ? `Délai ${DELAY_DIVISIONS[c.division].label}, ${c.mode}, ${c.repetitions} répétition(s), effet ${c.wet} %, pan ${c.pan === 0 ? 'Centre' : c.pan < 0 ? 'G ' + Math.abs(c.pan) + '%' : 'D ' + c.pan + '%'}` : titles[effect];
  const processSegment = () => {
    const n = source[0]?.length ?? 0;
    switch (effect) {
      case 'volume': return applyVolume(source, 0, n, c.gain);
      case 'normalize': return normalizeChannels(source, 0, n, c.target).channels;
      case 'fade': return applyFade(source, 0, n, c.direction, c.curve);
      case 'eq': return applyParametricEq(source, doc.sampleRate, 0, n, c.bands);
      case 'filter': return applyFrequencyFilter(source, doc.sampleRate, 0, n, c.filter, c.frequency, c.q);
      case 'compressor': return applyCompressorAutoGain(source, doc.sampleRate, 0, n, c.compressor);
      case 'noise-reduction': return applySpectralNoiseReduction(source, 0, n, noiseProfile ?? captureNoiseProfile(source, doc.sampleRate, 0, n), c.noise);
      case 'echo': return blocked ? source : applyMusicalDelay(source, doc.sampleRate, bpm, c.division, c.mode, c.repetitions, c.wet, c.pan);
      default: return source;
    }
  };
  useEffect(() => {
    if (!selected) return;
    if (effect === 'volume') { callback.current(source, doc.sampleRate, c.gain); return; }
    if (effect === 'eq' || effect === 'filter') {
      const bands: PreviewBand[] = effect === 'eq' ? c.bands : [{ type: c.filter, frequency: c.frequency, q: c.q }];
      callback.current(source, doc.sampleRate, undefined, bands); return;
    }
    const timer = window.setTimeout(() => {
      if (effect === 'speed-pitch') {
        const result = applySpeedAndPitch(doc.channels, doc.sampleRate, start, end, c.speed, c.pitch, true);
        callback.current(result.channels.map((ch) => ch.subarray(result.selection.startSample, result.selection.endSample)), doc.sampleRate);
      } else callback.current(processSegment(), doc.sampleRate);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [effect, doc, c, source, noiseProfile, selected, blocked]);
  const confirm = () => {
    if (!selected || blocked) return;
    if (effect === 'speed-pitch') {
      const result = applySpeedAndPitch(doc.channels, doc.sampleRate, start, end, c.speed, c.pitch, true);
      onApply(result.channels, label, result.selection); return;
    }
    const processed = processSegment();
    // A mono document promoted by ping-pong needs BOTH processed output channels.
    const full = processed.map((segment, index) => {
      const copy = new Float32Array(doc.channels[index] ?? doc.channels[0]); copy.set(segment, start); return copy;
    });
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
        {effect === 'echo' && <div className={panel}>
          <p className="text-xs text-center mb-4">{tempoAvailable ? `${bpm.toFixed(1)} BPM détectés` : 'BPM non détecté : fermez puis utilisez Ctrl+B.'}</p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 items-start">
            <Knob label="Division" value={c.division} max={DELAY_DIVISIONS.length - 1} defaultValue={DEFAULT_DIVISION} display={DELAY_DIVISIONS[c.division].label} onChange={(v) => change({ division: v })} />
            <Knob label="Répétitions" value={c.repetitions} max={16} defaultValue={0} display={c.repetitions === 0 ? '0 — aucun écho' : String(c.repetitions)} onChange={(v) => change({ repetitions: v })} />
            <Knob label="Niveau de l’effet" value={c.wet} max={100} defaultValue={0} display={`${c.wet} %`} onChange={(v) => change({ wet: v })} />
            <div className="space-y-4"><DelayModeSwitch value={c.mode} onChange={(mode) => change({ mode })} />
              <Knob small label="Panoramique" value={c.pan} min={-100} max={100} step={5} ticks={3} defaultValue={0} display={c.pan === 0 ? 'Centre' : c.pan < 0 ? `Gauche ${Math.abs(c.pan)} %` : `Droite ${c.pan} %`} onChange={(v) => change({ pan: v })} />
            </div>
          </div>
          <p className="text-[10px] text-[var(--text-muted)] mt-4">Son original conservé. Off, 0 répétition ou effet à 0 % : aucun écho. Les répétitions restent dans la sélection. Double-clic : valeur par défaut.</p>
          {doc.channels.length === 1 && c.mode === 'ping-pong' && <p className="text-[10px] mt-2">Le ping-pong transforme la source mono en sortie stéréo.</p>}
        </div>}
        {effect === 'eq' && <div className={`grid grid-cols-3 gap-3 ${panel}`}>
          {c.bands.map((b, index) => <Fader key={index} label={['Graves', 'Médiums', 'Aigus'][index]} detail={`${b.frequency} Hz`} value={b.gainDb} defaultValue={0} min={-12} max={12} step={0.1} display={`${b.gainDb.toFixed(1)} dB`} onChange={(v) => change({ bands: c.bands.map((band, i) => i === index ? { ...band, gainDb: v } : band) })} />)}
        </div>}
        {effect === 'volume' && <div className={panel}>{fader('Gain', c.gain, 0, -24, 24, 0.5, `${c.gain.toFixed(1)} dB`, (v) => change({ gain: v }))}</div>}
        {effect === 'normalize' && <div className={panel}>{fader('Pic cible', c.target, -1, -12, 0, 0.5, `${c.target.toFixed(1)} dBFS`, (v) => change({ target: v }))}{stats && <p className="text-xs text-center mt-3">Pic actuel : {stats.peakDb.toFixed(1)} dBFS</p>}</div>}
        {effect === 'filter' && <div className="space-y-3"><div className="flex gap-2" onDoubleClick={() => change({ filter: 'highpass', frequency: 80, q: 0.707 })}>
          {(['highpass', 'lowpass', 'notch'] as const).map((kind, i) => <button type="button" key={kind} className={button} aria-pressed={c.filter === kind} onClick={() => change({ filter: kind, frequency: [80, 8000, 50][i], q: kind === 'notch' ? 8 : 0.707 })}>{['Passe-haut', 'Passe-bas', 'Coupe-bande'][i]}</button>)}
          </div><div className={panel}>{fader('Fréquence', c.frequency, 80, 30, 16000, 1, `${c.frequency} Hz`, (v) => change({ frequency: v }))}</div></div>}
        {effect === 'compressor' && <div className={`grid grid-cols-2 gap-4 ${panel}`}>
          {fader('Seuil', c.compressor.thresholdDb, -20, -40, -2, 1, `${c.compressor.thresholdDb} dBFS`, (v) => change({ compressor: { ...c.compressor, thresholdDb: v } }))}
          {fader('Ratio', c.compressor.ratio, 3.2, 1.2, 10, 0.1, `${c.compressor.ratio.toFixed(1)} : 1`, (v) => change({ compressor: { ...c.compressor, ratio: v } }))}
        </div>}
        {effect === 'noise-reduction' && <div className={panel}>
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="text-[11px] text-[var(--text-muted)]">{noiseProfile ? 'Profil de bruit mémorisé actif' : 'Profil automatique sur la sélection'}</span>
            {onCaptureNoiseProfile && <button type="button" className={button} disabled={!selected} onClick={() => onCaptureNoiseProfile(captureNoiseProfile(source, doc.sampleRate, 0, source[0]?.length ?? 0))}>Capturer le profil</button>}
          </div>
          {fader('Atténuation', c.noise.reductionDb, 14, 0, 36, 1, `${c.noise.reductionDb} dB`, (v) => change({ noise: { ...c.noise, reductionDb: v } }))}
        </div>}
        {effect === 'speed-pitch' && <div className={`grid grid-cols-2 gap-4 ${panel}`}>
          {fader('Vitesse', c.speed, 1, 0.5, 2, 0.05, `${c.speed.toFixed(2)}x`, (v) => change({ speed: v }))}
          {fader('Hauteur', c.pitch, 0, -12, 12, 1, `${c.pitch} demi-tons`, (v) => change({ pitch: v }))}
        </div>}
        {effect === 'fade' && (() => {
          const steps = 80;
          const x0 = 12;
          const y0 = 12;
          const w = 256;
          const h = 116;
          const pts = Array.from({ length: steps + 1 }, (_, i) => {
            const t = i / steps;
            const g = computeFadeGain(t, c.direction, c.curve);
            return { x: x0 + t * w, y: y0 + (1 - g) * h };
          });
          const linePath = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
          const areaPath = `${linePath} L${(x0 + w).toFixed(1)} ${(y0 + h).toFixed(1)} L${x0.toFixed(1)} ${(y0 + h).toFixed(1)} Z`;
          const curveLabels: Record<FadeCurve, string> = { linear: 'Linéaire', exponential: 'Exponentielle', scurve: 'Courbe en S' };
          return <div className={`flex flex-col sm:flex-row gap-4 items-stretch ${panel}`}>
            <div className="w-full sm:w-44 shrink-0 flex flex-col gap-2">
              <div className="flex flex-col gap-1.5" onDoubleClick={() => change({ direction: 'in' })}>
                {(['in', 'out'] as const).map((v) => <button type="button" className={`${button} w-full text-left`} key={v} aria-pressed={c.direction === v} onClick={() => change({ direction: v })}>{v === 'in' ? 'Entrée' : 'Sortie'}</button>)}
              </div>
              <div className="h-px my-0.5 bg-[var(--border-subtle)]" />
              <div className="flex flex-col gap-1.5" onDoubleClick={() => change({ curve: 'scurve' })}>
                {(['linear', 'exponential', 'scurve'] as const).map((v) => <button type="button" className={`${button} w-full text-left`} key={v} aria-pressed={c.curve === v} onClick={() => change({ curve: v })}>{curveLabels[v]}</button>)}
              </div>
            </div>
            <div className="flex-1 min-h-[196px] rounded-lg border border-[var(--border-subtle)] bg-[var(--wave-bg)] p-3 flex flex-col justify-between gap-2">
              <div className="flex items-center justify-between text-[11px] font-medium">
                <span style={{ color: 'var(--text-secondary)' }}>{c.direction === 'in' ? 'Entrée' : 'Sortie'} · {curveLabels[c.curve]}</span>
                <span className="font-mono-tabular" style={{ color: 'var(--accent-secondary)' }}>{c.direction === 'in' ? '0 % → 100 %' : '100 % → 0 %'}</span>
              </div>
              <svg viewBox="0 0 280 140" className="w-full flex-1 rounded border border-[var(--border-subtle)]/50 bg-[#070912]" role="img" aria-label={`Courbe de fondu ${c.direction === 'in' ? 'entrée' : 'sortie'} ${curveLabels[c.curve]}`}>
                {[0.25, 0.5, 0.75].map((f) => <line key={`h${f}`} x1={x0} y1={y0 + h * f} x2={x0 + w} y2={y0 + h * f} stroke="rgba(189, 147, 249, 0.14)" strokeWidth="1" strokeDasharray={f === 0.5 ? '3 3' : undefined} />)}
                {[0.25, 0.5, 0.75].map((f) => <line key={`v${f}`} x1={x0 + w * f} y1={y0} x2={x0 + w * f} y2={y0 + h} stroke="rgba(189, 147, 249, 0.12)" strokeWidth="1" />)}
                <rect x={x0} y={y0} width={w} height={h} fill="none" stroke="rgba(189, 147, 249, 0.22)" strokeWidth="1" />
                <path d={areaPath} fill="rgba(57, 255, 20, 0.13)" />
                <path d={linePath} fill="none" stroke="#39ff14" strokeWidth="2.8" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 5px rgba(57, 255, 20, 0.65))' }} />
                <circle cx={pts[0].x} cy={pts[0].y} r="3.5" fill="#39ff14" />
                <circle cx={pts[pts.length - 1].x} cy={pts[pts.length - 1].y} r="3.5" fill="#39ff14" />
              </svg>
            </div>
          </div>;
        })()}
      </div>
      <div className="flex justify-end gap-2 px-5 py-3 border-t border-[var(--border-subtle)] bg-[var(--bg-elevated)]">
        <button type="button" className={button} onClick={onClose}>Annuler</button>
        <button type="button" className={button} disabled={!selected || blocked} onClick={confirm}>Appliquer</button>
      </div>
    </div>
  </div>;
};
