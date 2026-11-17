import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dragFrame } from '../src/utils/waveformNavigation.mjs';
const file = new URL('../src/utils/useWaveformInteractions.ts', import.meta.url);
let src = fs.readFileSync(file, 'utf8');
const marker = '// Anchored boundary expansion';
if (!src.includes(marker)) {
  const replace = (old, next) => {
    if (src.split(old).length !== 2) throw new Error('Ancre inattendue : ' + old);
    src = src.replace(old, () => next);
  };
  replace('selection: AudioSelection; start: number; end: number }', 'selection: AudioSelection; start: number; end: number; initialSpan?: number; anchor?: number; anchorRatio?: number }');
  replace('selection: { ...selection }, start: doc.viewStartSample, end: doc.viewEndSample };', `selection: { ...selection }, start: doc.viewStartSample, end: doc.viewEndSample,
            initialSpan: length, anchor: d0 <= d1 ? selection.endSample : selection.startSample,
            anchorRatio: ((d0 <= d1 ? selection.endSample : selection.startSample) - doc.viewStartSample) / length };`);
  replace('const frame = dragFrame(drag.start, drag.end, total, rect.left + 52, width, drag.x, delta);', `${marker}
      const left = rect.left + 52;
      const ratio = Math.max(0, Math.min(1, (drag.x - left) / width));
      let frame = dragFrame(drag.start, drag.end, total, left, width, drag.x, drag.edge === 'cursor' ? delta : 0);
      if (drag.initialSpan !== undefined && drag.anchor !== undefined && drag.anchorRatio !== undefined) {
        const zone = Math.min(24, width / 4);
        const pressure = drag.edge === 'resize-start' ? (left + zone - drag.x) / zone : (drag.x - (left + width - zone)) / zone;
        const a = drag.anchor;
        const r = drag.anchorRatio;
        const span = drag.end - drag.start;
        if (pressure > 0 && delta > 0 && r >= 0 && r <= 1) {
          const limit = Math.min(drag.initialSpan * 1.25, r > 0 ? a / r : Infinity, r < 1 ? (total - a) / (1 - r) : Infinity);
          const nextSpan = Math.max(span, Math.min(limit, span + drag.initialSpan * 0.2 * Math.min(1, pressure) * Math.min(64, delta) / 1000));
          const viewStart = a - r * nextSpan;
          const viewEnd = a + (1 - r) * nextSpan;
          frame = { viewStart, viewEnd, sample: Math.round(viewStart + ratio * nextSpan) };
        }
      }`);
  fs.writeFileSync(file, src);
}
assert.equal(dragFrame(4000, 5000, 10000, 52, 800, 852, 16).viewStart, 4016);
assert.equal(dragFrame(4000, 5000, 10000, 52, 800, 52, 16).viewStart, 3984);
