/**
 * Pure TypeScript lossless FLAC encoder (RFC 9639 compliant, 16-bit PCM).
 * Supports Verbatim (level 0) and Fixed LPC + Rice coding (levels 2 & 5).
 */

const CRC8_TABLE = new Uint8Array(256);
const CRC16_TABLE = new Uint16Array(256);

(function initCrcTables() {
  for (let i = 0; i < 256; i++) {
    let c8 = i;
    for (let b = 0; b < 8; b++) {
      c8 = c8 & 0x80 ? ((c8 << 1) ^ 0x07) & 0xff : (c8 << 1) & 0xff;
    }
    CRC8_TABLE[i] = c8;

    let c16 = i << 8;
    for (let b = 0; b < 8; b++) {
      c16 = c16 & 0x8000 ? ((c16 << 1) ^ 0x8005) & 0xffff : (c16 << 1) & 0xffff;
    }
    CRC16_TABLE[i] = c16;
  }
})();

export function crc8(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = CRC8_TABLE[crc ^ data[i]];
  }
  return crc;
}

export function crc16(data: Uint8Array): number {
  let crc = 0;
  for (let i = 0; i < data.length; i++) {
    crc = ((crc << 8) ^ CRC16_TABLE[((crc >> 8) ^ data[i]) & 0xff]) & 0xffff;
  }
  return crc;
}

class BitWriter {
  private bytes: number[] = [];
  private current = 0;
  private bitPos = 0;

  writeBits(value: number, bits: number): void {
    for (let i = bits - 1; i >= 0; i--) {
      this.current = (this.current << 1) | ((value >>> i) & 1);
      this.bitPos++;
      if (this.bitPos === 8) {
        this.bytes.push(this.current & 0xff);
        this.current = 0;
        this.bitPos = 0;
      }
    }
  }

  writeSignedBits(value: number, bits: number): void {
    const mask = (1 << bits) - 1;
    this.writeBits(value & mask, bits);
  }

  writeRice(residual: number, param: number): void {
    // ZigZag mapping: non-negative -> 2*v, negative -> -2*v - 1
    const folded = residual >= 0 ? residual * 2 : -residual * 2 - 1;
    const quotient = folded >>> param;
    const remainder = folded & ((1 << param) - 1);

    // Unary quotient: `quotient` zeros followed by a single 1
    for (let q = 0; q < quotient; q++) {
      this.writeBits(0, 1);
    }
    this.writeBits(1, 1);
    if (param > 0) {
      this.writeBits(remainder, param);
    }
  }

  alignToByte(): void {
    if (this.bitPos > 0) {
      this.current <<= 8 - this.bitPos;
      this.bytes.push(this.current & 0xff);
      this.current = 0;
      this.bitPos = 0;
    }
  }

  toUint8Array(): Uint8Array {
    this.alignToByte();
    return new Uint8Array(this.bytes);
  }
}

function encodeUtf8Number(n: number): number[] {
  if (n < 0x80) return [n];
  if (n < 0x800) return [0xc0 | (n >> 6), 0x80 | (n & 0x3f)];
  if (n < 0x10000) {
    return [0xe0 | (n >> 12), 0x80 | ((n >> 6) & 0x3f), 0x80 | (n & 0x3f)];
  }
  if (n < 0x200000) {
    return [
      0xf0 | (n >> 18),
      0x80 | ((n >> 12) & 0x3f),
      0x80 | ((n >> 6) & 0x3f),
      0x80 | (n & 0x3f),
    ];
  }
  return [
    0xf8 | Math.floor(n / 0x1000000),
    0x80 | ((n >> 18) & 0x3f),
    0x80 | ((n >> 12) & 0x3f),
    0x80 | ((n >> 6) & 0x3f),
    0x80 | (n & 0x3f),
  ];
}

