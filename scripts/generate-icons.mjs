import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const rootDir = path.resolve(import.meta.dirname, '..');
const publicDir = path.join(rootDir, 'public');
fs.mkdirSync(publicDir, { recursive: true });

function distToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len2 = dx * dx + dy * dy;
  if (len2 === 0) return Math.hypot(px - x1, py - y1);
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2));
  return Math.hypot(px - (x1 + t * dx), py - (y1 + t * dy));
}

function blendOver(dst, idx, r, g, b, a) {
  if (a <= 0) return;
  const srcA = Math.max(0, Math.min(1, a));
  const dstA = dst[idx + 3] / 255;
  const outA = srcA + dstA * (1 - srcA);
  if (outA <= 0) return;
  dst[idx] = Math.round((r * srcA + dst[idx] * dstA * (1 - srcA)) / outA);
  dst[idx + 1] = Math.round((g * srcA + dst[idx + 1] * dstA * (1 - srcA)) / outA);
  dst[idx + 2] = Math.round((b * srcA + dst[idx + 2] * dstA * (1 - srcA)) / outA);
  dst[idx + 3] = Math.round(outA * 255);
}

function roundedRectSignedDist(px, py, size, margin, radius) {
  const half = size / 2;
  const boxHalf = half - margin - radius;
  const qx = Math.abs(px - half) - boxHalf;
  const qy = Math.abs(py - half) - boxHalf;
  const out = Math.hypot(Math.max(qx, 0), Math.max(qy, 0));
  const inside = Math.min(Math.max(qx, qy), 0);
  return out + inside - radius;
}

function renderKickIconRgba(size) {
  const buf = Buffer.alloc(size * size * 4);
  const s = size / 64;
  const cx = 32 * s;
  const cy = 32 * s;

  const kickPts = [
    [18, 32],
    [24.5, 32],
    [28.5, 20.5],
    [34, 43.5],
    [38, 27.5],
    [41, 32],
    [46, 32],
  ].map(([x, y]) => [x * s, y * s]);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const idx = (y * size + x) * 4;

      // 1. Squircle container (#232632 fill, #3b4054 subtle border)
      const sqDist = roundedRectSignedDist(px, py, size, 2 * s, 13 * s);
      const fillAlpha = Math.max(0, Math.min(1, 0.5 - sqDist));
      if (fillAlpha > 0) {
        blendOver(buf, idx, 35, 38, 50, fillAlpha);
        const borderDist = Math.abs(sqDist + 0.7 * s);
        const borderAlpha = Math.max(0, Math.min(1, 0.9 * s - borderDist)) * fillAlpha;
        blendOver(buf, idx, 62, 67, 88, borderAlpha);
      }

      if (fillAlpha <= 0.01) continue;

      const rDist = Math.hypot(px - cx, py - cy);

      // 2. Subtle outer concentric orbital ring
      const outerRingDist = Math.abs(rDist - 24 * s);
      const outerAlpha = Math.max(0, Math.min(1, 0.75 * s - outerRingDist));
      blendOver(buf, idx, 248, 248, 242, outerAlpha * 0.14);

      // 3. Top & bottom discreet white kick beat dots (#f8f8f2)
      const topDotDist = Math.hypot(px - cx, py - 8 * s) - 2.6 * s;
      const botDotDist = Math.hypot(px - cx, py - 56 * s) - 2.6 * s;
      const dotAlpha = Math.max(
        Math.max(0, Math.min(1, 0.65 - topDotDist)),
        Math.max(0, Math.min(1, 0.65 - botDotDist))
      );
      blendOver(buf, idx, 248, 248, 242, dotAlpha);

      // 4. Inner lavender ring (#bd93f9)
      const ringHalfWidth = 2.15 * s;
      const lavDist = Math.abs(rDist - 18.2 * s) - ringHalfWidth;
      const lavAlpha = Math.max(0, Math.min(1, 0.65 - lavDist));
      blendOver(buf, idx, 189, 147, 249, lavAlpha);

      // 5. Crisp kick green impulse waveform (#45f882)
      let minSeg = 9999;
      for (let i = 0; i < kickPts.length - 1; i++) {
        const d = distToSegment(
          px,
          py,
          kickPts[i][0],
          kickPts[i][1],
          kickPts[i + 1][0],
          kickPts[i + 1][1]
        );
        if (d < minSeg) minSeg = d;
      }
      const waveAlpha = Math.max(0, Math.min(1, 0.65 - (minSeg - 1.95 * s)));
      blendOver(buf, idx, 69, 248, 130, waveAlpha);
    }
  }
  return buf;
}

// Minimal pure-Node PNG encoder
const crcTable = new Uint32Array(256);
for (let i = 0; i < 256; i++) {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[i] = c >>> 0;
}
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function pngChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuf = Buffer.from(type, 'ascii');
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
  return Buffer.concat([len, typeBuf, data, crcBuf]);
}
function encodePng(size, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // RGBA
  const raw = Buffer.alloc(size * (1 + size * 4));
  for (let y = 0; y < size; y++) {
    const rowOff = y * (1 + size * 4);
    raw[rowOff] = 0; // filter None
    rgba.copy(raw, rowOff + 1, y * size * 4, (y + 1) * size * 4);
  }
  const idat = zlib.deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

function buildIco(pngEntries) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type 1 = ICO
  header.writeUInt16LE(pngEntries.length, 4);

  const dirEntries = [];
  let offset = 6 + pngEntries.length * 16;
  for (const { size, png } of pngEntries) {
    const entry = Buffer.alloc(16);
    entry[0] = size >= 256 ? 0 : size;
    entry[1] = size >= 256 ? 0 : size;
    entry[2] = 0;
    entry[3] = 0;
    entry.writeUInt16LE(1, 4); // planes
    entry.writeUInt16LE(32, 6); // bpp
    entry.writeUInt32LE(png.length, 8);
    entry.writeUInt32LE(offset, 12);
    dirEntries.push(entry);
    offset += png.length;
  }

  return Buffer.concat([header, ...dirEntries, ...pngEntries.map((e) => e.png)]);
}

const sizes = [16, 32, 48, 256];
const pngEntries = sizes.map((size) => ({
  size,
  png: encodePng(size, renderKickIconRgba(size)),
}));

const png256 = pngEntries.find((e) => e.size === 256).png;
const icoBuf = buildIco(pngEntries);

fs.writeFileSync(path.join(publicDir, 'icon.png'), png256);
fs.writeFileSync(path.join(publicDir, 'icon.ico'), icoBuf);
console.log(`Generated public/icon.png (${png256.length} B) and public/icon.ico (${icoBuf.length} B)`);
