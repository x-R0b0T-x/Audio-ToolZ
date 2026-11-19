import { copyRange } from './dsp';
import type { CueTrackEntry } from './types';

export interface SilenceCueOptions {
  thresholdDb?: number; // default -42 dBFS
  minSilenceMs?: number; // default 450 ms
  minSegmentMs?: number; // default 1200 ms
  prefix?: string; // default "Segment"
}

export interface SplitCueSegment {
  trackNumber: number;
  title: string;
  fileName: string;
  startSample: number;
  endSample: number;
  durationSeconds: number;
  channels: Float32Array[];
}

export function detectSilenceCuePoints(
  channels: Float32Array[],
  sampleRate: number,
  options: SilenceCueOptions = {}
): CueTrackEntry[] {
  const total = channels[0]?.length ?? 0;
  if (total === 0 || sampleRate <= 0) return [];

  const thresholdLin = Math.pow(10, (options.thresholdDb ?? -42) / 20);
  const minSilenceSamples = Math.max(1, Math.round(((options.minSilenceMs ?? 450) / 1000) * sampleRate));
  const minSegmentSamples = Math.max(1, Math.round(((options.minSegmentMs ?? 1200) / 1000) * sampleRate));
  const windowSize = Math.max(64, Math.round(sampleRate * 0.02));
  const prefix = (options.prefix ?? 'Segment').trim() || 'Segment';

  const silenceRanges: Array<{ start: number; end: number }> = [];
  let silenceStart = -1;

  for (let pos = 0; pos < total; pos += windowSize) {
    const end = Math.min(total, pos + windowSize);
    let peak = 0;
    for (let c = 0; c < channels.length; c++) {
      const ch = channels[c];
      for (let i = pos; i < end; i++) {
        const a = Math.abs(ch[i]);
        if (a > peak) peak = a;
      }
    }

    if (peak <= thresholdLin) {
      if (silenceStart === -1) silenceStart = pos;
    } else if (silenceStart !== -1) {
      if (pos - silenceStart >= minSilenceSamples) {
        silenceRanges.push({ start: silenceStart, end: pos });
      }
      silenceStart = -1;
    }
  }

  const cueStarts: number[] = [0];
  for (const gap of silenceRanges) {
    // Start next track slightly after silence ends (at sound onset)
    const candidate = gap.end;
    const prev = cueStarts[cueStarts.length - 1];
    if (candidate - prev >= minSegmentSamples && total - candidate >= minSegmentSamples / 2) {
      cueStarts.push(candidate);
    }
  }

  return cueStarts.map((startSample, idx) => ({
    trackNumber: idx + 1,
    title: `${prefix} ${String(idx + 1).padStart(2, '0')}`,
    startSample,
  }));
}

export function splitChannelsByCues(
  channels: Float32Array[],
  sampleRate: number,
  cueTracks: CueTrackEntry[],
  baseName: string
): SplitCueSegment[] {
  const total = channels[0]?.length ?? 0;
  if (total === 0 || cueTracks.length === 0) return [];

  const sorted = [...cueTracks]
    .filter((t) => t.startSample >= 0 && t.startSample < total)
    .sort((a, b) => a.startSample - b.startSample);

  const safeBase = baseName.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'audio';
  const segments: SplitCueSegment[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    const nextStart = i + 1 < sorted.length ? sorted[i + 1].startSample : total;
    if (nextStart <= cur.startSample) continue;

    const sliced = copyRange(channels, cur.startSample, nextStart);
    const num = String(cur.trackNumber || i + 1).padStart(2, '0');
    const cleanTitle = (cur.title || `Segment ${num}`).replace(/[\\/:*?"<>|]/g, '_');

    segments.push({
      trackNumber: cur.trackNumber || i + 1,
      title: cur.title || `Segment ${num}`,
      fileName: `${safeBase}_${num}_${cleanTitle}`,
      startSample: cur.startSample,
      endSample: nextStart,
      durationSeconds: (nextStart - cur.startSample) / Math.max(1, sampleRate),
      channels: sliced,
    });
  }

  return segments;
}
