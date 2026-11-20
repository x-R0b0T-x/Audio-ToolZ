import React, { useCallback, useEffect, useRef } from 'react';
import { FileAudio, FolderOpen, Mic, Plus, X } from 'lucide-react';
import { findTrackAtSample } from '../audio/cueSheet';
import { computeWaveformPeaks, formatTimecode } from '../audio/dsp';
import type { AudioDocument, AudioSelection } from '../audio/types';
import { BrandLogo } from './BrandLogo';
import { useWaveformInteractions } from '../utils/useWaveformInteractions';

export type SelectionChangeReason =
  | 'new'
  | 'resize-start'
  | 'resize-end'
  | 'cursor'
  | 'cursor-drag';

interface WaveformViewProps {
  documents: AudioDocument[];
  activeDocId: string | null;
  isPlaying: boolean;
  isRecording: boolean;
  controlOpen?: boolean;
  enabledChannels: [boolean, boolean];
  getPlayheadSample: () => number;
  getRecordingPreview: () => Float32Array;
  onToggleChannel: (channelIdx: 0 | 1) => void;
  onToggleSnapToBeats: () => void;
  onSelectDocument: (id: string) => void;
  onCloseDocument: (id: string) => void;
  onSelectionChange: (
    selection: AudioSelection,
    reason: SelectionChangeReason
  ) => void;
  onSelectionCommit?: (
    selection: AudioSelection,
    reason: SelectionChangeReason
  ) => void;
  onViewRangeChange: (viewStart: number, viewEnd: number) => void;
  onOpenFile: () => void;
  onNewEmpty: () => void;
  onStartRecord: () => void;
}

