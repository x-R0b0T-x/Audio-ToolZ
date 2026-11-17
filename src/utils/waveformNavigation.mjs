export function dragFrame(start, end, total, left, width, x, deltaMs) {
  const length = Math.max(1, end - start);
  const zone = Math.min(36, width / 4);
  const right = left + width;
  const direction = x < left + zone ? -Math.min(1, (left + zone - x) / zone)
    : x > right - zone ? Math.min(1, (x - right + zone) / zone) : 0;
  const nextLength = Math.min(total, length * Math.exp(Math.abs(direction) * 1.4 * Math.min(64, Math.max(0, deltaMs)) / 1000));
  const viewStart = direction < 0 ? Math.max(0, end - nextLength)
    : Math.max(0, Math.min(start, total - nextLength));
  const viewEnd = Math.min(total, viewStart + nextLength);
  const ratio = Math.max(0, Math.min(1, (x - left) / width));
  return { viewStart, viewEnd, sample: Math.max(0, Math.min(total, Math.round(viewStart + ratio * (viewEnd - viewStart)))) };
}
