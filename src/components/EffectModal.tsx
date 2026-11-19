import React, { useEffect, useMemo, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { audioEngine, type PreviewBand } from '../audio/engine';
import {
  analyzeAudioStats,
  applyFade,
  applySpeedAndPitch,
  applyVolume,
  clampSelection,
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
  onStartPreview: (
    previewChannels: Float32Array[],
    sampleRate: number,
    liveGainDb?: number,
    bands?: PreviewBand[]
  ) => void;
  onStopPreview: () => void;
  onApply: (
    nextChannels: Float32Array[],
    label: string,
    nextSelection?: { startSample: number; endSample: number }
  ) => void;
  onClose: () => void;
}

interface FaderProps {
  label: string;
  detail?: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
  ticks?: string[];
}

const Fader: React.FC<FaderProps> = ({
  label, detail, value, min, max, step, display, onChange, ticks,
}) => (
  <div className="flex flex-col items-center gap-2">
    <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
      {label}
    </span>
    {detail && (
      <span className="text-[10px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
        {detail}
      </span>
    )}
    <div className="flex items-center gap-3 h-44">
      {ticks && (
        <div
          className="flex flex-col justify-between h-36 text-[9px] font-mono-tabular text-right select-none opacity-60"
          style={{ color: 'var(--text-muted)' }}
        >
          {ticks.map((tick, index) => <span key={index}>{tick}</span>)}
        </div>
      )}
      <div className="atz-effect-fader">
        <input
          type="range"
          aria-label={label}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
          className="cursor-pointer studio-fader-vertical"
          style={{
            writingMode: 'vertical-lr',
            direction: 'rtl',
            height: '144px',
            width: '28px',
            accentColor: '#45f882',
          }}
        />
        <div className="atz-effect-meter-column">
          <meter
            className="atz-effect-meter"
            min={-60}
            max={0}
            value={-60}
            aria-label="Crête en sortie de préécoute, en dBFS"
          />
          <span aria-hidden="true">dB</span>
        </div>
      </div>
    </div>
    <span
      className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]"
      style={{ color: '#45f882' }}
    >
      {display}
    </span>
  </div>
);

const panelClass =
  'py-4 px-6 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]';

