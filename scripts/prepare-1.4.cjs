const fs = require('node:fs');
const crypto = require('node:crypto');
const expected = {"src/App.tsx":"80a6a5f7234cf02f8543d240f2343663eb40dd8f","src/components/ControlWindow.tsx":"3615531e93638530356815633f6b1582322488df","src/components/TopMenuBar.tsx":"29fdcdf081eb7c88dc9472144d44cf8ca446328e","src/components/InfoModal.tsx":"f84c43e5b781d3216b713a152fd522562fd221a8","scripts/build-portable.ps1":"07da79c20bd52fc571e5bda3186cfbed2eb2ce1f"};
const changes = [
["src/App.tsx","import { audioEngine } from './audio/engine';","import { audioEngine } from './audio/engine';\nimport { desktop, notifyRecentFilesChanged, fileFromDesktop } from './utils/desktop';"],
["src/App.tsx","async (file: File) => {\n      try {\n        const buffer = await file.arrayBuffer();","async (file: File, recentToken?: string) => {\n      try {\n        const buffer = await file.arrayBuffer();"],
["src/App.tsx","        showToast(`Fichier ouvert : ${file.name}`);","        showToast(`Fichier ouvert : ${file.name}`);\n        try {\n          if (recentToken) await desktop()?.confirmOpened(recentToken);\n          else await desktop()?.rememberFile(file);\n          notifyRecentFilesChanged();\n        } catch (error) { console.warn('Historique non enregistre', error); }"],
["src/App.tsx","  const handleOpenFile = useCallback(async () => {","  const handleOpenRecent = useCallback(async (id: string) => {\n    try {\n      const api = desktop();\n      if (!api) return;\n      const payload = await api.openRecent(id);\n      await decodeAndOpenFile(fileFromDesktop(payload), payload.token);\n    } catch {\n      showToast('Fichier recent introuvable, deplace ou inaccessible.', true);\n    }\n  }, [decodeAndOpenFile, showToast]);\n\n  const handleOpenFile = useCallback(async () => {\n    const api = desktop();\n    if (api) {\n      try {\n        for (const payload of await api.pickAudioFiles()) {\n          await decodeAndOpenFile(fileFromDesktop(payload), payload.token);\n        }\n      } catch { showToast('Impossible de lire le fichier choisi.', true); }\n      return;\n    }"],
["src/App.tsx","      <TopMenuBar\n","      <TopMenuBar\n        onOpenRecent={(id) => void handleOpenRecent(id)}\n"],
["src/components/TopMenuBar.tsx","import { Download } from 'lucide-react';","import { Download } from 'lucide-react';\nimport { RecentFilesMenu } from './RecentFilesMenu';"],
["src/components/TopMenuBar.tsx","interface TopMenuBarProps {","interface TopMenuBarProps {\n  onOpenRecent: (id: string) => void;"],
["src/components/TopMenuBar.tsx","  hasDocument,\n","  onOpenRecent,\n  hasDocument,\n"],
["src/components/TopMenuBar.tsx","                  onClick={() => runAndClose(onOpenExport)}\n                />","                  onClick={() => runAndClose(onOpenExport)}\n                />\n                <RecentFilesMenu onOpen={(id) => runAndClose(() => onOpenRecent(id))} />"],
["src/components/ControlWindow.tsx","  const timeDisplayRef = useRef<HTMLSpanElement | null>(null);","  const coloredClockRef = useRef({ lastMs: 0, remainder: 0 });\n  useEffect(() => {\n    coloredClockRef.current = { lastMs: performance.now(), remainder: 0 };\n  }, [visible, collapsed, visualMode, isPlaying, isRecording]);\n  const timeDisplayRef = useRef<HTMLSpanElement | null>(null);"],
["src/components/ControlWindow.tsx","              // High-resolution 8 slices per frame (128 samples/px) for razor-sharp crest detail\n              const slicesPerFrame =\n                coloredHistoryRef.current.l.length === 0 ? maxHistoryCols : 8;","              // 240 colonnes/s : moitie du defilement precedent sur un ecran 60 Hz.\n              const clock = coloredClockRef.current;\n              const elapsed = Math.min(100, Math.max(0, now - clock.lastMs));\n              clock.lastMs = now;\n              const budget = clock.remainder + elapsed * 240 / 1000;\n              const slicesPerFrame = Math.min(maxHistoryCols, Math.floor(budget));\n              clock.remainder = budget - Math.floor(budget);"],
["src/components/ControlWindow.tsx","Math.floor(waveLData.length / slicesPerFrame)","Math.floor(waveLData.length / Math.max(1, slicesPerFrame))"],
["src/components/InfoModal.tsx","export const APP_VERSION = 'v1.3';","export const APP_VERSION = 'v1.4';"],
["src/components/InfoModal.tsx","const CHANGELOG_ADDITIONS = [","const CHANGELOG_ADDITIONS = [\n  'Les dix derniers fichiers audio dans le menu Fichier, avec effacement de la liste',\n  'Invitation a rejoindre la communaute Telegram Audio ToolZ',\n  'Dossier portable stable : Audio ToolZ',\n  'Defilement de la forme onde coloree ralenti et independant de la frequence ecran', "],
["src/components/InfoModal.tsx","          {/* Sélecteur Raccourcis / Changelog */}","          <section className=\"p-4 rounded-lg border text-center space-y-3\"\n            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}>\n            <h3 className=\"font-semibold\">Rejoignez la communaute Audio ToolZ</h3>\n            <p>Venez discuter du logiciel, partager vos idees, poser vos questions et echanger avec la communaute.</p>\n            <a href=\"https://t.me/Audio_ToolZ\" target=\"_blank\" rel=\"noopener noreferrer\"\n              className=\"inline-block px-4 py-2 rounded-md font-semibold\"\n              style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>\n              Rejoindre la communaute Telegram\n            </a>\n          </section>\n          {/* Sélecteur Raccourcis / Changelog */}"],
["scripts/build-portable.ps1","$bundle = Join-Path $out 'Audio-ToolZ-1.3-Windows-Portable-x64'","$bundle = Join-Path $out 'Audio ToolZ'"],
["scripts/build-portable.ps1","Copy-Item 'electron/main.cjs' (Join-Path $appDir 'main.cjs')","Copy-Item 'electron/main.cjs' (Join-Path $appDir 'main.cjs')\nCopy-Item 'electron/preload.cjs' (Join-Path $appDir 'preload.cjs')\nCopy-Item 'electron/recent-store.cjs' (Join-Path $appDir 'recent-store.cjs')"],
["scripts/build-portable.ps1","version = '1.3.0'","version = '1.4.0'"],
["scripts/build-portable.ps1","'Audio-ToolZ-1.3-Windows-Portable-x64.zip'","'Audio-ToolZ-1.4-Windows-Portable-x64.zip'"]
];
function main() {
  const marker = 'scripts/.v1.4-applied';
  if (fs.existsSync(marker)) { console.log('Migration 1.4 deja appliquee.'); return; }
  const output = new Map();
  for (const [file, sha] of Object.entries(expected)) {
    const bytes = fs.readFileSync(file);
    const actual = crypto.createHash('sha1').update('blob ' + bytes.length + '\0').update(bytes).digest('hex');
    if (actual !== sha) throw new Error('Source modifiee depuis la preparation : ' + file);
    output.set(file, bytes.toString('utf8'));
  }
  for (const [file, old, replacement] of changes) {
    const source = output.get(file);
    if (source.split(old).length !== 2) throw new Error('Ancre absente ou ambigue : ' + file + ' / ' + old.slice(0, 60));
    output.set(file, source.replace(old, () => replacement));
  }
  const iconFile = 'scripts/set-exe-icon.cjs';
  const iconSource = fs.readFileSync(iconFile, 'utf8');
  if ((iconSource.match(/'1\.3\.0'/g) || []).length !== 2) throw new Error('Version icone inattendue.');
  output.set(iconFile, iconSource.replaceAll("'1.3.0'", "'1.4.0'"));
  const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  pkg.version = '1.4.0';
  output.set('package.json', JSON.stringify(pkg, null, 2) + '\n');
  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const notes = fs.readFileSync('RELEASE_NOTES_1.4.md', 'utf8');
  output.set('CHANGELOG.md', '# Journal des modifications\n\n' + notes + '\n' + changelog.replace(/^# Journal des modifications\s*/, ''));
  for (const [file, content] of output) fs.writeFileSync(file, content, 'utf8');
  fs.writeFileSync(marker, '1.4\n', 'utf8');
  console.log('Migration 1.4 appliquee : ' + output.size + ' fichiers.');
}
main();