function encodeSubframe(samples: Int32Array, compressionLevel: 0 | 2 | 5): Uint8Array {
  const n = samples.length;

  // Check constant subframe
  let allSame = true;
  const first = samples[0];
  for (let i = 1; i < n; i++) {
    if (samples[i] !== first) {
      allSame = false;
      break;
    }
  }
  if (allSame) {
    const bw = new BitWriter();
    bw.writeBits(0, 1); // zero bit
    bw.writeBits(0, 6); // CONSTANT type
    bw.writeBits(0, 1); // no wasted bits
    bw.writeSignedBits(first, 16);
    return bw.toUint8Array();
  }

  // Verbatim baseline
  const verbatimWriter = new BitWriter();
  verbatimWriter.writeBits(0, 1);
  verbatimWriter.writeBits(1, 6); // VERBATIM type
  verbatimWriter.writeBits(0, 1);
  for (let i = 0; i < n; i++) {
    verbatimWriter.writeSignedBits(samples[i], 16);
  }
  let bestBytes = verbatimWriter.toUint8Array();

  if (compressionLevel === 0 || n < 16) {
    return bestBytes;
  }

  // Try Fixed LPC orders (0..2 for level 2, 0..4 for level 5)
  const maxOrder = compressionLevel >= 5 ? 4 : 2;
  for (let order = 1; order <= maxOrder; order++) {
    if (n <= order) continue;

    const residuals = new Int32Array(n - order);
    let sumAbs = 0;
    let overflow = false;

    for (let i = order; i < n; i++) {
      let pred = 0;
      if (order === 1) {
        pred = samples[i - 1];
      } else if (order === 2) {
        pred = 2 * samples[i - 1] - samples[i - 2];
      } else if (order === 3) {
        pred = 3 * samples[i - 1] - 3 * samples[i - 2] + samples[i - 3];
      } else {
        pred =
          4 * samples[i - 1] -
          6 * samples[i - 2] +
          4 * samples[i - 3] -
          samples[i - 4];
      }
      const r = samples[i] - pred;
      residuals[i - order] = r;
      const absR = Math.abs(r);
      if (absR > 1048576) {
        overflow = true;
        break;
      }
      sumAbs += absR;
    }

    if (overflow) continue;

    // Estimate optimal Rice parameter k
    const meanAbs = sumAbs / residuals.length;
    let k = 0;
    while (k < 14 && (1 << k) < meanAbs * 0.69) {
      k++;
    }

    // Check worst-case unary length so Rice doesn't blow up on transients
    let maxFolded = 0;
    for (let i = 0; i < residuals.length; i++) {
      const f = residuals[i] >= 0 ? residuals[i] * 2 : -residuals[i] * 2 - 1;
      if (f > maxFolded) maxFolded = f;
    }
    if ((maxFolded >>> k) > 256) continue;

    const bw = new BitWriter();
    bw.writeBits(0, 1); // zero pad
    bw.writeBits(8 + order, 6); // FIXED order 0..4 -> types 8..12
    bw.writeBits(0, 1); // no wasted bits

    // Warmup samples
    for (let i = 0; i < order; i++) {
      bw.writeSignedBits(samples[i], 16);
    }

    // Residual coding: 2-bit method (00 = 4-bit Rice parameter), 4-bit partition order = 0
    bw.writeBits(0, 2);
    bw.writeBits(0, 4);
    bw.writeBits(k, 4);

    for (let i = 0; i < residuals.length; i++) {
      bw.writeRice(residuals[i], k);
    }

    const candidate = bw.toUint8Array();
    if (candidate.length < bestBytes.length) {
      bestBytes = candidate;
    }
  }

  return bestBytes;
}

