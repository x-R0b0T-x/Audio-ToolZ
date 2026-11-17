import fs from 'node:fs';
import assert from 'node:assert/strict';
import { dragFrame } from '../src/utils/waveformNavigation.mjs';
const file = new URL('../src/utils/useWaveformInteractions.ts', import.meta.url);
let src = fs.readFileSync(file, 'utf8');
const marker = '// Publish integer sample bounds; keep drag accumulation fractional.';
if (!src.includes(marker)) {
  const patch = (before, after) => {
    assert.equal(src.split(before).length, 2, 'Ancre inattendue : ' + before);
    src = src.replace(before, () => after);
  };
  patch('latest.current.onViewRangeChange(drag.start, drag.end);', `${marker}
        const start = Math.max(0, Math.min(total - 1, Math.round(drag.start)));
        const end = Math.min(total, Math.max(start + 1, Math.round(drag.end)));
        latest.current.onViewRangeChange(start, end);`);
  const first = '      const next = event.button === 0';
  const last = "        latest.current.onSelectionChange(next, 'cursor-drag');";
  assert.equal(src.split(first).length, 2);
  assert.equal(src.split(last).length, 2);
  const a = src.indexOf(first), b = src.indexOf(last, a);
  assert.ok(b > a);
  src = src.slice(0, a) + `      if (event.button === 2 || selection.endSample > selection.startSample) {
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
      {
` + src.slice(b);
  patch("      } else {\n        latest.current.onSelectionChange(next, 'new');\n        latest.current.onSelectionCommit?.(next, 'new');\n      }", '      }');
}
assert.equal(dragFrame(4000, 5000, 10000, 52, 800, 852, 16).viewStart, 4016);
assert.equal(dragFrame(4000, 5000, 10000, 52, 800, 52, 16).viewStart, 3984);
fs.writeFileSync(file, src);
