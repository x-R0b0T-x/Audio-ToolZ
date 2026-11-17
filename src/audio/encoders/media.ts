import { createMp3Encoder, createOggEncoder } from 'wasm-media-encoders';

function normalizeToStereoOrMono(channels: Float32Array[]): Float32Array[] {
  if (channels.length === 1) return [channels[0]];
  return [channels[0], channels[1]];
}

export async function encodeMp3(
  channels: Float32Array[],
  sampleRate: number,
  bitrate: 128 | 192 | 256 | 320 = 192
): Promise<Uint8Array> {
  const chs = normalizeToStereoOrMono(channels);
  const encoder = await createMp3Encoder();
  encoder.configure({
    sampleRate,
    channels: chs.length as 1 | 2,
    bitrate,
  });

  const chunks: Uint8Array[] = [];
  const blockSize = 1152 * 16;
  const total = chs[0]?.length ?? 0;

  for (let i = 0; i < total; i += blockSize) {
    const end = Math.min(total, i + blockSize);
    const slice = chs.map((ch) => ch.subarray(i, end));
    const encoded = encoder.encode(slice);
    if (encoded.length > 0) {
      chunks.push(new Uint8Array(encoded));
    }
  }

  const tail = encoder.finalize();
  if (tail.length > 0) {
    chunks.push(new Uint8Array(tail));
  }

  const totalLen = chunks.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}

export async function encodeOgg(
  channels: Float32Array[],
  sampleRate: number,
  vbrQuality = 5
): Promise<Uint8Array> {
  const chs = normalizeToStereoOrMono(channels);
  const encoder = await createOggEncoder();
  encoder.configure({
    sampleRate,
    channels: chs.length as 1 | 2,
    vbrQuality: Math.max(-1, Math.min(10, vbrQuality)),
  });

  const chunks: Uint8Array[] = [];
  const blockSize = 4096 * 4;
  const total = chs[0]?.length ?? 0;

  for (let i = 0; i < total; i += blockSize) {
    const end = Math.min(total, i + blockSize);
    const slice = chs.map((ch) => ch.subarray(i, end));
    const encoded = encoder.encode(slice);
    if (encoded.length > 0) {
      chunks.push(new Uint8Array(encoded));
    }
  }

  const tail = encoder.finalize();
  if (tail.length > 0) {
    chunks.push(new Uint8Array(tail));
  }

  const totalLen = chunks.reduce((a, b) => a + b.length, 0);
  const out = new Uint8Array(totalLen);
  let off = 0;
  for (const c of chunks) {
    out.set(c, off);
    off += c.length;
  }
  return out;
}
