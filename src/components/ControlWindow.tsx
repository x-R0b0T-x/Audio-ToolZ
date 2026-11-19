import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FastForward,
  Mic,
  Minimize2,
  Maximize2,
  Pause,
  Play,
  Repeat,
  Rewind,
  Square,
  X,
} from 'lucide-react';
import { audioEngine } from '../audio/engine';
import { formatTimecode, linearToDb } from '../audio/dsp';
import type { VisualAnalyzerMode } from '../audio/types';
import {
  loadPersistedUiState,
  savePersistedUiState,
} from '../utils/uiStateStorage';
import { BrandLogo } from './BrandLogo';

export type TransportPlayMode = 'idle' | 'play' | 'loop' | 'reverse' | 'fast';

interface ControlWindowProps {
  visible: boolean;
  hasDocument: boolean;
  isPlaying: boolean;
  isPaused: boolean;
  isLooping: boolean;
  playMode: TransportPlayMode;
  isRecording: boolean;
  volumeDb: number;
  balance: number;
  speedRatio: number;
  playheadSeconds: number;
  getPlayheadSeconds: () => number;
  onVolumeChange: (db: number) => void;
  onBalanceChange: (pan: number) => void;
  onSpeedChange: (ratio: number) => void;
  onPlay: () => void;
  onPlayLoop: () => void;
  onPause: () => void;
  onStop: () => void;
  onPlayReverse: () => void;
  onPlayFastForward: () => void;
  onToggleRecord: () => void;
  onClose: () => void;
}