export const EffectModal: React.FC<EffectModalProps> = ({
  effect,
  document,
  noiseProfile,
  onStartPreview,
  onApply,
  onClose,
}) => {
  const [volumeGainDb, setVolumeGainDb] = useState(0);
  const [normTargetDb, setNormTargetDb] = useState(-1);
  const [fadeDirection, setFadeDirection] = useState<FadeDirection>('in');
  const [fadeCurve, setFadeCurve] = useState<FadeCurve>('scurve');
  const [speedRatio, setSpeedRatio] = useState(1);
  const [pitchSemitones, setPitchSemitones] = useState(0);
  const [preservePitch] = useState(true);
  const [eqLowDb, setEqLowDb] = useState(0);
  const [eqMidDb, setEqMidDb] = useState(0);
  const [eqHighDb, setEqHighDb] = useState(0);
  const [filterKind, setFilterKind] =
    useState<'highpass' | 'lowpass' | 'notch'>('highpass');
  const [filterFreq, setFilterFreq] = useState(80);
  const [filterQ, setFilterQ] = useState(0.707);
  const [compThresholdDb, setCompThresholdDb] = useState(-20);
  const [compRatio, setCompRatio] = useState(3.2);
  const [compAutoGain] = useState(true);
  const [compTargetDb] = useState(-1);
  const [nrReductionDb] = useState(14);
  const [nrSensitivity] = useState(1);
  const [echoDelayMs, setEchoDelayMs] = useState(140);
  const [echoFeedback, setEchoFeedback] = useState(0.32);
  const [echoMix, setEchoMix] = useState(0.28);

  const previewCallback = useRef(onStartPreview);
  previewCallback.current = onStartPreview;

  const rangeInfo = useMemo(() => {
    if (!document) return { start: 0, end: 0, hasSelection: false };
    const total = document.channels[0]?.length ?? 0;
    const clamped = clampSelection(document.selection, total);
    return {
      start: clamped.startSample,
      end: clamped.endSample,
      hasSelection: clamped.endSample > clamped.startSample,
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

  const computeProcessed = (): {
    fullChannels: Float32Array[];
    previewSegment: Float32Array[];
    label: string;
    nextSelection?: { startSample: number; endSample: number };
  } => {
    if (!document) {
      return { fullChannels: [], previewSegment: [], label: '' };
    }

    const { start, end } = rangeInfo;
    const packageResult = (fullChannels: Float32Array[], label: string) => ({
      fullChannels,
      previewSegment: fullChannels.map((channel) => channel.subarray(start, end)),
      label,
    });

    if (effect === 'volume') {
      return packageResult(
        applyVolume(document.channels, start, end, volumeGainDb),
        `Volume (${volumeGainDb >= 0 ? '+' : ''}${volumeGainDb.toFixed(1)} dB)`
      );
    }
    if (effect === 'normalize') {
      const result = normalizeChannels(document.channels, start, end, normTargetDb);
      return packageResult(result.channels, `Normaliser (${normTargetDb.toFixed(1)} dBFS)`);
    }
    if (effect === 'fade') {
      return packageResult(
        applyFade(document.channels, start, end, fadeDirection, fadeCurve),
        `Fondu ${fadeDirection === 'in' ? "d'entrée" : 'de sortie'}`
      );
    }
    if (effect === 'eq') {
      return packageResult(
        applyParametricEq(document.channels, document.sampleRate, start, end, [
          { type: 'lowshelf', frequency: 120, gainDb: eqLowDb, q: 0.7 },
          { type: 'peaking', frequency: 1200, gainDb: eqMidDb, q: 0.9 },
          { type: 'highshelf', frequency: 6500, gainDb: eqHighDb, q: 0.7 },
        ]),
        `EQ (${eqLowDb.toFixed(0)}/${eqMidDb.toFixed(0)}/${eqHighDb.toFixed(0)} dB)`
      );
    }
    if (effect === 'filter') {
      return packageResult(
        applyFrequencyFilter(
          document.channels, document.sampleRate, start, end,
          filterKind, filterFreq, filterQ
        ),
        `Filtre ${filterKind} (${filterFreq} Hz)`
      );
    }
    if (effect === 'compressor') {
      return packageResult(
        applyCompressorAutoGain(document.channels, document.sampleRate, start, end, {
          thresholdDb: compThresholdDb,
          ratio: compRatio,
          attackMs: 10,
          releaseMs: 120,
          autoGain: compAutoGain,
          targetPeakDb: compTargetDb,
        }),
        compAutoGain ? `Compresseur + Auto-Gain (${compTargetDb} dBFS)` : 'Compresseur'
      );
    }
    if (effect === 'noise-reduction') {
      const activeProfile = noiseProfile ?? captureNoiseProfile(
        document.channels, document.sampleRate, start, end
      );
      return packageResult(
        applySpectralNoiseReduction(document.channels, start, end, activeProfile, {
          reductionDb: nrReductionDb,
          sensitivity: nrSensitivity,
          smoothing: 0.35,
        }),
        `Réduction de bruit (-${nrReductionDb} dB)`
      );
    }
    if (effect === 'echo') {
      return packageResult(
        applyEchoDelay(document.channels, document.sampleRate, start, end, {
          delayMs: echoDelayMs,
          feedback: echoFeedback,
          mix: echoMix,
        }),
        `Écho (${echoDelayMs} ms)`
      );
    }

    const result = applySpeedAndPitch(
      document.channels, document.sampleRate, start, end,
      speedRatio, pitchSemitones, preservePitch
    );
    return {
      fullChannels: result.channels,
      previewSegment: result.channels.map((channel) => channel.subarray(
        result.selection.startSample, result.selection.endSample
      )),
      label: `Vitesse ${speedRatio.toFixed(2)}x / Pitch ${pitchSemitones >= 0 ? '+' : ''}${pitchSemitones} dt`,
      nextSelection: result.selection,
    };
  };

  useEffect(() => {
    if (!effect || !rangeInfo.hasSelection || !document) return;
    const { start, end } = rangeInfo;

    if (effect === 'volume') {
      previewCallback.current(
        document.channels.map((channel) => channel.subarray(start, end)),
        document.sampleRate,
        volumeGainDb
      );
      return;
    }

    if (effect === 'eq' || effect === 'filter') {
      const bands: PreviewBand[] = effect === 'eq'
        ? [
            { type: 'lowshelf', frequency: 120, gainDb: eqLowDb, q: 0.7 },
            { type: 'peaking', frequency: 1200, gainDb: eqMidDb, q: 0.9 },
            { type: 'highshelf', frequency: 6500, gainDb: eqHighDb, q: 0.7 },
          ]
        : [{ type: filterKind, frequency: filterFreq, q: filterQ }];
      previewCallback.current(
        document.channels.map((channel) => channel.subarray(start, end)),
        document.sampleRate,
        undefined,
        bands
      );
      return;
    }

    const timer = window.setTimeout(() => {
      const result = computeProcessed();
      previewCallback.current(result.previewSegment, document.sampleRate);
    }, 60);
    return () => window.clearTimeout(timer);
  }, [
    effect, document,
    volumeGainDb, normTargetDb, fadeDirection, fadeCurve,
    speedRatio, pitchSemitones, preservePitch,
    eqLowDb, eqMidDb, eqHighDb, filterKind, filterFreq, filterQ,
    compThresholdDb, compRatio, compAutoGain, compTargetDb,
    nrReductionDb, nrSensitivity, noiseProfile,
    echoDelayMs, echoFeedback, echoMix,
  ]);

  useEffect(() => {
    if (!effect || !document || !rangeInfo.hasSelection) return;
    let frame = 0;
    let lastRead = -Infinity;
    const refresh = (now: number) => {
      if (now - lastRead >= 33) {
        lastRead = now;
        const { leftPeak, rightPeak } = audioEngine.readLiveMeters();
        const peak = Math.max(leftPeak, rightPeak);
        const db = peak > 0 ? Math.max(-60, 20 * Math.log10(peak)) : -60;
        window.document
          .querySelectorAll<HTMLMeterElement>('meter.atz-effect-meter')
          .forEach((meter) => {
            meter.value = db;
            meter.title = peak > 0 ? `${db.toFixed(1)} dBFS` : 'Silence';
          });
      }
      frame = requestAnimationFrame(refresh);
    };
    frame = requestAnimationFrame(refresh);
    return () => cancelAnimationFrame(frame);
  }, [effect, document, rangeInfo.hasSelection]);

  if (!effect || !document) return null;

  const handleConfirm = () => {
    if (!rangeInfo.hasSelection) return;
    const result = computeProcessed();
    onApply(result.fullChannels, result.label, result.nextSelection);
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
  const matchingPresets = DEFAULT_STUDIO_PRESETS.filter((preset) => preset.category === effect);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="effect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 select-none"
    >
      <div
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden"
        style={{ backgroundColor: 'var(--bg-surface)', borderColor: 'var(--border-strong)' }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div>
            <h2 id="effect-modal-title" className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              {titles[effect]}
            </h2>
            <p className="text-[11px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
              {rangeInfo.hasSelection
                ? `Sélection : ${formatTimecode(rangeInfo.start / document.sampleRate)} → ${formatTimecode(rangeInfo.end / document.sampleRate)} (Écoute directe active)`
                : 'Sélectionnez une zone audio pour appliquer cet effet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-muted)' }}
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {matchingPresets.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {matchingPresets.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  disabled={!rangeInfo.hasSelection}
                  onClick={() => {
                    const { start, end } = rangeInfo;
                    const slice = document.channels.map((channel) => channel.slice(start, end));
                    const processed = applyEffectChain(
                      slice, document.sampleRate, preset.steps, noiseProfile ?? undefined
                    );
                    const next = document.channels.map((channel, index) => {
                      const copy = new Float32Array(channel);
                      copy.set(processed[index] ?? channel.subarray(start, end), start);
                      return copy;
                    });
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

          {effect === 'eq' && (
            <div className={`grid grid-cols-3 gap-6 ${panelClass}`}>
              {[
                { label: 'Graves', detail: '120 Hz', value: eqLowDb, set: setEqLowDb },
                { label: 'Médiums', detail: '1.2 kHz', value: eqMidDb, set: setEqMidDb },
                { label: 'Aigus', detail: '6.5 kHz', value: eqHighDb, set: setEqHighDb },
              ].map((fader) => (
                <Fader
                  key={fader.label}
                  label={fader.label}
                  detail={fader.detail}
                  value={fader.value}
                  onChange={fader.set}
                  min={-12} max={12} step={0.5}
                  ticks={['+12', '+6', '0', '-6', '-12']}
                  display={`${fader.value >= 0 ? '+' : ''}${fader.value.toFixed(1)} dB`}
                />
              ))}
            </div>
          )}

          {effect === 'echo' && (
            <div className={`grid grid-cols-3 gap-6 ${panelClass}`}>
              <Fader
                label="Délai" detail="ms"
                value={echoDelayMs} onChange={setEchoDelayMs}
                min={20} max={800} step={10}
                display={`${echoDelayMs} ms`}
              />
              <Fader
                label="Feedback" detail="%"
                value={Math.round(echoFeedback * 100)}
                onChange={(value) => setEchoFeedback(value / 100)}
                min={0} max={90} step={1}
                display={`${Math.round(echoFeedback * 100)} %`}
              />
              <Fader
                label="Mix" detail="%"
                value={Math.round(echoMix * 100)}
                onChange={(value) => setEchoMix(value / 100)}
                min={0} max={100} step={1}
                display={`${Math.round(echoMix * 100)} %`}
              />
            </div>
          )}

          {effect === 'volume' && (
            <div className={panelClass}>
              <Fader
                label="Gain Master"
                value={volumeGainDb} onChange={setVolumeGainDb}
                min={-24} max={24} step={0.5}
                ticks={['+24', '+12', '0', '-12', '-24']}
                display={`${volumeGainDb >= 0 ? '+' : ''}${volumeGainDb.toFixed(1)} dB`}
              />
            </div>
          )}

          {effect === 'normalize' && (
            <div className={`flex flex-col items-center gap-3 ${panelClass}`}>
              <Fader
                label="Pic Cible"
                value={normTargetDb} onChange={setNormTargetDb}
                min={-12} max={0} step={0.5}
                ticks={['0', '-3', '-6', '-9', '-12']}
                display={`${normTargetDb.toFixed(1)} dBFS`}
              />
              {currentStats && (
                <p className="text-[11px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
                  Pic actuel : {currentStats.peakDb.toFixed(1)} dBFS
                </p>
              )}
            </div>
          )}

          {effect === 'filter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['highpass', 'Passe-haut'],
                  ['lowpass', 'Passe-bas'],
                  ['notch', 'Coupe-bande (50 Hz)'],
                ] as const).map(([kind, label]) => (
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
                    className="px-2 py-2 rounded-lg border text-xs font-medium cursor-pointer transition-colors"
                    style={{
                      backgroundColor: filterKind === kind ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      borderColor: filterKind === kind ? '#45f882' : 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className={panelClass}>
                <Fader
                  label="Fréquence de coupure"
                  value={filterFreq} onChange={setFilterFreq}
                  min={30} max={16000} step={10}
                  display={`${filterFreq} Hz`}
                />
              </div>
            </div>
          )}

          {effect === 'compressor' && (
            <div className={`grid grid-cols-2 gap-6 ${panelClass}`}>
              <Fader
                label="Seuil"
                value={compThresholdDb} onChange={setCompThresholdDb}
                min={-40} max={-2} step={1}
                display={`${compThresholdDb} dBFS`}
              />
              <Fader
                label="Ratio"
                value={compRatio} onChange={setCompRatio}
                min={1.2} max={10} step={0.2}
                display={`${compRatio.toFixed(1)} : 1`}
              />
            </div>
          )}

          {effect === 'fade' && (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-2">
                {([
                  ['in', "Fondu d'entrée (Fade In)"],
                  ['out', 'Fondu de sortie (Fade Out)'],
                ] as const).map(([direction, label]) => (
                  <button
                    key={direction}
                    type="button"
                    onClick={() => setFadeDirection(direction)}
                    className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                    style={{
                      backgroundColor: fadeDirection === direction ? 'var(--accent-primary)' : 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color: fadeDirection === direction ? '#ffffff' : 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {([
                  ['linear', 'Linéaire'],
                  ['exponential', 'Exponentielle'],
                  ['scurve', 'Courbe en S'],
                ] as const).map(([curve, label]) => (
                  <button
                    key={curve}
                    type="button"
                    onClick={() => setFadeCurve(curve)}
                    className="px-2 py-1.5 rounded border text-xs font-medium cursor-pointer"
                    style={{
                      backgroundColor: fadeCurve === curve ? 'var(--accent-soft)' : 'var(--bg-elevated)',
                      borderColor: fadeCurve === curve ? 'var(--accent-primary)' : 'var(--border-subtle)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {effect === 'speed-pitch' && (
            <div className={`grid grid-cols-2 gap-6 ${panelClass}`}>
              <Fader
                label="Vitesse"
                value={speedRatio} onChange={setSpeedRatio}
                min={0.5} max={2} step={0.05}
                display={`${speedRatio.toFixed(2)}x`}
              />
              <Fader
                label="Hauteur (Pitch)"
                value={pitchSemitones} onChange={setPitchSemitones}
                min={-12} max={12} step={1}
                display={`${pitchSemitones > 0 ? '+' : ''}${pitchSemitones} dt`}
              />
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{ backgroundColor: 'var(--bg-elevated)', borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer"
            style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-secondary)' }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!rangeInfo.hasSelection}
            onClick={handleConfirm}
            className="px-5 py-2 rounded-lg text-xs font-semibold text-white cursor-pointer disabled:opacity-40"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Appliquer
          </button>
        </div>
      </div>
    </div>
  );
};
