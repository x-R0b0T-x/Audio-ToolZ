import React, { useState } from 'react';
import { Layers, Loader2, Play, Trash2, Upload, X } from 'lucide-react';
import { runBatchProcessing, type BatchInputDocument } from '../audio/batchProcessor';
import { DEFAULT_STUDIO_PRESETS, type AudioEffectPreset } from '../audio/presets';
import { audioEngine } from '../audio/engine';
import type { AudioExportFormat } from '../audio/types';

interface BatchModalProps {
  open: boolean;
  presets?: AudioEffectPreset[];
  onClose: () => void;
}

export const BatchModal: React.FC<BatchModalProps> = ({
  open,
  presets = DEFAULT_STUDIO_PRESETS,
  onClose,
}) => {
  const [files, setFiles] = useState<File[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>(presets[0]?.id ?? '');
  const [format, setFormat] = useState<AudioExportFormat>('flac');
  const [processing, setProcessing] = useState(false);
  const [progressText, setProgressText] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doneCount, setDoneCount] = useState<number>(0);

  if (!open) return null;

  const activePreset = presets.find((p) => p.id === selectedPresetId) ?? presets[0];

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const added = Array.from(fileList);
    setFiles((prev) => [...prev, ...added]);
    setErrorMsg(null);
    setDoneCount(0);
  };

  const handleRunBatch = async () => {
    if (files.length === 0 || !activePreset) return;
    setProcessing(true);
    setErrorMsg(null);
    setDoneCount(0);

    try {
      const decodedDocs: BatchInputDocument[] = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgressText(`Décodage (${i + 1}/${files.length}) : ${f.name}`);
        const decoded = await audioEngine.decodeFile(await f.arrayBuffer());
        decodedDocs.push({
          id: `batch-${i}`,
          name: f.name,
          sampleRate: decoded.sampleRate,
          channels: decoded.channels,
        });
      }

      const outputs = await runBatchProcessing(
        decodedDocs,
        activePreset.steps,
        {
          format,
          wavBitDepth: 16,
          mp3Bitrate: 192,
          flacCompression: 2,
          oggQuality: 6,
        },
        {
          suffix: '_v15',
          onProgress: (idx, total, name) => {
            if (name) setProgressText(`Traitement & encodage (${idx + 1}/${total}) : ${name}`);
          },
        }
      );

      for (const item of outputs) {
        const blob = new Blob([item.encoded.bytes as Uint8Array<ArrayBuffer>], {
          type: item.encoded.mimeType,
        });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = item.outputFileName;
        document.body.appendChild(a);
        a.click();
        a.remove();
        URL.revokeObjectURL(url);
      }

      setDoneCount(outputs.length);
      setProgressText('');
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Erreur lors du traitement par lots.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
      role="dialog"
      aria-modal="true"
    >
      <div
        className="w-full max-w-xl rounded-lg border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-panel)',
          borderColor: 'var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="w-4 h-4" />
            Traitement par lots (Batch v1.5)
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded hover:opacity-80 cursor-pointer"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 space-y-4 text-xs">
          <div>
            <label className="block font-medium mb-1">1. Chaîne / Preset DSP</label>
            <select
              value={selectedPresetId}
              onChange={(e) => setSelectedPresetId(e.target.value)}
              className="w-full px-3 py-2 rounded border"
              style={{
                backgroundColor: 'var(--bg-surface)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {presets.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            {activePreset && (
              <p className="mt-1 opacity-75">{activePreset.description}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium mb-1">2. Format de sortie</label>
              <select
                value={format}
                onChange={(e) => setFormat(e.target.value as AudioExportFormat)}
                className="w-full px-3 py-2 rounded border"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              >
                <option value="flac">FLAC (sans perte)</option>
                <option value="wav">WAV (PCM 16 bits)</option>
                <option value="mp3">MP3 (192 kbps)</option>
                <option value="ogg">OGG Vorbis (Q6)</option>
              </select>
            </div>
            <div className="flex items-end">
              <label
                className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded border cursor-pointer font-medium"
                style={{
                  backgroundColor: 'var(--bg-surface)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <Upload className="w-3.5 h-3.5" />
                Ajouter des fichiers
                <input
                  type="file"
                  multiple
                  accept="audio/*,.wav,.mp3,.flac,.ogg"
                  className="sr-only"
                  onChange={(e) => handleAddFiles(e.target.files)}
                />
              </label>
            </div>
          </div>

          <div
            className="max-h-40 overflow-y-auto rounded border p-2 space-y-1"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {files.length === 0 ? (
              <p className="opacity-60 text-center py-4">Aucun fichier dans la file batch.</p>
            ) : (
              files.map((f, idx) => (
                <div key={`${f.name}-${idx}`} className="flex items-center justify-between gap-2 px-2 py-1 rounded">
                  <span className="truncate font-mono">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setFiles((prev) => prev.filter((_, i) => i !== idx))}
                    className="opacity-70 hover:opacity-100 cursor-pointer"
                    aria-label={`Retirer ${f.name}`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))
            )}
          </div>

          {progressText && <p className="font-mono opacity-80">{progressText}</p>}
          {doneCount > 0 && (
            <p className="text-emerald-400 font-medium">
              {doneCount} fichier(s) traité(s) et exporté(s) avec succès.
            </p>
          )}
          {errorMsg && <p className="text-red-400">{errorMsg}</p>}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t"
          style={{ borderColor: 'var(--border-subtle)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 rounded border text-xs cursor-pointer"
            style={{
              backgroundColor: 'var(--bg-surface)',
              borderColor: 'var(--border-subtle)',
              color: 'var(--text-secondary)',
            }}
          >
            Fermer
          </button>
          <button
            type="button"
            disabled={processing || files.length === 0}
            onClick={handleRunBatch}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded text-xs font-semibold cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
          >
            {processing ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Traitement...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                Lancer le lot ({files.length})
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
