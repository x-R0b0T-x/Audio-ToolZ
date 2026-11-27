export interface AudioSelection {
  startSample: number;
  endSample: number; // exclusive; equal bounds represent the cursor
}
export interface BpmDetectionResult {
  bpm: number; confidence: number; firstBeatSample: number; beatSamples: number[]; kickSamples: number[];
}
export interface AudioSnapshot {
  channels: Float32Array[]; sampleRate: number; selection: AudioSelection; label: string;
}
export interface CueTrackEntry {
  trackNumber: number; title: string; performer?: string; startSample: number;
}
export type VisualAnalyzerMode = 'oscilloscope' | 'spectrum' | 'colored-waveform' | 'vectorscope' | 'spectrogram' | 'vu-meter';
export interface AudioDocument {
  id: string; name: string; sampleRate: number; channels: Float32Array[]; selection: AudioSelection;
  viewStartSample: number; viewEndSample: number; undoStack: AudioSnapshot[]; redoStack: AudioSnapshot[];
  dirty: boolean; sourceFormat: string; bpmInfo?: BpmDetectionResult | null; showBeatGrid?: boolean;
  snapToBeats?: boolean; cueTracks?: CueTrackEntry[];
}
export type AudioExportFormat = 'wav' | 'mp3' | 'flac' | 'ogg';
export interface ExportSettings {
  format: AudioExportFormat; fileName: string; wavBitDepth: 16 | 24 | 32;
  mp3Bitrate: 128 | 192 | 256 | 320; flacCompression: 0 | 2 | 5;
  oggQuality: number; exportSelectionOnly: boolean;
}
export type FadeDirection = 'in' | 'out';
export type FadeCurve = 'linear' | 'exponential' | 'scurve';
export type EffectModalId = 'fade' | 'speed-pitch' | 'eq' | 'filter' | 'compressor' | 'noise-reduction' | 'declick' | 'echo' | 'reverb' | 'chorus' | 'flanger' | 'imager' | null;
export interface AudioStats {
  durationSeconds: number; totalSamples: number; sampleRate: number; channelCount: number;
  peakLinear: number; peakDb: number; rmsDb: number; dcOffset: number; clippedSamples: number;
}
