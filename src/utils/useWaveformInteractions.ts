import { useEffect, useRef } from 'react';
import type { RefObject } from 'react';
import type { AudioDocument, AudioSelection } from '../audio/types';
import type { SelectionChangeReason } from '../components/WaveformView';
import { dragFrame } from './waveformNavigation.mjs';

type Edge = 'resize-start' | 'resize-end' | 'cursor';
interface Options {
  canvas: RefObject<HTMLCanvasElement | null>;
  doc: AudioDocument | null;
  isRecording: boolean;
  onSelectionChange: (selection: AudioSelection, reason: SelectionChangeReason) => void;
  onSelectionCommit?: (selection: AudioSelection, reason: SelectionChangeReason) => void;
  onViewRangeChange: (start: number, end: number) => void;
}
export function useWaveformInteractions(options: Options) {
  const latest = useRef(options);
  latest.current = options;
  useEffect(() => {
    const canvas = latest.current.canvas.current;
    if (!canvas || !options.doc || options.isRecording) return;
    let drag: { edge: Edge; x: number; alt: boolean; selection: AudioSelection; start: number; end: number } | null = null;
    let raf = 0;
    let lastTime = 0;
    const snap = (sample: number, width: number, length: number, alt: boolean) => {
      const doc = latest.current.doc;
      if (!doc || alt || !doc.snapToBeats || !doc.showBeatGrid || !doc.bpmInfo) return sample;
      const targets = doc.bpmInfo.kickSamples.length ? doc.bpmInfo.kickSamples : doc.bpmInfo.beatSamples;
      let result = sample;
      let distance = 7 * length / width;
      for (const target of targets) {
        const d = Math.abs(target - sample);
        if (d <= distance) { result = target; distance = d; }
      }
      return Math.max(0, Math.min(doc.channels[0]?.length ?? 0, result));
    };
    const move = (delta: number) => {
      const doc = latest.current.doc;
      if (!drag || !doc) return;
      const total = doc.channels[0]?.length ?? 0;
      if (!total) return;
      const rect = canvas.getBoundingClientRect();
      const left = rect.left + 52;
      const width = Math.max(1, rect.width - 52);
      if (doc.viewStartSample !== Math.round(drag.start) || doc.viewEndSample !== Math.round(drag.end)) {
        drag.start = doc.viewStartSample;
        drag.end = doc.viewEndSample;
      }
      // Pan at either edge without changing the visible span.
      const frame = dragFrame(drag.start, drag.end, total, left, width, drag.x, delta);
      const start = Math.round(frame.viewStart);
      const end = start + Math.round(frame.viewEnd - frame.viewStart);
      drag.start = frame.viewStart;
      drag.end = frame.viewEnd;
      if (start !== doc.viewStartSample || end !== doc.viewEndSample) {
        latest.current.onViewRangeChange(start, end);
      }
      const point = snap(frame.sample, width, drag.end - drag.start, drag.alt);
      const next = drag.edge === 'cursor'
        ? { startSample: Math.min(total - 1, point), endSample: Math.min(total - 1, point) }
        : drag.edge === 'resize-start'
        ? { startSample: Math.max(0, Math.min(drag.selection.endSample - 1, point)), endSample: drag.selection.endSample }
        : { startSample: drag.selection.startSample, endSample: Math.min(total, Math.max(drag.selection.startSample + 1, point)) };
      if (next.startSample !== drag.selection.startSample || next.endSample !== drag.selection.endSample) {
        drag.selection = next;
        latest.current.onSelectionChange(next, drag.edge === 'cursor' ? 'cursor-drag' : drag.edge);
      }
    };
    const tick = (time: number) => {
      if (!drag) return;
      move(time - lastTime); lastTime = time;
      raf = requestAnimationFrame(tick);
    };
    const stop = (commit: boolean) => {
      if (!drag) return;
      cancelAnimationFrame(raf);
      const finished = drag; drag = null;
      canvas.style.cursor = '';
      if (commit) latest.current.onSelectionCommit?.(finished.selection, finished.edge);
    };
    const down = (event: MouseEvent) => {
      const doc = latest.current.doc;
      if (!doc || (event.button !== 0 && event.button !== 2)) return;
      const total = doc.channels[0]?.length ?? 0;
      const rect = canvas.getBoundingClientRect();
      const left = rect.left + 52;
      if (!total || event.clientX < left) return;
      event.preventDefault(); event.stopImmediatePropagation();
      const width = Math.max(1, rect.width - 52);
      const length = Math.max(1, doc.viewEndSample - doc.viewStartSample);
      const selection = doc.selection;
      if (event.button === 0 && selection.endSample > selection.startSample) {
        const x0 = left + (selection.startSample - doc.viewStartSample) * width / length;
        const x1 = left + (selection.endSample - doc.viewStartSample) * width / length;
        const d0 = x0 >= left && x0 <= rect.right ? Math.abs(event.clientX - x0) : Infinity;
        const d1 = x1 >= left && x1 <= rect.right ? Math.abs(event.clientX - x1) : Infinity;
        if (Math.min(d0, d1) <= 9) {
          drag = { edge: d0 <= d1 ? 'resize-start' : 'resize-end', x: event.clientX, alt: event.altKey,
            selection: { ...selection }, start: doc.viewStartSample, end: doc.viewEndSample };
          canvas.style.cursor = 'ew-resize';
          lastTime = performance.now(); raf = requestAnimationFrame(tick); return;
        }
      }
      const frame = dragFrame(doc.viewStartSample, doc.viewEndSample, total, left, width, event.clientX, 0);
      const point = snap(frame.sample, width, length, event.altKey);
      if (event.button === 2 || selection.endSample > selection.startSample) {
        const next = event.button === 0
          ? { startSample: point, endSample: selection.endSample }
          : { startSample: selection.startSample, endSample: point };
        if (next.endSample <= next.startSample) return;
        const reason = event.button === 0 ? 'resize-start' : 'resize-end';
        latest.current.onSelectionChange(next, reason);
        latest.current.onSelectionCommit?.(next, reason);
        return;
      }
      const startSample = Math.min(total - 1, point);
      const next = { startSample, endSample: startSample };
      latest.current.onSelectionChange(next, 'cursor-drag');
      drag = { edge: 'cursor', x: event.clientX, alt: event.altKey, selection: next, start: doc.viewStartSample, end: doc.viewEndSample };
      canvas.style.cursor = 'ew-resize';
      lastTime = performance.now(); raf = requestAnimationFrame(tick);
    };
    const mousemove = (event: MouseEvent) => {
      if (!drag) return;
      event.preventDefault(); event.stopImmediatePropagation();
      drag.x = event.clientX; drag.alt = event.altKey; move(0);
    };
    const mouseup = (event: MouseEvent) => {
      if (!drag || event.button !== 0) return;
      event.preventDefault(); event.stopImmediatePropagation();
      drag.x = event.clientX; drag.alt = event.altKey; move(0); stop(true);
    };
    const contextmenu = (event: MouseEvent) => { event.preventDefault(); event.stopImmediatePropagation(); };
    const blur = () => stop(true);
    canvas.addEventListener('mousedown', down, true);
    canvas.addEventListener('contextmenu', contextmenu, true);
    window.addEventListener('mousemove', mousemove, true);
    window.addEventListener('mouseup', mouseup, true);
    window.addEventListener('blur', blur);
    return () => {
      stop(false);
      canvas.removeEventListener('mousedown', down, true);
      canvas.removeEventListener('contextmenu', contextmenu, true);
      window.removeEventListener('mousemove', mousemove, true);
      window.removeEventListener('mouseup', mouseup, true);
      window.removeEventListener('blur', blur);
    };
  }, [options.doc?.id, options.isRecording]);
}
