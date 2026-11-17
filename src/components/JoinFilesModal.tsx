import React, { useMemo, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Download,
  FilePlus2,
  FolderPlus,
  Layers,
  Loader2,
  Trash2,
  X,
} from 'lucide-react';
import {
  buildCueSheet,
  joinAudioTracks,
  samplesToCueTime,
} from '../audio/cueSheet';
import { formatTimecode } from '../audio/dsp';
import { audioEngine } from '../audio/engine';
import type { AudioDocument, CueTrackEntry } from '../audio/types';

export interface StagedJoinTrack {
  id: string;
  fileName: string;
  title: string;
  performer: string;
  sampleRate: number;
  channels: Float32Array[];
}

interface JoinFilesModalProps {
  open: boolean;
  openDocuments: AudioDocument[];
  onClose: () => void;
  onJoinComplete: (result: {
    mixTitle: string;
    mixPerformer: string;
    channels: Float32Array[];
    sampleRate: number;
    cueTracks: CueTrackEntry[];
  }) => void;
}

function stripExt(name: string): string {
  return name.replace(/\.[^.]+$/, '') || name;
}

export function downloadTextFile(fileName: string, content: string): void {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement('a');
  a.href = url;
  a.download = fileName;
  window.document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export const JoinFilesModal: React.FC<JoinFilesModalProps> = ({
  open,
  openDocuments,
  onClose,
  onJoinComplete,
}) => {
  const [tracks, setTracks] = useState<StagedJoinTrack[]>([]);
  const [mixTitle, setMixTitle] = useState('Mix_AudioToolZ');
  const [mixPerformer, setMixPerformer] = useState('Audio ToolZ');
  const [audioExtension, setAudioExtension] = useState<'wav' | 'mp3'>('wav');
  const [isDecoding, setIsDecoding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const timelineInfo = useMemo(() => {
    if (tracks.length === 0) {
      return {
        sampleRate: 44100,
        totalSamples: 0,
        cueTracks: [] as CueTrackEntry[],
        durationsSec: [] as number[],
      };
    }
    const targetRate = tracks[0].sampleRate || 44100;
    let cursor = 0;
    const cueTracks: CueTrackEntry[] = [];
    const durationsSec: number[] = [];

    for (let i = 0; i < tracks.length; i++) {
      const tr = tracks[i];
      const lenInTarget = Math.max(
        1,
        Math.round(((tr.channels[0]?.length ?? 0) / tr.sampleRate) * targetRate)
      );
      cueTracks.push({
        trackNumber: i + 1,
        title: tr.title.trim() || `Piste ${String(i + 1).padStart(2, '0')}`,
        performer: tr.performer.trim() || undefined,
        startSample: cursor,
      });
      durationsSec.push((tr.channels[0]?.length ?? 0) / tr.sampleRate);
      cursor += lenInTarget;
    }

    return {
      sampleRate: targetRate,
      totalSamples: cursor,
      cueTracks,
      durationsSec,
    };
  }, [tracks]);

  const cuePreviewText = useMemo(() => {
    if (tracks.length === 0) return '';
    const safeMix = mixTitle.trim() || 'Mix_AudioToolZ';
    return buildCueSheet({
      mixTitle: safeMix,
      mixPerformer: mixPerformer.trim() || undefined,
      audioFileName: `${safeMix}.${audioExtension}`,
      sampleRate: timelineInfo.sampleRate,
      tracks: timelineInfo.cueTracks,
    });
  }, [audioExtension, mixPerformer, mixTitle, timelineInfo, tracks.length]);

  if (!open) return null;

  const decodeFiles = async (files: File[]) => {
    if (files.length === 0) return;
    setErrorMsg(null);
    setIsDecoding(true);
    try {
      const added: StagedJoinTrack[] = [];
      for (const f of files) {
        const buf = await f.arrayBuffer();
        const decoded = await audioEngine.decodeFile(buf);
        added.push({
          id: `join_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          fileName: f.name,
          title: stripExt(f.name),
          performer: '',
          sampleRate: decoded.sampleRate,
          channels: decoded.channels,
        });
      }
      setTracks((prev) => [...prev, ...added]);
    } catch {
      setErrorMsg(
        'Impossible de décoder un des fichiers audio. Formats supportés : WAV, MP3, FLAC, OGG.'
      );
    } finally {
      setIsDecoding(false);
    }
  };

  const handleImportOpenTabs = () => {
    if (openDocuments.length === 0) return;
    setErrorMsg(null);
    const added: StagedJoinTrack[] = openDocuments.map((d) => ({
      id: `join_doc_${d.id}_${Date.now()}_${Math.random().toString(36).slice(2, 5)}`,
      fileName: d.name,
      title: stripExt(d.name),
      performer: '',
      sampleRate: d.sampleRate,
      channels: d.channels,
    }));
    setTracks((prev) => [...prev, ...added]);
  };

  const moveTrack = (idx: number, delta: -1 | 1) => {
    const nextIdx = idx + delta;
    if (nextIdx < 0 || nextIdx >= tracks.length) return;
    setTracks((prev) => {
      const copy = [...prev];
      const [item] = copy.splice(idx, 1);
      copy.splice(nextIdx, 0, item);
      return copy;
    });
  };

  const removeTrack = (id: string) => {
    setTracks((prev) => prev.filter((t) => t.id !== id));
  };

  const handleExtractCue = () => {
    if (tracks.length === 0) return;
    const safeName = (mixTitle.trim() || 'Mix_AudioToolZ').replace(
      /[\\/:*?"<>|]/g,
      '_'
    );
    downloadTextFile(`${safeName}.cue`, cuePreviewText);
  };

  const handleJoin = () => {
    if (tracks.length === 0) return;
    const joined = joinAudioTracks(
      tracks.map((t) => ({
        title: t.title.trim() || stripExt(t.fileName),
        performer: t.performer.trim() || undefined,
        sampleRate: t.sampleRate,
        channels: t.channels,
      }))
    );
    onJoinComplete({
      mixTitle: mixTitle.trim() || 'Mix_AudioToolZ',
      mixPerformer: mixPerformer.trim(),
      channels: joined.channels,
      sampleRate: joined.sampleRate,
      cueTracks: joined.cueTracks,
    });
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="join-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        const files = Array.from(e.dataTransfer.files);
        void decodeFiles(files);
      }}
    >
      <div
        className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <Layers
              className="w-4 h-4 shrink-0"
              style={{ color: 'var(--accent-secondary)' }}
            />
            <div>
              <h2
                id="join-modal-title"
                className="text-sm font-display font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Joindre des fichiers &amp; Générer un .cue
              </h2>
              <p
                className="text-xs mt-0.5"
                style={{ color: 'var(--text-secondary)' }}
              >
                Assemblez plusieurs pistes en un seul mix et extrayez la cue sheet pour afficher les titres.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Fermer"
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
            style={{ color: 'var(--text-secondary)' }}
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <input
          ref={fileInputRef}
          data-testid="join-file-input"
          type="file"
          multiple
          accept=".wav,.mp3,.flac,.ogg,audio/*"
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            void decodeFiles(files);
            e.target.value = '';
          }}
        />

        <div className="p-4 space-y-4 overflow-y-auto flex-1 min-h-0">
          {/* Mix metadata + Add actions */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label
                htmlFor="join-mix-title"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Titre du mix
              </label>
              <input
                id="join-mix-title"
                type="text"
                value={mixTitle}
                onChange={(e) => setMixTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border text-xs"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="join-mix-performer"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Artiste / DJ (optionnel)
              </label>
              <input
                id="join-mix-performer"
                type="text"
                value={mixPerformer}
                onChange={(e) => setMixPerformer(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md border text-xs"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
            </div>
            <div>
              <label
                htmlFor="join-cue-ext"
                className="block text-xs font-medium mb-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Référence audio .cue
              </label>
              <select
                id="join-cue-ext"
                value={audioExtension}
                onChange={(e) =>
                  setAudioExtension(e.target.value === 'mp3' ? 'mp3' : 'wav')
                }
                className="w-full px-2.5 py-1.5 rounded-md border text-xs"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="wav">.wav (WAVE)</option>
                <option value="mp3">.mp3 (MP3)</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isDecoding}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              {isDecoding ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <FolderPlus className="w-3.5 h-3.5" />
              )}
              Ajouter des fichiers audio...
            </button>

            {openDocuments.length > 0 && (
              <button
                type="button"
                onClick={handleImportOpenTabs}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <FilePlus2 className="w-3.5 h-3.5" />
                Importer les onglets ouverts ({openDocuments.length})
              </button>
            )}

            {tracks.length > 0 && (
              <button
                type="button"
                onClick={() => setTracks([])}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer ml-auto"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Vider la liste
              </button>
            )}
          </div>

          {/* Staged tracks list */}
          <div
            className="rounded-lg border overflow-hidden"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {tracks.length === 0 ? (
              <div
                className="py-8 px-4 text-center text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Aucune piste ajoutée. Ajoutez au moins 2 fichiers audio (ou déposez-les ici) pour créer votre mix et son fichier .cue.
              </div>
            ) : (
              <div className="divide-y divide-[var(--border-subtle)] max-h-60 overflow-y-auto">
                {tracks.map((tr, idx) => {
                  const startSample = timelineInfo.cueTracks[idx]?.startSample ?? 0;
                  const cueStart = samplesToCueTime(
                    startSample,
                    timelineInfo.sampleRate
                  );
                  const durSec = timelineInfo.durationsSec[idx] ?? 0;
                  return (
                    <div
                      key={tr.id}
                      className="flex flex-wrap sm:flex-nowrap items-center gap-2 px-3 py-2"
                    >
                      <span
                        className="font-mono-tabular text-[11px] font-bold w-6 shrink-0"
                        style={{ color: 'var(--accent-secondary)' }}
                      >
                        {String(idx + 1).padStart(2, '0')}
                      </span>

                      <div className="flex-1 min-w-[160px] grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                        <input
                          type="text"
                          aria-label={`Titre de la piste ${idx + 1}`}
                          placeholder="Titre du morceau"
                          value={tr.title}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTracks((prev) =>
                              prev.map((item) =>
                                item.id === tr.id ? { ...item, title: val } : item
                              )
                            );
                          }}
                          className="px-2 py-1 rounded border text-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        />
                        <input
                          type="text"
                          aria-label={`Artiste de la piste ${idx + 1}`}
                          placeholder="Artiste (optionnel)"
                          value={tr.performer}
                          onChange={(e) => {
                            const val = e.target.value;
                            setTracks((prev) =>
                              prev.map((item) =>
                                item.id === tr.id
                                  ? { ...item, performer: val }
                                  : item
                              )
                            );
                          }}
                          className="px-2 py-1 rounded border text-xs"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-primary)',
                          }}
                        />
                      </div>

                      <div
                        className="text-[11px] font-mono-tabular shrink-0 text-right min-w-[110px]"
                        style={{ color: 'var(--text-secondary)' }}
                      >
                        <div>CUE {cueStart}</div>
                        <div style={{ color: 'var(--text-muted)' }}>
                          {formatTimecode(durSec)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          aria-label={`Monter la piste ${idx + 1}`}
                          disabled={idx === 0}
                          onClick={() => moveTrack(idx, -1)}
                          className="p-1 rounded border cursor-pointer disabled:opacity-30"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <ArrowUp className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Descendre la piste ${idx + 1}`}
                          disabled={idx === tracks.length - 1}
                          onClick={() => moveTrack(idx, 1)}
                          className="p-1 rounded border cursor-pointer disabled:opacity-30"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <ArrowDown className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Supprimer la piste ${idx + 1}`}
                          onClick={() => removeTrack(tr.id)}
                          className="p-1 rounded border cursor-pointer hover:text-rose-400"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            borderColor: 'var(--border-subtle)',
                            color: 'var(--text-secondary)',
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* CUE sheet preview */}
          {tracks.length > 0 && (
            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span style={{ color: 'var(--text-secondary)' }}>
                  Aperçu du fichier .cue généré
                </span>
                <span
                  className="font-mono-tabular"
                  style={{ color: 'var(--text-muted)' }}
                >
                  Durée totale :{' '}
                  {formatTimecode(
                    timelineInfo.totalSamples / timelineInfo.sampleRate
                  )}
                </span>
              </div>
              <pre
                data-testid="cue-preview"
                className="p-2.5 rounded-lg border text-[11px] font-mono-tabular overflow-x-auto max-h-32 leading-relaxed"
                style={{
                  backgroundColor: 'var(--wave-bg)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {cuePreviewText}
              </pre>
            </div>
          )}

          {errorMsg && (
            <p className="text-xs font-medium text-rose-400">{errorMsg}</p>
          )}
        </div>

        <div
          className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 border-t shrink-0"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            disabled={tracks.length === 0}
            onClick={handleExtractCue}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer disabled:opacity-40"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--accent-secondary)',
            }}
          >
            <Download className="w-3.5 h-3.5" />
            Extraire le fichier .cue
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-md border text-xs font-medium cursor-pointer"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-secondary)',
              }}
            >
              Annuler
            </button>
            <button
              type="button"
              disabled={tracks.length === 0 || isDecoding}
              onClick={handleJoin}
              className="px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-40"
              style={{
                backgroundColor: 'var(--accent-primary)',
                color: '#ffffff',
              }}
            >
              Joindre et ouvrir ({tracks.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
