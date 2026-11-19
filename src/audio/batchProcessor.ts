import { applyVolume, normalizeChannels } from './dsp';
import { encodeWav } from './encoders/wav';
import type { EncodedAudioResult } from './encoders';
import {
  applyCompressorAutoGain,
  applyEchoDelay,
  applyFrequencyFilter,
  applyParametricEq,
  applySpectralNoiseReduction,
  removeDcOffset,
  type NoiseProfile,
} from './studioDsp';
import type { EffectChainStep } from './presets';
import type { ExportSettings } from './types';

export interface BatchInputDocument {
  id: string;
  name: string;
  sampleRate: number;
  channels: Float32Array[];
}

export interface BatchOutputItem {
  sourceName: string;
  outputFileName: string;
  encoded: EncodedAudioResult;
  durationSeconds: number;
}

export type BatchEncoderFn = (
  channels: Float32Array[],
  sampleRate: number,
  settings: ExportSettings
) => Promise<EncodedAudioResult>;

async function defaultBatchEncoder(
  channels: Float32Array[],
  sampleRate: number,
  settings: ExportSettings
): Promise<EncodedAudioResult> {
  if (settings.format === 'wav') {
    return {
      bytes: encodeWav(channels, sampleRate, settings.wavBitDepth),
      mimeType: 'audio/wav',
      extension: 'wav',
    };
  }
  const { encodeAudioDocument } = await import('./encoders');
  return encodeAudioDocument(channels, sampleRate, settings);
}

export function applyEffectChain(
  channels: Float32Array[],
  sampleRate: number,
  steps: EffectChainStep[],
  noiseProfile?: NoiseProfile
): Float32Array[] {
  let current = channels;
  for (const step of steps) {
    const total = current[0]?.length ?? 0;
    if (total === 0) break;

    if (step.kind === 'remove-dc') {
      current = removeDcOffset(current, 0, total);
    } else if (step.kind === 'volume') {
      current = applyVolume(current, 0, total, step.gainDb);
    } else if (step.kind === 'normalize') {
      current = normalizeChannels(current, 0, total, step.targetPeakDb).channels;
    } else if (step.kind === 'eq') {
      current = applyParametricEq(current, sampleRate, 0, total, step.bands);
    } else if (step.kind === 'filter') {
      current = applyFrequencyFilter(
        current,
        sampleRate,
        0,
        total,
        step.filterKind,
        step.frequency,
        step.q
      );
    } else if (step.kind === 'compressor') {
      current = applyCompressorAutoGain(current, sampleRate, 0, total, step.params);
    } else if (step.kind === 'noise-reduction' && noiseProfile) {
      current = applySpectralNoiseReduction(current, 0, total, noiseProfile, step.params);
    } else if (step.kind === 'echo') {
      current = applyEchoDelay(current, sampleRate, 0, total, step.params);
    }
  }
  return current;
}

export async function runBatchProcessing(
  inputs: BatchInputDocument[],
  chain: EffectChainStep[],
  exportSettings: Omit<ExportSettings, 'fileName' | 'exportSelectionOnly'>,
  options: {
    noiseProfile?: NoiseProfile;
    suffix?: string;
    encoder?: BatchEncoderFn;
    onProgress?: (completed: number, total: number, currentName: string) => void;
  } = {}
): Promise<BatchOutputItem[]> {
  const results: BatchOutputItem[] = [];
  const suffix = options.suffix ?? '_v15';
  const encodeFn = options.encoder ?? defaultBatchEncoder;

  for (let i = 0; i < inputs.length; i++) {
    const doc = inputs[i];
    options.onProgress?.(i, inputs.length, doc.name);

    const processed = applyEffectChain(doc.channels, doc.sampleRate, chain, options.noiseProfile);
    const baseName = doc.name.replace(/\.[^.]+$/, '').replace(/[\\/:*?"<>|]/g, '_') || 'audio';

    const encoded = await encodeFn(processed, doc.sampleRate, {
      ...exportSettings,
      fileName: `${baseName}${suffix}`,
      exportSelectionOnly: false,
    });

    results.push({
      sourceName: doc.name,
      outputFileName: `${baseName}${suffix}.${encoded.extension}`,
      encoded,
      durationSeconds: (processed[0]?.length ?? 0) / Math.max(1, doc.sampleRate),
    });
  }

  options.onProgress?.(inputs.length, inputs.length, '');
  return results;
}
