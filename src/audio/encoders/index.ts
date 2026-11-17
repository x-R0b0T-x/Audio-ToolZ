import type { ExportSettings } from '../types';
import { encodeFlac } from './flac';
import { encodeMp3, encodeOgg } from './media';
import { encodeWav } from './wav';

export interface EncodedAudioResult {
  bytes: Uint8Array;
  mimeType: string;
  extension: string;
}

export async function encodeAudioDocument(
  channels: Float32Array[],
  sampleRate: number,
  settings: ExportSettings
): Promise<EncodedAudioResult> {
  switch (settings.format) {
    case 'wav':
      return {
        bytes: encodeWav(channels, sampleRate, settings.wavBitDepth),
        mimeType: 'audio/wav',
        extension: 'wav',
      };
    case 'flac':
      return {
        bytes: encodeFlac(channels, sampleRate, settings.flacCompression),
        mimeType: 'audio/flac',
        extension: 'flac',
      };
    case 'mp3':
      return {
        bytes: await encodeMp3(channels, sampleRate, settings.mp3Bitrate),
        mimeType: 'audio/mpeg',
        extension: 'mp3',
      };
    case 'ogg':
      return {
        bytes: await encodeOgg(channels, sampleRate, settings.oggQuality),
        mimeType: 'audio/ogg',
        extension: 'ogg',
      };
  }
}
