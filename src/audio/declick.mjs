const ORDER = 16;
const BLOCK = 2048;
export const MIN_SAMPLES = 4000;
export const DEFAULTS = Object.freeze({ tolerance: 1000, maxMs: 5, passes: 3 });

function levinson(r, p) {
  const a = new Float64Array(p + 1); a[0] = 1;
  const tmp = new Float64Array(p + 1);
  let err = r[0];
  if (!(err > 0)) return a;
  for (let i = 1; i <= p; i++) {
    let acc = r[i];
    for (let j = 1; j < i; j++) acc += a[j] * r[i - j];
    const k = -acc / err;
    tmp.set(a);
    for (let j = 1; j < i; j++) a[j] = tmp[j] + k * tmp[i - j];
    a[i] = k;
    err *= 1 - k * k;
    if (!(err > 1e-12 * r[0])) break;
  }
  return a;
}

function autocorrelate(x, start, end, p, r) {
  const n = end - start;
  if (n <= p) return;
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = x[start + i] * (0.5 - 0.5 * Math.cos(2 * Math.PI * (i + 0.5) / n));
  for (let k = 0; k <= p; k++) {
    let s = 0;
    for (let i = 0; i + k < n; i++) s += w[i] * w[i + k];
    r[k] += s;
  }
}

function lpcFromSegments(x, segments, p) {
  const r = new Float64Array(p + 1);
  for (const [a, b] of segments) autocorrelate(x, a, b, p, r);
  r[0] = r[0] * 1.0001 + 1e-12;
  return levinson(r, p);
}

function median(values) {
  const sorted = Float64Array.from(values).sort();
  return sorted[sorted.length >> 1] || 0;
}

function rms(x, a, b) {
  let s = 0;
  for (let i = a; i < b; i++) s += x[i] * x[i];
  return Math.sqrt(s / Math.max(1, b - a));
}

export function detectClicks(x, rate, options = {}) {
  const tolerance = options.tolerance ?? DEFAULTS.tolerance;
  const maxMs = options.maxMs ?? DEFAULTS.maxMs;
  const p = ORDER, length = x.length;
  if (length < MIN_SAMPLES) return [];
  const factor = Math.max(3, tolerance / 100);
  const maxLength = Math.max(2, Math.round(rate * maxMs / 1000)) + p;
  const guard = Math.max(16, Math.round(rate * 0.003));
  const flags = new Uint8Array(length);
  for (let start = 0; start < length; start += BLOCK) {
    const end = Math.min(length, start + BLOCK);
    const a0 = Math.max(0, start - BLOCK / 2), a1 = Math.min(length, end + BLOCK / 2);
    if (a1 - a0 < p * 4) continue;
    const a = lpcFromSegments(x, [[a0, a1]], p);
    const residual = new Float64Array(end - start);
    for (let n = start; n < end; n++) {
      if (n < p) continue;
      let acc = 0;
      for (let j = 0; j <= p; j++) acc += a[j] * x[n - j];
      residual[n - start] = Math.abs(acc);
    }
    const sigma = Math.max(1.4826 * median(residual), 1e-4);
    const threshold = factor * sigma;
    for (let i = 0; i < residual.length; i++) if (residual[i] > threshold) flags[start + i] = 1;
  }
  const regions = [];
  let n = 0;
  while (n < length) {
    if (!flags[n]) { n++; continue; }
    let first = n, last = n, gap = 0;
    while (n < length && gap <= p + 2) {
      if (flags[n]) { last = n; gap = 0; } else gap++;
      n++;
    }
    const spread = Math.round((last - first) * 0.1);
    const begin = Math.max(p, first - 1), finish = Math.min(length - 1, last + 2 + spread);
    if (finish < begin) continue;
    if (finish - begin + 1 > maxLength) continue;
    if (begin - guard >= 0 && finish + 1 + guard <= length) {
      const before = rms(x, begin - guard, begin), after = rms(x, finish + 1, finish + 1 + guard);
      const ratio = (before + 1e-6) / (after + 1e-6);
      if (ratio > 6 || ratio < 1 / 6) continue;
    }
    regions.push({ start: begin, end: finish });
  }
  return regions;
}