export function encodeFlac(
  channels: Float32Array[],
  sampleRate: number,
  compressionLevel: 0 | 2 | 5 = 2
): Uint8Array {
  const numChannels = Math.min(2, Math.max(1, channels.length));
  const totalSamples = channels[0]?.length ?? 0;
  const blockSizeMax = 4096;
  const actualMinBlock = Math.min(blockSizeMax, Math.max(16, totalSamples));

  const chunks: Uint8Array[] = [];

  // 1. Magic "fLaC"
  chunks.push(new Uint8Array([0x66, 0x4c, 0x61, 0x43]));

  // 2. METADATA_BLOCK_HEADER (last=1, type=0 STREAMINFO, len=34)
  chunks.push(new Uint8Array([0x80, 0x00, 0x00, 0x22]));

  // 3. STREAMINFO (34 bytes)
  const streamInfo = new Uint8Array(34);
  const siView = new DataView(streamInfo.buffer);
  siView.setUint16(0, actualMinBlock, false);
  siView.setUint16(2, blockSizeMax, false);
  // min/max frame size = 0 (unknown)
  // Sample rate (20 bits), channels-1 (3 bits), bps-1 (5 bits = 15), totalSamples (36 bits)
  const sr = Math.max(1, Math.min(1048575, Math.round(sampleRate)));
  const chBits = (numChannels - 1) & 0x07;
  const bpsBits = 15; // 16-bit - 1

  streamInfo[10] = (sr >> 12) & 0xff;
  streamInfo[11] = (sr >> 4) & 0xff;
  streamInfo[12] = ((sr & 0x0f) << 4) | (chBits << 1) | ((bpsBits >> 4) & 0x01);
  streamInfo[13] = ((bpsBits & 0x0f) << 4) | Math.floor(totalSamples / 0x100000000);
  siView.setUint32(14, totalSamples >>> 0, false);
  // Bytes 18..33 = MD5 (zeros = unset)
  chunks.push(streamInfo);

  // Convert float channels to 16-bit integer arrays
  const intChannels = channels.slice(0, numChannels).map((ch) => {
    const out = new Int32Array(totalSamples);
    for (let i = 0; i < totalSamples; i++) {
      const s = Math.max(-1, Math.min(1, ch[i]));
      const v = s < 0 ? Math.round(s * 32768) : Math.round(s * 32767);
      out[i] = Math.max(-32768, Math.min(32767, v));
    }
    return out;
  });

  // 4. Encode frames
  let pos = 0;
  let frameIndex = 0;
  while (pos < totalSamples) {
    const blockLen = Math.min(blockSizeMax, totalSamples - pos);

    // Build frame header
    const headerBytes: number[] = [];
    headerBytes.push(0xff, 0xf8); // Sync + fixed blocksize (0)

    // Block size code = 7 (16-bit blocksize-1 follows), sample rate code = 13 (16-bit Hz follows) or 14 (tens of Hz)
    const useTensHz = sr > 65535;
    const srCode = useTensHz ? 14 : 13;
    headerBytes.push((7 << 4) | srCode);

    // Channel assignment (0=mono, 1=independent stereo), sample size code 4 (16-bit), reserved 0
    const chAssign = numChannels === 1 ? 0 : 1;
    headerBytes.push((chAssign << 4) | (4 << 1) | 0);

    // UTF-8 frame index
    headerBytes.push(...encodeUtf8Number(frameIndex));

    // 16-bit (blockLen - 1)
    const bMinus1 = blockLen - 1;
    headerBytes.push((bMinus1 >> 8) & 0xff, bMinus1 & 0xff);

    // 16-bit sample rate
    const srVal = useTensHz ? Math.round(sr / 10) : sr;
    headerBytes.push((srVal >> 8) & 0xff, srVal & 0xff);

    const hdrArr = new Uint8Array(headerBytes);
    const hdrCrc = crc8(hdrArr);

    // Encode subframes (note: subframes are byte-aligned per channel here because each subframe starts on bit 0 only if concatenated via BitWriter! Wait: in FLAC, subframes are bit-packed without padding between channels, so let's keep a single frame writer or pack bit-accurate!).
    // Actually let's pack subframes bit-accurately or note that Verbatim subframes are always a whole number of bytes EXCEPT their 8-bit header (which is also 1 byte!).
    // Wait: Fixed subframes with Rice coding are NOT guaranteed to end on a byte boundary!
    // To be 100% RFC 9639 compliant, subframes MUST be bit-concatenated when Rice-coded!
    // Let's handle multi-channel bit-packing cleanly by passing a shared BitWriter when compressionLevel > 0!
    const frameParts: Uint8Array[] = [hdrArr, new Uint8Array([hdrCrc])];

    const subframesWriter = new BitWriter();
    for (let c = 0; c < numChannels; c++) {
      const slice = intChannels[c].subarray(pos, pos + blockLen);
      encodeSubframeInto(subframesWriter, slice, compressionLevel);
    }
    const subframesBytes = subframesWriter.toUint8Array();
    frameParts.push(subframesBytes);

    // Concatenate frame without CRC-16 to compute CRC-16
    const frameBodyLen = hdrArr.length + 1 + subframesBytes.length;
    const frameBody = new Uint8Array(frameBodyLen);
    frameBody.set(hdrArr, 0);
    frameBody[hdrArr.length] = hdrCrc;
    frameBody.set(subframesBytes, hdrArr.length + 1);

    const fCrc = crc16(frameBody);
    chunks.push(frameBody);
    chunks.push(new Uint8Array([(fCrc >> 8) & 0xff, fCrc & 0xff]));

    pos += blockLen;
    frameIndex++;
  }

  const totalBytes = chunks.reduce((acc, c) => acc + c.length, 0);
  const out = new Uint8Array(totalBytes);
  let writeOffset = 0;
  for (const c of chunks) {
    out.set(c, writeOffset);
    writeOffset += c.length;
  }
  return out;
}

