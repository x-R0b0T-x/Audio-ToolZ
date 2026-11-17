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
import type {
  AudioDocument,
  EffectModalId,
  FadeCurve,
  FadeDirection,
} from '../audio/types';

interface EffectModalProps {
  effect: EffectModalId;
  document: AudioDocument | null;
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
      const next = applyFade(
        document.channels,
        start,
        end,
        fadeDirection,
        fadeCurve
      );
      return {
        fullChannels: next,
        previewSegment: next.map((c) => c.subarray(start, end)),
        label: `Fondu ${fadeDirection === 'in' ? "d'entrée" : 'de sortie'}`,
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
  };

  // Fade SVG curve points
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
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <h2
              id="effect-modal-title"
              className="text-sm font-display font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              {titles[effect]}
            </h2>
            <p
              className="text-xs mt-0.5 font-mono-tabular"
              style={{ color: 'var(--text-secondary)' }}
            >
              {rangeInfo.hasSelection
                ? `Sélection active : ${formatTimecode(
                    rangeInfo.start / document.sampleRate
                  )} → ${formatTimecode(rangeInfo.end / document.sampleRate)}`
                : 'Aucune sélection active — sélectionnez une zone audio'}
            </p>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={() => {
              onStopPreview();
              onClose();
            }}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {!rangeInfo.hasSelection && (
            <div
              className="px-3 py-2 rounded-lg border text-xs"
              style={{
                backgroundColor: 'rgba(251, 77, 109, 0.12)',
                borderColor: 'var(--record-color)',
                color: 'var(--text-primary)',
              }}
            >
              Les effets s&apos;appliquent uniquement sur une zone sélectionnée. Tracez une sélection sur la forme d&apos;onde puis réessayez.
            </div>
          )}
          {effect === 'volume' && (
            <>
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="eff-volume-range"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Gain appliqué
                </label>
                <span
                  className="font-mono-tabular font-semibold text-sm"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  {volumeGainDb > 0 ? `+${volumeGainDb.toFixed(1)}` : volumeGainDb.toFixed(1)}{' '}
                  dB ({Math.round(Math.pow(10, volumeGainDb / 20) * 100)} %)
                </span>
              </div>
              <input
                id="eff-volume-range"
                type="range"
                min={-36}
                max={24}
                step={0.5}
                value={volumeGainDb}
                onChange={(e) => setVolumeGainDb(parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
              <div className="flex flex-wrap gap-2">
                {[-12, -6, -3, 0, 3, 6, 12].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setVolumeGainDb(preset)}
                    className="px-2.5 py-1 rounded border text-xs font-mono-tabular cursor-pointer"
                    style={{
                      backgroundColor:
                        volumeGainDb === preset
                          ? 'var(--accent-primary)'
                          : 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color:
                        volumeGainDb === preset
                          ? '#ffffff'
                          : 'var(--text-primary)',
                    }}
                  >
                    {preset > 0 ? `+${preset}` : preset} dB
                  </button>
                ))}
              </div>
            </>
          )}

          {effect === 'normalize' && (
            <>
              {currentStats && (
                <div
                  className="flex items-center justify-between px-3 py-2 rounded-lg border text-xs"
                  style={{
                    backgroundColor: 'var(--bg-input)',
                    borderColor: 'var(--border-subtle)',
                  }}
                >
                  <span style={{ color: 'var(--text-secondary)' }}>
                    Pic maximum détecté
                  </span>
                  <span
                    className="font-mono-tabular font-semibold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {currentStats.peakDb.toFixed(2)} dBFS
                  </span>
                </div>
              )}
              <div className="flex items-center justify-between text-xs">
                <label
                  htmlFor="eff-norm-range"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Niveau cible (Pic)
                </label>
                <span
                  className="font-mono-tabular font-semibold text-sm"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  {normTargetDb.toFixed(1)} dBFS
                </span>
              </div>
              <input
                id="eff-norm-range"
                type="range"
                min={-12}
                max={0}
                step={0.1}
                value={normTargetDb}
                onChange={(e) => setNormTargetDb(parseFloat(e.target.value))}
                className="w-full studio-slider"
              />
              <div className="flex flex-wrap gap-2">
                {[-3, -1, -0.3, 0].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => setNormTargetDb(preset)}
                    className="px-2.5 py-1 rounded border text-xs font-mono-tabular cursor-pointer"
                    style={{
                      backgroundColor:
                        Math.abs(normTargetDb - preset) < 0.05
                          ? 'var(--accent-primary)'
                          : 'var(--bg-elevated)',
                      borderColor: 'var(--border-subtle)',
                      color:
                        Math.abs(normTargetDb - preset) < 0.05
                          ? '#ffffff'
                          : 'var(--text-primary)',
                    }}
                  >
                    {preset.toFixed(1)} dB
                  </button>
                ))}
              </div>
            </>
          )}

          {effect === 'fade' && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setFadeDirection('in')}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor:
                      fadeDirection === 'in'
                        ? 'var(--accent-primary)'
                        : 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color:
                      fadeDirection === 'in' ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  Fondu d&apos;entrée (Fade In)
                </button>
                <button
                  type="button"
                  onClick={() => setFadeDirection('out')}
                  className="px-3 py-2 rounded-lg border text-xs font-semibold cursor-pointer"
                  style={{
                    backgroundColor:
                      fadeDirection === 'out'
                        ? 'var(--accent-primary)'
                        : 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color:
                      fadeDirection === 'out' ? '#ffffff' : 'var(--text-primary)',
                  }}
                >
                  Fondu de sortie (Fade Out)
                </button>
              </div>

              <div>
                <span
                  className="block text-xs mb-1.5"
                  style={{ color: 'var(--text-secondary)' }}
                >
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
                        backgroundColor:
                          fadeCurve === id
                            ? 'var(--accent-soft)'
                            : 'var(--bg-elevated)',
                        borderColor:
                          fadeCurve === id
                            ? 'var(--accent-primary)'
                            : 'var(--border-subtle)',
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
                style={{
                  backgroundColor: 'var(--wave-bg)',
                  borderColor: 'var(--border-subtle)',
                }}
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
                  <label
                    htmlFor="eff-speed-range"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Vitesse de lecture
                  </label>
                  <span
                    className="font-mono-tabular font-semibold"
                    style={{ color: 'var(--accent-secondary)' }}
                  >
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
                  <label
                    htmlFor="eff-pitch-range"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Hauteur (Pitch)
                  </label>
                  <span
                    className="font-mono-tabular font-semibold"
                    style={{ color: 'var(--accent-secondary)' }}
                  >
                    {pitchSemitones > 0
                      ? `+${pitchSemitones}`
                      : pitchSemitones}{' '}
                    demi-tons
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
        </div>

        <div
          className="flex items-center justify-between gap-3 px-4 py-3 border-t"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            disabled={!rangeInfo.hasSelection}
            onClick={handlePreview}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              backgroundColor: isPreviewPlaying
                ? 'var(--accent-soft)'
                : 'var(--bg-surface)',
              borderColor: isPreviewPlaying
                ? 'var(--accent-primary)'
                : 'var(--border-subtle)',
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
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              Appliquer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
