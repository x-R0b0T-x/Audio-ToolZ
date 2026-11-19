import { audioEngine, type PreviewBand } from '../audio/engine';
import React, { useMemo, useState, useEffect } from 'react';
import { X } from 'lucide-react';
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
  onStartPreview: (previewChannels: Float32Array[], sampleRate: number, liveGainDb?: number, bands?: PreviewBand[]) => void;
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

  // Filtre
  const [filterKind, setFilterKind] = useState<'highpass' | 'lowpass' | 'notch'>('highpass');
  const [filterFreq, setFilterFreq] = useState(80);
  const [filterQ, setFilterQ] = useState(0.707);

  // Compresseur
  const [compThresholdDb, setCompThresholdDb] = useState(-20);
  const [compRatio, setCompRatio] = useState(3.2);
  const [compAutoGain, setCompAutoGain] = useState(true);
  const [compTargetDb, setCompTargetDb] = useState(-1.0);

  // Bruit
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

  useEffect(() => {
    if (!effect || !rangeInfo.hasSelection || !document) return;

    const { start, end } = rangeInfo;

    if (effect === 'volume') {
      onStartPreview(
        document.channels.map((channel) =>
          channel.subarray(start, end)
        ),
        document.sampleRate,
        volumeGainDb
      );
      return;
    }

    if (effect === 'eq' || effect === 'filter') {
      const bands: PreviewBand[] =
        effect === 'eq'
          ? [
              {
                type: 'lowshelf',
                frequency: 120,
                gainDb: eqLowDb,
                q: 0.7,
              },
              {
                type: 'peaking',
                frequency: 1200,
                gainDb: eqMidDb,
                q: 0.9,
              },
              {
                type: 'highshelf',
                frequency: 6500,
                gainDb: eqHighDb,
                q: 0.7,
              },
            ]
          : [
              {
                type: filterKind,
                frequency: filterFreq,
                q: filterQ,
              },
            ];

      onStartPreview(
        document.channels.map((channel) =>
          channel.subarray(start, end)
        ),
        document.sampleRate,
        undefined,
        bands
      );
      return;
    }

    const timer = window.setTimeout(() => {
      const res = computeProcessed();

      onStartPreview(
        res.previewSegment,
        document.sampleRate
      );
    }, 60);

    return () => window.clearTimeout(timer);
  }, [
    effect,
    document,
    volumeGainDb,
    normTargetDb,
    fadeDirection,
    fadeCurve,
    speedRatio,
    pitchSemitones,
    preservePitch,
    eqLowDb,
    eqMidDb,
    eqHighDb,
    filterKind,
    filterFreq,
    filterQ,
    compThresholdDb,
    compRatio,
    compAutoGain,
    compTargetDb,
    nrReductionDb,
    nrSensitivity,
    echoDelayMs,
    echoFeedback,
    echoMix,
  ]);

  useEffect(() => {
    if (!effect || !document || !rangeInfo.hasSelection) return;

    let frame = 0;
    let lastRead = -Infinity;

    const refresh = (now: number) => {
      if (now - lastRead >= 33) {
        lastRead = now;

        const { leftPeak, rightPeak } =
          audioEngine.readLiveMeters();

        const peak = Math.max(leftPeak, rightPeak);

        const db =
          peak > 0
            ? Math.max(-60, 20 * Math.log10(peak))
            : -60;

        window.document
          .querySelectorAll<HTMLMeterElement>(
            'meter.atz-effect-meter'
          )
          .forEach((meter) => {
            meter.value = db;
            meter.title =
              peak > 0
                ? `${db.toFixed(1)} dBFS`
                : 'Silence';
          });
      }

      frame = requestAnimationFrame(refresh);
    };

    frame = requestAnimationFrame(refresh);

    return () => cancelAnimationFrame(frame);
  }, [effect, document, rangeInfo.hasSelection]);

  if (!effect || !document) return null;

    const ctx = this.ctx;
    const oldSource = this.sourceNode;
    const destination = this.previewNodes[0] ?? this.preSplitGain;
    const total = channels[0]?.length ?? 0;

    if (
      !ctx ||
      !oldSource ||
      !destination ||
      !this.isPlayingState ||
      !this.isLooping ||
      this.isReverse ||
      total === 0 ||
      sampleRate <= 0 ||
      channels.some((channel) => channel.length !== total)
    ) {
      return false;
    }

    const buffer = ctx.createBuffer(
      channels.length,
      total,
      sampleRate
    );

    for (let channel = 0; channel < channels.length; channel++) {
      buffer.getChannelData(channel).set(channels[channel]);
    }

    const previousLength = Math.max(
      1,
      this.playbackEndSample - this.playbackStartSample
    );

    const previousPosition = Math.max(
      0,
      this.getCurrentSample() - this.playbackStartSample
    );

    const relativePosition =
      (previousPosition % previousLength) / previousLength;

    const nextPosition = Math.min(
      total - 1,
      Math.floor(relativePosition * total)
    );

    const now = ctx.currentTime;
    const transitionSeconds = 0.02;

    const incomingGain = ctx.createGain();
    const outgoingGain = ctx.createGain();

    incomingGain.gain.setValueAtTime(0, now);
    incomingGain.gain.linearRampToValueAtTime(
      1,
      now + transitionSeconds
    );

    outgoingGain.gain.setValueAtTime(1, now);
    outgoingGain.gain.linearRampToValueAtTime(
      0,
      now + transitionSeconds
    );

    const nextSource = ctx.createBufferSource();
    nextSource.buffer = buffer;
    nextSource.loop = true;
    nextSource.loopStart = 0;
    nextSource.loopEnd = total / sampleRate;
    nextSource.playbackRate.setValueAtTime(
      this.speedRatio,
      now
    );

    nextSource.connect(incomingGain);
    incomingGain.connect(destination);
    outgoingGain.connect(destination);

    oldSource.disconnect();
    oldSource.connect(outgoingGain);
    oldSource.onended = null;

    nextSource.start(now, nextPosition / sampleRate);

    this.sourceNode = nextSource;
    this.currentBuffer = buffer;
    this.currentTotalSamples = total;
    this.currentChannelCount = channels.length;
    this.currentDocSampleRate = sampleRate;
    this.playbackStartSample = 0;
    this.playbackEndSample = total;
    this.offsetSamplesAtStart = nextPosition;
    this.startedAtCtxTime = now;
    this.isPlayingState = true;
    this.isPausedState = false;
    this.isLooping = true;
    this.isReverse = false;

    this.setEnabledChannels(
      this.enabledChannels,
      channels.length
    );

    oldSource.stop(now + transitionSeconds);

    window.setTimeout(() => {
      try {
        oldSource.disconnect();
      } catch {
        // La source peut avoir déjà été déconnectée.
      }

      outgoingGain.disconnect();

      if (this.sourceNode === nextSource) {
        nextSource.disconnect();
        nextSource.connect(destination);
      }

      incomingGain.disconnect();
    }, Math.ceil(transitionSeconds * 1000) + 50);

    return true;
  }

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

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="effect-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 select-none"
    >
      <div
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden"
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
                ? `Sélection : ${formatTimecode(rangeInfo.start / document.sampleRate)} → ${formatTimecode(rangeInfo.end / document.sampleRate)} (Écoute directe active)`
                : 'Sélectionnez une zone audio pour appliquer cet effet.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
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

          {/* Égaliseur 3 bandes avec Faders Studio Violets & Verts + dB Meter */}
          {effect === 'eq' && (
            <div className="grid grid-cols-3 gap-6 py-4 px-6 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
              {[
                { label: 'Graves', freq: '120 Hz', val: eqLowDb, set: setEqLowDb },
                { label: 'Médiums', freq: '1.2 kHz', val: eqMidDb, set: setEqMidDb },
                { label: 'Aigus', freq: '6.5 kHz', val: eqHighDb, set: setEqHighDb },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                  <span className="text-[10px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>{f.freq}</span>
                  
                  <div className="flex items-center gap-2 h-44 py-1">
                    <div className="flex flex-col justify-between h-36 text-[9px] font-mono-tabular text-right select-none opacity-60" style={{ color: 'var(--text-muted)' }}>
                      <span>+12</span>
                      <span>+6</span>
                      <span>0</span>
                      <span>-6</span>
                      <span>-12</span>
                    </div>
                    <div className="relative h-36 w-6 flex items-center justify-center">
                      <div className="atz-effect-fader">
                        <input
                          type="range"
                          min={-12}
                          max={12}
                          step={0.5}
                          value={f.val}
                          onChange={(e) => f.set(parseFloat(e.target.value))}
                          className="cursor-pointer studio-fader-vertical"
                          style={{
                            writingMode: 'vertical-lr',
                            direction: 'rtl',
                            height: '144px',
                            width: '24px',
                            accentColor: '#45f882',
                          }}
                        />
                        <div className="atz-effect-meter-column">
                          <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                          <span aria-hidden="true">dB</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                    {f.val >= 0 ? '+' : ''}{f.val.toFixed(1)} dB
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Écho / Delay */}
          {effect === 'echo' && (
            <div className="grid grid-cols-3 gap-6 py-4 px-6 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
              {[
                { label: 'Délai', unit: 'ms', val: echoDelayMs, set: setEchoDelayMs, min: 20, max: 800, step: 10, display: `${echoDelayMs} ms` },
                { label: 'Feedback', unit: '%', val: Math.round(echoFeedback * 100), set: (v: number) => setEchoFeedback(v / 100), min: 0, max: 90, step: 1, display: `${Math.round(echoFeedback * 100)} %` },
                { label: 'Mix', unit: '%', val: Math.round(echoMix * 100), set: (v: number) => setEchoMix(v / 100), min: 0, max: 100, step: 1, display: `${Math.round(echoMix * 100)} %` },
              ].map((f) => (
                <div key={f.label} className="flex flex-col items-center gap-2">
                  <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>{f.label}</span>
                  <span className="text-[10px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>{f.unit}</span>
                  <div className="h-44 flex items-center justify-center py-1">
                    <div className="atz-effect-fader">
                      <input
                        type="range"
                        min={f.min}
                        max={f.max}
                        step={f.step}
                        value={f.val}
                        onChange={(e) => f.set(parseFloat(e.target.value))}
                        className="cursor-pointer"
                        style={{
                          writingMode: 'vertical-lr',
                          direction: 'rtl',
                          height: '144px',
                          width: '24px',
                          accentColor: '#45f882',
                        }}
                      />
                      <div className="atz-effect-meter-column">
                        <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                        <span aria-hidden="true">dB</span>
                      </div>
                    </div>
                  </div>
                  <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                    {f.display}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Volume */}
          {effect === 'volume' && (
            <div className="flex flex-col items-center gap-3 py-4 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Gain Master</span>
              <div className="flex items-center gap-3 h-44">
                <div className="flex flex-col justify-between h-36 text-[9px] font-mono-tabular text-right select-none opacity-60" style={{ color: 'var(--text-muted)' }}>
                  <span>+24</span>
                  <span>+12</span>
                  <span>0</span>
                  <span>-12</span>
                  <span>-24</span>
                </div>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={-24}
                    max={24}
                    step={0.5}
                    value={volumeGainDb}
                    onChange={(e) => setVolumeGainDb(parseFloat(e.target.value))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
              </div>
              <span className="font-mono-tabular text-sm font-semibold px-3 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                {volumeGainDb >= 0 ? '+' : ''}{volumeGainDb.toFixed(1)} dB
              </span>
            </div>
          )}

          {/* Normaliser */}
          {effect === 'normalize' && (
            <div className="flex flex-col items-center gap-3 py-4 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Pic Cible</span>
              <div className="flex items-center gap-3 h-44">
                <div className="flex flex-col justify-between h-36 text-[9px] font-mono-tabular text-right select-none opacity-60" style={{ color: 'var(--text-muted)' }}>
                  <span>0</span>
                  <span>-3</span>
                  <span>-6</span>
                  <span>-9</span>
                  <span>-12</span>
                </div>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={-12}
                    max={0}
                    step={0.5}
                    value={normTargetDb}
                    onChange={(e) => setNormTargetDb(parseFloat(e.target.value))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
              </div>
              <span className="font-mono-tabular text-sm font-semibold px-3 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                {normTargetDb.toFixed(1)} dBFS
              </span>
              {currentStats && (
                <p className="text-[11px] font-mono-tabular" style={{ color: 'var(--text-muted)' }}>
                  Pic actuel : {currentStats.peakDb.toFixed(1)} dBFS
                </p>
              )}
            </div>
          )}

          {/* Filtre */}
          {effect === 'filter' && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['highpass', 'Passe-haut'],
                  ['lowpass', 'Passe-bas'],
                  ['notch', 'Coupe-bande (50 Hz)'],
                ].map(([kind, lbl]) => (
                  <button
                    key={kind}
                    type="button"
                    onClick={() => {
                      setFilterKind(kind as any);
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
                    {lbl}
                  </button>
                ))}
              </div>
              <div className="flex flex-col items-center gap-3 py-4 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Fréquence de coupure</span>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={30}
                    max={16000}
                    step={10}
                    value={filterFreq}
                    onChange={(e) => setFilterFreq(parseInt(e.target.value, 10))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
                <span className="font-mono-tabular text-sm font-semibold px-3 py-1 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                  {filterFreq} Hz
                </span>
              </div>
            </div>
          )}

          {/* Compresseur */}
          {effect === 'compressor' && (
            <div className="grid grid-cols-2 gap-6 py-4 px-6 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Seuil</span>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={-40}
                    max={-2}
                    step={1}
                    value={compThresholdDb}
                    onChange={(e) => setCompThresholdDb(parseInt(e.target.value, 10))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                  {compThresholdDb} dBFS
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Ratio</span>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={1.2}
                    max={10}
                    step={0.2}
                    value={compRatio}
                    onChange={(e) => setCompRatio(parseFloat(e.target.value))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                  {compRatio.toFixed(1)} : 1
                </span>
              </div>
            </div>
          )}

          {/* Fondus */}
          {effect === 'fade' && (
            <div className="space-y-3">
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
              <div className="grid grid-cols-3 gap-2">
                {[
                  ['linear', 'Linéaire'],
                  ['exponential', 'Exponentielle'],
                  ['scurve', 'Courbe en S'],
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setFadeCurve(id as any)}
                    className="px-2 py-1.5 rounded border text-xs font-medium cursor-pointer"
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
          )}

          {/* Speed / Pitch */}
          {effect === 'speed-pitch' && (
            <div className="grid grid-cols-2 gap-6 py-4 px-6 rounded-xl border bg-[var(--bg-canvas)] border-[var(--border-subtle)]">
              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Vitesse</span>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={0.5}
                    max={2.0}
                    step={0.05}
                    value={speedRatio}
                    onChange={(e) => setSpeedRatio(parseFloat(e.target.value))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                  {speedRatio.toFixed(2)}x
                </span>
              </div>

              <div className="flex flex-col items-center gap-2">
                <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Hauteur (Pitch)</span>
                <div className="atz-effect-fader">
                  <input
                    type="range"
                    min={-12}
                    max={12}
                    step={1}
                    value={pitchSemitones}
                    onChange={(e) => setPitchSemitones(parseInt(e.target.value, 10))}
                    className="cursor-pointer"
                    style={{
                      writingMode: 'vertical-lr',
                      direction: 'rtl',
                      height: '144px',
                      width: '28px',
                      accentColor: '#45f882',
                    }}
                  />
                  <div className="atz-effect-meter-column">
                    <meter className="atz-effect-meter" min={-60} max={0} value={-60} aria-label="Crête en sortie de préécoute, en dBFS" />
                    <span aria-hidden="true">dB</span>
                  </div>
                </div>
                <span className="font-mono-tabular text-xs font-semibold px-2 py-0.5 rounded border border-[var(--border-subtle)] bg-[var(--bg-elevated)]" style={{ color: '#45f882' }}>
                  {pitchSemitones > 0 ? `+${pitchSemitones}` : pitchSemitones} dt
                </span>
              </div>
            </div>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-5 py-3 border-t"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => {
              onClose();
            }}
            className="px-4 py-2 rounded-lg border text-xs font-medium cursor-pointer"
            style={{
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Annuler
          </button>
          <button
            type="button"
            disabled={!rangeInfo.hasSelection}
            onClick={() => {
              if (!rangeInfo.hasSelection || !document) return;

              const res = computeProcessed();

              onApply(
                res.fullChannels,
                res.label,
                res.nextSelection
              );
            }}
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
