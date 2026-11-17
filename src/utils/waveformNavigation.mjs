export function dragFrame(start, end, total, left, width, x, deltaMs) {
  const length = Math.max(1, end - start);
  const zone = Math.min(36, width / 4);
  const right = left + width;
  const speed = x < left + zone ? -Math.min(1, (left + zone - x) / zone)
    : x > right - zone ? Math.min(1, (x - right + zone) / zone) : 0;
  const shift = speed * length * Math.min(64, Math.max(0, deltaMs)) / 1000;
  const viewStart = Math.max(0, Math.min(Math.max(0, total - length), start + shift));
  const ratio = Math.max(0, Math.min(1, (x - left) / width));
  return { viewStart, viewEnd: viewStart + length, sample: Math.max(0, Math.min(total, Math.round(viewStart + ratio * length))) };
}
