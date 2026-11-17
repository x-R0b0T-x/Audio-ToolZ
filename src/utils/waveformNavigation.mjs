export function dragFrame(start, end, total, left, width, x, deltaMs) {
  const length = Math.min(total, Math.max(0, end - start));
  const zone = Math.min(36, width / 4);
  const right = left + width;
  const clamp = (n, max) => Math.max(0, Math.min(max, n));
  const speed = zone <= 0 ? 0 : x < left + zone ? -clamp((left + zone - x) / zone, 1)
    : x > right - zone ? clamp((x - right + zone) / zone, 1) : 0;
  const viewStart = clamp(start + speed * length * clamp(deltaMs, 64) / 1000, total - length);
  const viewEnd = Math.min(total, viewStart + length);
  const ratio = clamp((x - left) / Math.max(1, width), 1);
  return { viewStart, viewEnd, sample: clamp(Math.round(viewStart + ratio * length), total) };
}
