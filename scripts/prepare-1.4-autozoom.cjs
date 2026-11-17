const fs = require('node:fs');
const marker = 'scripts/.v1.4-autozoom-applied';
if (!fs.existsSync(marker)) {
  const output = new Map();
  function patch(file, old, replacement) {
    const text = output.has(file) ? output.get(file) : fs.readFileSync(file, 'utf8');
    if (text.split(old).length !== 2) throw new Error('Ancre absente ou ambigue : ' + file + ' / ' + old.slice(0, 60));
    output.set(file, text.replace(old, () => replacement));
  }
  const hook = 'src/utils/useWaveformInteractions.ts';
  patch('src/components/WaveformView.tsx', "  | 'cursor';", "  | 'cursor'\n  | 'cursor-drag';");
  patch(hook, "type Edge = 'resize-start' | 'resize-end';", "type Edge = 'resize-start' | 'resize-end' | 'cursor';");
  patch(hook, 'if (frame.viewStart !== drag.start) {', 'if (frame.viewStart !== drag.start || frame.viewEnd !== drag.end) {');
  patch(hook, "      const next = drag.edge === 'resize-start'", "      const next = drag.edge === 'cursor'\n        ? { startSample: Math.min(total - 1, point), endSample: Math.min(total - 1, point) }\n        : drag.edge === 'resize-start'");
  patch(hook, 'latest.current.onSelectionChange(next, drag.edge);', "latest.current.onSelectionChange(next, drag.edge === 'cursor' ? 'cursor-drag' : drag.edge);");
  patch(hook, "      const reason = event.button === 0 ? 'cursor' : 'new';\n      latest.current.onSelectionChange(next, reason);\n      latest.current.onSelectionCommit?.(next, reason);", "      if (event.button === 0) {\n        latest.current.onSelectionChange(next, 'cursor-drag');\n        drag = { edge: 'cursor', x: event.clientX, alt: event.altKey, selection: next, start: doc.viewStartSample, end: doc.viewEndSample };\n        canvas.style.cursor = 'ew-resize';\n        lastTime = performance.now(); raf = requestAnimationFrame(tick);\n      } else {\n        latest.current.onSelectionChange(next, 'new');\n        latest.current.onSelectionCommit?.(next, 'new');\n      }");
  patch('src/App.tsx', '          updateActiveDoc((doc) => ({ ...doc, selection: sel }));\n          if (isPaused)', "          updateActiveDoc((doc) => ({ ...doc, selection: sel }));\n          if (reason === 'cursor-drag') return;\n          if (isPaused)");
  patch('src/App.tsx', '        onSelectionCommit={(sel) => {', "        onSelectionCommit={(sel, reason) => {\n          if (reason === 'cursor') {\n            setIsPaused(false);\n            setIsLooping(false);\n            setPlayMode(isPlaying ? 'play' : 'idle');\n            if (isPlaying && activeDoc) {\n              const total = activeDoc.channels[0]?.length ?? 0;\n              audioEngine.play(activeDoc.channels, activeDoc.sampleRate, sel.startSample, total, {\n                loop: false, reverse: false, volumeDb, balance, speedRatio, enabledChannels,\n                onEnded: () => { setIsPlaying(false); setIsPaused(false); setIsLooping(false); setPlayMode('idle'); },\n              });\n            }\n            return;\n          }");
  const notes = '### Dezoom automatique — correctif v1.4\n- Elargissement progressif de la vue lors du glissement vers un bord, a gauche comme a droite.\n- Correction de la mise a jour du bord droit et ajout du glissement du curseur simple.\n- Pendant le glissement du curseur, la lecture continue ; le repositionnement audio est valide au relachement, sans devoir appuyer sur Stop.\n- Tests de calcul automatiques ; validation interactive Windows encore necessaire.\n\n';
  for (const file of ['CHANGELOG.md', 'RELEASE_NOTES_1.4.md']) output.set(file, notes + fs.readFileSync(file, 'utf8'));
  for (const [file, content] of output) fs.writeFileSync(file, content, 'utf8');
  fs.writeFileSync(marker, '1.4-autozoom\n', 'utf8');
}
