// Shared gestures for existing native fields and accessible custom sliders.
// Values not registered here are never guessed as zero. Text/file fields are excluded.
export function nextControlValue(value: number, direction: number, min: number, max: number, step: number): number {
  return Number(Math.max(min, Math.min(max, value + direction * step)).toFixed(8));
}
export function writeControlValue(field: HTMLInputElement | HTMLSelectElement, value: string | boolean): void {
  if (field.disabled) return;
  if (field instanceof HTMLInputElement && field.type === 'checkbox') {
    if (field.checked !== Boolean(value)) field.click();
    return;
  }
  const proto = field instanceof HTMLSelectElement ? HTMLSelectElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value')?.set?.call(field, String(value));
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.dispatchEvent(new Event('change', { bubbles: true }));
}
function text(element: Element): string { return (element.textContent ?? '').replace(/\s+/g, ' ').trim(); }
function nativeField(target: Element, boundary: Element): HTMLInputElement | HTMLSelectElement | null {
  const direct = target.closest('input, select');
  if (direct instanceof HTMLInputElement || direct instanceof HTMLSelectElement) return direct;
  let node: Element | null = target;
  while (node && node !== boundary) {
    if (node.matches('button, [role="slider"], canvas')) return null;
    const fields = node.querySelectorAll('input:not([type="file"]):not([type="text"]), select');
    if (fields.length === 1) return fields[0] as HTMLInputElement | HTMLSelectElement;
    if (fields.length > 1) return null;
    node = node.parentElement;
  }
  return null;
}
export function defaultValue(field: HTMLInputElement | HTMLSelectElement): string | boolean | null {
  if (field.hasAttribute('data-zonyx-default')) {
    const value = field.getAttribute('data-zonyx-default')!;
    return field instanceof HTMLInputElement && field.type === 'checkbox' ? value === 'true' : value;
  }
  if (field instanceof HTMLInputElement && ['text','file','hidden'].includes(field.type)) return null;
  if (field.id === 'export-ogg-q') return '6';
  if (field.id === 'join-cue-ext') return 'wav';
  if (field.id === 'settings-audio-input-select' || field.id === 'settings-audio-output-select') {
    const select = field as HTMLSelectElement;
    return Array.from(select.options).find((o) => o.value === 'default')?.value ?? select.options[0]?.value ?? '';
  }
  const settings = field.closest('[aria-labelledby="settings-modal-title"]');
  if (settings && field instanceof HTMLInputElement && field.type === 'checkbox') return false;
  const exporting = field.closest('[aria-labelledby="export-modal-title"]');
  if (exporting && field instanceof HTMLInputElement && field.type === 'checkbox') return false;
  const control = field.closest('aside[aria-label="Fenêtre de contrôle flottante"]');
  if (control && field instanceof HTMLInputElement && field.type === 'range') {
    const ranges = Array.from(control.querySelectorAll('input[type="range"]'));
    const index = ranges.indexOf(field);
    if (index >= 0 && index < 3) return ['0', '0', '1'][index];
  }
  if (control && field instanceof HTMLSelectElement && Array.from(field.options).some((o) => o.value === 'oscilloscope')) return 'oscilloscope';
  const dialog = field.closest('[role="dialog"]');
  if (!dialog && field instanceof HTMLInputElement && field.type === 'checkbox') {
    const description = [field.getAttribute('aria-label'), field.closest('label')?.textContent].join(' ');
    if (/canal|gauche|droite/i.test(description) || /^\s*[GD]\s*$/.test(description)) return true;
  }
  if (dialog && text(dialog).includes('Traitement par lots (Batch v1.5)') && field instanceof HTMLSelectElement) {
    const selects = Array.from(dialog.querySelectorAll('select'));
    return selects.indexOf(field) === 0 ? field.options[0]?.value ?? '' : 'flac';
  }
  return null;
}
function resetChoice(target: Element): boolean {
  const button = target.closest('button');
  if (!(button instanceof HTMLButtonElement) || button.disabled) return false;
  const exporting = button.closest('[aria-labelledby="export-modal-title"]');
  if (exporting) {
    const label = text(button);
    let defaultLabel: string | null = null;
    if (/^(WAV|MP3|FLAC|OGG)/.test(label)) defaultLabel = 'WAV';
    else if (/^(16-bit PCM|24-bit PCM|32-bit Float)$/.test(label)) defaultLabel = '16-bit PCM';
    else if (/^(128|192|256|320) kbps$/.test(label)) defaultLabel = '192 kbps';
    else if (/^(Rapide \(0\)|Standard \(2\)|Maximale \(5\))$/.test(label)) defaultLabel = 'Standard (2)';
    if (defaultLabel) {
      const wanted = Array.from(button.parentElement?.querySelectorAll('button') ?? [])
        .find((b) => defaultLabel === 'WAV' ? text(b).startsWith('WAV') : text(b) === defaultLabel);
      if (wanted && !wanted.disabled) { wanted.click(); return true; }
    }
  }
  const settings = button.closest('[aria-labelledby="settings-modal-title"]');
  if (settings && button.parentElement?.className.includes('divide-y')) {
    const select = settings.querySelector<HTMLSelectElement>('#settings-audio-input-select');
    if (select) { writeControlValue(select, defaultValue(select) ?? ''); return true; }
  }
  const pressed = button.getAttribute('aria-pressed');
  const description = [button.getAttribute('aria-label'), button.title, text(button)].join(' ');
  if (pressed !== null) {
    let wanted: boolean | null = null;
    if (/fenêtre de contrôle/i.test(description)) wanted = true;
    else if (/BPM|aimant|magnét|snap/i.test(description)) wanted = false;
    else if (/canal.*(gauche|droite|\bG\b|\bD\b)/i.test(description)) wanted = true;
    if (wanted !== null) { if ((pressed === 'true') !== wanted) button.click(); return true; }
  }
  const control = button.closest('aside[aria-label="Fenêtre de contrôle flottante"]');
  if (control) {
    const group = button.parentElement;
    const options = Array.from(group?.querySelectorAll('button') ?? []);
    // Only a visual-mode group containing the default oscilloscope is eligible.
    const isOsc = (b: Element) => /oscillo/i.test([text(b),b.getAttribute('title'),b.getAttribute('aria-label')].join(' '));
    const osc = options.find(isOsc);
    const hasOtherMode = options.some((b) => /spectr|waveform|forme d.onde/i.test([text(b),b.title,b.getAttribute('aria-label')].join(' ')));
    if (osc && hasOtherMode && !osc.disabled) { osc.click(); return true; }
  }
  return false;
}
export function installControlGestures(root: HTMLElement): () => void {
  const accumulated = new WeakMap<Element, number>();
  const wheel = (event: WheelEvent) => {
    if (!(event.target instanceof Element) || event.ctrlKey || !event.deltaY) return;
    const stereo = event.target.closest('.zonyx-rv-stereo');
    if (stereo && event.target.closest('.zonyx-value-entry input')) return;
    const field = event.target.closest('input[type="range"], input[type="number"], [role="slider"]') ?? stereo?.querySelector('[role="slider"]');
    if (!(field instanceof HTMLElement) || !root.contains(field) || field.matches(':disabled, [aria-disabled="true"]')) return;
    if (field instanceof HTMLInputElement && field.readOnly) return;
    event.preventDefault(); event.stopPropagation();
    const delta = event.deltaMode === 0 ? event.deltaY : event.deltaY * 40;
    const old = accumulated.get(field) ?? 0;
    const sum = (Math.sign(old) === Math.sign(delta) ? old : 0) + delta;
    if (Math.abs(sum) < 40) { accumulated.set(field, sum); return; }
    accumulated.set(field, 0);
    const direction = sum < 0 ? 1 : -1;
    if (field instanceof HTMLInputElement) {
      const step = field.step && field.step !== 'any' ? Number(field.step) : 1;
      const value = Number(field.value);
      if (!Number.isFinite(value) || !Number.isFinite(step) || step <= 0) return;
      writeControlValue(field, String(nextControlValue(value, direction,
        field.min === '' ? -Number.MAX_VALUE : Number(field.min),
        field.max === '' ? Number.MAX_VALUE : Number(field.max), step)));
    } else {
      field.dispatchEvent(new KeyboardEvent('keydown', { key: direction > 0 ? 'ArrowUp' : 'ArrowDown', bubbles: true, cancelable: true }));
    }
  };
  const doubleClick = (event: MouseEvent) => {
    if (!(event.target instanceof Element)) return;
    // Effect controls already own explicit React reset callbacks.
    if (event.target.closest('[aria-labelledby="effect-modal-title"]')) return;
    const field = nativeField(event.target, root);
    if (field) {
      const value = defaultValue(field);
      if (value !== null) {
        event.preventDefault(); event.stopPropagation();
        writeControlValue(field, value);
      }
      return;
    }
    if (resetChoice(event.target)) { event.preventDefault(); event.stopPropagation(); }
  };
  root.addEventListener('wheel', wheel, { passive: false, capture: true });
  root.addEventListener('dblclick', doubleClick, true);
  return () => {
    root.removeEventListener('wheel', wheel, true);
    root.removeEventListener('dblclick', doubleClick, true);
  };
}