function encodeSubframeInto(
  target: BitWriter,
  samples: Int32Array,
  compressionLevel: 0 | 2 | 5
): void {
  const n = samples.length;

  // Constant check
  let allSame = true;
  const first = samples[0];
  for (let i = 1; i < n; i++) {
    if (samples[i] !== first) {
      allSame = false;
      break;
    }
  }
  if (allSame) {
    target.writeBits(0, 1);
    target.writeBits(0, 6);
    target.writeBits(0, 1);
    target.writeSignedBits(first, 16);
    return;
  }

  // Estimate verbatim bit length: 8 + 16 * n
  const verbatimBits = 8 + 16 * n;
  let bestOrder = -1;
  let bestK = 0;
  let bestResiduals: Int32Array | null = null;
  let bestBitEstimate = verbatimBits;

  if (compressionLevel > 0 && n >= 16) {
    const maxOrder = compressionLevel >= 5 ? 4 : 2;
    for (let order = 1; order <= maxOrder; order++) {
      if (n <= order) continue;
      const residuals = new Int32Array(n - order);
      let sumAbs = 0;
      let overflow = false;

      for (let i = order; i < n; i++) {
        let pred = 0;
        if (order === 1) pred = samples[i - 1];
        else if (order === 2) pred = 2 * samples[i - 1] - samples[i - 2];
        else if (order === 3) pred = 3 * samples[i - 1] - 3 * samples[i - 2] + samples[i - 3];
        else pred = 4 * samples[i - 1] - 6 * samples[i - 2] + 4 * samples[i - 3] - samples[i - 4];

        const r = samples[i] - pred;
        residuals[i - order] = r;
        const absR = Math.abs(r);
        if (absR > 1048576) {
          overflow = true;
          break;
        }
        sumAbs += absR;
      }

      if (overflow) continue;
      const meanAbs = sumAbs / residuals.length;
      let k = 0;
      while (k < 14 && (1 << k) < meanAbs * 0.69) k++;

      let totalBits = 8 + order * 16 + 10; // header + warmup + rice header
      let tooBig = false;
      for (let i = 0; i < residuals.length; i++) {
        const f = residuals[i] >= 0 ? residuals[i] * 2 : -residuals[i] * 2 - 1;
        const q = f >>> k;
        if (q > 256) {
          tooBig = true;
          break;
        }
        totalBits += q + 1 + k;
      }

      if (!tooBig && totalBits < bestBitEstimate) {
        bestBitEstimate = totalBits;
        bestOrder = order;
        bestK = k;
        bestResiduals = residuals;
      }
    }
  }

  if (bestOrder > 0 && bestResiduals) {
    target.writeBits(0, 1);
    target.writeBits(8 + bestOrder, 6);
    target.writeBits(0, 1);
    for (let i = 0; i < bestOrder; i++) {
      target.writeSignedBits(samples[i], 16);
    }
    target.writeBits(0, 2); // 4-bit Rice parameter method
    target.writeBits(0, 4); // partition order 0
    target.writeBits(bestK, 4);
    for (let i = 0; i < bestResiduals.length; i++) {
      target.writeRice(bestResiduals[i], bestK);
    }
  } else {
    target.writeBits(0, 1);
    target.writeBits(1, 6); // VERBATIM
    target.writeBits(0, 1);
    for (let i = 0; i < n; i++) {
      target.writeSignedBits(samples[i], 16);
    }
  }
}
