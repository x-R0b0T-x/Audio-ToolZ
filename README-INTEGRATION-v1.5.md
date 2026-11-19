# Audio ToolZ v1.5 — Guide d'intégration (Tauri v2 + DSP Studio)

Ce kit complet et prêt à compiler (tests unitaires `node:test` 21/21 + vérification TypeScript) met à niveau **Audio ToolZ v1.4** (`x-R0b0T-x/Audio-ToolZ`) vers la **v1.5** sans aucune dépendance propriétaire.

## 1. Alléger Audio ToolZ.exe (Electron -> Tauri v2, ~6–12 Mo)
- Remplace la coque Electron (~150+ Mo Chromium/Node) par **Tauri v2 + WebView2 natif Windows 10/11**.
- Fichiers inclus :
  - `src-tauri/Cargo.toml`, `src-tauri/build.rs`, `src-tauri/tauri.conf.json`, `src-tauri/capabilities/default.json`
  - `src-tauri/src/main.rs` (reprend tes 6 commandes `DesktopAPI`, le stockage portable `user-data/recent-files.json` à côté de l'`.exe` et le lien `https://t.me/Audio_ToolZ`)
  - `src/utils/desktop.ts` (compatible Tauri v2 + Electron + Web)
  - `.github/workflows/build-v1.5.yml` (restaure les icônes depuis le commit `6af5c11` et compile `Audio ToolZ.exe` portable sur `windows-latest`)

## 2. Nouveaux effets DSP Studio + Presets
- `src/audio/studioDsp.ts` :
  - `applyParametricEq` (LowShelf / Peaking / HighShelf Biquad)
  - `applyFrequencyFilter` (LowPass / HighPass / Notch 50-60 Hz)
  - `applyCompressorAutoGain` (Compresseur + mode Auto-Gain)
  - `captureNoiseProfile` & `applySpectralNoiseReduction` (FFT Radix-2 + fenêtre de Hann + overlap-add)
  - `applyEchoDelay`, `mixPasteAt` (mixage au collage avec crossfade sans clic, `Ctrl+M`), `invertPhase`, `swapStereoChannels`, `removeDcOffset`
- `src/audio/presets.ts` : catalogue de presets JSON (`DEFAULT_STUDIO_PRESETS`) + import/export.

## 3. Traitement par lots (Batch), Auto-Cue & Interface câblée
- `src/audio/autoCueSplit.ts` : `detectSilenceCuePoints` + `splitChannelsByCues` (compatible `CueTrackEntry`).
- `src/audio/batchProcessor.ts` : `applyEffectChain` + `runBatchProcessing` (export `wav`, `flac`, `mp3`, `ogg`).
- `src/audio/types.ts`, `src/components/EffectModal.tsx`, `src/components/BatchModal.tsx`, `src/components/TopMenuBar.tsx`, `src/App.tsx` : tous les menus, modales, presets et raccourcis sont déjà branchés.
- `src/audio/studioDsp.test.ts` : suite de 7 tests unitaires (`npx tsx --test src/audio/studioDsp.test.ts`).
