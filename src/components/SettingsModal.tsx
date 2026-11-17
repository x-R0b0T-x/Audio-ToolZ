import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  Mic,
  RefreshCw,
  Settings,
  ShieldCheck,
  Speaker,
  X,
} from 'lucide-react';
import {
  audioEngine,
  type AudioInputDevice,
  type AudioOutputDevice,
} from '../audio/engine';
import type { RecordingPreferences } from '../utils/uiStateStorage';

interface SettingsModalProps {
  open: boolean;
  selectedInputDeviceId: string;
  selectedOutputDeviceId: string;
  recordingSettings: RecordingPreferences;
  onSelectInputDevice: (deviceId: string) => void;
  onSelectOutputDevice: (deviceId: string) => void;
  onChangeRecordingSettings: (patch: Partial<RecordingPreferences>) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  open,
  selectedInputDeviceId,
  selectedOutputDeviceId,
  recordingSettings,
  onSelectInputDevice,
  onSelectOutputDevice,
  onChangeRecordingSettings,
  onClose,
}) => {
  const [inputs, setInputs] = useState<AudioInputDevice[]>([]);
  const [outputs, setOutputs] = useState<AudioOutputDevice[]>([]);
  const [supportsOutputSelect, setSupportsOutputSelect] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const refreshDevices = useCallback(async () => {
    setLoading(true);
    try {
      const res = await audioEngine.listAudioDevices();
      setInputs(res.inputs);
      setOutputs(res.outputs);
      setSupportsOutputSelect(res.supportsOutputSelect);
      if (
        res.inputs.length > 0 &&
        (!selectedInputDeviceId ||
          !res.inputs.some((d) => d.deviceId === selectedInputDeviceId))
      ) {
        onSelectInputDevice(res.inputs[0].deviceId);
      }
      if (
        res.outputs.length > 0 &&
        (!selectedOutputDeviceId ||
          !res.outputs.some((d) => d.deviceId === selectedOutputDeviceId))
      ) {
        onSelectOutputDevice(res.outputs[0].deviceId);
      }
    } finally {
      setLoading(false);
    }
  }, [
    onSelectInputDevice,
    onSelectOutputDevice,
    selectedInputDeviceId,
    selectedOutputDeviceId,
  ]);

  useEffect(() => {
    if (!open) return;
    setStatusMessage(null);
    void refreshDevices();
  }, [open, refreshDevices]);

  const handleRequestPermission = async () => {
    setLoading(true);
    setStatusMessage(null);
    const granted = await audioEngine.requestMicrophonePermission(
      selectedInputDeviceId || undefined
    );
    await refreshDevices();
    setLoading(false);
    setStatusMessage(
      granted
        ? 'Cartes son et microphones détectés avec leurs noms matériels.'
        : "Autorisation microphone refusée ou aucun périphérique d'entrée détecté."
    );
  };

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4"
    >
      <div
        className="w-full max-w-xl rounded-xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
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
          <div className="flex items-center gap-2">
            <Settings
              className="w-4 h-4"
              style={{ color: 'var(--accent-secondary)' }}
            />
            <h2
              id="settings-modal-title"
              className="text-sm font-display font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Paramètres audio &amp; Périphériques
            </h2>
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

        <div className="p-5 space-y-5 overflow-y-auto text-xs">
          {/* Audio Input Section */}
          <section className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Mic
                  className="w-4 h-4"
                  style={{ color: 'var(--accent-primary-hover)' }}
                />
                <h3
                  className="text-xs font-display font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
                  Carte d&apos;entrée audio / Microphone
                </h3>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => void handleRequestPermission()}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded border text-[11px] font-medium cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-primary)',
                  }}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Détecter les cartes son
                </button>
                <button
                  type="button"
                  aria-label="Actualiser la liste des périphériques"
                  title="Actualiser"
                  onClick={() => void refreshDevices()}
                  disabled={loading}
                  className="p-1.5 rounded border cursor-pointer hover:bg-[var(--bg-hover)] disabled:opacity-50"
                  style={{
                    backgroundColor: 'var(--bg-elevated)',
                    borderColor: 'var(--border-subtle)',
                    color: 'var(--text-secondary)',
                  }}
                >
                  <RefreshCw
                    className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`}
                  />
                </button>
              </div>
            </div>

            {statusMessage && (
              <p
                className="px-3 py-1.5 rounded border text-[11px]"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                  color: 'var(--text-secondary)',
                }}
              >
                {statusMessage}
              </p>
            )}

            <div className="space-y-1.5">
              <label
                htmlFor="settings-audio-input-select"
                className="block text-[11px]"
                style={{ color: 'var(--text-secondary)' }}
              >
                Périphérique d&apos;enregistrement actif
              </label>
              <select
                id="settings-audio-input-select"
                data-testid="settings-audio-input-select"
                value={selectedInputDeviceId}
                onChange={(e) => onSelectInputDevice(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border text-xs"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-strong)',
                  color: 'var(--text-primary)',
                }}
              >
                {inputs.length === 0 ? (
                  <option value="">Entrée audio par défaut</option>
                ) : (
                  inputs.map((dev) => (
                    <option key={dev.deviceId} value={dev.deviceId}>
                      {dev.label}
                    </option>
                  ))
                )}
              </select>
            </div>

            {inputs.length > 0 && (
              <div
                className="rounded-lg border divide-y max-h-40 overflow-y-auto"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                {inputs.map((dev) => {
                  const isSelected = dev.deviceId === selectedInputDeviceId;
                  return (
                    <button
                      key={dev.deviceId}
                      type="button"
                      onClick={() => onSelectInputDevice(dev.deviceId)}
                      className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left transition-colors cursor-pointer hover:bg-[var(--bg-hover)]"
                      style={{
                        borderColor: 'var(--border-subtle)',
                        backgroundColor: isSelected
                          ? 'var(--accent-soft)'
                          : 'transparent',
                        color: 'var(--text-primary)',
                      }}
                    >
                      <span className="truncate font-medium">{dev.label}</span>
                      {isSelected && (
                        <Check
                          className="w-3.5 h-3.5 shrink-0"
                          style={{ color: 'var(--accent-secondary)' }}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* Audio Output Section */}
          <section className="space-y-2">
            <div className="flex items-center gap-2">
              <Speaker
                className="w-4 h-4"
                style={{ color: 'var(--accent-secondary)' }}
              />
              <h3
                className="text-xs font-display font-semibold"
                style={{ color: 'var(--text-primary)' }}
              >
                Sortie audio (Lecture / Moniteurs)
              </h3>
            </div>
            <select
              id="settings-audio-output-select"
              data-testid="settings-audio-output-select"
              disabled={!supportsOutputSelect || outputs.length === 0}
              value={selectedOutputDeviceId}
              onChange={(e) => onSelectOutputDevice(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border text-xs disabled:opacity-50"
              style={{
                backgroundColor: 'var(--bg-input)',
                borderColor: 'var(--border-subtle)',
                color: 'var(--text-primary)',
              }}
            >
              {outputs.length === 0 ? (
                <option value="">Sortie audio par défaut du système</option>
              ) : (
                outputs.map((dev) => (
                  <option key={dev.deviceId} value={dev.deviceId}>
                    {dev.label}
                  </option>
                ))
              )}
            </select>
            {!supportsOutputSelect && (
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Ce navigateur utilise automatiquement la sortie audio principale
                du système.
              </p>
            )}
          </section>

          {/* Capture Options */}
          <section
            className="rounded-lg border p-3.5 space-y-2.5"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-subtle)',
            }}
          >
            <h3
              className="text-xs font-display font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              Traitement de l&apos;entrée à l&apos;enregistrement
            </h3>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span style={{ color: 'var(--text-secondary)' }}>
                Annulation d&apos;écho
              </span>
              <input
                type="checkbox"
                checked={recordingSettings.echoCancellation}
                onChange={(e) =>
                  onChangeRecordingSettings({
                    echoCancellation: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[var(--accent-primary)] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span style={{ color: 'var(--text-secondary)' }}>
                Réduction de bruit automatique
              </span>
              <input
                type="checkbox"
                checked={recordingSettings.noiseSuppression}
                onChange={(e) =>
                  onChangeRecordingSettings({
                    noiseSuppression: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[var(--accent-primary)] cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between gap-3 cursor-pointer">
              <span style={{ color: 'var(--text-secondary)' }}>
                Contrôle automatique du gain (AGC)
              </span>
              <input
                type="checkbox"
                checked={recordingSettings.autoGainControl}
                onChange={(e) =>
                  onChangeRecordingSettings({
                    autoGainControl: e.target.checked,
                  })
                }
                className="w-4 h-4 accent-[var(--accent-primary)] cursor-pointer"
              />
            </label>
          </section>
        </div>

        <div
          className="flex items-center justify-end gap-2 px-4 py-3 border-t shrink-0"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
          >
            Valider
          </button>
        </div>
      </div>
    </div>
  );
};
