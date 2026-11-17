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
  clampControlPosition,
  getDefaultControlPosition,
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
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    if (typeof window === 'undefined') return { x: 1000, y: 430 };
    const saved = loadPersistedUiState();
    return (
      saved.controlPos ??
      getDefaultControlPosition(window.innerWidth, window.innerHeight)
    );
  });
  const [collapsed, setCollapsed] = useState<boolean>(
    () => loadPersistedUiState().controlCollapsed
  );
  const [visualMode, setVisualMode] = useState<VisualAnalyzerMode>(
    () => loadPersistedUiState().visualMode
  );

  const hasCustomPosRef = useRef<boolean>(
    typeof window !== 'undefined' ? loadPersistedUiState().controlPos !== null : false
  );
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const latestPosRef = useRef(pos);
  latestPosRef.current = pos;

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

  useEffect(() => {
    savePersistedUiState({
      controlPos: hasCustomPosRef.current ? pos : null,
      controlCollapsed: collapsed,
      visualMode,
    });
  }, [pos, collapsed, visualMode]);

  useEffect(() => {
    const onResize = () => {
      setPos((prev) =>
        hasCustomPosRef.current
          ? clampControlPosition(prev, window.innerWidth, window.innerHeight)
          : getDefaultControlPosition(window.innerWidth, window.innerHeight)
      );
    };
    const onBeforeUnload = () => {
      savePersistedUiState({
        controlPos: hasCustomPosRef.current ? latestPosRef.current : null,
        controlCollapsed: collapsed,
        visualMode,
      });
    };
    window.addEventListener('resize', onResize);
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('beforeunload', onBeforeUnload);
    };
  }, [collapsed, visualMode]);

  const handleHeaderMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).closest('button')) return;
    draggingRef.current = true;
    dragOffsetRef.current = {
      x: e.clientX - pos.x,
      y: e.clientY - pos.y,
    };
  };

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      hasCustomPosRef.current = true;
      const clamped = clampControlPosition(
        {
          x: e.clientX - dragOffsetRef.current.x,
          y: e.clientY - dragOffsetRef.current.y,
        },
        window.innerWidth,
        window.innerHeight
      );
      setPos(clamped);
    };
    const onUp = () => {
      if (draggingRef.current) {
        draggingRef.current = false;
        savePersistedUiState({
          controlPos: hasCustomPosRef.current ? latestPosRef.current : null,
        });
      }
    };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  const drawMetersAndVisuals = useCallback(() => {
    const vuCanvas = vuCanvasRef.current;
    const visCanvas = visCanvasRef.current;
    if (!vuCanvas && !visCanvas) return;

    const style = getComputedStyle(document.documentElement);
    const waveBg = style.getPropertyValue('--wave-bg').trim() || '#080a14';
    const borderSubtle =
      style.getPropertyValue('--border-subtle').trim() || '#272f54';
    const accent =
      style.getPropertyValue('--accent-primary').trim() || '#6d7bff';
    const accent2 =
      style.getPropertyValue('--accent-secondary').trim() || '#38bdf8';
    const waveLeft =
      style.getPropertyValue('--wave-left').trim() || accent2;
    const waveRight =
      style.getPropertyValue('--wave-right').trim() || accent;
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

    // GoldWave-style Side-by-Side Horizontal Stereo VU-Meters (G left half | D right half)
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

    // Split Stereo Rainbow dB Real-Time Analyzer (Left channel G | Right channel D)
    // Shows level progression across a rainbow dB scale up to 0 dB maximum (red/crimson).
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

            // Symmetric rainbow gradient centered at 0.0 (-∞ dB) peaking to 0 dB red at both ±1.0 edges
            const oscGrad = ctx.createLinearGradient(0, midY - maxAmpPx, 0, midY + maxAmpPx);
            oscGrad.addColorStop(0.0, '#ff2a55');  // +0 dB max
            oscGrad.addColorStop(0.10, '#ff7b00'); // -2 dB orange
            oscGrad.addColorStop(0.22, '#f1fa8c'); // -6 dB yellow
            oscGrad.addColorStop(0.35, '#50fa7b'); // -12 dB green
            oscGrad.addColorStop(0.45, '#00d9ff'); // -24 dB cyan
            oscGrad.addColorStop(0.50, '#5b6cff'); // silence center blue/indigo
            oscGrad.addColorStop(0.55, '#00d9ff'); // -24 dB cyan
            oscGrad.addColorStop(0.65, '#50fa7b'); // -12 dB green
            oscGrad.addColorStop(0.78, '#f1fa8c'); // -6 dB yellow
            oscGrad.addColorStop(0.90, '#ff7b00'); // -2 dB orange
            oscGrad.addColorStop(1.0, '#ff2a55');  // -0 dB max

            // Horizontal 0 dB top/bottom ceiling lines, -6 dB dashed guides, and 0-amplitude baseline
            ctx.strokeStyle = 'rgba(255, 42, 85, 0.35)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(0, Math.round(midY - maxAmpPx) + 0.5);
            ctx.lineTo(w, Math.round(midY - maxAmpPx) + 0.5);
            ctx.moveTo(0, Math.round(midY + maxAmpPx) + 0.5);
            ctx.lineTo(w, Math.round(midY + maxAmpPx) + 0.5);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(241, 250, 140, 0.14)';
            ctx.beginPath();
            ctx.moveTo(0, Math.round(midY - maxAmpPx * 0.5) + 0.5);
            ctx.lineTo(w, Math.round(midY - maxAmpPx * 0.5) + 0.5);
            ctx.moveTo(0, Math.round(midY + maxAmpPx * 0.5) + 0.5);
            ctx.lineTo(w, Math.round(midY + maxAmpPx * 0.5) + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = borderSubtle;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(w, midY);
            ctx.moveTo(midX + 0.5, 2);
            ctx.lineTo(midX + 0.5, h - 2);
            ctx.stroke();

            const { left, right } = audioEngine.readStereoWaveformSnapshots();
            const drawOscPane = (
              samples: Float32Array,
              originX: number,
              paneW: number
            ) => {
              const pxCount = Math.max(1, Math.floor(paneW));
              // 1. Filled vertical min/max rainbow envelope per pixel column
              ctx.fillStyle = oscGrad;
              ctx.globalAlpha = 0.72;
              for (let i = 0; i < pxCount; i++) {
                const s0 = Math.floor((i / pxCount) * samples.length);
                const s1 = Math.max(
                  s0 + 1,
                  Math.floor(((i + 1) / pxCount) * samples.length)
                );
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

              // 2. Crisp glowing rainbow waveform trace on top
              ctx.globalAlpha = 1;
              ctx.strokeStyle = oscGrad;
              ctx.lineWidth = 1.6;
              ctx.beginPath();
              for (let i = 0; i < pxCount; i++) {
                const idx = Math.min(
                  samples.length - 1,
                  Math.floor((i / pxCount) * samples.length)
                );
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

            // Micro rainbow dB legend on center strip & 0 dB edge badge
            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#ff5555';
            ctx.fillText('0dB', leftPane.x + leftPane.width - 18, 2);
            ctx.fillText('0dB', rightPane.x + rightPane.width - 18, 2);
          } else if (visualMode === 'spectrum') {
            const topPad = 14;
            const specH = Math.max(8, h - topPad - 2);
            const specGrad = ctx.createLinearGradient(0, topPad, 0, h - 2);
            specGrad.addColorStop(0.0, '#ff2a55');  // 0 dB max red
            specGrad.addColorStop(0.15, '#ff7b00'); // -3 dB orange
            specGrad.addColorStop(0.32, '#f1fa8c'); // -6 dB yellow
            specGrad.addColorStop(0.52, '#50fa7b'); // -12 dB green
            specGrad.addColorStop(0.75, '#00d9ff'); // -24 dB cyan
            specGrad.addColorStop(0.92, '#5b6cff'); // -36 dB blue
            specGrad.addColorStop(1.0, '#4c1d95');  // -48 dB deep violet

            // 0 dB, -12 dB, -24 dB horizontal grid lines
            ctx.strokeStyle = 'rgba(255, 42, 85, 0.32)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(0, topPad + 0.5);
            ctx.lineTo(w, topPad + 0.5);
            ctx.stroke();

            ctx.strokeStyle = 'rgba(139, 233, 253, 0.14)';
            ctx.beginPath();
            ctx.moveTo(0, Math.round(topPad + specH * 0.5) + 0.5);
            ctx.lineTo(w, Math.round(topPad + specH * 0.5) + 0.5);
            ctx.moveTo(0, Math.round(topPad + specH * 0.75) + 0.5);
            ctx.lineTo(w, Math.round(topPad + specH * 0.75) + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = borderSubtle;
            ctx.beginPath();
            ctx.moveTo(midX + 0.5, 2);
            ctx.lineTo(midX + 0.5, h - 2);
            ctx.stroke();

            const { left, right } = audioEngine.readStereoSpectrumSnapshots();
            const bars = 28;

            const drawSpectrumPane = (
              spectrum: Uint8Array,
              peaks: Float32Array,
              originX: number,
              paneW: number
            ) => {
              const gap = 1.5;
              const bw = Math.max(1.5, (paneW - (bars - 1) * gap) / bars);
              ctx.fillStyle = specGrad;

              // Musical log-frequency bands from bin 1 (~43 Hz) to ~75% Nyquist (~16 kHz)
              const minBin = 1;
              const maxBin = Math.max(bars + 1, Math.floor(spectrum.length * 0.72));
              const logRatio = maxBin / minBin;

              for (let i = 0; i < bars; i++) {
                const b0 = Math.max(
                  1,
                  Math.floor(minBin * Math.pow(logRatio, i / bars))
                );
                const b1 = Math.max(
                  b0 + 1,
                  Math.floor(minBin * Math.pow(logRatio, (i + 1) / bars))
                );
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

            ctx.font = '8px "JetBrains Mono", monospace';
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#ff5555';
            ctx.fillText('0dB', leftPane.x + leftPane.width - 18, 3);
            ctx.fillText('0dB', rightPane.x + rightPane.width - 18, 3);
          } else {
            // Mode 3: Volume-Mapped Stereo Colored Waveform (Green = low, Yellow = medium, Red = loud) with detailed 1px crests
            const midY = h / 2;
            const maxAmpPx = h * 0.44;

            // Subtle reference guide lines (±50% & 0.0 center line)
            ctx.strokeStyle = 'rgba(250, 204, 21, 0.14)';
            ctx.lineWidth = 1;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(0, Math.round(midY - maxAmpPx * 0.58) + 0.5);
            ctx.lineTo(w, Math.round(midY - maxAmpPx * 0.58) + 0.5);
            ctx.moveTo(0, Math.round(midY + maxAmpPx * 0.58) + 0.5);
            ctx.lineTo(w, Math.round(midY + maxAmpPx * 0.58) + 0.5);
            ctx.stroke();
            ctx.setLineDash([]);

            ctx.strokeStyle = borderSubtle;
            ctx.beginPath();
            ctx.moveTo(0, midY);
            ctx.lineTo(w, midY);
            ctx.stroke();

            // Vertical symmetric volume gradient: Green (low) -> Yellow (mid-loud) -> Red (high peak)
            const volGrad = ctx.createLinearGradient(
              0,
              midY - maxAmpPx,
              0,
              midY + maxAmpPx
            );
            volGrad.addColorStop(0.0, '#ff2a55');  // Peak loud (+0 dB) Rouge
            volGrad.addColorStop(0.14, '#ff5533'); // Rouge-Orange
            volGrad.addColorStop(0.28, '#facc15'); // Moyen-Fort Jaune
            volGrad.addColorStop(0.40, '#45f882'); // Faible Vert vif
            volGrad.addColorStop(0.50, '#16a34a'); // Centre silence / très faible Vert
            volGrad.addColorStop(0.60, '#45f882'); // Faible Vert vif
            volGrad.addColorStop(0.72, '#facc15'); // Moyen-Fort Jaune
            volGrad.addColorStop(0.86, '#ff5533'); // Rouge-Orange
            volGrad.addColorStop(1.0, '#ff2a55');  // Peak loud (-0 dB) Rouge

            const { left: waveLData, right: waveRData } =
              audioEngine.readStereoWaveformSnapshots();

            const maxHistoryCols = Math.max(60, Math.floor(leftPane.width));
            if (isPlaying || isRecording) {
              // 240 colonnes/s : moitie du defilement precedent sur un ecran 60 Hz.
              const clock = coloredClockRef.current;
              const elapsed = Math.min(100, Math.max(0, now - clock.lastMs));
              clock.lastMs = now;
              const budget = clock.remainder + elapsed * 240 / 1000;
              const slicesPerFrame = Math.min(maxHistoryCols, Math.floor(budget));
              clock.remainder = budget - Math.floor(budget);
              const chunk = Math.max(
                1,
                Math.floor(waveLData.length / Math.max(1, slicesPerFrame))
              );
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
                coloredHistoryRef.current.l.push({
                  min: Math.max(-1, minL),
                  max: Math.min(1, maxL),
                });
                coloredHistoryRef.current.r.push({
                  min: Math.max(-1, minR),
                  max: Math.min(1, maxR),
                });
              }

              if (coloredHistoryRef.current.l.length > maxHistoryCols) {
                coloredHistoryRef.current.l.splice(
                  0,
                  coloredHistoryRef.current.l.length - maxHistoryCols
                );
              }
              if (coloredHistoryRef.current.r.length > maxHistoryCols) {
                coloredHistoryRef.current.r.splice(
                  0,
                  coloredHistoryRef.current.r.length - maxHistoryCols
                );
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

              // 1. Crisp 1px vertical min..max bars shaded by volume (Green -> Yellow -> Red)
              ctx.fillStyle = volGrad;
              ctx.globalAlpha = 0.72;
              for (let i = 0; i < count; i++) {
                const col = history[offset + i];
                const yTop = midY - col.max * maxAmpPx;
                const yBot = midY - col.min * maxAmpPx;
                const barH = Math.max(1, yBot - yTop);
                ctx.fillRect(startX + i, yTop, 1, barH);
              }

              // 2. High-definition upper & lower crest outline for razor-sharp peak detail
              ctx.globalAlpha = 1;
              ctx.strokeStyle = volGrad;
              ctx.lineWidth = 1.15;
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

            drawVolumeDetailedPane(
              coloredHistoryRef.current.l,
              leftPane.x,
              leftPane.width
            );
            drawVolumeDetailedPane(
              coloredHistoryRef.current.r,
              rightPane.x,
              rightPane.width
            );
          }

          // Subtle 1px vertical center separator + micro rainbow dB legend bar on far right
          ctx.strokeStyle = borderSubtle;
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(midX + 0.5, 2);
          ctx.lineTo(midX + 0.5, h - 2);
          ctx.stroke();

          // Channel badges (G | D) in top-left of each half
          ctx.font = 'bold 10px "JetBrains Mono", monospace';
          ctx.textBaseline = 'top';
          ctx.fillStyle = waveLeft;
          ctx.fillText('G', leftPane.x + 4, 4);
          ctx.fillStyle = waveRight;
          ctx.fillText('D', rightPane.x + 4, 4);

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

  const balanceLabel =
    Math.abs(balance) < 0.02
      ? '0 %'
      : balance < 0
      ? `G ${Math.round(Math.abs(balance) * 100)} %`
      : `D ${Math.round(balance * 100)} %`;

  return (
    <aside
      aria-label="Fenêtre de contrôle flottante"
      data-testid="control-window"
      className="fixed z-40 rounded-xl border shadow-2xl overflow-hidden select-none"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: '404px',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
      }}
    >
      {/* Draggable Title Bar */}
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
          <span
            className="text-xs font-display font-semibold tracking-tight"
            style={{ color: 'var(--text-primary)' }}
          >
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
            aria-label={collapsed ? 'Déplier Contrôle' : 'Réduire Contrôle'}
            onClick={() => setCollapsed((c) => !c)}
            className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            {collapsed ? (
              <Maximize2 className="w-3.5 h-3.5" />
            ) : (
              <Minimize2 className="w-3.5 h-3.5" />
            )}
          </button>
          <button
            type="button"
            aria-label="Fermer la fenêtre de contrôle"
            onClick={onClose}
            className="p-1 rounded hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {collapsed ? (
        <div
          data-testid="control-mini-bar"
          className="px-3 py-2 grid grid-cols-4 gap-1.5"
        >
          <TransportButton
            label="Lire depuis le début"
            active={isPlaying && playMode === 'play'}
            disabled={!hasDocument || isRecording}
            onClick={onPlay}
            icon={<Play className="w-3.5 h-3.5" />}
          />
          <TransportButton
            label="Pause"
            active={isPaused}
            disabled={!isPlaying}
            onClick={onPause}
            icon={<Pause className="w-3.5 h-3.5" />}
          />
          <TransportButton
            label="Lire la boucle sélectionnée"
            active={isPlaying && (isLooping || playMode === 'loop')}
            disabled={!hasDocument || isRecording}
            onClick={onPlayLoop}
            icon={<Repeat className="w-3.5 h-3.5" />}
          />
          <TransportButton
            label="Stop"
            disabled={!isPlaying && !isPaused && !isRecording}
            onClick={onStop}
            icon={<Square className="w-3 h-3" />}
          />
        </div>
      ) : (
        <div className="p-3 space-y-2.5">
          {/* GoldWave 2-column top section: Transport on left | Volume, Balance, Speed on right */}
          <div className="grid grid-cols-12 gap-3 items-start">
            <div className="col-span-5 space-y-1.5">
              {/* Row 1: Play from start, Loop selection, Rec */}
              <div className="grid grid-cols-3 gap-1">
                <TransportButton
                  label="Lire depuis le début"
                  active={isPlaying && playMode === 'play'}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlay}
                  icon={<Play className="w-4 h-4" />}
                />
                <TransportButton
                  label="Lire la boucle sélectionnée"
                  active={isPlaying && (isLooping || playMode === 'loop')}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlayLoop}
                  icon={<Repeat className="w-4 h-4" />}
                />
                <TransportButton
                  label={isRecording ? 'Arrêter enregistrement' : 'Enregistrer'}
                  active={isRecording}
                  isRecord
                  onClick={onToggleRecord}
                  icon={<Mic className="w-4 h-4" />}
                />
              </div>

              {/* Row 2: Reverse (<<), Accelerated Forward (>>), Pause, Stop */}
              <div className="grid grid-cols-4 gap-1">
                <TransportButton
                  label="Lire à l'envers"
                  active={isPlaying && playMode === 'reverse'}
                  disabled={!hasDocument || isRecording}
                  onClick={onPlayReverse}
                  icon={<Rewind className="w-3.5 h-3.5" />}
                />
                <TransportButton
                  label="Lire en accéléré (2x)"
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

            {/* Right Column: Volume, Balance, Speed */}
            <div className="col-span-7 space-y-2">
              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <label
                    htmlFor="atz-ctrl-volume"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Volume
                  </label>
                  <span
                    className="font-mono-tabular font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {volumeDb > 0 ? `+${volumeDb.toFixed(1)}` : volumeDb.toFixed(1)} dB
                  </span>
                </div>
                <input
                  id="atz-ctrl-volume"
                  type="range"
                  min={-40}
                  max={12}
                  step={0.5}
                  value={volumeDb}
                  onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
                  onDoubleClick={() => onVolumeChange(0)}
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <label
                    htmlFor="atz-ctrl-balance"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Balance
                  </label>
                  <span
                    className="font-mono-tabular font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {balanceLabel}
                  </span>
                </div>
                <input
                  id="atz-ctrl-balance"
                  type="range"
                  min={-1}
                  max={1}
                  step={0.05}
                  value={balance}
                  onChange={(e) => onBalanceChange(parseFloat(e.target.value))}
                  onDoubleClick={() => onBalanceChange(0)}
                  className="w-full studio-slider"
                />
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px]">
                  <label
                    htmlFor="atz-ctrl-speed"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Vitesse
                  </label>
                  <span
                    className="font-mono-tabular font-medium"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {speedRatio.toFixed(2)}x
                  </span>
                </div>
                <input
                  id="atz-ctrl-speed"
                  type="range"
                  min={0.5}
                  max={2.0}
                  step={0.05}
                  value={speedRatio}
                  onChange={(e) => onSpeedChange(parseFloat(e.target.value))}
                  onDoubleClick={() => onSpeedChange(1)}
                  className="w-full studio-slider"
                />
              </div>
            </div>
          </div>

          {/* Side-by-Side Stereo VU-Meters */}
          <canvas
            ref={vuCanvasRef}
            data-testid="vu-meter-canvas"
            className="w-full h-7 rounded-md border block"
            style={{ borderColor: 'var(--border-subtle)' }}
          />

          {/* Visualizer (1 bouton -> 3 modes : Oscillo / Spectre / Waveforme colorée) */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <span
                className="text-[11px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Analyseur temps réel
              </span>
              <button
                type="button"
                data-testid="analyzer-mode-btn"
                title="Changer de vue : 1. Oscillo · 2. Spectre · 3. Waveforme colorée"
                onClick={() =>
                  setVisualMode((prev) =>
                    prev === 'oscilloscope'
                      ? 'spectrum'
                      : prev === 'spectrum'
                      ? 'colored-waveform'
                      : 'oscilloscope'
                  )
                }
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition-opacity hover:opacity-95"
                style={{
                  backgroundColor: 'var(--accent-primary)',
                  color: '#ffffff',
                }}
              >
                <span className="font-mono-tabular opacity-90 text-[9px]">
                  {visualMode === 'oscilloscope'
                    ? '1/3'
                    : visualMode === 'spectrum'
                    ? '2/3'
                    : '3/3'}
                </span>
                <span>
                  {visualMode === 'oscilloscope'
                    ? 'Oscillo'
                    : visualMode === 'spectrum'
                    ? 'Spectre'
                    : 'Waveforme colorée'}
                </span>
              </button>
            </div>
            <canvas
              ref={visCanvasRef}
              data-testid="visualizer-canvas"
              className="w-full h-24 rounded-md border block"
              style={{ borderColor: 'var(--border-subtle)' }}
            />
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
      aria-label={label}
      aria-pressed={Boolean(active)}
      disabled={disabled}
      onClick={onClick}
      className="h-8 rounded-md border flex items-center justify-center transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
      style={{
        backgroundColor: active ? activeBg : 'var(--bg-elevated)',
        borderColor: active ? activeBg : 'var(--border-subtle)',
        color: active
          ? '#ffffff'
          : isRecord
          ? 'var(--record-color)'
          : 'var(--text-primary)',
      }}
    >
      {icon}
    </button>
  );
}
