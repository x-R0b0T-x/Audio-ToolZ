const fs = require('node:fs');
const crypto = require('node:crypto');
const patches = [
["src/components/WaveformView.tsx","import { BrandLogo } from './BrandLogo';","import { BrandLogo } from './BrandLogo';\nimport { useWaveformInteractions } from '../utils/useWaveformInteractions';"],
["src/components/WaveformView.tsx","  const readCssVar = (name: string, fallback: string): string => {","  useWaveformInteractions({ canvas: mainCanvasRef, doc: activeDoc, isRecording,\n    onSelectionChange, onSelectionCommit, onViewRangeChange });\n\n  const readCssVar = (name: string, fallback: string): string => {"],
["src/App.tsx","  const lastLoopSeekAtRef = useRef<number>(0);\n",""],
["src/App.tsx","      // Play always reads the full track from the beginning (0 -> total),\n      // whereas Loop reads the active selection loop (or full track if none).","      // Lecture depuis le curseur ; aucune boucle implicite sans selection."],
["src/App.tsx","      const targetMode: TransportPlayMode = loop ? 'loop' : 'play';","      loop = loop && endSample > startSample;\n      const targetMode: TransportPlayMode = loop ? 'loop' : 'play';"],
["src/App.tsx","        : 0;\n\n      const playEnd = loop","        : Math.min(total - 1, startSample);\n\n      const playEnd = loop"],
["src/App.tsx","? audioEngine.getCurrentSample() / activeDoc.sampleRate","? (isPlaying || isPaused ? audioEngine.getCurrentSample() : activeDoc.selection.startSample) / activeDoc.sampleRate"],
["src/audio/engine.ts","    const startChanged = safeStart !== this.playbackStartSample;\n",""],
["src/audio/engine.ts","    if (!restartFromStart && !outsideRange && !startChanged && this.sourceNode) {\n      this.offsetSamplesAtStart = current - this.playbackStartSample;","    if (!restartFromStart && !outsideRange && this.sourceNode) {\n      this.playbackStartSample = safeStart;\n      this.sourceNode.loopStart = safeStart / this.currentDocSampleRate;\n      this.offsetSamplesAtStart = current - safeStart;"],
["src/components/InfoModal.tsx","['Clic gauche', 'Début de sélection']","['Clic gauche', 'Départ de lecture']"],
["src/components/InfoModal.tsx","['Clic droit', 'Fin de sélection']","['Clic droit', 'Créer la sélection / boucle']"]
];
const block = "        onSelectionChange={(sel, reason: SelectionChangeReason) => {\n          updateActiveDoc((doc) => ({ ...doc, selection: sel }));\n          if (isPaused) setIsPaused(false);\n          if (reason === 'cursor') {\n            setIsLooping(false);\n            setPlayMode(isPlaying ? 'play' : 'idle');\n            if (isPlaying && activeDoc) {\n              const total = activeDoc.channels[0]?.length ?? 0;\n              audioEngine.play(activeDoc.channels, activeDoc.sampleRate, sel.startSample, total, {\n                loop: false, reverse: false, volumeDb, balance, speedRatio, enabledChannels,\n                onEnded: () => { setIsPlaying(false); setIsPaused(false); setIsLooping(false); setPlayMode('idle'); },\n              });\n            }\n            return;\n          }\n          if (isPlaying && isLooping && sel.endSample > sel.startSample) {\n            audioEngine.updateLoopRegion(sel.startSample, sel.endSample, false);\n          }\n        }}\n        onSelectionCommit={(sel) => {\n          if (isPlaying && isLooping && sel.endSample > sel.startSample) {\n            audioEngine.updateLoopRegion(sel.startSample, sel.endSample, false);\n          }\n        }}\n";
const notes = "### Correctifs de navigation — v1.4\n- Clic gauche : curseur de départ sans sélection implicite ; Lecture démarre au curseur. Un nouveau clic pendant la lecture repositionne celle-ci.\n- Clic droit : définition de la fin de sélection. Le bouton Boucle utilise uniquement une sélection existante.\n- Bornes déplaçables avec défilement automatique aux bords, même avec un pointeur immobile et pendant la lecture. Le zoom et la borne opposée sont conservés.\n- Ajustement de boucle sans redémarrage lorsque la tête de lecture reste dans les nouvelles bornes.\n- Annulation du glissement au changement de document et nettoyage des événements ; fin du glissement au relâchement ou à la perte de focus.\n- Vérifications automatiques avant préparation du ZIP ; essais interactifs Windows toujours nécessaires.\n";
function main() {
  const marker = 'scripts/.v1.4-interactions-applied';
  if (fs.existsSync(marker)) return;
  const output = new Map();
  for (const [file] of patches) if (!output.has(file)) output.set(file, fs.readFileSync(file, 'utf8'));
  const wave = output.get('src/components/WaveformView.tsx');
  const hash = crypto.createHash('sha1').update('blob ' + Buffer.byteLength(wave) + '\0').update(wave).digest('hex');
  if (hash !== '7340486d02555bfc55afa1feef68a36aa2840a19') throw new Error('WaveformView a change : revision manuelle requise.');
  for (const [file, old, replacement] of patches) {
    const text = output.get(file);
    if (text.split(old).length !== 2) throw new Error('Ancre absente ou ambigue : ' + file + ' / ' + old.slice(0, 70));
    output.set(file, text.replace(old, () => replacement));
  }
  let app = output.get('src/App.tsx');
  const a = '        onSelectionChange={(sel, reason: SelectionChangeReason) => {';
  const b = '        onViewRangeChange={(viewStartSample, viewEndSample) =>';
  if (app.split(a).length !== 2 || app.split(b).length !== 2) throw new Error('Callbacks de selection inattendus.');
  const start = app.indexOf(a), end = app.indexOf(b, start);
  if (end < start) throw new Error('Ordre des callbacks incorrect.');
  app = app.slice(0, start) + block + app.slice(end);
  output.set('src/App.tsx', app);
  for (const file of ['CHANGELOG.md', 'RELEASE_NOTES_1.4.md']) output.set(file, notes + '\n' + fs.readFileSync(file, 'utf8'));
  for (const [file, text] of output) fs.writeFileSync(file, text, 'utf8');
  fs.writeFileSync(marker, '1.4-interactions\n', 'utf8');
}
main();