export const ControlWindow: React.FC<ControlWindowProps> = ({
  visible,
  hasDocument,
  isPlaying,
  isPaused,
  isLooping,
  playMode,
  isRecording,
  volumeDb,
  balance,
  speedRatio,
  playheadSeconds,
  getPlayheadSeconds,
  onVolumeChange,
  onBalanceChange,
  onSpeedChange,
  onPlay,
  onPlayLoop,
  onPause,
  onStop,
  onPlayReverse,
  onPlayFastForward,
  onToggleRecord,
  onClose,
}) => {
  // Ancrage fixe permanent au coin inférieur droit de l'espace de travail
  const [rightOffset, setRightOffset] = useState<number>(18);
  const [bottomOffset, setBottomOffset] = useState<number>(28);

  const [collapsed, setCollapsed] = useState<boolean>(
    () => loadPersistedUiState().controlCollapsed
  );
  const [visualMode, setVisualMode] = useState<VisualAnalyzerMode>(
    () => loadPersistedUiState().visualMode
  );

  const draggingRef = useRef(false);
  const dragAnchorRef = useRef({ mouseX: 0, mouseY: 0, startR: 18, startB: 28 });

  const vuCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const visCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const peakHoldRef = useRef({ l: 0, r: 0, lTime: 0, rTime: 0 });
  const specPeaksRef = useRef<{ l: Float32Array; r: Float32Array }>({
    l: new Float32Array(32),
    r: new Float32Array(32),
  });
  const coloredHistoryRef = useRef<{
    l: Array<{ min: number; max: number }>;
    r: Array<{ min: number; max: number }>;
  }>({ l: [], r: [] });
  const coloredClockRef = useRef({ lastMs: 0, remainder: 0 });

  useEffect(() => {
    coloredClockRef.current = { lastMs: performance.now(), remainder: 0 };
  }, [visible, collapsed, visualMode, isPlaying, isRecording]);

  const timeDisplayRef = useRef<HTMLSpanElement | null>(null);

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggingRef.current = true;
    dragAnchorRef.current = {
      mouseX: e.clientX,
      mouseY: e.clientY,
      startR: rightOffset,
      startB: bottomOffset,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      const dx = e.clientX - dragAnchorRef.current.mouseX;
      const dy = e.clientY - dragAnchorRef.current.mouseY;
      setRightOffset(Math.max(10, Math.min(window.innerWidth - 420, dragAnchorRef.current.startR - dx)));
      setBottomOffset(Math.max(20, Math.min(window.innerHeight - 80, dragAnchorRef.current.startB - dy)));
    };
    const onUp = () => {
      draggingRef.current = false;
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [rightOffset, bottomOffset]);

  const drawMetersAndVisuals = useCallback(() => {
    const vuCanvas = vuCanvasRef.current;
    const visCanvas = visCanvasRef.current;
    if (!vuCanvas && !visCanvas) return;

    const style = getComputedStyle(document.documentElement);
    const waveBg = style.getPropertyValue('--wave-bg').trim() || '#080a14';
    const borderSubtle =
      style.getPropertyValue('--border-subtle').trim() || '#272f54';
    const lowCol = style.getPropertyValue('--meter-low').trim() || '#34d399';
    const midCol = style.getPropertyValue('--meter-mid').trim() || '#fbbf24';
    const highCol = style.getPropertyValue('--meter-high').trim() || '#f43f5e';
    const mutedCol =
      style.getPropertyValue('--text-muted').trim() || '#6c76a3';

    const now = performance.now();
    const levels = audioEngine.readLiveMeters();

    const dbL =
      levels.leftPeak > 1e-5 ? Math.max(-60, linearToDb(levels.leftPeak)) : -60;
    const dbR =
      levels.rightPeak > 1e-5
        ? Math.max(-60, linearToDb(levels.rightPeak))
        : -60;
    const normL = Math.max(0, Math.min(1, (dbL + 60) / 60));
    const normR = Math.max(0, Math.min(1, (dbR + 60) / 60));

    if (normL >= peakHoldRef.current.l || now - peakHoldRef.current.lTime > 900) {
      peakHoldRef.current.l = normL;
      peakHoldRef.current.lTime = now;
    } else {
      peakHoldRef.current.l = Math.max(0, peakHoldRef.current.l - 0.015);
    }
    if (normR >= peakHoldRef.current.r || now - peakHoldRef.current.rTime > 900) {
      peakHoldRef.current.r = normR;
      peakHoldRef.current.rTime = now;
    } else {
      peakHoldRef.current.r = Math.max(0, peakHoldRef.current.r - 0.015);
    }

    if (vuCanvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = vuCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (
          vuCanvas.width !== Math.round(rect.width * dpr) ||
          vuCanvas.height !== Math.round(rect.height * dpr)
        ) {
          vuCanvas.width = Math.round(rect.width * dpr);
          vuCanvas.height = Math.round(rect.height * dpr);
        }
        const ctx = vuCanvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const w = rect.width;
          const h = rect.height;

          ctx.fillStyle = waveBg;
          ctx.fillRect(0, 0, w, h);

          const halfW = (w - 8) / 2;
          const drawSideMeter = (
            originX: number,
            meterW: number,
            val: number,
            hold: number,
            label: string
          ) => {
            ctx.fillStyle = mutedCol;
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.fillText(label, originX + 4, h / 2 + 3.5);

            const startX = originX + 18;
            const barW = meterW - 22;
            const barY = 5;
            const barH = h - 10;
            const segments = 18;
            const gap = 1.5;
            const segW = (barW - (segments - 1) * gap) / segments;
            const activeCount = Math.round(val * segments);

            for (let i = 0; i < segments; i++) {
              const frac = i / segments;
              const col = frac > 0.85 ? highCol : frac > 0.65 ? midCol : lowCol;
              ctx.fillStyle = i < activeCount ? col : borderSubtle;
              ctx.globalAlpha = i < activeCount ? 1 : 0.4;
              ctx.fillRect(startX + i * (segW + gap), barY, segW, barH);
            }
            ctx.globalAlpha = 1;

            if (hold > 0.02) {
              const hx = startX + Math.min(barW - 2, hold * barW);
              ctx.fillStyle = hold > 0.85 ? highCol : '#ffffff';
              ctx.fillRect(hx, barY, 2, barH);
            }
          };

          drawSideMeter(2, halfW, normL, peakHoldRef.current.l, 'G');
          drawSideMeter(halfW + 6, halfW, normR, peakHoldRef.current.r, 'D');

          ctx.strokeStyle = borderSubtle;
          ctx.beginPath();
          ctx.moveTo(Math.round(w / 2) + 0.5, 2);
          ctx.lineTo(Math.round(w / 2) + 0.5, h - 2);
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    if (visCanvas) {
      const dpr = window.devicePixelRatio || 1;
      const rect = visCanvas.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) {
        if (
          visCanvas.width !== Math.round(rect.width * dpr) ||
          visCanvas.height !== Math.round(rect.height * dpr)
        ) {
          visCanvas.width = Math.round(rect.width * dpr);
          visCanvas.height = Math.round(rect.height * dpr);
        }
        const ctx = visCanvas.getContext('2d');
        if (ctx) {
          ctx.save();
          ctx.scale(dpr, dpr);
          const w = rect.width;
          const h = rect.height;
          const midX = Math.round(w / 2);
          const paneGap = 4;
          const leftPane = { x: 2, width: midX - paneGap };
          const rightPane = { x: midX + paneGap - 2, width: w - (midX + paneGap) };

          ctx.fillStyle = waveBg;
          ctx.fillRect(0, 0, w, h);

          if (visualMode === 'oscilloscope') {
            const topEdge = 6;
            const botEdge = h - 6;
            const midY = h / 2;
            const maxAmpPx = h * 0.43;

            const oscGrad = ctx.createLinearGradient(0, midY - maxAmpPx, 0, midY + maxAmpPx);
            oscGrad.addColorStop(0.0, '#ff2a55');
            oscGrad.addColorStop(0.10, '#ff7b00');
            oscGrad.addColorStop(0.22, '#f1fa8c');
            oscGrad.addColorStop(0.35, '#50fa7b');
            oscGrad.addColorStop(0.45, '#00d9ff');
            oscGrad.addColorStop(0.50, '#5b6cff');
            oscGrad.addColorStop(0.55, '#00d9ff');
            oscGrad.addColorStop(0.65, '#50fa7b');
            oscGrad.addColorStop(0.78, '#f1fa8c');
            oscGrad.addColorStop(0.90, '#ff7b00');
            oscGrad.addColorStop(1.0, '#ff2a55');

            ctx.strokeStyle = borderSubtle;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(w, midY);
            ctx.moveTo(midX + 0.5, 2);
            ctx.lineTo(midX + 0.5, h - 2);
            ctx.stroke();

            const { left, right } = audioEngine.readStereoWaveformSnapshots();
            const drawOscPane = (samples: Float32Array, originX: number, paneW: number) => {
              const pxCount = Math.max(1, Math.floor(paneW));
              ctx.fillStyle = oscGrad;
              ctx.globalAlpha = 0.72;
              for (let i = 0; i < pxCount; i++) {
                const s0 = Math.floor((i / pxCount) * samples.length);
                const s1 = Math.max(s0 + 1, Math.floor(((i + 1) / pxCount) * samples.length));
                let lo = samples[s0] ?? 0;
                let hi = lo;
                for (let s = s0 + 1; s < s1 && s < samples.length; s++) {
                  const v = samples[s];
                  if (v < lo) lo = v;
                  if (v > hi) hi = v;
                }
                const yTop = Math.max(topEdge - 2, midY - hi * maxAmpPx);
                const yBot = Math.min(botEdge + 2, midY - lo * maxAmpPx);
                if (yBot - yTop > 0.6) {
                  ctx.fillRect(originX + i, yTop, 1, Math.max(1, yBot - yTop));
                }
              }

              ctx.globalAlpha = 1;
              ctx.strokeStyle = oscGrad;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              for (let i = 0; i < pxCount; i++) {
                const idx = Math.min(samples.length - 1, Math.floor((i / pxCount) * samples.length));
                const v = samples[idx] ?? 0;
                const y = Math.max(2, Math.min(h - 2, midY - v * maxAmpPx));
                const px = originX + i;
                if (i === 0) ctx.moveTo(px, y);
                else ctx.lineTo(px, y);
              }
              ctx.stroke();
            };

            drawOscPane(left, leftPane.x, leftPane.width);
            drawOscPane(right, rightPane.x, rightPane.width);
          } else if (visualMode === 'spectrum') {
            const topPad = 14;
            const specH = Math.max(8, h - topPad - 2);
            const specGrad = ctx.createLinearGradient(0, topPad, 0, h - 2);
            specGrad.addColorStop(0.0, '#ff2a55');
            specGrad.addColorStop(0.15, '#ff7b00');
            specGrad.addColorStop(0.32, '#f1fa8c');
            specGrad.addColorStop(0.52, '#50fa7b');
            specGrad.addColorStop(0.75, '#00d9ff');
            specGrad.addColorStop(0.92, '#5b6cff');
            specGrad.addColorStop(1.0, '#4c1d95');

            ctx.strokeStyle = borderSubtle;
            ctx.beginPath();
            ctx.moveTo(midX + 0.5, 2);
            ctx.lineTo(midX + 0.5, h - 2);
            ctx.stroke();

            const { left, right } = audioEngine.readStereoSpectrumSnapshots();
            const bars = 28;

            const drawSpectrumPane = (spectrum: Uint8Array, peaks: Float32Array, originX: number, paneW: number) => {
              const gap = 1.5;
              const bw = Math.max(1.5, (paneW - (bars - 1) * gap) / bars);
              ctx.fillStyle = specGrad;

              const minBin = 1;
              const maxBin = Math.max(bars + 1, Math.floor(spectrum.length * 0.72));
              const logRatio = maxBin / minBin;

              for (let i = 0; i < bars; i++) {
                const b0 = Math.max(1, Math.floor(minBin * Math.pow(logRatio, i / bars)));
                const b1 = Math.max(b0 + 1, Math.floor(minBin * Math.pow(logRatio, (i + 1) / bars)));
                let peakBinVal = 0;
                for (let b = b0; b < b1 && b < spectrum.length; b++) {
                  if (spectrum[b] > peakBinVal) peakBinVal = spectrum[b];
                }
                const mag = peakBinVal / 255;
                if (mag >= peaks[i]) {
                  peaks[i] = mag;
                } else {
                  peaks[i] = Math.max(0, peaks[i] - 0.018);
                }

                const bh = Math.max(2, mag * specH);
                const bx = originX + i * (bw + gap);
                const by = h - 2 - bh;

                ctx.globalAlpha = 0.92;
                ctx.fillRect(bx, by, bw, bh);

                if (peaks[i] > 0.03) {
                  const py = Math.max(topPad, h - 2 - peaks[i] * specH);
                  ctx.globalAlpha = 1;
                  ctx.fillRect(bx, py - 2, bw, 2);
                }
              }
              ctx.globalAlpha = 1;
            };

            drawSpectrumPane(left, specPeaksRef.current.l, leftPane.x, leftPane.width);
            drawSpectrumPane(right, specPeaksRef.current.r, rightPane.x, rightPane.width);
          } else {
            // Mode 3 : Waveforme temps réel GoldWave ralentie et détaillée
            const midY = h / 2;
            const maxAmpPx = h * 0.44;

            const volGrad = ctx.createLinearGradient(0, midY - maxAmpPx, 0, midY + maxAmpPx);
            volGrad.addColorStop(0.0, '#ff2a55');
            volGrad.addColorStop(0.14, '#ff5533');
            volGrad.addColorStop(0.28, '#facc15');
            volGrad.addColorStop(0.40, '#45f882');
            volGrad.addColorStop(0.50, '#16a34a');
            volGrad.addColorStop(0.60, '#45f882');
            volGrad.addColorStop(0.72, '#facc15');
            volGrad.addColorStop(0.86, '#ff5533');
            volGrad.addColorStop(1.0, '#ff2a55');

            const { left: waveLData, right: waveRData } = audioEngine.readStereoWaveformSnapshots();
            const maxHistoryCols = Math.max(60, Math.floor(leftPane.width));

            if (isPlaying || isRecording) {
              const clock = coloredClockRef.current;
              const elapsed = Math.min(100, Math.max(0, now - clock.lastMs));
              clock.lastMs = now;
              const budget = clock.remainder + (elapsed * 70) / 1000;
              const slicesPerFrame = Math.min(maxHistoryCols, Math.floor(budget));
              clock.remainder = budget - Math.floor(budget);

              const chunk = Math.max(1, Math.floor(waveLData.length / Math.max(1, slicesPerFrame)));
              for (let p = 0; p < slicesPerFrame; p++) {
                const s0 = Math.min(waveLData.length - 1, p * chunk);
                const s1 = Math.min(waveLData.length, s0 + chunk);
                let minL = waveLData[s0] ?? 0;
                let maxL = minL;
                let minR = waveRData[s0] ?? 0;
                let maxR = minR;
                for (let s = s0 + 1; s < s1; s++) {
                  const vl = waveLData[s];
                  const vr = waveRData[s];
                  if (vl < minL) minL = vl;
                  if (vl > maxL) maxL = vl;
                  if (vr < minR) minR = vr;
                  if (vr > maxR) maxR = vr;
                }
                coloredHistoryRef.current.l.push({ min: Math.max(-1, minL), max: Math.min(1, maxL) });
                coloredHistoryRef.current.r.push({ min: Math.max(-1, minR), max: Math.min(1, maxR) });
              }

              if (coloredHistoryRef.current.l.length > maxHistoryCols) {
                coloredHistoryRef.current.l.splice(0, coloredHistoryRef.current.l.length - maxHistoryCols);
              }
              if (coloredHistoryRef.current.r.length > maxHistoryCols) {
                coloredHistoryRef.current.r.splice(0, coloredHistoryRef.current.r.length - maxHistoryCols);
              }
            }

            const drawVolumeDetailedPane = (
              history: Array<{ min: number; max: number }>,
              originX: number,
              paneW: number
            ) => {
              const count = Math.min(history.length, Math.floor(paneW));
              if (count === 0) return;
              const startX = Math.floor(originX + paneW - count);
              const offset = history.length - count;

              ctx.fillStyle = volGrad;
              ctx.globalAlpha = 0.72;
              for (let i = 0; i < count; i++) {
                const col = history[offset + i];
                const yTop = midY - col.max * maxAmpPx;
                const yBot = midY - col.min * maxAmpPx;
                const barH = Math.max(1, yBot - yTop);
                ctx.fillRect(startX + i, yTop, 1, barH);
              }

              ctx.globalAlpha = 1;
              ctx.strokeStyle = volGrad;
              ctx.lineWidth = 1.2;
              ctx.beginPath();
              for (let i = 0; i < count; i++) {
                const col = history[offset + i];
                const x = startX + i + 0.5;
                const y = midY - col.max * maxAmpPx;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();

              ctx.beginPath();
              for (let i = 0; i < count; i++) {
                const col = history[offset + i];
                const x = startX + i + 0.5;
                const y = midY - col.min * maxAmpPx;
                if (i === 0) ctx.moveTo(x, y);
                else ctx.lineTo(x, y);
              }
              ctx.stroke();
            };

            drawVolumeDetailedPane(coloredHistoryRef.current.l, leftPane.x, leftPane.width);
            drawVolumeDetailedPane(coloredHistoryRef.current.r, rightPane.x, rightPane.width);
          }

          ctx.strokeStyle = borderSubtle;
          ctx.beginPath();
          ctx.moveTo(midX + 0.5, 2);
          ctx.lineTo(midX + 0.5, h - 2);
          ctx.stroke();

          ctx.restore();
        }
      }
    }

    if (timeDisplayRef.current && isPlaying) {
      timeDisplayRef.current.textContent = formatTimecode(getPlayheadSeconds());
    }
  }, [getPlayheadSeconds, isPlaying, isRecording, visualMode]);

  useEffect(() => {
    if (!visible) return;
    if (!collapsed) {
      drawMetersAndVisuals();
    } else if (timeDisplayRef.current) {
      timeDisplayRef.current.textContent = formatTimecode(getPlayheadSeconds());
    }
    if (!isPlaying && !isRecording) return;

    let raf = 0;
    const loop = () => {
      if (!collapsed) {
        drawMetersAndVisuals();
      } else if (timeDisplayRef.current && isPlaying) {
        timeDisplayRef.current.textContent = formatTimecode(getPlayheadSeconds());
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [visible, collapsed, isPlaying, isRecording, drawMetersAndVisuals, getPlayheadSeconds]);

  if (!visible) return null;

  return (
    <aside
      aria-label="Fenêtre de contrôle flottante"
      className="fixed z-40 rounded-xl border shadow-2xl overflow-hidden select-none"
      style={{
        right: `${rightOffset}px`,
        bottom: `${bottomOffset}px`,
        width: '404px',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
      }}
    >
      <div
        onMouseDown={handleHeaderMouseDown}
        className="flex items-center justify-between px-3 py-1.5 border-b cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-2">
          <BrandLogo size={16} showWordmark={false} />
          <span className="text-xs font-display font-semibold tracking-tight" style={{ color: 'var(--text-primary)' }}>
            Contrôle
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            ref={timeDisplayRef}
            className="font-mono-tabular text-xs px-1.5 py-0.5 rounded"
            style={{
              backgroundColor: 'var(--wave-bg)',
              color: 'var(--accent-secondary)',
            }}
          >
            {formatTimecode(playheadSeconds)}
          </span>
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            {collapsed ? <Maximize2 className="w-3.5 h-3.5" /> : <Minimize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {collapsed ? (
        /* Mini barre de contrôle repliée avec boutons de transport */
        <div className="px-3 py-1.5 flex items-center justify-between gap-1.5 bg-[var(--bg-elevated)]">
          <div className="flex items-center gap-1">
            <button
              type="button"
              title="Lecture"
              disabled={!hasDocument || isRecording}
              onClick={onPlay}
              className="p-1 rounded hover:bg-[var(--bg-hover)] disabled:opacity-35 cursor-pointer text-white"
            >
              <Play className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Boucle"
              disabled={!hasDocument || isRecording}
              onClick={onPlayLoop}
              className="p-1 rounded hover:bg-[var(--bg-hover)] disabled:opacity-35 cursor-pointer text-[var(--accent-primary)]"
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Pause"
              disabled={!isPlaying}
              onClick={onPause}
              className="p-1 rounded hover:bg-[var(--bg-hover)] disabled:opacity-35 cursor-pointer text-white"
            >
              <Pause className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              title="Stop"
              disabled={!isPlaying && !isPaused && !isRecording}
              onClick={onStop}
              className="p-1 rounded hover:bg-[var(--bg-hover)] disabled:opacity-35 cursor-pointer text-white"
            >
              <Square className="w-3 h-3" />
            </button>
          </div>
          <span className="text-[10px] font-mono-tabular opacity-70" style={{ color: 'var(--text-muted)' }}>
            Contrôle discret
          </span>
        </div>
      ) : (
        <div className="p-3 space-y-2.5">
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-5 space-y-1.5">
              <div className="grid grid-cols-3 gap-1">
                <TransportButton
                  label="Lecture"
                  active={isPlaying && playMode === 'play'}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlay}
                  icon={<Play className="w-4 h-4" />}
                />
                <TransportButton
                  label="Boucle"
                  active={isPlaying && isLooping}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlayLoop}
                  icon={<Repeat className="w-4 h-4" />}
                />
                <TransportButton
                  label="Enregistrer"
                  active={isRecording}
                  isRecord
                  onClick={onToggleRecord}
                  icon={<Mic className="w-4 h-4" />}
                />
              </div>
              <div className="grid grid-cols-4 gap-1">
                <TransportButton
                  label="<< Envers"
                  active={isPlaying && playMode === 'reverse'}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlayReverse}
                  icon={<Rewind className="w-3.5 h-3.5" />}
                />
                <TransportButton
                  label=">> 2x"
                  active={isPlaying && playMode === 'fast'}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlayFastForward}
                  icon={<FastForward className="w-3.5 h-3.5" />}
                />
                <TransportButton
                  label="Pause"
                  active={isPaused}
                  disabled={!isPlaying}
                  onClick={onPause}
                  icon={<Pause className="w-3.5 h-3.5" />}
                />
                <TransportButton
                  label="Stop"
                  disabled={!isPlaying && !isPaused && !isRecording}
                  onClick={onStop}
                  icon={<Square className="w-3 h-3" />}
                />
              </div>
            </div>

            <div className="col-span-7 space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: 'var(--text-secondary)' }}>Volume</span>
                  <span className="font-mono-tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                    {volumeDb >= 0 ? `+${volumeDb.toFixed(1)}` : volumeDb.toFixed(1)} dB
                  </span>
                </div>
                <input
                  type="range"
                  min={-40}
                  max={12}
                  step={0.5}
                  value={volumeDb}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: 'var(--text-secondary)' }}>Balance</span>
                  <span className="font-mono-tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                    {balance === 0 ? '0 %' : balance < 0 ? `G ${Math.round(Math.abs(balance) * 100)} %` : `D ${Math.round(balance * 100)} %`}
                  </span>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={balance}
                  onChange={(e) => onBalanceChange(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <span style={{ color: 'var(--text-secondary)' }}>Vitesse</span>
                  <span className="font-mono-tabular font-medium" style={{ color: 'var(--text-primary)' }}>
                    {speedRatio.toFixed(2)}x
                  </span>
                </div>
                <input
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={speedRatio}
                  onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                  className="w-full studio-slider"
                />
              </div>
            </div>
          </div>

          <canvas ref={vuCanvasRef} className="w-full h-7 rounded-md border block" style={{ borderColor: 'var(--border-subtle)' }} />

          <div>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>
                Analyseur temps réel
              </span>
              <button
                type="button"
                onClick={() =>
                  setVisualMode((prev) =>
                    prev === 'oscilloscope' ? 'spectrum' : prev === 'spectrum' ? 'colored-waveform' : 'oscilloscope'
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer"
                style={{ backgroundColor: 'var(--accent-primary)', color: '#ffffff' }}
              >
                <span>{visualMode === 'oscilloscope' ? '1/3' : visualMode === 'spectrum' ? '2/3' : '3/3'}</span>
                <span>{visualMode === 'oscilloscope' ? 'Oscillo' : visualMode === 'spectrum' ? 'Spectre' : 'Waveforme colorée'}</span>
              </button>
            </div>
            <canvas ref={visCanvasRef} className="w-full h-24 rounded-md border block" style={{ borderColor: 'var(--border-subtle)' }} />
          </div>
        </div>
      )}
    </aside>
  );
};

function TransportButton({
  label,
  icon,
  active,
  disabled,
  isRecord,
  onClick,
}: {
  label: string;
  icon: React.ReactNode;
  active?: boolean;
  disabled?: boolean;
  isRecord?: boolean;
  onClick: () => void;
}) {
  const activeBg = isRecord ? 'var(--record-color)' : 'var(--accent-primary)';
  return (
    <button
      type="button"
      title={label}
      disabled={disabled}
      onClick={onClick}
      className="h-8 rounded-md border flex items-center justify-center cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
      style={{
        backgroundColor: active ? activeBg : 'var(--bg-elevated)',
        borderColor: active ? activeBg : 'var(--border-subtle)',
        color: active ? '#ffffff' : isRecord ? 'var(--record-color)' : 'var(--text-primary)',
      }}
    >
      {icon}
    </button>
  );
}