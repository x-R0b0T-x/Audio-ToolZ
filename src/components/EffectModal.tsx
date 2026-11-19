import React, { useMemo, useState } from 'react';
import { Play, Square, X } from 'lucide-react';
import {
  analyzeAudioStats,
  applyFade,
  applySpeedAndPitch,
  applyVolume,
  clampSelection,
  computeFadeGain,
  formatTimecode,
  normalizeChannels,
} from '../audio/dsp';
import {
  applyCompressorAutoGain,
  applyEchoDelay,
  applyFrequencyFilter,
  applyParametricEq,
  applySpectralNoiseReduction,
  captureNoiseProfile,
  type NoiseProfile,
} from '../audio/studioDsp';
import { DEFAULT_STUDIO_PRESETS } from '../audio/presets';
import { applyEffectChain } from '../audio/batchProcessor';
import type {
  AudioDocument,
  EffectModalId,
  FadeCurve,
  FadeDirection,
} from '../audio/types';

interface EffectModalProps {
  effect: EffectModalId;
  document: AudioDocument | null;
  noiseProfile?: NoiseProfile | null;
  onCaptureNoiseProfile?: (profile: NoiseProfile) => void;
  isPreviewPlaying: boolean;
  onStartPreview: (previewChannels: Float32Array[], sampleRate: number) => void;
  onStopPreview: () => void;
  onApply: (
    nextChannels: Float32Array[],
    label: string,
    nextSelection?: { startSample: number; endSample: number }
  ) => void;
  onClose: () => void;
}

