import type { VisualAnalyzerMode } from '../audio/types';

export interface RecordingPreferences {
  echoCancellation: boolean;
  noiseSuppression: boolean;
  autoGainControl: boolean;
}

export interface PersistedUiState {
  controlPos: { x: number; y: number } | null;
  controlOpen: boolean;
  controlCollapsed: boolean;
  visualMode: VisualAnalyzerMode;
  selectedInputDeviceId: string;
  selectedOutputDeviceId: string;
  recordingSettings: RecordingPreferences;
}

export const UI_STATE_STORAGE_KEY = 'audio_toolz_ui_state_v1';

export const DEFAULT_RECORDING_SETTINGS: RecordingPreferences = {
  echoCancellation: false,
  noiseSuppression: false,
  autoGainControl: false,
};

export const DEFAULT_UI_STATE: PersistedUiState = {
  controlPos: null,
  controlOpen: true,
  controlCollapsed: false,
  visualMode: 'oscilloscope',
  selectedInputDeviceId: '',
  selectedOutputDeviceId: '',
  recordingSettings: { ...DEFAULT_RECORDING_SETTINGS },
};

const CONTROL_WIDTH = 404;
const CONTROL_MIN_VISIBLE_Y = 80;

export function clampControlPosition(
  pos: { x: number; y: number },
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  const maxX = Math.max(8, viewportWidth - CONTROL_WIDTH - 8);
  const maxY = Math.max(52, viewportHeight - CONTROL_MIN_VISIBLE_Y);
  return {
    x: Math.round(Math.max(8, Math.min(maxX, pos.x))),
    y: Math.round(Math.max(52, Math.min(maxY, pos.y))),
  };
}

export function getDefaultControlPosition(
  viewportWidth: number,
  viewportHeight: number
): { x: number; y: number } {
  return clampControlPosition(
    {
      x: Math.max(24, viewportWidth - 420),
      y: Math.max(110, viewportHeight - 454),
    },
    viewportWidth,
    viewportHeight
  );
}

export function parsePersistedUiState(
  raw: string | null | undefined,
  viewportWidth = 1440,
  viewportHeight = 900
): PersistedUiState {
  if (!raw) {
    return {
      ...DEFAULT_UI_STATE,
      recordingSettings: { ...DEFAULT_RECORDING_SETTINGS },
    };
  }
  try {
    const parsed = JSON.parse(raw) as Partial<PersistedUiState>;
    let controlPos: { x: number; y: number } | null = null;
    if (
      parsed.controlPos &&
      typeof parsed.controlPos.x === 'number' &&
      Number.isFinite(parsed.controlPos.x) &&
      typeof parsed.controlPos.y === 'number' &&
      Number.isFinite(parsed.controlPos.y)
    ) {
      controlPos = clampControlPosition(
        parsed.controlPos,
        viewportWidth,
        viewportHeight
      );
    }

    const rs = parsed.recordingSettings;

    return {
      controlPos,
      controlOpen:
        typeof parsed.controlOpen === 'boolean'
          ? parsed.controlOpen
          : DEFAULT_UI_STATE.controlOpen,
      controlCollapsed:
        typeof parsed.controlCollapsed === 'boolean'
          ? parsed.controlCollapsed
          : DEFAULT_UI_STATE.controlCollapsed,
      visualMode:
        parsed.visualMode === 'spectrum' ||
        parsed.visualMode === 'oscilloscope' ||
        parsed.visualMode === 'vectorscope' ||
        parsed.visualMode === 'spectrogram' ||
        parsed.visualMode === 'vu-meter' ||
        parsed.visualMode === 'colored-waveform'
          ? parsed.visualMode
          : DEFAULT_UI_STATE.visualMode,
      selectedInputDeviceId:
        typeof parsed.selectedInputDeviceId === 'string'
          ? parsed.selectedInputDeviceId
          : '',
      selectedOutputDeviceId:
        typeof parsed.selectedOutputDeviceId === 'string'
          ? parsed.selectedOutputDeviceId
          : '',
      recordingSettings: {
        echoCancellation:
          typeof rs?.echoCancellation === 'boolean'
            ? rs.echoCancellation
            : DEFAULT_RECORDING_SETTINGS.echoCancellation,
        noiseSuppression:
          typeof rs?.noiseSuppression === 'boolean'
            ? rs.noiseSuppression
            : DEFAULT_RECORDING_SETTINGS.noiseSuppression,
        autoGainControl:
          typeof rs?.autoGainControl === 'boolean'
            ? rs.autoGainControl
            : DEFAULT_RECORDING_SETTINGS.autoGainControl,
      },
    };
  } catch {
    return {
      ...DEFAULT_UI_STATE,
      recordingSettings: { ...DEFAULT_RECORDING_SETTINGS },
    };
  }
}

export function loadPersistedUiState(): PersistedUiState {
  if (typeof window === 'undefined') {
    return {
      ...DEFAULT_UI_STATE,
      recordingSettings: { ...DEFAULT_RECORDING_SETTINGS },
    };
  }
  try {
    const raw = window.localStorage.getItem(UI_STATE_STORAGE_KEY);
    return parsePersistedUiState(
      raw,
      window.innerWidth || 1440,
      window.innerHeight || 900
    );
  } catch {
    return {
      ...DEFAULT_UI_STATE,
      recordingSettings: { ...DEFAULT_RECORDING_SETTINGS },
    };
  }
}

export function savePersistedUiState(
  patch: Partial<PersistedUiState>
): PersistedUiState {
  const current = loadPersistedUiState();
  const next: PersistedUiState = {
    ...current,
    ...patch,
    recordingSettings: patch.recordingSettings
      ? { ...current.recordingSettings, ...patch.recordingSettings }
      : current.recordingSettings,
  };
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(UI_STATE_STORAGE_KEY, JSON.stringify(next));
    } catch {
      // Ignore storage quota / privacy mode errors
    }
  }
  return next;
}