export const WaveformView: React.FC<WaveformViewProps> = ({
  documents,
  activeDocId,
  isPlaying,
  isRecording,
  enabledChannels,
  getPlayheadSample,
  getRecordingPreview,
  onToggleChannel,
  onToggleSnapToBeats,
  onSelectDocument,
  onCloseDocument,
  onSelectionChange,
  onSelectionCommit,
  onViewRangeChange,
  onOpenFile,
  onNewEmpty,
  onStartRecord,
}) => {
  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  const overviewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const mainCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const dragModeRef = useRef<
    'none' | 'resize-start' | 'resize-end' | 'overview'
  >('none');
  const dragAnchorSampleRef = useRef<number>(0);
  const latestSelectionRef = useRef<AudioSelection>({
    startSample: 0,
    endSample: 0,
  });
  const activeDocRef = useRef<AudioDocument | null>(activeDoc);
  activeDocRef.current = activeDoc;
  const onViewRangeChangeRef = useRef(onViewRangeChange);
  onViewRangeChangeRef.current = onViewRangeChange;

  const [hoverEdge, setHoverEdge] = React.useState<'start' | 'end' | null>(
    null
  );
  const [hoverSnapSample, setHoverSnapSample] = React.useState<number | null>(
    null
  );

  useWaveformInteractions({ canvas: mainCanvasRef, doc: activeDoc, isRecording,
    onSelectionChange, onSelectionCommit, onViewRangeChange });

  const readCssVar = (name: string, fallback: string): string => {
    if (typeof window === 'undefined') return fallback;
    const val = getComputedStyle(document.documentElement)
      .getPropertyValue(name)
      .trim();
    return val || fallback;
  };

  const drawAll = useCallback(() => {
    const mainCanvas = mainCanvasRef.current;
    const overviewCanvas = overviewCanvasRef.current;
    if (!mainCanvas || !activeDoc) return;

    const bg = readCssVar('--wave-bg', '#13151c');
    const grid = readCssVar('--wave-grid', 'rgba(127, 135, 166, 0.16)');
    const waveL = readCssVar('--wave-left', '#bd93f9');
    const waveR = readCssVar('--wave-right', '#45f882');
    const selBg = readCssVar('--wave-selection', 'rgba(189, 147, 249, 0.20)');
    const selBorder = readCssVar('--wave-selection-border', '#8be9fd');
    const playheadColor = readCssVar('--playhead', '#f8f8f2');
    const beatGridColor = readCssVar('--beat-grid', 'rgba(248, 248, 242, 0.34)');
    const beatBarColor = readCssVar('--beat-bar', 'rgba(248, 248, 242, 0.70)');
    const textMuted = readCssVar('--text-muted', '#7f87a6');
    const borderSubtle = readCssVar('--border-subtle', '#35394b');
    const surfaceBg = readCssVar('--bg-surface', '#1f222d');

    const total = activeDoc.channels[0]?.length ?? 0;
    const dpr = window.devicePixelRatio || 1;
    const leftMargin = 52;

    // 1. Main Waveform Canvas (with Time Ruler at the BOTTOM)
    const rect = mainCanvas.getBoundingClientRect();
    if (rect.width > 0 && rect.height > 0) {
      if (
        mainCanvas.width !== Math.round(rect.width * dpr) ||
        mainCanvas.height !== Math.round(rect.height * dpr)
      ) {
        mainCanvas.width = Math.round(rect.width * dpr);
        mainCanvas.height = Math.round(rect.height * dpr);
      }

      const ctx = mainCanvas.getContext('2d');
      if (ctx) {
        ctx.save();
        ctx.scale(dpr, dpr);

        const w = rect.width;
        const h = rect.height;
        const rulerHeight = 24;
        const plotW = Math.max(1, w - leftMargin);
        const plotH = Math.max(1, h - rulerHeight);
        const rulerTop = plotH;

        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, w, h);

        // Left gutter + Bottom ruler strip
        ctx.fillStyle = surfaceBg;
        ctx.fillRect(0, 0, leftMargin, h);
        ctx.fillRect(0, rulerTop, w, rulerHeight);

        ctx.strokeStyle = borderSubtle;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(0, rulerTop + 0.5);
        ctx.lineTo(w, rulerTop + 0.5);
        ctx.moveTo(leftMargin - 0.5, 0);
        ctx.lineTo(leftMargin - 0.5, h);
        ctx.stroke();

        if (isRecording) {
          const rec = getRecordingPreview();
          ctx.fillStyle = readCssVar('--record-color', '#fb4d6d');
          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.fillText('REC', 12, 18);

          const mid = plotH / 2;
          ctx.strokeStyle = grid;
          ctx.beginPath();
          ctx.moveTo(leftMargin, mid);
          ctx.lineTo(w, mid);
          ctx.stroke();

          if (rec.length > 0) {
            const peaks = computeWaveformPeaks(
              rec,
              Math.max(0, rec.length - Math.min(rec.length, 44100 * 8)),
              rec.length,
              Math.floor(plotW)
            );
            ctx.fillStyle = readCssVar('--record-color', '#fb4d6d');
            for (let i = 0; i < peaks.length; i++) {
              const yTop = mid - peaks[i].max * (plotH * 0.44);
              const yBot = mid - peaks[i].min * (plotH * 0.44);
              ctx.fillRect(leftMargin + i, yTop, 1, Math.max(1, yBot - yTop));
            }
          }
          ctx.restore();
        } else {
          const viewStart = activeDoc.viewStartSample;
          const viewEnd = Math.max(viewStart + 1, activeDoc.viewEndSample);
          const viewLen = viewEnd - viewStart;
          const sr = activeDoc.sampleRate;

          // Vertical time grid lines + bottom ruler timestamps
          const viewDuration = viewLen / sr;
          const targetTicks = Math.max(4, Math.floor(plotW / 100));
          const rawStep = viewDuration / targetTicks;
          const niceSteps = [
            0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10, 15, 30, 60, 120,
          ];
          const stepSec =
            niceSteps.find((s) => s >= rawStep) ?? Math.ceil(rawStep / 60) * 60;

          const startSec = viewStart / sr;
          const firstTickSec = Math.ceil(startSec / stepSec) * stepSec;

          ctx.font = '11px "JetBrains Mono", monospace';
          ctx.textBaseline = 'middle';
          for (let sec = firstTickSec; sec <= viewEnd / sr; sec += stepSec) {
            const x = leftMargin + ((sec * sr - viewStart) / viewLen) * plotW;
            ctx.strokeStyle = grid;
            ctx.beginPath();
            ctx.moveTo(Math.round(x) + 0.5, 0);
            ctx.lineTo(Math.round(x) + 0.5, plotH);
            ctx.stroke();

            ctx.strokeStyle = textMuted;
            ctx.beginPath();
            ctx.moveTo(Math.round(x) + 0.5, rulerTop);
            ctx.lineTo(Math.round(x) + 0.5, rulerTop + 5);
            ctx.stroke();

            ctx.fillStyle = textMuted;
            ctx.fillText(formatTimecode(sec), x + 4, rulerTop + rulerHeight / 2 + 1);
          }

          // Channel lanes with horizontal amplitude grid (0.8, 0.4, 0.0, -0.4, -0.8)
          const numChannels = Math.min(2, activeDoc.channels.length);
          const laneH = plotH / Math.max(1, numChannels);
          const gridLevels = [0.8, 0.4, 0.0, -0.4, -0.8];

          for (let c = 0; c < numChannels; c++) {
            const laneTop = c * laneH;
            const laneMid = laneTop + laneH / 2;
            const ampScale = laneH * 0.44;
            const isEnabled = c === 0 ? enabledChannels[0] : enabledChannels[1];

            // Horizontal amplitude grid lines + Y-axis labels
            ctx.font = '10px "JetBrains Mono", monospace';
            ctx.textBaseline = 'middle';
            for (const lvl of gridLevels) {
              const gy = Math.round(laneMid - lvl * ampScale) + 0.5;
              ctx.strokeStyle = grid;
              ctx.setLineDash(lvl === 0 ? [3, 3] : []);
              ctx.beginPath();
              ctx.moveTo(leftMargin, gy);
              ctx.lineTo(w, gy);
              ctx.stroke();
              ctx.setLineDash([]);

              ctx.fillStyle = textMuted;
              ctx.fillText(
                lvl === 0 ? ' 0.0' : lvl > 0 ? ` ${lvl.toFixed(1)}` : lvl.toFixed(1),
                20,
                gy
              );
            }

            if (c > 0) {
              ctx.strokeStyle = borderSubtle;
              ctx.beginPath();
              ctx.moveTo(0, Math.round(laneTop) + 0.5);
              ctx.lineTo(w, Math.round(laneTop) + 0.5);
              ctx.stroke();
            }

            // Draw waveform
            if (total > 0) {
              const ch = activeDoc.channels[c];
              const color = c === 0 ? waveL : waveR;

              ctx.save();
              if (!isEnabled) {
                ctx.globalAlpha = 0.25;
              }
              if (viewLen <= plotW * 2) {
                ctx.strokeStyle = color;
                ctx.lineWidth = 1.4;
                ctx.beginPath();
                const s0 = Math.max(0, Math.floor(viewStart));
                const s1 = Math.min(total - 1, Math.ceil(viewEnd));
                for (let s = s0; s <= s1; s++) {
                  const x = leftMargin + ((s - viewStart) / viewLen) * plotW;
                  const y = laneMid - ch[s] * ampScale;
                  if (s === s0) ctx.moveTo(x, y);
                  else ctx.lineTo(x, y);
                }
                ctx.stroke();
              } else {
                const buckets = Math.max(1, Math.floor(plotW));
                const peaks = computeWaveformPeaks(
                  ch,
                  viewStart,
                  Math.min(total, viewEnd),
                  buckets
                );
                ctx.fillStyle = color;
                for (let i = 0; i < peaks.length; i++) {
                  const yTop = laneMid - peaks[i].max * ampScale;
                  const yBot = laneMid - peaks[i].min * ampScale;
                  ctx.fillRect(
                    leftMargin + i,
                    yTop,
                    1,
                    Math.max(1, yBot - yTop)
                  );
                }
              }
              ctx.restore();
            }
          }

          // BPM grid rendered as clean ticks & small dots at top and bottom of waveform
          if (
            total > 0 &&
            activeDoc.showBeatGrid &&
            activeDoc.bpmInfo &&
            activeDoc.bpmInfo.beatSamples.length > 0
          ) {
            const { beatSamples, kickSamples } = activeDoc.bpmInfo;
            const pxPerBeat =
              beatSamples.length >= 2
                ? ((beatSamples[1] - beatSamples[0]) / viewLen) * plotW
                : plotW;
            const downbeatsOnly = pxPerBeat < 7;

            ctx.save();
            for (let b = 0; b < beatSamples.length; b++) {
              const isDownbeat = b % 4 === 0;
              if (downbeatsOnly && !isDownbeat) continue;

              const markerSample = kickSamples[b] ?? beatSamples[b];
              if (markerSample < viewStart || markerSample > viewEnd) continue;

              const tx =
                Math.round(
                  leftMargin + ((markerSample - viewStart) / viewLen) * plotW
                ) + 0.5;
              const isSnappedHover = hoverSnapSample === markerSample;
              const tickColor = isSnappedHover
                ? '#ffffff'
                : isDownbeat
                ? beatBarColor
                : beatGridColor;

              // Subtle faint hairline ONLY while mouse is magnetized onto this tick
              if (isSnappedHover) {
                ctx.strokeStyle = 'rgba(248, 248, 242, 0.28)';
                ctx.lineWidth = 1;
                ctx.setLineDash([3, 3]);
                ctx.beginPath();
                ctx.moveTo(tx, 0);
                ctx.lineTo(tx, plotH);
                ctx.stroke();
                ctx.setLineDash([]);
              }

              // Top & bottom discreet short white ticks
              ctx.strokeStyle = tickColor;
              ctx.lineWidth = isDownbeat || isSnappedHover ? 1.2 : 0.9;
              ctx.beginPath();
              ctx.moveTo(tx, 0);
              ctx.lineTo(tx, 3.5);
              ctx.moveTo(tx, plotH - 3.5);
              ctx.lineTo(tx, plotH);
              ctx.stroke();

              // Discreet small white circular dots at top and bottom kick attack edges
              const dotR = isSnappedHover ? 2.6 : isDownbeat ? 1.9 : 1.3;
              ctx.fillStyle = isSnappedHover
                ? '#ffffff'
                : isDownbeat
                ? 'rgba(248, 248, 242, 0.72)'
                : 'rgba(248, 248, 242, 0.42)';
              ctx.beginPath();
              ctx.arc(tx, 6.5, dotR, 0, Math.PI * 2);
              ctx.arc(tx, plotH - 6.5, dotR, 0, Math.PI * 2);
              ctx.fill();

              if (isSnappedHover) {
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.arc(tx, 6.5, 4.2, 0, Math.PI * 2);
                ctx.arc(tx, plotH - 6.5, 4.2, 0, Math.PI * 2);
                ctx.stroke();
              }

              if (isDownbeat) {
                ctx.fillStyle = 'rgba(248, 248, 242, 0.56)';
                ctx.font = '10px "JetBrains Mono", monospace';
                ctx.textBaseline = 'top';
                ctx.fillText(`${Math.floor(b / 4) + 1}`, tx + 4, 2);
              }
            }
            ctx.restore();
          }

          // CUE mix track markers & titles along the waveform
          if (
            total > 0 &&
            activeDoc.cueTracks &&
            activeDoc.cueTracks.length > 0
          ) {
            ctx.save();
            ctx.font = '600 10px "Inter", sans-serif';
            ctx.textBaseline = 'top';
            const badgeY = activeDoc.showBeatGrid ? 18 : 5;
            let lastLabelRight = -Infinity;

            for (const track of activeDoc.cueTracks) {
              if (track.startSample < viewStart || track.startSample > viewEnd) {
                continue;
              }
              const tx =
                Math.round(
                  leftMargin + ((track.startSample - viewStart) / viewLen) * plotW
                ) + 0.5;

              ctx.strokeStyle = 'rgba(241, 250, 140, 0.58)';
              ctx.lineWidth = 1.2;
              ctx.setLineDash([4, 3]);
              ctx.beginPath();
              ctx.moveTo(tx, 0);
              ctx.lineTo(tx, plotH);
              ctx.stroke();
              ctx.setLineDash([]);

              const rawLabel = `${String(track.trackNumber).padStart(2, '0')} · ${
                track.performer ? `${track.performer} - ${track.title}` : track.title
              }`;
              const label =
                rawLabel.length > 34 ? `${rawLabel.slice(0, 33)}…` : rawLabel;
              const textW = ctx.measureText(label).width;
              const boxW = textW + 10;
              const boxX = Math.min(w - boxW - 4, tx + 4);

              if (boxX > lastLabelRight + 6) {
                ctx.fillStyle = 'rgba(19, 21, 28, 0.88)';
                ctx.fillRect(boxX, badgeY, boxW, 17);
                ctx.strokeStyle = 'rgba(241, 250, 140, 0.65)';
                ctx.lineWidth = 1;
                ctx.strokeRect(boxX + 0.5, badgeY + 0.5, boxW - 1, 16);

                ctx.fillStyle = '#f1fa8c';
                ctx.fillText(label, boxX + 5, badgeY + 3.5);
                lastLabelRight = boxX + boxW;
              }
            }
            ctx.restore();
          }

          // Selection overlay, darkened unselected regions & cursor
          if (total > 0) {
            const selStart = activeDoc.selection.startSample;
            const selEnd = activeDoc.selection.endSample;

            if (selEnd > selStart) {
              const rawX0 = leftMargin + ((selStart - viewStart) / viewLen) * plotW;
              const rawX1 = leftMargin + ((selEnd - viewStart) / viewLen) * plotW;
              const cx0 = Math.max(leftMargin, Math.min(w, rawX0));
              const cx1 = Math.max(leftMargin, Math.min(w, rawX1));

              // Darken unselected regions (left and right of the active selection)
              ctx.fillStyle = 'rgba(6, 8, 13, 0.60)';
              if (cx0 > leftMargin) {
                ctx.fillRect(leftMargin, 0, cx0 - leftMargin, plotH);
              }
              if (cx1 < w) {
                ctx.fillRect(cx1, 0, w - cx1, plotH);
              }

              if (cx1 > cx0) {
                ctx.fillStyle = selBg;
                ctx.fillRect(cx0, 0, cx1 - cx0, plotH);
              }

              // Full-height directly draggable vertical selection lines
              const drawBoundaryLine = (lx: number, isHovered: boolean) => {
                if (isHovered) {
                  ctx.fillStyle = 'rgba(248, 248, 242, 0.22)';
                  ctx.fillRect(lx - 3, 0, 6, plotH);
                }
                ctx.strokeStyle = isHovered ? '#ffffff' : selBorder;
                ctx.lineWidth = isHovered ? 2.6 : 1.8;
                ctx.beginPath();
                ctx.moveTo(lx, 0);
                ctx.lineTo(lx, plotH);
                ctx.stroke();

                const midY = plotH / 2;
                ctx.fillStyle = isHovered ? '#ffffff' : selBorder;
                ctx.fillRect(lx - 1.5, midY - 12, 3, 24);
              };

              if (rawX0 >= leftMargin && rawX0 <= w) {
                drawBoundaryLine(rawX0, hoverEdge === 'start');
              }
              if (rawX1 >= leftMargin && rawX1 <= w) {
                drawBoundaryLine(rawX1, hoverEdge === 'end');
              }
            } else {
              const cx = leftMargin + ((selStart - viewStart) / viewLen) * plotW;
              if (cx >= leftMargin && cx <= w) {
                ctx.strokeStyle = selBorder;
                ctx.lineWidth = 1.5;
                ctx.setLineDash([4, 3]);
                ctx.beginPath();
                ctx.moveTo(cx, 0);
                ctx.lineTo(cx, plotH);
                ctx.stroke();
                ctx.setLineDash([]);

                // Studio triangle marker on channel divider
                if (numChannels === 2) {
                  ctx.fillStyle = selBorder;
                  ctx.beginPath();
                  ctx.moveTo(cx, laneH - 5);
                  ctx.lineTo(cx + 8, laneH);
                  ctx.lineTo(cx, laneH + 5);
                  ctx.closePath();
                  ctx.fill();
                }
              }
            }

            // Live playhead
            if (isPlaying) {
              const playSample = getPlayheadSample();
              const px = leftMargin + ((playSample - viewStart) / viewLen) * plotW;
              if (px >= leftMargin && px <= w) {
                ctx.strokeStyle = playheadColor;
                ctx.lineWidth = 2;
                ctx.beginPath();
                ctx.moveTo(px, 0);
                ctx.lineTo(px, h);
                ctx.stroke();

                ctx.fillStyle = playheadColor;
                ctx.beginPath();
                ctx.moveTo(px - 5, rulerTop);
                ctx.lineTo(px + 5, rulerTop);
                ctx.lineTo(px, rulerTop + 7);
                ctx.closePath();
                ctx.fill();
              }
            }
          }
        }

        ctx.restore();
      }
    }

    // Overview: keep the existing thin strip, with independent stereo lanes.
    if (overviewCanvas) {
      const r = overviewCanvas.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) {
        if (overviewCanvas.width !== Math.round(r.width * dpr) || overviewCanvas.height !== Math.round(r.height * dpr)) {
          overviewCanvas.width = Math.round(r.width * dpr); overviewCanvas.height = Math.round(r.height * dpr);
        }
        const ctx = overviewCanvas.getContext('2d');
        if (ctx) {
          ctx.save(); ctx.scale(dpr, dpr);
          const w = r.width, h = r.height;
          ctx.fillStyle = bg; ctx.fillRect(0, 0, w, h);
          if (total > 0) {
            const lanes = Math.min(2, activeDoc.channels.length), laneH = h / Math.max(1, lanes);
            const buckets = Math.max(1, Math.min(700, Math.floor(w)));
            for (let ch = 0; ch < lanes; ch++) {
              const top = ch * laneH, middle = top + laneH / 2;
              const peaks = computeWaveformPeaks(activeDoc.channels[ch], 0, total, buckets);
              const barW = w / Math.max(1, peaks.length);
              ctx.save(); ctx.beginPath(); ctx.rect(0, top, w, laneH); ctx.clip();
              ctx.strokeStyle = grid; ctx.lineWidth = 1;
              ctx.beginPath(); ctx.moveTo(0, middle + 0.5); ctx.lineTo(w, middle + 0.5); ctx.stroke();
              ctx.fillStyle = ch === 0 ? waveL : waveR;
              for (let i = 0; i < peaks.length; i++) {
                const y0 = middle - peaks[i].max * laneH * 0.40;
                const y1 = middle - peaks[i].min * laneH * 0.40;
                ctx.fillRect(i * barW, y0, Math.max(1, barW), Math.max(1, y1 - y0));
              }
              ctx.restore();
            }
            if (lanes === 2) {
              ctx.strokeStyle = borderSubtle;
              ctx.beginPath(); ctx.moveTo(0, Math.floor(laneH) + 0.5); ctx.lineTo(w, Math.floor(laneH) + 0.5); ctx.stroke();
            }
            if (activeDoc.selection.endSample > activeDoc.selection.startSample) {
              const x0 = activeDoc.selection.startSample / total * w, x1 = activeDoc.selection.endSample / total * w;
              ctx.fillStyle = 'rgba(6,8,13,.45)';
              if (x0 > 0) ctx.fillRect(0, 0, x0, h);
              if (x1 < w) ctx.fillRect(x1, 0, w - x1, h);
            }
            const vx0 = activeDoc.viewStartSample / total * w, vx1 = activeDoc.viewEndSample / total * w;
            ctx.fillStyle = selBg; ctx.fillRect(vx0, 0, Math.max(3, vx1 - vx0), h);
            ctx.strokeStyle = selBorder; ctx.lineWidth = 1.5;
            ctx.strokeRect(vx0 + 0.5, 0.5, Math.max(3, vx1 - vx0) - 1, h - 1);
            ctx.font = 'bold 9px monospace'; ctx.textBaseline = 'top';
            for (let ch = 0; ch < lanes; ch++) {
              const top = ch * laneH;
              ctx.fillStyle = 'rgba(19,21,28,.9)'; ctx.fillRect(2, top + 1, lanes === 1 ? 31 : 13, Math.min(12, laneH - 1));
              ctx.fillStyle = ch === 0 ? waveL : waveR;
              ctx.fillText(lanes === 1 ? 'Mono' : ch === 0 ? 'G' : 'D', 4, top + 1);
            }
          }
          ctx.restore();
        }
      }
    }
  }, [
    activeDoc,
    enabledChannels,
    getPlayheadSample,
    getRecordingPreview,
    hoverEdge,
    hoverSnapSample,
    isPlaying,
    isRecording,
  ]);

  useEffect(() => {
    drawAll();
  }, [drawAll]);

  useEffect(() => {
    if (!isPlaying && !isRecording) return;
    let rafId = 0;
    const tick = () => {
      drawAll();
      rafId = requestAnimationFrame(tick);
    };
    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [drawAll, isPlaying, isRecording]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => drawAll());
    ro.observe(el);
    return () => ro.disconnect();
  }, [drawAll]);

  // Native non-passive wheel zoom strictly anchored under the mouse pointer (zero auto-scroll)
  useEffect(() => {
    const canvas = mainCanvasRef.current;
    if (!canvas) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const doc = activeDocRef.current;
      if (!doc) return;
      const total = doc.channels[0]?.length ?? 0;
      if (total === 0) return;

      const delta = e.deltaMode === 1 ? e.deltaY * 32 : e.deltaY;
      if (Math.abs(delta) < 0.01) return;

      const rect = canvas.getBoundingClientRect();
      const leftMargin = 52;
      const plotW = Math.max(1, rect.width - leftMargin);
      const mouseRatio = Math.max(
        0,
        Math.min(1, (e.clientX - rect.left - leftMargin) / plotW)
      );
      const viewStart = doc.viewStartSample;
      const viewEnd = Math.max(viewStart + 1, doc.viewEndSample);
      const viewLen = viewEnd - viewStart;
      const anchorSample = viewStart + mouseRatio * viewLen;

      const zoomFactor = Math.pow(1.0022, Math.max(-240, Math.min(240, delta)));
      let nextLen = Math.max(
        64,
        Math.min(total, Math.round(viewLen * zoomFactor))
      );
      if (delta < 0 && nextLen >= viewLen && viewLen > 64) {
        nextLen = Math.max(64, viewLen - Math.max(1, Math.floor(viewLen * 0.04)));
      } else if (delta > 0 && nextLen <= viewLen && viewLen < total) {
        nextLen = Math.min(total, viewLen + Math.max(1, Math.ceil(viewLen * 0.04)));
      }
      const nextStart = Math.max(
        0,
        Math.min(total - nextLen, Math.round(anchorSample - mouseRatio * nextLen))
      );
      onViewRangeChangeRef.current(nextStart, Math.min(total, nextStart + nextLen));
    };
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', onWheel);
  }, [activeDocId]);

  const xToSampleWithSnapInfo = (
    clientX: number,
    allowSnap = false,
    altKey = false
  ): { sample: number; snappedSample: number | null } => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !activeDoc) return { sample: 0, snappedSample: null };
    const rect = canvas.getBoundingClientRect();
    const leftMargin = 52;
    const plotW = Math.max(1, rect.width - leftMargin);
    const ratio = Math.max(0, Math.min(1, (clientX - rect.left - leftMargin) / plotW));
    const viewLen = activeDoc.viewEndSample - activeDoc.viewStartSample;
    const rawSample = Math.round(activeDoc.viewStartSample + ratio * viewLen);

    if (
      allowSnap &&
      !altKey &&
      activeDoc.snapToBeats &&
      activeDoc.showBeatGrid &&
      activeDoc.bpmInfo
    ) {
      const targets =
        activeDoc.bpmInfo.kickSamples.length > 0
          ? activeDoc.bpmInfo.kickSamples
          : activeDoc.bpmInfo.beatSamples;
      if (targets.length > 0) {
        // Gentle 7px magnetic threshold so user can lightly snap when approaching a kick tick
        const thresholdSamples = Math.max(1, Math.round((7 / plotW) * viewLen));
        let closest = rawSample;
        let bestDist = thresholdSamples + 1;
        for (let i = 0; i < targets.length; i++) {
          const d = Math.abs(targets[i] - rawSample);
          if (d < bestDist) {
            bestDist = d;
            closest = targets[i];
          }
        }
        if (bestDist <= thresholdSamples) {
          return { sample: closest, snappedSample: closest };
        }
      }
    }

    return { sample: rawSample, snappedSample: null };
  };

  const xToSample = (clientX: number, allowSnap = false, altKey = false): number => {
    return xToSampleWithSnapInfo(clientX, allowSnap, altKey).sample;
  };

  const hitTestSelectionEdge = (clientX: number): 'start' | 'end' | null => {
    const canvas = mainCanvasRef.current;
    if (!canvas || !activeDoc) return null;
    const { startSample, endSample } = activeDoc.selection;
    if (endSample <= startSample) return null;

    const rect = canvas.getBoundingClientRect();
    const leftMargin = 52;
    const plotW = Math.max(1, rect.width - leftMargin);
    const viewStart = activeDoc.viewStartSample;
    const viewLen = Math.max(1, activeDoc.viewEndSample - viewStart);
    const x0 = rect.left + leftMargin + ((startSample - viewStart) / viewLen) * plotW;
    const x1 = rect.left + leftMargin + ((endSample - viewStart) / viewLen) * plotW;

    const distStart = Math.abs(clientX - x0);
    const distEnd = Math.abs(clientX - x1);
    const threshold = 12;
    if (distStart <= threshold && distStart <= distEnd) return 'start';
    if (distEnd <= threshold) return 'end';
    return null;
  };

  const handleMainMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeDoc || isRecording) return;
    if (e.button !== 0 && e.button !== 2) return;

    const sample = xToSample(e.clientX, true, e.altKey);
    const { startSample, endSample } = activeDoc.selection;

    // Right click (button 2): always sets selection END
    if (e.button === 2) {
      e.preventDefault();
      dragModeRef.current = 'none';
      const next: AudioSelection =
        sample >= startSample
          ? { startSample, endSample: sample }
          : { startSample: sample, endSample: startSample };
      const reason: SelectionChangeReason =
        next.endSample > next.startSample ? 'new' : 'cursor';
      latestSelectionRef.current = next;
      onSelectionChange(next, reason);
      onSelectionCommit?.(next, reason);
      return;
    }

    // Left click (button 0): drag an existing vertical boundary line if hovered
    const edge = hitTestSelectionEdge(e.clientX);
    if (edge === 'start') {
      dragModeRef.current = 'resize-start';
      dragAnchorSampleRef.current = endSample;
      const next = {
        startSample: Math.min(sample, endSample),
        endSample: Math.max(sample, endSample),
      };
      latestSelectionRef.current = next;
      onSelectionChange(next, 'resize-start');
      return;
    }

    if (edge === 'end') {
      dragModeRef.current = 'resize-end';
      dragAnchorSampleRef.current = startSample;
      const next = {
        startSample: Math.min(startSample, sample),
        endSample: Math.max(startSample, sample),
      };
      latestSelectionRef.current = next;
      onSelectionChange(next, 'resize-end');
      return;
    }

    // Otherwise left click sets selection START only (holding left click never sweeps a selection)
    dragModeRef.current = 'none';
    const next: AudioSelection =
      endSample > sample
        ? { startSample: sample, endSample }
        : { startSample: sample, endSample: sample };
    const reason: SelectionChangeReason =
      next.endSample > next.startSample ? 'new' : 'cursor';
    latestSelectionRef.current = next;
    onSelectionChange(next, reason);
    onSelectionCommit?.(next, reason);
  };

  const handleMainMouseMoveHover = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (dragModeRef.current !== 'none') return;
    const edge = hitTestSelectionEdge(e.clientX);
    if (edge !== hoverEdge) setHoverEdge(edge);
    const { snappedSample } = xToSampleWithSnapInfo(e.clientX, true, e.altKey);
    if (snappedSample !== hoverSnapSample) setHoverSnapSample(snappedSample);
  };

  const handleOverviewMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!activeDoc || !overviewCanvasRef.current || e.button !== 0) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    if (total === 0) return;
    const rect = overviewCanvasRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const center = Math.round(ratio * total);
    const viewLen = activeDoc.viewEndSample - activeDoc.viewStartSample;
    const newStart = Math.max(0, Math.min(total - viewLen, Math.round(center - viewLen / 2)));
    onViewRangeChange(newStart, Math.min(total, newStart + viewLen));
    dragModeRef.current = 'overview';
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeDoc) return;
      const mode = dragModeRef.current;
      if (mode === 'resize-start' || mode === 'resize-end') {
        const { sample: s, snappedSample } = xToSampleWithSnapInfo(e.clientX, true, e.altKey);
        if (snappedSample !== hoverSnapSample) setHoverSnapSample(snappedSample);
        const anchor = dragAnchorSampleRef.current;
        const next: AudioSelection = {
          startSample: Math.min(anchor, s),
          endSample: Math.max(anchor, s),
        };
        latestSelectionRef.current = next;
        const reason: SelectionChangeReason =
          mode === 'resize-start' ? 'resize-start' : 'resize-end';
        onSelectionChange(next, reason);
      } else if (mode === 'overview' && overviewCanvasRef.current) {
        const total = activeDoc.channels[0]?.length ?? 0;
        if (total === 0) return;
        const rect = overviewCanvasRef.current.getBoundingClientRect();
        const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
        const center = Math.round(ratio * total);
        const viewLen = activeDoc.viewEndSample - activeDoc.viewStartSample;
        const newStart = Math.max(0, Math.min(total - viewLen, Math.round(center - viewLen / 2)));
        onViewRangeChange(newStart, Math.min(total, newStart + viewLen));
      }
    };
    const handleMouseUp = (e: MouseEvent) => {
      const mode = dragModeRef.current;
      dragModeRef.current = 'none';
      if (mode === 'resize-start' || mode === 'resize-end') {
        const sel = latestSelectionRef.current;
        const reason: SelectionChangeReason =
          mode === 'resize-start' ? 'resize-start' : 'resize-end';
        onSelectionCommit?.(sel, reason);
        const edge = hitTestSelectionEdge(e.clientX);
        setHoverEdge(edge);
      }
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  });

  if (!activeDoc) {
    return (
      <main
        data-testid="empty-workspace"
        className="flex-1 flex flex-col items-center justify-center p-8 text-center"
        style={{ backgroundColor: 'var(--bg-canvas)' }}
      >
        <div className="flex flex-col items-center gap-7">
          <BrandLogo size={84} showWordmark wordmarkClassName="text-4xl" />

          <div className="flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onOpenFile}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold cursor-pointer transition-opacity hover:opacity-95"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              <FolderOpen className="w-4 h-4" />
              Sélectionner un fichier
            </button>
            <button
              type="button"
              onClick={onStartRecord}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg border text-sm font-medium cursor-pointer transition-colors hover:bg-[var(--bg-hover)]"
              style={{
                backgroundColor: 'var(--bg-elevated)',
                borderColor: 'var(--border-strong)',
                color: 'var(--text-primary)',
              }}
            >
              <Mic className="w-4 h-4" />
              Enregistrer
            </button>
          </div>
        </div>
      </main>
    );
  }

  const totalSamples = activeDoc.channels[0]?.length ?? 0;
  const totalSec = activeDoc.sampleRate > 0 ? totalSamples / activeDoc.sampleRate : 0;
  const selStartSec = activeDoc.selection.startSample / activeDoc.sampleRate;
  const selEndSec = activeDoc.selection.endSample / activeDoc.sampleRate;
  const selDurSec = Math.max(0, selEndSec - selStartSec);
  const isStereo = activeDoc.channels.length > 1;
  const currentCueTrack = findTrackAtSample(
    activeDoc.cueTracks,
    isPlaying ? getPlayheadSample() : activeDoc.selection.startSample
  );

  return (
    <main
      ref={containerRef}
      className="flex-1 flex flex-col min-h-0 min-w-0"
      style={{ backgroundColor: 'var(--bg-canvas)' }}
    >
      {/* MDI Document Tabs */}
      <div
        className="flex items-center gap-1 px-2 pt-1.5 border-b overflow-x-auto shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        {documents.map((doc) => {
          const isActive = doc.id === activeDoc.id;
          return (
            <div
              key={doc.id}
              className="atz-doc-tab group flex items-center gap-1.5 px-3 py-1.5 rounded-t-md border-t border-x text-xs font-medium shrink-0"
              style={{
                backgroundColor: isActive
                  ? 'var(--bg-canvas)'
                  : 'var(--bg-elevated)',
                borderColor: isActive
                  ? 'var(--border-strong)'
                  : 'var(--border-subtle)',
                color: isActive
                  ? 'var(--text-primary)'
                  : 'var(--text-secondary)',
              }}
            >
              <button
                type="button"
                onClick={() => onSelectDocument(doc.id)}
                className="inline-flex items-center gap-1.5 whitespace-nowrap cursor-pointer"
              >
                <FileAudio
                  className="w-3.5 h-3.5 shrink-0"
                  style={{
                    color: isActive
                      ? 'var(--accent-secondary)'
                      : 'var(--text-muted)',
                  }}
                />
                <span>
                  {doc.name}
                  {doc.dirty ? ' *' : ''}
                </span>
              </button>
              <button
                type="button"
                aria-label={`Fermer ${doc.name}`}
                onClick={() => onCloseDocument(doc.id)}
                className="p-0.5 rounded opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={onNewEmpty}
          title="Nouveau document"
          aria-label="Nouveau document"
          className="inline-flex items-center justify-center w-7 h-7 mb-0.5 rounded cursor-pointer hover:bg-[var(--bg-hover)] shrink-0"
          style={{ color: 'var(--icon-stroke)' }}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Main High-DPI Waveform Canvas + Left Channel Checkboxes */}
      <div className="flex-1 min-h-0 relative">
        <canvas
          ref={mainCanvasRef}
          data-testid="waveform-canvas"
          onMouseDown={handleMainMouseDown}
          onContextMenu={(e) => e.preventDefault()}
          onMouseMove={handleMainMouseMoveHover}
          onMouseLeave={() => {
            setHoverEdge(null);
            setHoverSnapSample(null);
          }}
          className={`w-full h-full block ${
            hoverEdge ? 'cursor-ew-resize' : 'cursor-crosshair'
          }`}
        />

        {/* Channel enable checkboxes on far left */}
        {!isRecording && (
          <div className="absolute left-1 top-0 bottom-6 flex flex-col justify-around pointer-events-none">
            <label
              title="Activer le canal gauche (G)"
              className="pointer-events-auto flex flex-col items-center gap-0.5 cursor-pointer"
            >
              <input
                type="checkbox"
                aria-label="Canal gauche actif"
                checked={enabledChannels[0]}
                onChange={() => onToggleChannel(0)}
                className="w-3.5 h-3.5 accent-[var(--accent-primary)] cursor-pointer"
              />
              <span
                className="font-mono-tabular text-[10px] font-semibold"
                style={{ color: 'var(--wave-left)' }}
              >
                {isStereo ? 'G' : 'M'}
              </span>
            </label>

            {isStereo && (
              <label
                title="Activer le canal droit (D)"
                className="pointer-events-auto flex flex-col items-center gap-0.5 cursor-pointer"
              >
                <input
                  type="checkbox"
                  aria-label="Canal droit actif"
                  checked={enabledChannels[1]}
                  onChange={() => onToggleChannel(1)}
                  className="w-3.5 h-3.5 accent-[var(--accent-primary)] cursor-pointer"
                />
                <span
                  className="font-mono-tabular text-[10px] font-semibold"
                  style={{ color: 'var(--wave-right)' }}
                >
                  D
                </span>
              </label>
            )}
          </div>
        )}
      </div>

      {/* Overview Strip at the BOTTOM (right above the status bar) */}
      <div
        className="h-11 px-2 py-1 border-t shrink-0 flex items-center gap-2"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <span
          className="text-[11px] font-medium whitespace-nowrap shrink-0 px-1"
          style={{ color: 'var(--text-muted)' }}
        >
          Aperçu
        </span>
        <canvas
          ref={overviewCanvasRef}
          data-testid="overview-canvas"
          onMouseDown={handleOverviewMouseDown}
          className="w-full h-full rounded border cursor-ew-resize"
          style={{ borderColor: 'var(--border-subtle)' }}
        />
      </div>

      {/* Document Status Bar (tabular figures) */}
      <div
        className="flex flex-wrap items-center justify-between gap-4 px-4 py-1.5 border-t text-xs shrink-0"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-secondary)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3 font-mono-tabular">
          <span>
            <span className="font-semibold" style={{ color: 'var(--accent-secondary)' }}>
              {activeDoc.channels.length === 1 ? 'Mono' : 'Stéréo'}
            </span>{' '}
            · {activeDoc.sampleRate.toLocaleString('fr-FR')} Hz · 32-bit float
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <span className="font-semibold" style={{ color: 'var(--accent-secondary)' }}>Durée</span>{' '}
            {formatTimecode(totalSec)}
          </span>
          {activeDoc.bpmInfo && activeDoc.bpmInfo.bpm > 0 && (
            <>
              <span aria-hidden="true">·</span>
              <span
                data-testid="bpm-readout"
                className="font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                {activeDoc.bpmInfo.bpm.toFixed(1)} BPM
              </span>
              <button
                type="button"
                data-testid="snap-kicks-toggle"
                aria-pressed={Boolean(activeDoc.snapToBeats)}
                onClick={onToggleSnapToBeats}
                title="Magnétiser les sélections et bords sur les attaques de kicks (maintenir Alt pour désactiver temporairement)"
                className="px-2 py-0.5 rounded border text-[11px] font-medium transition-colors cursor-pointer"
                style={{
                  backgroundColor: activeDoc.snapToBeats
                    ? 'rgba(248, 248, 242, 0.14)'
                    : 'var(--bg-elevated)',
                  borderColor: activeDoc.snapToBeats
                    ? 'rgba(248, 248, 242, 0.52)'
                    : 'var(--border-subtle)',
                  color: activeDoc.snapToBeats
                    ? 'var(--text-primary)'
                    : 'var(--text-muted)',
                }}
              >
                Aimant kicks {activeDoc.snapToBeats ? 'actif' : 'inactif'}
              </button>
            </>
          )}
          {currentCueTrack && (
            <>
              <span aria-hidden="true">·</span>
              <span
                data-testid="active-cue-track"
                className="font-semibold truncate max-w-[260px]"
                style={{ color: '#f1fa8c' }}
                title={
                  currentCueTrack.performer
                    ? `${currentCueTrack.performer} - ${currentCueTrack.title}`
                    : currentCueTrack.title
                }
              >
                {String(currentCueTrack.trackNumber).padStart(2, '0')} ·{' '}
                {currentCueTrack.performer
                  ? `${currentCueTrack.performer} - ${currentCueTrack.title}`
                  : currentCueTrack.title}
              </span>
            </>
          )}
        </div>

        <div className="flex items-center gap-3 font-mono-tabular">
          <span>Curseur {formatTimecode(selStartSec)}</span>
          <span aria-hidden="true">·</span>
          <span>
            Sélection{' '}
            {selDurSec > 0
              ? `${formatTimecode(selStartSec)} à ${formatTimecode(selEndSec)} (${formatTimecode(selDurSec)})`
              : 'Aucune'}
          </span>
        </div>
      </div>
    </main>
  );
};
