import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dragFrame } from '../src/utils/waveformNavigation.mjs';
const file = new URL('../src/utils/useWaveformInteractions.ts', import.meta.url);
let src = fs.readFileSync(file, 'utf8');
const marker = '// Expand only beyond the visible waveform';
if (!src.includes(marker)) {
  const replace = (before, after) => {
    if (src.split(before).length !== 2) throw new Error('Correctif ancre precedent absent ou modifie : ' + before);
    src = src.replace(before, () => after);
  };
  replace('const zone = Math.min(24, width / 4);\n        const pressure = drag.edge === \'resize-start\' ? (left + zone - drag.x) / zone : (drag.x - (left + width - zone)) / zone;', `${marker}
        const pressure = drag.edge === 'resize-start' ? (left - drag.x) / 24 : (drag.x - (left + width)) / 24;`);
  replace('drag.initialSpan * 1.25', 'drag.initialSpan * 1.08');
  replace('drag.initialSpan * 0.2 * Math.min(1, pressure)', 'drag.initialSpan * 0.04 * Math.min(1, pressure)');
}
assert.equal(dragFrame(4000, 5000, 10000, 52, 800, 852, 16).viewStart, 4016);
assert.equal(dragFrame(4000, 5000, 10000, 52, 800, 52, 16).viewStart, 3984);
fs.writeFileSync(file, src);