export const EffectModal: React.FC<EffectModalProps> = ({
  effect,
  document,
  noiseProfile,
  onCaptureNoiseProfile,
  isPreviewPlaying,
  onStartPreview,
  onStopPreview,
  onApply,
  onClose,
}) => {
  const [volumeGainDb, setVolumeGainDb] = useState(0);
  const [normTargetDb, setNormTargetDb] = useState(-1);
  const [fadeDirection, setFadeDirection] = useState<FadeDirection>('in');
  const [fadeCurve, setFadeCurve] = useState<FadeCurve>('scurve');
  const [speedRatio, setSpeedRatio] = useState(1.0);
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [preservePitch, setPreservePitch] = useState(true);

  // EQ 3 bandes
  const [eqLowDb, setEqLowDb] = useState(0);
  const [eqMidDb, setEqMidDb] = useState(0);
  const [eqHighDb, setEqHighDb] = useState(0);

  // Filtre passe-haut / passe-bas / coupe-bande
  const [filterKind, setFilterKind] = useState<'highpass' | 'lowpass' | 'notch'>('highpass');
  const [filterFreq, setFilterFreq] = useState(80);
  const [filterQ, setFilterQ] = useState(0.707);

  // Compresseur / Auto-Gain
  const [compThresholdDb, setCompThresholdDb] = useState(-20);
  const [compRatio, setCompRatio] = useState(3.2);
  const [compAutoGain, setCompAutoGain] = useState(true);
  const [compTargetDb, setCompTargetDb] = useState(-1.0);

  // Réduction de bruit spectrale
  const [nrReductionDb, setNrReductionDb] = useState(14);
  const [nrSensitivity, setNrSensitivity] = useState(1.0);

  // Écho / Delay
  const [echoDelayMs, setEchoDelayMs] = useState(140);
  const [echoFeedback, setEchoFeedback] = useState(0.32);
  const [echoMix, setEchoMix] = useState(0.28);

  const rangeInfo = useMemo(() => {
    if (!document) return { start: 0, end: 0, hasSelection: false };
    const total = document.channels[0]?.length ?? 0;
    const clamped = clampSelection(document.selection, total);
    const hasSelection = clamped.endSample > clamped.startSample;
    return {
      start: clamped.startSample,
      end: clamped.endSample,
      hasSelection,
    };
  }, [document]);

  const currentStats = useMemo(() => {
    if (!document || !rangeInfo.hasSelection) return null;
    return analyzeAudioStats(
      document.channels,
      document.sampleRate,
      rangeInfo.start,
      rangeInfo.end
    );
  }, [document, rangeInfo]);

  if (!effect || !document) return null;

  const computeProcessed = (): {
    fullChannels: Float32Array[];
    previewSegment: Float32Array[];
    label: string;
    nextSelection?: { startSample: number; endSample: number };
  } => {
    const { start, end } = rangeInfo;
    if (effect === 'volume') {
      const next = applyVolume(document.channels, start, end, volumeGainDb);
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `Volume (${volumeGainDb >= 0 ? '+' : ''}${volumeGainDb.toFixed(1)} dB)`,
      };
    }
    if (effect === 'normalize') {
      const res = normalizeChannels(document.channels, start, end, normTargetDb);
      return {
        fullChannels: res.channels,
        previewSegment: res.channels.map((c) => c.subarray(start, end)),
        label: `Normaliser (${normTargetDb.toFixed(1)} dBFS)`,
      };
    }
    if (effect === 'fade') {
      const next = applyFade(document.channels, start, end, fadeDirection, fadeCurve);
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `Fondu ${fadeDirection === 'in' ? "d'entrée" : 'de sortie'}`,
      };
    }
    if (effect === 'eq') {
      const next = applyParametricEq(document.channels, document.sampleRate, start, end, [
        { type: 'lowshelf', frequency: 120, gainDb: eqLowDb, q: 0.7 },
        { type: 'peaking', frequency: 1200, gainDb: eqMidDb, q: 0.9 },
        { type: 'highshelf', frequency: 6500, gainDb: eqHighDb, q: 0.7 },
      ]);
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `EQ (${eqLowDb.toFixed(0)}/${eqMidDb.toFixed(0)}/${eqHighDb.toFixed(0)} dB)`,
      };
    }
    if (effect === 'filter') {
      const next = applyFrequencyFilter(
        document.channels,
        document.sampleRate,
        start,
        end,
        filterKind,
        filterFreq,
        filterQ
      );
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `Filtre ${filterKind} (${filterFreq} Hz)`,
      };
    }
    if (effect === 'compressor') {
      const next = applyCompressorAutoGain(document.channels, document.sampleRate, start, end, {
        thresholdDb: compThresholdDb,
        ratio: compRatio,
        attackMs: 10,
        releaseMs: 120,
        autoGain: compAutoGain,
        targetPeakDb: compTargetDb,
      });
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: compAutoGain ? `Compresseur + Auto-Gain (${compTargetDb} dBFS)` : 'Compresseur',
      };
    }
    if (effect === 'noise-reduction') {
      const activeProfile =
        noiseProfile ?? captureNoiseProfile(document.channels, document.sampleRate, start, end);
      const next = applySpectralNoiseReduction(document.channels, start, end, activeProfile, {
        reductionDb: nrReductionDb,
        sensitivity: nrSensitivity,
        smoothing: 0.35,
      });
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `Réduction de bruit (-${nrReductionDb} dB)`,
      };
    }
    if (effect === 'echo') {
      const next = applyEchoDelay(document.channels, document.sampleRate, start, end, {
        delayMs: echoDelayMs,
        feedback: echoFeedback,
        mix: echoMix,
      });
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `Écho (${echoDelayMs} ms)`,
      };
    }
    const res = applySpeedAndPitch(
      document.channels,
      document.sampleRate,
      start,
      end,
      speedRatio,
      pitchSemitones,
      preservePitch
    );
    return {
      fullChannels: res.channels,
      previewSegment: res.channels.map((c) =>
        c.subarray(res.selection.startSample, res.selection.endSample)
      ),
      label: `Vitesse ${speedRatio.toFixed(2)}x / Pitch ${pitchSemitones >= 0 ? '+' : ''}${pitchSemitones} dt`,
      nextSelection: res.selection,
    };
  };

  const handlePreview = () => {
    if (!rangeInfo.hasSelection) return;
    if (isPreviewPlaying) {
      onStopPreview();
      return;
    }
    const res = computeProcessed();
    onStartPreview(res.previewSegment, document.sampleRate);
  };

  const handleConfirm = () => {
    if (!rangeInfo.hasSelection) return;
    onStopPreview();
    const res = computeProcessed();
    onApply(res.fullChannels, res.label, res.nextSelection);
  };

  const titles: Record<Exclude<EffectModalId, null>, string> = {
    volume: 'Volume',
    normalize: 'Normaliser le niveau',
    fade: "Fondus d'entrée / de sortie",
    'speed-pitch': 'Vitesse et Hauteur (Pitch)',
    eq: 'Égaliseur 3 bandes (EQ)',
    filter: 'Filtre fréquentiel (HP / LP / Notch)',
    compressor: 'Compresseur & Auto-Gain',
    'noise-reduction': 'Réduction de bruit spectrale',
    echo: 'Écho / Delay',
  };

  const matchingPresets = DEFAULT_STUDIO_PRESETS.filter((p) => p.category === effect);

  const fadePoints = Array.from({ length: 40 }, (_, i) => {
    const p = i / 39;
    const g = computeFadeGain(p, fadeDirection, fadeCurve);
    const x = 8 + p * 264;
    const y = 68 - g * 56;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(' ');

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="effect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className="w-full max-w-md rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2
              id="effect-modal-title"
              className="text-sm font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {titles[effect]}
            </h2>
            <p className="text-[11px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
              {rangeInfo.hasSelection
                ? `Sélection : ${formatTimecode(rangeInfo.start / document.sampleRate)} → ${formatTimecode(rangeInfo.end / document.sampleRate)}`
                : 'Sélectionnez une zone audio pour appliquer cet effet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onStopPreview();
              onClose();
            }}
            className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {matchingPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {matchingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!rangeInfo.hasSelection}
                  onClick={() => {
                    const { start, end } = rangeInfo;
                    const slice = document.channels.map((c) => c.slice(start, end));
                    const processed = applyEffectChain(
                      slice,
                      document.sampleRate,
                      preset.steps,
                      noiseProfile ?? undefined
                    );
                    const next = document.channels.map((ch, idx) => {
                      const copy = new Float32Array(ch);
                      copy.set(processed[idx] ?? ch.subarray(start, end), start);
                      return copy;
                    });
                    onStopPreview();
                    onApply(next, preset.name);
                  }}
                  className="px-2 py-1 rounded border text-[11px] font-medium cursor-pointer disabled:opacity-40"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--accent-secondary)',
                  }}
                  title={preset.description}
                >
                  Preset : {preset.name}
                </button>
              ))}
            </div>
          )}

          {effect === 'volume' && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="eff-vol-range" style={{ color: 'var(--text-secondary)' }}>
                  Gain (dB)
                </label>
                <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                  {volumeGainDb >= 0 ? '+' : ''}{volumeGainDb.toFixed(1)} dB
                </span>
              </div>
              <input
                id="eff-vol-range"
                type="range"
                min={-24}
                max={24}
                step={0.5}
                value={volumeGainDb}
                onChange={(e) => setVolumeGainDb(parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
            </div>
          )}

          {effect === 'normalize' && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <label htmlFor="eff-norm-range" style={{ color: 'var(--text-secondary)' }}>
                  Niveau cible (dBFS)
                </label>
                <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                  {normTargetDb.toFixed(1)} dBFS
                </span>
              </div>
              <input
                id="eff-norm-range"
                type="range"
                min={-12}
                max={0}
                step={0.5}
                value={normTargetDb}
                onChange={(e) => setNormTargetDb(parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
              {currentStats && (
                <p className="text-[11px] mt-1 font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
                  Pic actuel : {currentStats.peakDb.toFixed(1)} dBFS
                </p>
              )}
            </div>
          )}

          {effect === 'fade' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFadeDirection('in')}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: fadeDirection === 'in' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: fadeDirection === 'in' ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  Fondu d&apos;entrée (Fade In)
                </button>
                <button
                  type="button"
                  onClick={() => setFadeDirection('out')}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor: fadeDirection === 'out' ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: fadeDirection === 'out' ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  Fondu de sortie (Fade Out)
                </button>
              </div>
              <div>
                <span className="block text-xs mb-1.5" style={{ color: 'var(--text-secondary)' }}>
                  Profil de courbe
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ['linear', 'Linéaire'],
                      ['exponential', 'Exponentielle'],
                      ['scurve', 'Courbe en S'],
                    ] as const
                  ).map(([id, label]) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setFadeCurve(id)}
                      className="px-2.5 py-1.5 rounded border text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor: fadeCurve === id ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                        borderColor: fadeCurve === id ? 'var(--accent-primary)' : 'var(--border-subtle)',
                        color: 'var(--text-primary)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              <svg
                viewBox="0 0 280 76"
                className="w-full h-20 rounded-lg border"
                style={{ backgroundColor: 'var(--wave-bg)', borderColor: 'var(--border-subtle)' }}
              >
                <polyline
                  fill="none"
                  stroke="var(--accent-secondary)"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  points={fadePoints}
                />
              </svg>
            </>
          )}

          {effect === 'speed-pitch' && (
            <>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="eff-speed-range" style={{ color: 'var(--text-secondary)' }}>
                    Vitesse de lecture
                  </label>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {speedRatio.toFixed(2)}x ({Math.round(speedRatio * 100)} %)
                  </span>
                </div>
                <input
                  id="eff-speed-range"
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={speedRatio}
                  onChange={(e) => setSpeedRatio(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <label htmlFor="eff-pitch-range" style={{ color: 'var(--text-secondary)' }}>
                    Hauteur (Pitch)
                  </label>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} demi-tons
                  </span>
                </div>
                <input
                  id="eff-pitch-range"
                  type="range"
                  min={-12}
                  max={12}
                  step={1}
                  value={pitchSemitones}
                  onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))}
                  className="w-full studio-slider"
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={preservePitch}
                  onChange={(e) => setPreservePitch(e.target.checked)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  Conserver la hauteur lors du changement de vitesse (WSOLA)
                </span>
              </label>
            </>
          )}

          {effect === 'eq' && (
            <div className="space-y-3">
              {(
                [
                  ['Graves (120 Hz)', eqLowDb, setEqLowDb],
                  ['Médiums (1.2 kHz)', eqMidDb, setEqMidDb],
                  ['Aigus (6.5 kHz)', eqHighDb, setEqHighDb],
                ] as const
              ).map(([lbl, val, setter]) => (
                <div key={lbl}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span style={{ color: 'var(--text-secondary)' }}>{lbl}</span>
                    <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                      {val >= 0 ? '+' : ''}{val.toFixed(1)} dB
                    </span>
                  </div>
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={0.5}
                    value={val}
                    onChange={(e) => setter(parseFloat(e.target.value))}
                    className="w-full studio-slider"
                  />
                </div>
              ))}
            </div>
          )}

          {effect === 'filter' && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['highpass', 'Passe-haut'],
                    ['lowpass', 'Passe-bas'],
                    ['notch', 'Coupe-bande'],
                  ] as const
                ).map(([kind, lbl]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setFilterKind(kind);
                      if (kind === 'notch') {
                        setFilterFreq(50);
                        setFilterQ(8);
                      } else if (kind === 'highpass') {
                        setFilterFreq(80);
                        setFilterQ(0.707);
                      } else {
                        setFilterFreq(8000);
                        setFilterQ(0.707);
                      }
                    }}
                    className="px-2 py-1.5 rounded border text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: filterKind === kind ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      borderColor: filterKind === kind ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Fréquence de coupure</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {filterFreq} Hz
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={16000}
                  step={10}
                  value={filterFreq}
                  onChange={(e) => setFilterFreq(parseInt(e.target.value, 10))}
                  className="w-full studio-slider"
                />
              </div>
            </div>
          )}

          {effect === 'compressor' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Seuil (Threshold)</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {compThresholdDb} dBFS
                  </span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={-2}
                  step={1}
                  value={compThresholdDb}
                  onChange={(e) => setCompThresholdDb(parseInt(e.target.value, 10))}
                  className="w-full studio-slider"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Ratio</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {compRatio.toFixed(1)} : 1
                  </span>
                </div>
                <input
                  type="range"
                  min={1.2}
                  max={10}
                  step={0.2}
                  value={compRatio}
                  onChange={(e) => setCompRatio(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              </div>
              <label className="flex items-center gap-2 text-xs cursor-pointer">
                <input
                  type="checkbox"
                  checked={compAutoGain}
                  onChange={(e) => setCompAutoGain(e.target.checked)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  Auto-Gain vers pic cible ({compTargetDb.toFixed(1)} dBFS)
                </span>
              </label>
              {compAutoGain && (
                <input
                  type="range"
                  min={-6}
                  max={0}
                  step={0.5}
                  value={compTargetDb}
                  onChange={(e) => setCompTargetDb(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              )}
            </div>
          )}

          {effect === 'noise-reduction' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                  {noiseProfile
                    ? `Profil capturé (${noiseProfile.fftSize} pts)`
                    : 'Aucun profil mémorisé (utilisera la sélection)'}
                </span>
                {onCaptureNoiseProfile && (
                  <button
                    type="button"
                    disabled={!rangeInfo.hasSelection}
                    onClick={() => {
                      const prof = captureNoiseProfile(
                        document.channels,
                        document.sampleRate,
                        rangeInfo.start,
                        rangeInfo.end
                      );
                      onCaptureNoiseProfile(prof);
                    }}
                    className="px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer disabled:opacity-40"
                    style={{
                      backgroundColor: 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--accent-secondary)',
                    }}
                  >
                    Capturer le bruit
                  </button>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Atténuation</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    -{nrReductionDb} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={4}
                  max={36}
                  step={1}
                  value={nrReductionDb}
                  onChange={(e) => setNrReductionDb(parseInt(e.target.value, 10))}
                  className="w-full studio-slider"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Sensibilité</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {nrSensitivity.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={nrSensitivity}
                  onChange={(e) => setNrSensitivity(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              </div>
            </div>
          )}

          {effect === 'echo' && (
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Délai</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {echoDelayMs} ms
                  </span>
                </div>
                <input
                  type="range"
                  min={30}
                  max={800}
                  step={10}
                  value={echoDelayMs}
                  onChange={(e) => setEchoDelayMs(parseInt(e.target.value, 10))}
                  className="w-full studio-slider"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span style={{ color: 'var(--text-secondary)' }}>Feedback / Mix</span>
                  <span className="font-mono-tabular font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                    {Math.round(echoFeedback * 100)}% / {Math.round(echoMix * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={0.85}
                  step={0.05}
                  value={echoFeedback}
                  onChange={(e) => setEchoFeedback(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
                <input
                  type="range"
                  min={0.05}
                  max={0.85}
                  step={0.05}
                  value={echoMix}
                  onChange={(e) => setEchoMix(parseFloat(e.target.value))}
                  className="w-full studio-slider mt-2"
                />
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-t"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            disabled={!rangeInfo.hasSelection}
            onClick={handlePreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isPreviewPlaying ? 'var(--accent-soft)' : 'var(--bg-surface)',
              borderColor: isPreviewPlaying ? 'var(--accent-primary)' : 'var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
          >
            {isPreviewPlaying ? (
              <>
                <Square className="w-3.5 h-3.5" />
                Arrêter l&apos;écoute
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Pré-écouter
              </>
            )}
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onStopPreview();
                onClose();
              }}
              className="px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={!rangeInfo.hasSelection}
              onClick={handleConfirm}
              className="px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
