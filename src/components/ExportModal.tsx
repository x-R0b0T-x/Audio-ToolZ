import React, { useMemo, useState } from 'react';
import { Download, Loader2, X } from 'lucide-react';
import { encodeAudioDocument } from '../audio/encoders';
import { copyRange, formatTimecode } from '../audio/dsp';
import type {
  AudioDocument,
  AudioExportFormat,
  ExportSettings,
} from '../audio/types';

interface ExportModalProps {
  open: boolean;
  document: AudioDocument | null;
  onClose: () => void;
  onExported: (fileName: string, format: AudioExportFormat) => void;
}

export const ExportModal: React.FC<ExportModalProps> = ({
  open,
  document: doc,
  onClose,
  onExported,
}) => {
  const baseName = useMemo(() => {
    if (!doc) return 'audio';
    return doc.name.replace(/\.[^.]+$/, '') || 'audio';
  }, [doc]);

  const [format, setFormat] = useState<AudioExportFormat>('wav');
  const [fileName, setFileName] = useState(baseName);
  const [wavBitDepth, setWavBitDepth] = useState<16 | 24 | 32>(16);
  const [mp3Bitrate, setMp3Bitrate] = useState<128 | 192 | 256 | 320>(192);
  const [flacCompression, setFlacCompression] = useState<0 | 2 | 5>(2);
  const [oggQuality, setOggQuality] = useState<number>(6);
  const [exportSelectionOnly, setExportSelectionOnly] = useState(false);
  const [isEncoding, setIsEncoding] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!open || !doc) return null;

  const hasSelection =
    doc.selection.endSample > doc.selection.startSample &&
    doc.selection.endSample - doc.selection.startSample <
      (doc.channels[0]?.length ?? 0);

  const activeSampleCount =
    exportSelectionOnly && hasSelection
      ? doc.selection.endSample - doc.selection.startSample
      : doc.channels[0]?.length ?? 0;

  const activeDurationSec =
    doc.sampleRate > 0 ? activeSampleCount / doc.sampleRate : 0;

  const estimatedSizeKb = (() => {
    const ch = doc.channels.length;
    if (format === 'wav') {
      return Math.round((activeSampleCount * ch * (wavBitDepth / 8)) / 1024);
    }
    if (format === 'flac') {
      const ratio = flacCompression === 0 ? 1 : flacCompression === 2 ? 0.62 : 0.54;
      return Math.round((activeSampleCount * ch * 2 * ratio) / 1024);
    }
    if (format === 'mp3') {
      return Math.round((activeDurationSec * mp3Bitrate) / 8);
    }
    // OGG Vorbis approx bitrate by quality (-1..10)
    const approxKbps = Math.max(45, 64 + oggQuality * 32);
    return Math.round((activeDurationSec * approxKbps) / 8);
  })();

  const handleExport = async () => {
    setErrorMsg(null);
    setIsEncoding(true);
    try {
      const targetChannels =
        exportSelectionOnly && hasSelection
          ? copyRange(doc.channels, doc.selection.startSample, doc.selection.endSample)
          : doc.channels;

      const safeBase = (fileName.trim() || baseName).replace(/[\\/:*?"<>|]/g, '_');
      const settings: ExportSettings = {
        format,
        fileName: safeBase,
        wavBitDepth,
        mp3Bitrate,
        flacCompression,
        oggQuality,
        exportSelectionOnly,
      };

      const encoded = await encodeAudioDocument(
        targetChannels,
        doc.sampleRate,
        settings
      );

      const finalName = `${safeBase}.${encoded.extension}`;
      const blob = new Blob([encoded.bytes as Uint8Array<ArrayBuffer>], {
        type: encoded.mimeType,
      });

      // Prefer native File System Access API starting in Desktop when supported
      const win = window as unknown as {
        showSaveFilePicker?: (opts: {
          suggestedName?: string;
          startIn?: string;
          types?: Array<{
            description: string;
            accept: Record<string, string[]>;
          }>;
        }) => Promise<{
          createWritable: () => Promise<{
            write: (data: Blob) => Promise<void>;
            close: () => Promise<void>;
          }>;
        }>;
      };

      if (typeof win.showSaveFilePicker === 'function') {
        try {
          const handle = await win.showSaveFilePicker({
            suggestedName: finalName,
            startIn: 'desktop',
            types: [
              {
                description: `Audio ${format.toUpperCase()}`,
                accept: { [encoded.mimeType]: [`.${encoded.extension}`] },
              },
            ],
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          onExported(finalName, format);
          onClose();
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === 'AbortError') {
            setIsEncoding(false);
            return;
          }
          // Fall through to standard browser download if picker is blocked in iframe
        }
      }

      const url = URL.createObjectURL(blob);
      const a = window.document.createElement('a');
      a.href = url;
      a.download = finalName;
      window.document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 4000);

      onExported(finalName, format);
      onClose();
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : "Échec de l'encodage audio."
      );
    } finally {
      setIsEncoding(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="export-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className="w-full max-w-lg rounded-xl border shadow-2xl overflow-hidden"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div>
            <h2
              id="export-modal-title"
              className="text-sm font-display font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Exporter le fichier audio
            </h2>
            <p
              className="text-xs mt-0.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Encodage 100 % local · Aucun envoi sur Internet
            </p>
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

        <div className="p-5 space-y-4">
          {/* File Name */}
          <div>
            <label
              htmlFor="export-filename"
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Nom du fichier
            </label>
            <div className="flex items-center gap-2">
              <input
                id="export-filename"
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="flex-1 px-3 py-1.5 rounded-md border text-sm"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}
              />
              <span
                className="font-mono-tabular text-xs px-2.5 py-1.5 rounded-md border"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--accent-secondary)',
                }}
              >
                .{format}
              </span>
            </div>
          </div>

          {/* Format Selector */}
          <div>
            <span
              className="block text-xs font-medium mb-1.5"
              style={{ color: 'var(--text-secondary)' }}
            >
              Format de sortie
            </span>
            <div className="grid grid-cols-4 gap-2">
              {(
                [
                  ['wav', 'WAV', 'Non compressé'],
                  ['mp3', 'MP3', 'LAME'],
                  ['flac', 'FLAC', 'Sans perte'],
                  ['ogg', 'OGG', 'Vorbis'],
                ] as const
              ).map(([id, title, sub]) => (
                <button
                  key={id}
                  type="button"
                  onClick={() => setFormat(id)}
                  className="px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer"
                  style={{
                    backgroundColor:
                      format === id
                        ? 'var(--accent-soft)'
                        : 'var(--bg-elevated)',
                    borderColor:
                      format === id
                        ? 'var(--accent-primary)'
                        : 'var(--border-subtle)',
                  }}
                >
                  <div
                    className="text-xs font-display font-bold"
                    style={{ color: 'var(--text-primary)' }}
                  >
                    {title}
                  </div>
                  <div
                    className="text-[11px]"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    {sub}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Quality settings per format */}
          <div
            className="p-3.5 rounded-lg border space-y-3"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            {format === 'wav' && (
              <div>
                <span
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Résolution PCM / Flottant
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {([16, 24, 32] as const).map((bd) => (
                    <button
                      key={bd}
                      type="button"
                      onClick={() => setWavBitDepth(bd)}
                      className="px-3 py-1.5 rounded border text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor:
                          wavBitDepth === bd
                            ? 'var(--accent-primary)'
                            : 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color:
                          wavBitDepth === bd ? '#ffffff' : 'var(--text-primary)',
                      }}
                    >
                      {bd === 32 ? '32-bit Float' : `${bd}-bit PCM`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {format === 'mp3' && (
              <div>
                <span
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Débit constant (Bitrate)
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {([128, 192, 256, 320] as const).map((br) => (
                    <button
                      key={br}
                      type="button"
                      onClick={() => setMp3Bitrate(br)}
                      className="px-2.5 py-1.5 rounded border text-xs font-mono-tabular cursor-pointer"
                      style={{
                        backgroundColor:
                          mp3Bitrate === br
                            ? 'var(--accent-primary)'
                            : 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color:
                          mp3Bitrate === br ? '#ffffff' : 'var(--text-primary)',
                      }}
                    >
                      {br} kbps
                    </button>
                  ))}
                </div>
              </div>
            )}

            {format === 'flac' && (
              <div>
                <span
                  className="block text-xs font-medium mb-2"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  Niveau de compression sans perte
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      [0, 'Rapide (0)'],
                      [2, 'Standard (2)'],
                      [5, 'Maximale (5)'],
                    ] as const
                  ).map(([lvl, label]) => (
                    <button
                      key={lvl}
                      type="button"
                      onClick={() => setFlacCompression(lvl)}
                      className="px-2.5 py-1.5 rounded border text-xs font-medium cursor-pointer"
                      style={{
                        backgroundColor:
                          flacCompression === lvl
                            ? 'var(--accent-primary)'
                            : 'var(--bg-elevated)',
                        borderColor: 'var(--border-subtle)',
                        color:
                          flacCompression === lvl
                            ? '#ffffff'
                            : 'var(--text-primary)',
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {format === 'ogg' && (
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label
                    htmlFor="export-ogg-q"
                    style={{ color: 'var(--text-secondary)' }}
                  >
                    Qualité Vorbis VBR
                  </label>
                  <span
                    className="font-mono-tabular font-semibold"
                    style={{ color: 'var(--accent-secondary)' }}
                  >
                    Qualité {oggQuality} / 10
                  </span>
                </div>
                <input
                  id="export-ogg-q"
                  type="range"
                  min={1}
                  max={10}
                  step={1}
                  value={oggQuality}
                  onChange={(e) => setOggQuality(parseInt(e.target.value, 10))}
                  className="w-full studio-slider"
                />
              </div>
            )}

            {hasSelection && (
              <label className="flex items-center gap-2 text-xs pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={exportSelectionOnly}
                  onChange={(e) => setExportSelectionOnly(e.target.checked)}
                />
                <span style={{ color: 'var(--text-primary)' }}>
                  Exporter uniquement la sélection active
                </span>
              </label>
            )}
          </div>

          <div
            className="flex items-center justify-between text-xs font-mono-tabular"
            style={{ color: 'var(--text-secondary)' }}
          >
            <span>Durée exportée : {formatTimecode(activeDurationSec)}</span>
            <span>Taille estimée : ~{estimatedSizeKb.toLocaleString('fr-FR')} Ko</span>
          </div>

          {errorMsg && (
            <p className="text-xs font-medium text-rose-400">{errorMsg}</p>
          )}
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
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
            disabled={isEncoding}
            onClick={handleExport}
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-md text-xs font-semibold cursor-pointer disabled:opacity-50"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
          >
            {isEncoding ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Encodage...
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5" />
                Enregistrer le fichier
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
