import type { CueTrackEntry } from './types';

export interface JoinableAudioTrack {
  title: string;
  performer?: string;
  sampleRate: number;
  channels: Float32Array[];
}

export function sanitizeCueText(value: string): string {
  return value.replace(/[\r\n"]+/g, ' ').trim();
}

/**
 * Converts a sample position to standard CUE MM:SS:FF timecode (75 frames/sec).
 */
export function samplesToCueTime(sample: number, sampleRate: number): string {
  if (!Number.isFinite(sample) || !Number.isFinite(sampleRate) || sampleRate <= 0 || sample <= 0) {
    return '00:00:00';
  }
  const totalFrames = Math.round((sample / sampleRate) * 75);
  const frames = totalFrames % 75;
  const totalSeconds = Math.floor(totalFrames / 75);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}:${String(frames).padStart(2, '0')}`;
}

/**
 * Parses standard CUE MM:SS:FF (75 frames/sec) into sample index.
 */
export function cueTimeToSamples(timecode: string, sampleRate: number): number {
  const match = timecode.trim().match(/^(\d+):(\d{1,2}):(\d{1,2})$/);
  if (!match || !Number.isFinite(sampleRate) || sampleRate <= 0) return 0;
  const minutes = parseInt(match[1], 10);
  const seconds = parseInt(match[2], 10);
  const frames = parseInt(match[3], 10);
  const totalSec = minutes * 60 + seconds + frames / 75;
  return Math.max(0, Math.round(totalSec * sampleRate));
}

export function buildCueSheet(options: {
  mixTitle: string;
  mixPerformer?: string;
  audioFileName: string;
  sampleRate: number;
  tracks: CueTrackEntry[];
}): string {
  const title = sanitizeCueText(options.mixTitle) || 'Mix Audio ToolZ';
  const performer = sanitizeCueText(options.mixPerformer || '');
  const audioName = sanitizeCueText(options.audioFileName) || 'Mix.wav';
  const lower = audioName.toLowerCase();
  const fileType = lower.endsWith('.mp3') ? 'MP3' : 'WAVE';

  const lines: string[] = ['REM COMMENT "Généré par Audio ToolZ"'];
  if (performer) {
    lines.push(`PERFORMER "${performer}"`);
  }
  lines.push(`TITLE "${title}"`);
  lines.push(`FILE "${audioName}" ${fileType}`);

  const sorted = [...options.tracks].sort((a, b) => a.startSample - b.startSample);
  sorted.forEach((tr, idx) => {
    const trackNum = String(idx + 1).padStart(2, '0');
    const trTitle = sanitizeCueText(tr.title) || `Piste ${trackNum}`;
    const trPerf = sanitizeCueText(tr.performer || '');
    const indexTime = samplesToCueTime(tr.startSample, options.sampleRate);
    lines.push(`  TRACK ${trackNum} AUDIO`);
    lines.push(`    TITLE "${trTitle}"`);
    if (trPerf) {
      lines.push(`    PERFORMER "${trPerf}"`);
    }
    lines.push(`    INDEX 01 ${indexTime}`);
  });

  return `${lines.join('\n')}\n`;
}

function unquoteCueValue(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"') && trimmed.length >= 2) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function parseCueSheet(
  cueText: string,
  sampleRate: number,
  totalSamples?: number
): { mixTitle?: string; mixPerformer?: string; tracks: CueTrackEntry[] } {
  const lines = cueText.split(/\r?\n/);
  let mixTitle: string | undefined;
  let mixPerformer: string | undefined;

  let currentTrack: Partial<CueTrackEntry> | null = null;
  const tracks: CueTrackEntry[] = [];

  const flushTrack = () => {
    if (currentTrack && typeof currentTrack.startSample === 'number') {
      const num = currentTrack.trackNumber ?? tracks.length + 1;
      const clampedSample =
        typeof totalSamples === 'number' && totalSamples > 0
          ? Math.max(0, Math.min(totalSamples - 1, currentTrack.startSample))
          : Math.max(0, currentTrack.startSample);
      tracks.push({
        trackNumber: num,
        title: currentTrack.title || `Piste ${String(num).padStart(2, '0')}`,
        performer: currentTrack.performer,
        startSample: clampedSample,
      });
    }
    currentTrack = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith('REM ')) continue;

    const trackMatch = line.match(/^TRACK\s+(\d+)\s+AUDIO/i);
    if (trackMatch) {
      flushTrack();
      currentTrack = {
        trackNumber: parseInt(trackMatch[1], 10),
      };
      continue;
    }

    const titleMatch = line.match(/^TITLE\s+(.+)$/i);
    if (titleMatch) {
      const val = unquoteCueValue(titleMatch[1]);
      if (currentTrack) currentTrack.title = val;
      else mixTitle = val;
      continue;
    }

    const perfMatch = line.match(/^PERFORMER\s+(.+)$/i);
    if (perfMatch) {
      const val = unquoteCueValue(perfMatch[1]);
      if (currentTrack) currentTrack.performer = val;
      else mixPerformer = val;
      continue;
    }

    const indexMatch = line.match(/^INDEX\s+01\s+(\d+:\d{1,2}:\d{1,2})/i);
    if (indexMatch && currentTrack) {
      currentTrack.startSample = cueTimeToSamples(indexMatch[1], sampleRate);
    }
  }
  flushTrack();

  tracks.sort((a, b) => a.startSample - b.startSample);
  return { mixTitle, mixPerformer, tracks };
}

export function findTrackAtSample(
  cueTracks: CueTrackEntry[] | undefined,
  sample: number
): CueTrackEntry | null {
  if (!cueTracks || cueTracks.length === 0) return null;
  let active = cueTracks[0];
  for (let i = 0; i < cueTracks.length; i++) {
    if (cueTracks[i].startSample <= sample) {
      active = cueTracks[i];
    } else {
      break;
    }
  }
  return active;
}

function resampleLinear(
  input: Float32Array,
  fromRate: number,
  toRate: number
): Float32Array {
  if (fromRate === toRate || input.length === 0) {
    return new Float32Array(input);
  }
  const ratio = fromRate / toRate;
  const outLen = Math.max(1, Math.round(input.length / ratio));
  const out = new Float32Array(outLen);
  const last = input.length - 1;
  for (let i = 0; i < outLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(last, i0 + 1);
    const frac = pos - i0;
    out[i] = input[i0] * (1 - frac) + input[i1] * frac;
  }
  return out;
}

/**
 * Joins multiple audio tracks sequentially into a single continuous mix, normalizing
 * sample rates and channel counts (stereo if any track is stereo) and generating exact
 * CueTrackEntry offsets for each track.
 */
export function joinAudioTracks(
  tracks: JoinableAudioTrack[],
  targetSampleRate?: number
): {
  channels: Float32Array[];
  sampleRate: number;
  cueTracks: CueTrackEntry[];
} {
  if (tracks.length === 0) {
    return {
      channels: [new Float32Array(0), new Float32Array(0)],
      sampleRate: targetSampleRate ?? 44100,
      cueTracks: [],
    };
  }

  const outRate = targetSampleRate ?? tracks[0].sampleRate ?? 44100;
  const outChannelCount = tracks.some((t) => t.channels.length >= 2) ? 2 : 1;

  const prepared = tracks.map((t) => {
    const ch0 = resampleLinear(t.channels[0] ?? new Float32Array(0), t.sampleRate, outRate);
    if (outChannelCount === 1) {
      return [ch0];
    }
    const ch1 =
      t.channels.length >= 2
        ? resampleLinear(t.channels[1], t.sampleRate, outRate)
        : new Float32Array(ch0);
    return [ch0, ch1];
  });

  const totalSamples = prepared.reduce((acc, chs) => acc + (chs[0]?.length ?? 0), 0);
  const outChannels = Array.from(
    { length: outChannelCount },
    () => new Float32Array(totalSamples)
  );

  const cueTracks: CueTrackEntry[] = [];
  let cursor = 0;

  for (let i = 0; i < tracks.length; i++) {
    const len = prepared[i][0]?.length ?? 0;
    cueTracks.push({
      trackNumber: i + 1,
      title: sanitizeCueText(tracks[i].title) || `Piste ${String(i + 1).padStart(2, '0')}`,
      performer: sanitizeCueText(tracks[i].performer || '') || undefined,
      startSample: cursor,
    });
    for (let c = 0; c < outChannelCount; c++) {
      outChannels[c].set(prepared[i][c], cursor);
    }
    cursor += len;
  }

  return {
    channels: outChannels,
    sampleRate: outRate,
    cueTracks,
  };
}
