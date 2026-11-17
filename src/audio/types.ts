export interface AudioSelection {
  startSample: number;
  endSample: number; // exclusive; when startSample === endSample, it represents the cursor position
}

export interface BpmDetectionResult {
  bpm: number;
  confidence: number;
  firstBeatSample: number;
  beatSamples: number[];
  kickSamples: number[];
}

export interface AudioSnapshot {
  channels: Float32Array[];
  sampleRate: number;
  selection: AudioSelection;
  label: string;
}

export interface CueTrackEntry {
  trackNumber: number;
  title: string;
  performer?: string;
  startSample: number;
}

export type VisualAnalyzerMode =
  | 'oscilloscope'
  | 'spectrum'
  | 'colored-waveform';

export interface AudioDocument {
  id: string;
  name: string;
  sampleRate: number;
  channels: Float32Array[];
  selection: AudioSelection;
  viewStartSample: number;
  viewEndSample: number;
  undoStack: AudioSnapshot[];
  redoStack: AudioSnapshot[];
  dirty: boolean;
  sourceFormat: string;
  bpmInfo?: BpmDetectionResult | null;
  showBeatGrid?: boolean;
  snapToBeats?: boolean;
  cueTracks?: CueTrackEntry[];
}

export type AudioExportFormat = 'wav' | 'mp3' | 'flac' | 'ogg';

export interface ExportSettings {
  format: AudioExportFormat;
  fileName: string;
  wavBitDepth: 16 | 24 | 32;
  mp3Bitrate: 128 | 192 | 256 | 320;
  flacCompression: 0 | 2 | 5;
  oggQuality: number; // -1 to 10 (typical: 3 to 9)
  exportSelectionOnly: boolean;
}

export type FadeDirection = 'in' | 'out';
export type FadeCurve = 'linear' | 'exponential' | 'scurve';

export type EffectModalId =
  | 'volume'
  | 'normalize'
  | 'fade'
  | 'speed-pitch'
  | null;

export interface AudioStats {
  durationSeconds: number;
  totalSamples: number;
  sampleRate: number;
  channelCount: number;
  peakLinear: number;
  peakDb: number;
  rmsDb: number;
  dcOffset: number;
  clippedSamples: number;
}