function solve(matrix, rhs, m) {
  let trace = 0;
  for (let i = 0; i < m; i++) trace += matrix[i * m + i];
  const ridge = 1e-9 * trace / Math.max(1, m) + 1e-15;
  for (let i = 0; i < m; i++) matrix[i * m + i] += ridge;
  for (let j = 0; j < m; j++) {
    let d = matrix[j * m + j];
    for (let k = 0; k < j; k++) d -= matrix[j * m + k] * matrix[j * m + k];
    if (!(d > 0)) return false;
    d = Math.sqrt(d);
    matrix[j * m + j] = d;
    for (let i = j + 1; i < m; i++) {
      let s = matrix[i * m + j];
      for (let k = 0; k < j; k++) s -= matrix[i * m + k] * matrix[j * m + k];
      matrix[i * m + j] = s / d;
    }
  }
  for (let i = 0; i < m; i++) {
    let s = rhs[i];
    for (let k = 0; k < i; k++) s -= matrix[i * m + k] * rhs[k];
    rhs[i] = s / matrix[i * m + i];
  }
  for (let i = m - 1; i >= 0; i--) {
    let s = rhs[i];
    for (let k = i + 1; k < m; k++) s -= matrix[k * m + i] * rhs[k];
    rhs[i] = s / matrix[i * m + i];
  }
  return true;
}

function linearFill(x, start, end) {
  const left = start > 0 ? x[start - 1] : 0, right = end + 1 < x.length ? x[end + 1] : left;
  const m = end - start + 1;
  for (let i = 0; i < m; i++) x[start + i] = left + (right - left) * (i + 1) / (m + 1);
}

export function repairRegion(x, start, end) {
  const m = end - start + 1, context = 2048, p = m > 120 ? 64 : m > 40 ? 48 : m > 12 ? 32 : ORDER;
  if (m < 1) return;
  if (start < p + 8 || end + 1 + p + 8 > x.length) { linearFill(x, start, end); return; }
  const segments = [];
  const l0 = Math.max(0, start - context), r1 = Math.min(x.length, end + 1 + context);
  if (start - l0 > p * 2) segments.push([l0, start]);
  if (r1 - (end + 1) > p * 2) segments.push([end + 1, r1]);
  if (!segments.length) { linearFill(x, start, end); return; }
  const a = lpcFromSegments(x, segments, p);
  const matrix = new Float64Array(m * m), rhs = new Float64Array(m);
  const cols = new Int32Array(p + 1), coef = new Float64Array(p + 1);
  const last = Math.min(x.length - 1, end + p);
  for (let n = start; n <= last; n++) {
    let count = 0, constant = 0;
    for (let j = 0; j <= p; j++) {
      const index = n - j;
      if (index < 0) continue;
      if (index >= start && index <= end) { cols[count] = index - start; coef[count] = a[j]; count++; }
      else constant += a[j] * x[index];
    }
    for (let u = 0; u < count; u++) {
      rhs[cols[u]] -= coef[u] * constant;
      for (let v = 0; v < count; v++) matrix[cols[u] * m + cols[v]] += coef[u] * coef[v];
    }
  }
  if (!solve(matrix, rhs, m)) { linearFill(x, start, end); return; }
  for (let i = 0; i < m; i++) {
    const value = rhs[i];
    x[start + i] = Number.isFinite(value) ? Math.max(-1, Math.min(1, value)) : 0;
  }
}

export function removeClicks(channels, rate, options = {}) {
  const out = [], found = [];
  channels.forEach((channel, index) => {
    const work = Float64Array.from(channel);
    const passes = options.passes ?? DEFAULTS.passes;
    for (let pass = 0; pass < passes; pass++) {
      const regions = detectClicks(work, rate, options);
      if (!regions.length) break;
      for (const region of regions) { repairRegion(work, region.start, region.end); found.push({ channel: index, pass, ...region }); }
    }
    out.push(Float32Array.from(work));
  });
  return { channels: out, clicks: found };
}
