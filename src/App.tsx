import { installMenuHover } from './utils/uiPolish';
import './polish.css';
import { decodeAudioFallback } from './utils/desktop';
/**
 * @license
 * SPDX-License-Identifier: GPL-3.0-or-later
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { detectSilenceCuePoints, splitChannelsByCues } from './audio/autoCueSplit';
import { buildCueSheet, parseCueSheet } from './audio/cueSheet';
import { encodeWav } from './audio/encoders/wav';
import {
  invertPhase,
  mixPasteAt,
  removeDcOffset,
  swapStereoChannels,
  type NoiseProfile,
} from './audio/studioDsp';
import {
  cloneChannels,
  cutRange,
  copyRange,
  detectBpmAndBeats,
  pasteAt,
  resolveTargetRange,
  silenceRange,
  trimToRange,
} from './audio/dsp';
import { audioEngine } from './audio/engine';
import { desktop, notifyRecentFilesChanged, fileFromDesktop } from './utils/desktop';
import type {
  AudioDocument,
  AudioExportFormat,
  AudioSelection,
  CueTrackEntry,
  EffectModalId,
} from './audio/types';
import { BatchModal } from './components/BatchModal';
import { ControlWindow, type TransportPlayMode } from './components/ControlWindow';
import { EffectModal } from './components/EffectModal';
import { ExportModal } from './components/ExportModal';
import { InfoModal } from './components/InfoModal';
import { downloadTextFile, JoinFilesModal } from './components/JoinFilesModal';
import { SettingsModal } from './components/SettingsModal';
import { TopMenuBar } from './components/TopMenuBar';
import {
  WaveformView,
  type SelectionChangeReason,
} from './components/WaveformView';
import {
  loadPersistedUiState,
  savePersistedUiState,
  type RecordingPreferences,
} from './utils/uiStateStorage';

function makeDocId(): string {
  return `doc_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
}

export default function App() {
  useEffect(() => {
    const root = document.getElementById('root');
    document.title = 'Audio ToolZ v1.5';
    return root ? installMenuHover(root) : undefined;
  }, []);
  const [documents, setDocuments] = useState<AudioDocument[]>([]);
  const [activeDocId, setActiveDocId] = useState<string | null>(null);
  const [clipboard, setClipboard] = useState<Float32Array[] | null>(null);

  const controlOpen = true;
  const [activeEffect, setActiveEffect] = useState<EffectModalId>(null);
  const [noiseProfile, setNoiseProfile] = useState<NoiseProfile | null>(null);
  const [batchOpen, setBatchOpen] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [infoOpen, setInfoOpen] = useState(false);
  const [deviceRefreshKey, setDeviceRefreshKey] = useState(0);

  const [selectedInputDeviceId, setSelectedInputDeviceId] = useState<string>(
    () => loadPersistedUiState().selectedInputDeviceId
  );
  const [selectedOutputDeviceId, setSelectedOutputDeviceId] = useState<string>(
    () => loadPersistedUiState().selectedOutputDeviceId
  );
  const [recordingSettings, setRecordingSettings] =
    useState<RecordingPreferences>(() => loadPersistedUiState().recordingSettings);

  useEffect(() => {
    savePersistedUiState({
      controlOpen,
      selectedInputDeviceId,
      selectedOutputDeviceId,
      recordingSettings,
    });
  }, [
    controlOpen,
    selectedInputDeviceId,
    selectedOutputDeviceId,
    recordingSettings,
  ]);

  useEffect(() => {
    if (selectedOutputDeviceId) {
      void audioEngine.setOutputDevice(selectedOutputDeviceId);
    }
  }, [selectedOutputDeviceId]);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isLooping, setIsLooping] = useState(false);
  const [playMode, setPlayMode] = useState<TransportPlayMode>('idle');
  const [isRecording, setIsRecording] = useState(false);
  const [isPreviewPlaying, setIsPreviewPlaying] = useState(false);

  const [volumeDb, setVolumeDb] = useState(0);
  const [balance, setBalance] = useState(0);
  const [speedRatio, setSpeedRatio] = useState(1);
  const [enabledChannels, setEnabledChannels] = useState<[boolean, boolean]>([
    true,
    true,
  ]);
  const [toast, setToast] = useState<{ text: string; isError?: boolean } | null>(
    null
  );

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const cueInputRef = useRef<HTMLInputElement | null>(null);
  const toastTimerRef = useRef<number | null>(null);

  const activeDoc = documents.find((d) => d.id === activeDocId) ?? null;

  const showToast = useCallback((text: string, isError = false) => {
    setToast({ text, isError });
    if (toastTimerRef.current) {
      window.clearTimeout(toastTimerRef.current);
    }
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  const updateActiveDoc = useCallback(
    (updater: (doc: AudioDocument) => AudioDocument) => {
      if (!activeDocId) return;
      setDocuments((prev) =>
        prev.map((d) => (d.id === activeDocId ? updater(d) : d))
      );
    },
    [activeDocId]
  );

  const commitAudioEdit = useCallback(
    (
      nextChannels: Float32Array[],
      label: string,
      nextSelection?: AudioSelection,
      respectChannelMask = false,
      resetView = false
    ) => {
      if (!activeDocId) return;
      audioEngine.stop(true);
      setIsPlaying(false);
      setIsPaused(false);
      setIsLooping(false);

      setDocuments((prev) =>
        prev.map((doc) => {
          if (doc.id !== activeDocId) return doc;
          const snapshot = {
            channels: cloneChannels(doc.channels),
            sampleRate: doc.sampleRate,
            selection: { ...doc.selection },
            label,
          };
          // If only one stereo channel is checked, keep the unchecked channel unmodified when lengths match
          const mergedChannels =
            respectChannelMask &&
            doc.channels.length === 2 &&
            nextChannels.length === 2 &&
            doc.channels[0].length === nextChannels[0].length
              ? [
                  enabledChannels[0] ? nextChannels[0] : new Float32Array(doc.channels[0]),
                  enabledChannels[1] ? nextChannels[1] : new Float32Array(doc.channels[1]),
                ]
              : nextChannels;

          const total = mergedChannels[0]?.length ?? 0;
          const lengthChanged = (doc.channels[0]?.length ?? 0) !== total;
          const sel = nextSelection ?? {
            startSample: Math.min(doc.selection.startSample, total),
            endSample: Math.min(doc.selection.endSample, total),
          };
          const bpmWasEnabled = Boolean(doc.bpmInfo || doc.showBeatGrid);
          const recomputedBpm =
            bpmWasEnabled && (lengthChanged || resetView)
              ? detectBpmAndBeats(mergedChannels, doc.sampleRate)
              : null;
          return {
            ...doc,
            channels: mergedChannels,
            selection: sel,
            viewStartSample: resetView ? 0 : Math.min(doc.viewStartSample, total),
            viewEndSample: resetView
              ? total
              : doc.viewEndSample > total || doc.viewEndSample === doc.channels[0]?.length
              ? total
              : Math.max(Math.min(total, doc.viewEndSample), 1),
            undoStack: [...doc.undoStack.slice(-29), snapshot],
            redoStack: [],
            dirty: true,
            ...(recomputedBpm
              ? {
                  bpmInfo: recomputedBpm.bpm > 0 ? recomputedBpm : null,
                  showBeatGrid: recomputedBpm.bpm > 0 && Boolean(doc.showBeatGrid),
                  snapToBeats: recomputedBpm.bpm > 0 && Boolean(doc.snapToBeats),
                }
              : {}),
          };
        })
      );
    },
    [activeDocId, enabledChannels]
  );

  const handleUndo = useCallback(() => {
    if (!activeDoc || activeDoc.undoStack.length === 0) return;
    audioEngine.stop(true);
    setIsPlaying(false);
    setIsPaused(false);
    updateActiveDoc((doc) => {
      const prevSnap = doc.undoStack[doc.undoStack.length - 1];
      const redoSnap = {
        channels: cloneChannels(doc.channels),
        sampleRate: doc.sampleRate,
        selection: { ...doc.selection },
        label: prevSnap.label,
      };
      const restoredChannels = cloneChannels(prevSnap.channels);
      const nextTotal = restoredChannels[0]?.length ?? 0;
      const lengthChanged = (doc.channels[0]?.length ?? 0) !== nextTotal;
      const bpmWasEnabled = Boolean(doc.bpmInfo || doc.showBeatGrid);
      const recomputedBpm =
        bpmWasEnabled && lengthChanged
          ? detectBpmAndBeats(restoredChannels, prevSnap.sampleRate)
          : null;
      return {
        ...doc,
        channels: restoredChannels,
        sampleRate: prevSnap.sampleRate,
        selection: { ...prevSnap.selection },
        viewStartSample: 0,
        viewEndSample: nextTotal,
        undoStack: doc.undoStack.slice(0, -1),
        redoStack: [...doc.redoStack, redoSnap],
        dirty: true,
        ...(recomputedBpm
          ? {
              bpmInfo: recomputedBpm.bpm > 0 ? recomputedBpm : null,
              showBeatGrid: recomputedBpm.bpm > 0 && Boolean(doc.showBeatGrid),
              snapToBeats: recomputedBpm.bpm > 0 && Boolean(doc.snapToBeats),
            }
          : {}),
      };
    });
    showToast('Action annulée');
  }, [activeDoc, showToast, updateActiveDoc]);

  const handleRedo = useCallback(() => {
    if (!activeDoc || activeDoc.redoStack.length === 0) return;
    audioEngine.stop(true);
    setIsPlaying(false);
    setIsPaused(false);
    updateActiveDoc((doc) => {
      const nextSnap = doc.redoStack[doc.redoStack.length - 1];
      const undoSnap = {
        channels: cloneChannels(doc.channels),
        sampleRate: doc.sampleRate,
        selection: { ...doc.selection },
        label: nextSnap.label,
      };
      const restoredChannels = cloneChannels(nextSnap.channels);
      const nextTotal = restoredChannels[0]?.length ?? 0;
      const lengthChanged = (doc.channels[0]?.length ?? 0) !== nextTotal;
      const bpmWasEnabled = Boolean(doc.bpmInfo || doc.showBeatGrid);
      const recomputedBpm =
        bpmWasEnabled && lengthChanged
          ? detectBpmAndBeats(restoredChannels, nextSnap.sampleRate)
          : null;
      return {
        ...doc,
        channels: restoredChannels,
        sampleRate: nextSnap.sampleRate,
        selection: { ...nextSnap.selection },
        viewStartSample: 0,
        viewEndSample: nextTotal,
        undoStack: [...doc.undoStack, undoSnap],
        redoStack: doc.redoStack.slice(0, -1),
        dirty: true,
        ...(recomputedBpm
          ? {
              bpmInfo: recomputedBpm.bpm > 0 ? recomputedBpm : null,
              showBeatGrid: recomputedBpm.bpm > 0 && Boolean(doc.showBeatGrid),
              snapToBeats: recomputedBpm.bpm > 0 && Boolean(doc.snapToBeats),
            }
          : {}),
      };
    });
    showToast('Action rétablie');
  }, [activeDoc, showToast, updateActiveDoc]);

  const handleCut = useCallback(() => {
    if (!activeDoc) return;
    const { startSample, endSample } = activeDoc.selection;
    if (endSample <= startSample) return;
    const res = cutRange(activeDoc.channels, startSample, endSample);
    setClipboard(res.copied);
    commitAudioEdit(res.channels, 'Couper', {
      startSample: res.cursorSample,
      endSample: res.cursorSample,
    });
    showToast('Sélection coupée');
  }, [activeDoc, commitAudioEdit, showToast]);

  const handleCopy = useCallback(() => {
    if (!activeDoc) return;
    const { startSample, endSample } = activeDoc.selection;
    if (endSample <= startSample) return;
    setClipboard(copyRange(activeDoc.channels, startSample, endSample));
    showToast('Sélection copiée dans le presse-papiers');
  }, [activeDoc, showToast]);

  const handlePaste = useCallback(() => {
    if (!activeDoc || !clipboard) return;
    const { startSample, endSample } = activeDoc.selection;
    const res = pasteAt(
      activeDoc.channels,
      clipboard,
      startSample,
      endSample > startSample ? endSample : undefined
    );
    commitAudioEdit(res.channels, 'Coller', res.selection);
    showToast('Audio collé au curseur');
  }, [activeDoc, clipboard, commitAudioEdit, showToast]);

  const handleMixPaste = useCallback(() => {
    if (!activeDoc || !clipboard || clipboard.length === 0) return;
    const res = mixPasteAt(
      activeDoc.channels,
      clipboard,
      activeDoc.sampleRate,
      activeDoc.selection.startSample
    );
    commitAudioEdit(res.channels, 'Mixage au collage', {
      startSample: activeDoc.selection.startSample,
      endSample: res.endSample,
    });
    showToast('Audio mixé au curseur (crossfade)');
  }, [activeDoc, clipboard, commitAudioEdit, showToast]);

  const handleInvertPhase = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    const { start, end } = resolveTargetRange(activeDoc.selection, total);
    const next = invertPhase(activeDoc.channels, start, end);
    commitAudioEdit(next, 'Inverser la phase', undefined, true);
    showToast('Phase inversée');
  }, [activeDoc, commitAudioEdit, showToast]);

  const handleSwapChannels = useCallback(() => {
    if (!activeDoc || activeDoc.channels.length < 2) {
      showToast('Une piste stéréo est requise pour inverser les canaux G/D.', true);
      return;
    }
    const next = swapStereoChannels(activeDoc.channels);
    commitAudioEdit(next, 'Inverser canaux G/D');
    showToast('Canaux gauche / droite inversés');
  }, [activeDoc, commitAudioEdit, showToast]);

  const handleRemoveDcOffset = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    const { start, end } = resolveTargetRange(activeDoc.selection, total);
    const next = removeDcOffset(activeDoc.channels, start, end);
    commitAudioEdit(next, 'Suppression DC', undefined, true);
    showToast('Décalage DC supprimé');
  }, [activeDoc, commitAudioEdit, showToast]);

  const handleSilence = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    const { start, end } = resolveTargetRange(activeDoc.selection, total);
    const next = silenceRange(activeDoc.channels, start, end);
    commitAudioEdit(next, 'Silence', undefined, true);
    showToast('Zone mise en silence');
  }, [activeDoc, commitAudioEdit, showToast]);

  const handleTrim = useCallback(() => {
    if (!activeDoc) return;
    const { startSample, endSample } = activeDoc.selection;
    if (endSample <= startSample) return;
    const next = trimToRange(activeDoc.channels, startSample, endSample);
    commitAudioEdit(
      next,
      'Rogner',
      {
        startSample: 0,
        endSample: 0,
      },
      false,
      true
    );
    showToast('Extérieurs supprimés : seul votre sample sélectionné a été gardé');
  }, [activeDoc, commitAudioEdit, showToast]);

  const handleDetectBpm = useCallback(() => {
    if (!activeDoc) return;
    if (activeDoc.bpmInfo && activeDoc.bpmInfo.bpm > 0) {
      const nextShow = !activeDoc.showBeatGrid;
      updateActiveDoc((doc) => ({
        ...doc,
        showBeatGrid: nextShow,
      }));
      showToast(
        nextShow
          ? `Grille ${activeDoc.bpmInfo.bpm.toFixed(1)} BPM / kicks affichée`
          : 'Grille BPM / kicks masquée'
      );
      return;
    }

    const res = detectBpmAndBeats(activeDoc.channels, activeDoc.sampleRate);
    if (res.bpm <= 0) {
      showToast(
        'Impossible de détecter un tempo régulier (piste trop courte ou silencieuse).',
        true
      );
      return;
    }

    updateActiveDoc((doc) => ({
      ...doc,
      bpmInfo: res,
      showBeatGrid: true,
      snapToBeats: true,
    }));
    showToast(
      `BPM détecté : ${res.bpm.toFixed(1)} BPM (${res.kickSamples.length} kicks repérés)`
    );
  }, [activeDoc, showToast, updateActiveDoc]);

  const handleToggleSnapToBeats = useCallback(() => {
    if (!activeDoc) return;
    const nextSnap = !activeDoc.snapToBeats;
    updateActiveDoc((doc) => ({
      ...doc,
      snapToBeats: nextSnap,
    }));
    showToast(
      nextSnap ? 'Aimant sur les kicks activé' : 'Aimant sur les kicks désactivé'
    );
  }, [activeDoc, showToast, updateActiveDoc]);

  const handleSelectAll = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    updateActiveDoc((doc) => ({
      ...doc,
      selection: { startSample: 0, endSample: total },
    }));
    if (isPlaying && isLooping) {
      audioEngine.updateLoopRegion(0, total, true);
    }
  }, [activeDoc, isLooping, isPlaying, updateActiveDoc]);

  const handleZoomIn = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    const len = activeDoc.viewEndSample - activeDoc.viewStartSample;
    const nextLen = Math.max(128, Math.round(len * 0.55));
    const center =
      activeDoc.selection.endSample > activeDoc.selection.startSample
        ? (activeDoc.selection.startSample + activeDoc.selection.endSample) / 2
        : activeDoc.selection.startSample ||
          (activeDoc.viewStartSample + activeDoc.viewEndSample) / 2;
    const start = Math.max(0, Math.min(total - nextLen, Math.round(center - nextLen / 2)));
    updateActiveDoc((doc) => ({
      ...doc,
      viewStartSample: start,
      viewEndSample: Math.min(total, start + nextLen),
    }));
  }, [activeDoc, updateActiveDoc]);

  const handleZoomOut = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    const len = activeDoc.viewEndSample - activeDoc.viewStartSample;
    const nextLen = Math.min(total, Math.round(len * 1.8));
    const center = (activeDoc.viewStartSample + activeDoc.viewEndSample) / 2;
    const start = Math.max(0, Math.min(total - nextLen, Math.round(center - nextLen / 2)));
    updateActiveDoc((doc) => ({
      ...doc,
      viewStartSample: start,
      viewEndSample: Math.min(total, start + nextLen),
    }));
  }, [activeDoc, updateActiveDoc]);

  const handleZoomSelection = useCallback(() => {
    if (!activeDoc) return;
    const { startSample, endSample } = activeDoc.selection;
    if (endSample <= startSample) return;
    updateActiveDoc((doc) => ({
      ...doc,
      viewStartSample: startSample,
      viewEndSample: endSample,
    }));
  }, [activeDoc, updateActiveDoc]);

  const handleZoomReset = useCallback(() => {
    if (!activeDoc) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    updateActiveDoc((doc) => ({
      ...doc,
      viewStartSample: 0,
      viewEndSample: total,
    }));
  }, [activeDoc, updateActiveDoc]);

  const handleNewEmpty = useCallback(() => {
    const sampleRate = 44100;
    const len = sampleRate * 5;
    const doc: AudioDocument = {
      id: makeDocId(),
      name: `Sans_titre_${documents.length + 1}.wav`,
      sampleRate,
      channels: [new Float32Array(len), new Float32Array(len)],
      selection: { startSample: 0, endSample: 0 },
      viewStartSample: 0,
      viewEndSample: len,
      undoStack: [],
      redoStack: [],
      dirty: false,
      sourceFormat: 'WAV',
    };
    setDocuments((prev) => [...prev, doc]);
    setActiveDocId(doc.id);
    showToast(`Document vierge créé (${doc.name})`);
  }, [documents.length, showToast]);

  const handleApplyCueFile = useCallback(
    async (file: File) => {
      if (!activeDoc) {
        showToast(
          'Ouvrez d’abord un fichier audio ou un mix avant d’importer un .cue.',
          true
        );
        return;
      }
      try {
        const text = await file.text();
        const total = activeDoc.channels[0]?.length ?? 0;
        const parsed = parseCueSheet(text, activeDoc.sampleRate, total);
        if (parsed.tracks.length === 0) {
          showToast('Aucune piste valide trouvée dans ce fichier .cue.', true);
          return;
        }
        updateActiveDoc((doc) => ({
          ...doc,
          cueTracks: parsed.tracks,
        }));
        showToast(
          `${parsed.tracks.length} titre(s) importé(s) depuis ${file.name}`
        );
      } catch {
        showToast(`Impossible de lire le fichier .cue « ${file.name} ».`, true);
      }
    },
    [activeDoc, showToast, updateActiveDoc]
  );

  const handleExportCue = useCallback(() => {
    if (!activeDoc || !activeDoc.cueTracks || activeDoc.cueTracks.length === 0) {
      return;
    }
    const baseName = activeDoc.name.replace(/\.[^.]+$/, '') || 'Mix_AudioToolZ';
    const cueContent = buildCueSheet({
      mixTitle: baseName,
      audioFileName: activeDoc.name,
      sampleRate: activeDoc.sampleRate,
      tracks: activeDoc.cueTracks,
    });
    downloadTextFile(`${baseName}.cue`, cueContent);
    showToast(`Fichier .cue extrait : ${baseName}.cue`);
  }, [activeDoc, showToast]);

  const handleAutoCue = useCallback(() => {
    if (!activeDoc) return;
    const cues = detectSilenceCuePoints(activeDoc.channels, activeDoc.sampleRate);
    if (cues.length === 0) {
      showToast('Aucun repère détecté sur cette piste.', true);
      return;
    }
    updateActiveDoc((doc) => ({
      ...doc,
      cueTracks: cues,
    }));
    showToast(`${cues.length} repère(s) Auto-Cue détecté(s)`);
  }, [activeDoc, showToast, updateActiveDoc]);

  const handleSplitByCue = useCallback(() => {
    if (!activeDoc || !activeDoc.cueTracks || activeDoc.cueTracks.length === 0) {
      showToast('Aucun repère .cue disponible pour découper.', true);
      return;
    }
    const baseName = activeDoc.name.replace(/\.[^.]+$/, '') || 'AudioToolZ';
    const segments = splitChannelsByCues(
      activeDoc.channels,
      activeDoc.sampleRate,
      activeDoc.cueTracks,
      baseName
    );
    if (segments.length === 0) {
      showToast('Aucun segment valide à exporter.', true);
      return;
    }
    for (const seg of segments) {
      const wavBytes = encodeWav(seg.channels, activeDoc.sampleRate, 16);
      const blob = new Blob([wavBytes.buffer as ArrayBuffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${seg.fileName}.wav`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 4000);
    }
    showToast(`${segments.length} segment(s) WAV découpé(s)`);
  }, [activeDoc, showToast]);

  const handleJoinComplete = useCallback(
    (result: {
      mixTitle: string;
      mixPerformer: string;
      channels: Float32Array[];
      sampleRate: number;
      cueTracks: CueTrackEntry[];
    }) => {
      const total = result.channels[0]?.length ?? 0;
      const safeName = `${result.mixTitle.replace(/[\\/:*?"<>|]/g, '_')}.wav`;
      const doc: AudioDocument = {
        id: makeDocId(),
        name: safeName,
        sampleRate: result.sampleRate,
        channels: result.channels,
        selection: { startSample: 0, endSample: 0 },
        viewStartSample: 0,
        viewEndSample: total,
        undoStack: [],
        redoStack: [],
        dirty: true,
        sourceFormat: 'WAV',
        bpmInfo: null,
        showBeatGrid: false,
        snapToBeats: false,
        cueTracks: result.cueTracks,
      };
      setDocuments((prev) => [...prev, doc]);
      setActiveDocId(doc.id);
      showToast(
        `Mix créé (${result.cueTracks.length} pistes) : ${safeName}`
      );
    },
    [showToast]
  );

  const decodeAndOpenFile = useCallback(
    async (file: File, recentToken?: string) => {
      try {
        const buffer = await file.arrayBuffer();
        const decoded = await audioEngine.decodeFile(buffer).catch(async (error) => {
          if (!window.__TAURI_INTERNALS__) throw error;
          try {
            return await decodeAudioFallback(buffer);
          } catch (fallbackError) {
            const detail = fallbackError instanceof Error ? fallbackError.message : String(fallbackError);
            throw new Error(`Piste audio non importée : ${detail}`);
          }
        });
        const total = decoded.channels[0]?.length ?? 0;
        const ext = file.name.split('.').pop()?.toUpperCase() || 'AUDIO';
        const doc: AudioDocument = {
          id: makeDocId(),
          name: file.name,
          sampleRate: decoded.sampleRate,
          channels: decoded.channels,
          selection: { startSample: 0, endSample: 0 },
          viewStartSample: 0,
          viewEndSample: total,
          undoStack: [],
          redoStack: [],
          dirty: false,
          sourceFormat: ext,
          bpmInfo: null,
          showBeatGrid: false,
          snapToBeats: false,
        };
        setDocuments((prev) => [...prev, doc]);
        setActiveDocId(doc.id);
        showToast(`Fichier ouvert : ${file.name}`);
        try {
          if (recentToken) await desktop()?.confirmOpened(recentToken);
          else await desktop()?.rememberFile(file);
          notifyRecentFilesChanged();
        } catch (error) { console.warn('Historique non enregistre', error); }
      } catch {
        showToast(
          `Impossible de décoder « ${file.name} ». Formats supportés : WAV, MP3, FLAC, OGG.`,
          true
        );
      }
    },
    [showToast]
  );

  const handleOpenRecent = useCallback(async (id: string) => {
    try {
      const api = desktop();
      if (!api) return;
      const payload = await api.openRecent(id);
      await decodeAndOpenFile(fileFromDesktop(payload), payload.token);
    } catch {
      showToast('Fichier recent introuvable, deplace ou inaccessible.', true);
    }
  }, [decodeAndOpenFile, showToast]);

  const handleOpenFile = useCallback(async () => {
    const api = desktop();
    if (api) {
      try {
        for (const payload of await api.pickAudioFiles()) {
          await decodeAndOpenFile(fileFromDesktop(payload), payload.token);
        }
      } catch { showToast('Impossible de lire le fichier choisi.', true); }
      return;
    }
    const win = window as unknown as {
      showOpenFilePicker?: (opts: {
        startIn?: string;
        multiple?: boolean;
        types?: Array<{
          description: string;
          accept: Record<string, string[]>;
        }>;
      }) => Promise<Array<{ getFile: () => Promise<File> }>>;
    };

    if (typeof win.showOpenFilePicker === 'function') {
      try {
        const handles = await win.showOpenFilePicker({
          startIn: 'desktop',
          multiple: true,
          types: [
            {
              description: 'Fichiers audio (WAV, MP3, FLAC, OGG)',
              accept: {
                'audio/*': ['.wav', '.mp3', '.flac', '.ogg'],
              },
            },
          ],
        });
        for (const h of handles) {
          const f = await h.getFile();
          await decodeAndOpenFile(f);
        }
        return;
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') return;
        // Fallback to hidden file input if blocked
      }
    }
    fileInputRef.current?.click();
  }, [decodeAndOpenFile]);

  const handlePlay = useCallback(
    (loop = false) => {
      if (!activeDoc || isRecording) return;
      const total = activeDoc.channels[0]?.length ?? 0;
      if (total === 0) return;

      const { startSample, endSample } = activeDoc.selection;
      loop = loop && endSample > startSample;
      const targetMode: TransportPlayMode = loop ? 'loop' : 'play';

      // Lecture depuis le curseur ; aucune boucle implicite sans selection.
      const playStart = loop
        ? isPaused && playMode === 'loop'
          ? Math.min(total - 1, Math.round(audioEngine.getCurrentSample()))
          : startSample
        : isPaused && playMode === 'play'
        ? Math.min(total - 1, Math.round(audioEngine.getCurrentSample()))
        : Math.min(total - 1, startSample);

      const playEnd = loop
        ? endSample > startSample
          ? endSample
          : total
        : total;

      setPlayMode(targetMode);
      setIsLooping(loop);
      setIsPlaying(true);
      setIsPaused(false);
      audioEngine.play(activeDoc.channels, activeDoc.sampleRate, playStart, playEnd, {
        loop,
        reverse: false,
        volumeDb,
        balance,
        speedRatio,
        enabledChannels,
        onEnded: () => {
          setIsPlaying(false);
          setIsPaused(false);
          setIsLooping(false);
          setPlayMode('idle');
        },
      });
    },
    [
      activeDoc,
      balance,
      enabledChannels,
      isPaused,
      isRecording,
      playMode,
      speedRatio,
      volumeDb,
    ]
  );

  const handlePlayReverse = useCallback(() => {
    if (!activeDoc || isRecording) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    if (total === 0) return;
    const { startSample, endSample } = activeDoc.selection;
    const hasSelection = endSample > startSample;
    const reverseLoop = hasSelection;
    const playStart = hasSelection ? startSample : 0;
    const playEnd = hasSelection
      ? endSample
      : isPaused && playMode === 'reverse'
      ? Math.max(1, Math.min(total, Math.round(audioEngine.getCurrentSample())))
      : startSample > 0
      ? startSample
      : total;
    const pausedSample = Math.round(audioEngine.getCurrentSample());
    const offsetSamples =
      reverseLoop && isPaused && playMode === 'reverse' && pausedSample > playStart && pausedSample <= playEnd
        ? Math.max(0, playEnd - pausedSample)
        : 0;
    setPlayMode('reverse');
    setIsLooping(reverseLoop);
    setIsPlaying(true);
    setIsPaused(false);
    audioEngine.play(activeDoc.channels, activeDoc.sampleRate, playStart, playEnd, {
      loop: reverseLoop,
      reverse: true,
      offsetSamples,
      volumeDb,
      balance,
      speedRatio,
      enabledChannels,
      onEnded: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setIsLooping(false);
        setPlayMode('idle');
      },
    });
  }, [
    activeDoc,
    balance,
    enabledChannels,
    isPaused,
    isRecording,
    playMode,
    speedRatio,
    volumeDb,
  ]);

  const handlePlayFastForward = useCallback(() => {
    if (!activeDoc || isRecording) return;
    const total = activeDoc.channels[0]?.length ?? 0;
    if (total === 0) return;

    const { startSample } = activeDoc.selection;
    const fastStart =
      isPaused && playMode === 'fast'
        ? Math.min(total - 1, Math.round(audioEngine.getCurrentSample()))
        : startSample;
    const fastRate = Math.min(4, Math.max(2, speedRatio * 2));

    setPlayMode('fast');
    setIsLooping(false);
    setIsPlaying(true);
    setIsPaused(false);
    audioEngine.play(activeDoc.channels, activeDoc.sampleRate, fastStart, total, {
      loop: false,
      reverse: false,
      volumeDb,
      balance,
      speedRatio: fastRate,
      enabledChannels,
      onEnded: () => {
        setIsPlaying(false);
        setIsPaused(false);
        setIsLooping(false);
        setPlayMode('idle');
      },
    });
  }, [
    activeDoc,
    balance,
    enabledChannels,
    isPaused,
    isRecording,
    playMode,
    speedRatio,
    volumeDb,
  ]);

  const handlePause = useCallback(() => {
    if (!isPlaying) return;
    audioEngine.pause();
    setIsPlaying(false);
    setIsPaused(true);
  }, [isPlaying]);

  const handleStop = useCallback(() => {
    if (isRecording) {
      const rec = audioEngine.stopRecording();
      setIsRecording(false);
      const len = rec.channels[0]?.length ?? 0;
      if (len > 0) {
        const doc: AudioDocument = {
          id: makeDocId(),
          name: `Enregistrement_${documents.length + 1}.wav`,
          sampleRate: rec.sampleRate,
          channels: rec.channels,
          selection: { startSample: 0, endSample: 0 },
          viewStartSample: 0,
          viewEndSample: len,
          undoStack: [],
          redoStack: [],
          dirty: true,
          sourceFormat: 'WAV',
          bpmInfo: null,
          showBeatGrid: false,
          snapToBeats: false,
        };
        setDocuments((prev) => [...prev, doc]);
        setActiveDocId(doc.id);
        showToast('Enregistrement terminé et ouvert dans un onglet');
      }
      return;
    }
    audioEngine.stop(true);
    setIsPlaying(false);
    setIsPaused(false);
    setIsLooping(false);
    setPlayMode('idle');
  }, [documents.length, isRecording, showToast]);

  const handleToggleRecord = useCallback(
    async (deviceId?: string) => {
      if (isRecording) {
        handleStop();
        return;
      }
      const chosenDeviceId = deviceId ?? (selectedInputDeviceId || undefined);
      try {
        setIsPlaying(false);
        setIsPaused(false);
        setPlayMode('idle');
        await audioEngine.startRecording(chosenDeviceId, recordingSettings);
        setIsRecording(true);
        showToast('Enregistrement microphone en cours...');
      } catch (err) {
        showToast(
          err instanceof Error
            ? err.message
            : "Accès au microphone refusé ou indisponible.",
          true
        );
      }
    },
    [
      handleStop,
      isRecording,
      recordingSettings,
      selectedInputDeviceId,
      showToast,
    ]
  );

  const handleCloseDoc = useCallback(
    (id: string) => {
      if (id === activeDocId) {
        audioEngine.stop(true);
        setIsPlaying(false);
        setIsPaused(false);
      }
      setDocuments((prev) => {
        const filtered = prev.filter((d) => d.id !== id);
        if (id === activeDocId) {
          setActiveDocId(filtered[0]?.id ?? null);
        }
        return filtered;
      });
    },
    [activeDocId]
  );

  // Global keyboard shortcuts (studio style)
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.tagName === 'SELECT')
      ) {
        return;
      }

      if (
        e.code === 'Space' &&
        !activeEffect &&
        !exportOpen &&
        !joinOpen &&
        !settingsOpen &&
        !infoOpen &&
        !batchOpen
      ) {
        e.preventDefault();
        if (isPlaying) handlePause();
        else handlePlay(false);
        return;
      }

      const mod = e.ctrlKey || e.metaKey;
      if (mod && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        handleUndo();
      } else if (mod && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        handleRedo();
      } else if (mod && e.key.toLowerCase() === 'x') {
        e.preventDefault();
        handleCut();
      } else if (mod && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        handleCopy();
      } else if (mod && e.key.toLowerCase() === 'v') {
        e.preventDefault();
        handlePaste();
      } else if (mod && e.key.toLowerCase() === 'm') {
        e.preventDefault();
        handleMixPaste();
      } else if (mod && e.key.toLowerCase() === 't') {
        e.preventDefault();
        handleTrim();
      } else if (mod && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        handleDetectBpm();
      } else if (mod && e.key.toLowerCase() === 'a') {
        e.preventDefault();
        handleSelectAll();
      } else if (mod && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        void handleOpenFile();
      } else if (mod && e.key.toLowerCase() === 'e') {
        e.preventDefault();
        if (activeDoc) setExportOpen(true);
      } else if (
        e.key === 'Delete' &&
        !activeEffect &&
        !exportOpen &&
        !joinOpen &&
        !settingsOpen &&
        !batchOpen
      ) {
        e.preventDefault();
        handleSilence();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    activeDoc,
    activeEffect,
    exportOpen,
    handleCopy,
    handleCut,
    handleDetectBpm,
    batchOpen,
    handleMixPaste,
    handleOpenFile,
    handlePaste,
    handlePause,
    handlePlay,
    handleRedo,
    handleSelectAll,
    handleSilence,
    handleTrim,
    handleUndo,
    infoOpen,
    isPlaying,
    joinOpen,
    settingsOpen,
  ]);

  const hasSelection = Boolean(
    activeDoc && activeDoc.selection.endSample > activeDoc.selection.startSample
  );

  const playheadSec = activeDoc
    ? (isPlaying || isPaused
        ? audioEngine.getCurrentSample()
        : activeDoc.selection.startSample) / activeDoc.sampleRate
    : 0;

  return (
    <div
      className="h-screen w-screen flex flex-col overflow-hidden"
      style={{
        backgroundColor: 'var(--bg-canvas)',
        color: 'var(--text-primary)',
      }}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        for (const f of files) {
          if (f.name.toLowerCase().endsWith('.cue')) {
            void handleApplyCueFile(f);
          } else {
            void decodeAndOpenFile(f);
          }
        }
      }}
    >
      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".wav,.mp3,.flac,.ogg,audio/*"
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          for (const f of files) {
            void decodeAndOpenFile(f);
          }
          e.target.value = '';
        }}
      />
      <input
        ref={cueInputRef}
        data-testid="cue-file-input"
        type="file"
        accept=".cue,text/plain"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleApplyCueFile(file);
          e.target.value = '';
        }}
      />

      <TopMenuBar
        onOpenRecent={(id) => void handleOpenRecent(id)}
        hasDocument={Boolean(activeDoc)}
        hasSelection={hasSelection}
        hasClipboard={Boolean(clipboard && clipboard[0]?.length)}
        hasCueTracks={Boolean(activeDoc?.cueTracks && activeDoc.cueTracks.length > 0)}
        hasStereo={Boolean(activeDoc && activeDoc.channels.length >= 2)}
        canUndo={Boolean(activeDoc && activeDoc.undoStack.length > 0)}
        canRedo={Boolean(activeDoc && activeDoc.redoStack.length > 0)}
        hasBpm={Boolean(activeDoc?.bpmInfo && activeDoc.bpmInfo.bpm > 0)}
        showBeatGrid={Boolean(activeDoc?.showBeatGrid)}
        onDetectBpm={handleDetectBpm}
        onNewEmpty={handleNewEmpty}
        onOpenFile={() => void handleOpenFile()}
        onOpenExport={() => setExportOpen(true)}
        onOpenJoinFiles={() => setJoinOpen(true)}
        onImportCue={() => cueInputRef.current?.click()}
        onExportCue={handleExportCue}
        onAutoCue={handleAutoCue}
        onSplitByCue={handleSplitByCue}
        onOpenBatch={() => setBatchOpen(true)}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onCut={handleCut}
        onCopy={handleCopy}
        onPaste={handlePaste}
        onMixPaste={handleMixPaste}
        onInvertPhase={handleInvertPhase}
        onSwapChannels={handleSwapChannels}
        onRemoveDcOffset={handleRemoveDcOffset}
        onSilence={handleSilence}
        onTrim={handleTrim}
        onSelectAll={handleSelectAll}
        onZoomIn={handleZoomIn}
        onZoomOut={handleZoomOut}
        onZoomSelection={handleZoomSelection}
        onZoomReset={handleZoomReset}
        onOpenEffect={(eff) => {
          if (!hasSelection) {
            showToast(
              'Sélectionnez d’abord une zone audio pour appliquer un effet.',
              true
            );
            return;
          }
          setActiveEffect(eff);
        }}
        onOpenSettings={() => setSettingsOpen(true)}
        onOpenInfo={() => setInfoOpen(true)}
      />

      <WaveformView
        documents={documents}
        activeDocId={activeDocId}
        isPlaying={isPlaying}
        isRecording={isRecording}
        controlOpen={controlOpen}
        enabledChannels={enabledChannels}
        getPlayheadSample={() => audioEngine.getCurrentSample()}
        getRecordingPreview={() => audioEngine.getRecordedPreviewSamples()}
        onToggleChannel={(idx) =>
          setEnabledChannels((prev) => {
            const next: [boolean, boolean] = [...prev] as [boolean, boolean];
            next[idx] = !next[idx];
            // Ensure at least one channel stays enabled
            if (!next[0] && !next[1]) return prev;
            audioEngine.setEnabledChannels(
              next,
              activeDoc?.channels.length ?? 2
            );
            return next;
          })
        }
        onToggleSnapToBeats={handleToggleSnapToBeats}
        onSelectDocument={(id) => {
          audioEngine.stop(true);
          setIsPlaying(false);
          setIsPaused(false);
          setActiveDocId(id);
        }}
        onCloseDocument={handleCloseDoc}
        onSelectionChange={(sel, reason: SelectionChangeReason) => {
          updateActiveDoc((doc) => ({ ...doc, selection: sel }));
          if (reason === 'cursor-drag') return;
          if (isPaused) setIsPaused(false);
          if (reason === 'cursor') {
            setIsLooping(false);
            setPlayMode(isPlaying ? 'play' : 'idle');
            if (isPlaying && activeDoc) {
              const total = activeDoc.channels[0]?.length ?? 0;
              audioEngine.play(activeDoc.channels, activeDoc.sampleRate, sel.startSample, total, {
                loop: false, reverse: false, volumeDb, balance, speedRatio, enabledChannels,
                onEnded: () => { setIsPlaying(false); setIsPaused(false); setIsLooping(false); setPlayMode('idle'); },
              });
            }
            return;
          }
          if (isPlaying && isLooping && sel.endSample > sel.startSample) {
            audioEngine.updateLoopRegion(sel.startSample, sel.endSample, false);
          }
        }}
        onSelectionCommit={(sel, reason) => {
          if (reason === 'cursor') {
            setIsPaused(false);
            setIsLooping(false);
            setPlayMode(isPlaying ? 'play' : 'idle');
            if (isPlaying && activeDoc) {
              const total = activeDoc.channels[0]?.length ?? 0;
              audioEngine.play(activeDoc.channels, activeDoc.sampleRate, sel.startSample, total, {
                loop: false, reverse: false, volumeDb, balance, speedRatio, enabledChannels,
                onEnded: () => { setIsPlaying(false); setIsPaused(false); setIsLooping(false); setPlayMode('idle'); },
              });
            }
            return;
          }
          if (isPlaying && isLooping && sel.endSample > sel.startSample) {
            audioEngine.updateLoopRegion(sel.startSample, sel.endSample, false);
          }
        }}
        onViewRangeChange={(viewStartSample, viewEndSample) =>
          updateActiveDoc((doc) => ({
            ...doc,
            viewStartSample,
            viewEndSample,
          }))
        }
        onOpenFile={() => void handleOpenFile()}
        onNewEmpty={handleNewEmpty}
        onStartRecord={() => void handleToggleRecord()}
      />

      <ControlWindow
        visible={controlOpen}
        hasDocument={Boolean(activeDoc)}
        isPlaying={isPlaying}
        isPaused={isPaused}
        isLooping={isLooping}
        playMode={playMode}
        isRecording={isRecording}
        volumeDb={volumeDb}
        balance={balance}
        speedRatio={speedRatio}
        playheadSeconds={playheadSec}
        getPlayheadSeconds={() =>
          activeDoc
            ? (isPlaying || isPaused ? audioEngine.getCurrentSample() : activeDoc.selection.startSample) / activeDoc.sampleRate
            : 0
        }
        onVolumeChange={(db) => {
          setVolumeDb(db);
          audioEngine.setVolumeDb(db);
        }}
        onBalanceChange={(pan) => {
          setBalance(pan);
          audioEngine.setBalance(pan);
        }}
        onSpeedChange={(r) => {
          setSpeedRatio(r);
          audioEngine.setSpeedRatio(
            playMode === 'fast' ? Math.min(4, Math.max(2, r * 2)) : r
          );
        }}
        onPlay={() => handlePlay(false)}
        onPlayLoop={() => handlePlay(true)}
        onPause={handlePause}
        onStop={handleStop}
        onPlayReverse={handlePlayReverse}
        onPlayFastForward={handlePlayFastForward}
        onToggleRecord={() => void handleToggleRecord()}
      />

      {(() => {
        // Session conservée sur le moteur, indépendamment des rendus React.
        type PreviewSession = {
          docId: string;
          start: number;
          end: number;
          originalLoop: boolean;
          previewLength: number;
        };
        const engine = audioEngine as typeof audioEngine & {
          effectPreviewSession?: PreviewSession;
        };

        const finishPlayback = () => {
          setIsPlaying(false);
          setIsPaused(false);
          setIsLooping(false);
          setPlayMode('idle');
        };

        const getDocumentPosition = () => {
          const position = Math.max(0, audioEngine.getCurrentSample());
          const session = engine.effectPreviewSession;
          if (!session || session.docId !== activeDoc?.id) return position;
          const length = Math.max(1, session.previewLength);
          const fraction = (position % length) / length;
          return session.start + fraction * (session.end - session.start);
        };

        const resumeDocument = (
          channels: Float32Array[],
          sampleRate: number,
          position: number,
          loop: boolean,
          start: number,
          end: number
        ) => {
          const total = channels[0]?.length ?? 0;
          if (!total) {
            audioEngine.stop(true);
            finishPlayback();
            return;
          }
          const safeStart = Math.max(0, Math.min(total - 1, Math.floor(start)));
          const safeEnd = Math.max(safeStart + 1, Math.min(total, Math.floor(end)));
          const cursor = loop
            ? safeStart + ((Math.max(0, Math.floor(position) - safeStart)) % (safeEnd - safeStart))
            : Math.max(0, Math.min(total - 1, Math.floor(position)));
          audioEngine.play(channels, sampleRate, cursor, loop ? safeEnd : total, {
            loop,
            volumeDb,
            balance,
            speedRatio,
            enabledChannels,
            onEnded: finishPlayback,
          });
          if (loop) audioEngine.updateLoopRegion(safeStart, safeEnd, false);
          setIsPlaying(audioEngine.isPlaying);
          setIsPaused(false);
          setIsLooping(loop);
          setPlayMode(audioEngine.isPlaying ? (loop ? 'loop' : 'play') : 'idle');
        };

        return (
          <EffectModal
            effect={activeEffect}
            document={activeDoc}
            noiseProfile={noiseProfile}
            onCaptureNoiseProfile={(profile) => {
              setNoiseProfile(profile);
              showToast('Profil de bruit capturé');
            }}
            isPreviewPlaying={isPreviewPlaying}
            onStartPreview={(previewChannels, sampleRate, liveGainDb, bands) => {
              if (!activeDoc) return;
              const totalSamples = previewChannels[0]?.length ?? 0;
              if (!totalSamples) return;
              const docTotal = activeDoc.channels[0]?.length ?? 0;
              const start = Math.max(0, Math.min(docTotal, activeDoc.selection.startSample));
              const end = Math.max(start, Math.min(docTotal, activeDoc.selection.endSample));
              if (end <= start) return;

              let session = engine.effectPreviewSession;
              const existing = session?.docId === activeDoc.id;
              const documentPosition = getDocumentPosition();

              if (existing && audioEngine.isPlaying) {
                if (bands && audioEngine.updatePreviewBands(bands)) {
                  setIsPlaying(true);
                  return;
                }
                if (liveGainDb !== undefined && !bands) {
                  audioEngine.setVolumeDb(volumeDb + liveGainDb);
                  setIsPlaying(true);
                  return;
                }
                if (!bands && liveGainDb === undefined &&
                    audioEngine.replacePreviewAudio(previewChannels, sampleRate)) {
                  session!.previewLength = totalSamples;
                  setIsPlaying(true);
                  return;
                }
              }

              if (!existing) {
                session = {
                  docId: activeDoc.id,
                  start,
                  end,
                  originalLoop: isLooping,
                  previewLength: totalSamples,
                };
                engine.effectPreviewSession = session;
              }
              const relative = documentPosition >= start && documentPosition < end
                ? (documentPosition - start) / (end - start)
                : 0;
              const offset = Math.min(totalSamples - 1, Math.floor(relative * totalSamples));
              session!.previewLength = totalSamples;
              audioEngine.play(previewChannels, sampleRate, offset, totalSamples, {
                loop: true,
                volumeDb: volumeDb + (liveGainDb ?? 0),
                previewBands: bands,
                balance,
                speedRatio,
                enabledChannels,
              });
              // Le décalage initial ne doit pas devenir le début de la boucle.
              audioEngine.updateLoopRegion(0, totalSamples, false);
              setIsPreviewPlaying(audioEngine.isPlaying);
              setIsPlaying(audioEngine.isPlaying);
              setIsPaused(false);
            }}
            onStopPreview={() => {
              // Appliquer / Annuler assurent la transition après lecture de la position.
            }}
            onApply={(nextChannels, label, nextSelection) => {
              if (!activeDoc) return;
              const playing = audioEngine.isPlaying;
              const position = getDocumentPosition();
              const session = engine.effectPreviewSession;
              const loop = session?.docId === activeDoc.id ? session.originalLoop : isLooping;
              const oldStart = activeDoc.selection.startSample;
              const oldEnd = activeDoc.selection.endSample;
              const selection = nextSelection ?? activeDoc.selection;
              const mappedPosition = nextSelection && oldEnd > oldStart &&
                position >= oldStart && position < oldEnd
                ? selection.startSample + ((position - oldStart) / (oldEnd - oldStart)) *
                  (selection.endSample - selection.startSample)
                : position;
              const channels = activeDoc.channels.length === 2 &&
                nextChannels.length === 2 &&
                activeDoc.channels[0].length === nextChannels[0].length
                ? [
                    enabledChannels[0] ? nextChannels[0] : activeDoc.channels[0],
                    enabledChannels[1] ? nextChannels[1] : activeDoc.channels[1],
                  ]
                : nextChannels;

              delete engine.effectPreviewSession;
              commitAudioEdit(nextChannels, label, nextSelection, true);
              setIsPreviewPlaying(false);
              setActiveEffect(null);
              if (playing) {
                resumeDocument(channels, activeDoc.sampleRate, mappedPosition,
                  loop && selection.endSample > selection.startSample,
                  selection.startSample, selection.endSample);
              } else {
                finishPlayback();
              }
              showToast(`Effet appliqué : ${label}`);
            }}
            onClose={() => {
              const session = engine.effectPreviewSession;
              const wasPreviewing = session?.docId === activeDoc?.id && Boolean(session);
              const playing = audioEngine.isPlaying;
              const position = getDocumentPosition();
              delete engine.effectPreviewSession;
              setIsPreviewPlaying(false);
              setActiveEffect(null);
              if (!wasPreviewing || !activeDoc) return;
              if (playing) {
                resumeDocument(activeDoc.channels, activeDoc.sampleRate, position,
                  session!.originalLoop, session!.start, session!.end);
              } else {
                audioEngine.stop(true);
                audioEngine.setVolumeDb(volumeDb);
                finishPlayback();
              }
            }}
          />
        );
      })()}

      <ExportModal
        open={exportOpen}
        document={activeDoc}
        onClose={() => setExportOpen(false)}
        onExported={(fileName: string, fmt: AudioExportFormat) => {
          updateActiveDoc((doc) => ({ ...doc, dirty: false }));
          showToast(`Fichier exporté (${fmt.toUpperCase()}) : ${fileName}`);
        }}
      />

      <JoinFilesModal
        open={joinOpen}
        openDocuments={documents}
        onClose={() => setJoinOpen(false)}
        onJoinComplete={handleJoinComplete}
      />

      <BatchModal open={batchOpen} onClose={() => setBatchOpen(false)} />

      <SettingsModal
        open={settingsOpen}
        selectedInputDeviceId={selectedInputDeviceId}
        selectedOutputDeviceId={selectedOutputDeviceId}
        recordingSettings={recordingSettings}
        onSelectInputDevice={setSelectedInputDeviceId}
        onSelectOutputDevice={(devId) => {
          setSelectedOutputDeviceId(devId);
          void audioEngine.setOutputDevice(devId);
        }}
        onChangeRecordingSettings={(patch) =>
          setRecordingSettings((prev) => ({ ...prev, ...patch }))
        }
        onClose={() => {
          setSettingsOpen(false);
          setDeviceRefreshKey((k) => k + 1);
        }}
      />

      <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />

      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-24 left-4 z-50 px-3.5 py-2 rounded-lg border text-xs font-medium shadow-lg"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: toast.isError ? 'var(--record-color)' : 'var(--accent-primary)',
            color: 'var(--text-primary)',
          }}
        >
          {toast.text}
        </div>
      )}
    </div>
  );
}
