export function wheelValue(value: number, min: number, max: number, step: number, direction: number): number {
  if (![value, min, max, step, direction].every(Number.isFinite) || max < min || step <= 0) return value;
  if (direction === 0) return value;
  return Math.max(min, Math.min(max, Number((value + Math.sign(direction) * step).toFixed(10))));
}
export function installControlWheel(root: HTMLElement): () => void {
  const wheel = (event: WheelEvent) => {
    if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.altKey || event.deltaY === 0 || !(event.target instanceof Element)) return;
    if(event.target.closest('[data-eq-band]'))return;
    const control = event.target.closest<HTMLElement>('input[type="range"], input[type="number"], [role="slider"]');
    if (!control || !root.contains(control) || control.matches(':disabled') || control.closest('fieldset:disabled, [inert], [aria-disabled="true"]')) return;
    const view = control.ownerDocument.defaultView;
    if (!view) return;
    if (control instanceof HTMLInputElement) {
      if (control.readOnly) return;
      const value = control.valueAsNumber;
      if (!Number.isFinite(value)) return;
      const min = control.min === '' ? (control.type === 'range' ? 0 : -Number.MAX_SAFE_INTEGER) : Number(control.min);
      const max = control.max === '' ? (control.type === 'range' ? 100 : Number.MAX_SAFE_INTEGER) : Number(control.max);
      // Leave unconstrained "any" fields to their own handlers.
      if (control.step === 'any') return;
      const step = control.step === '' ? 1 : Number(control.step);
      if (!Number.isFinite(step) || step <= 0) return;
      event.preventDefault();
      const next = wheelValue(value, min, max, step, event.deltaY < 0 ? 1 : -1);
      if (next === value) return;
      // Use the native setter so React sees the value change in the input event.
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')?.set;
      if (!setter) return;
      setter.call(control, String(next));
      control.dispatchEvent(new Event('input', { bubbles: true }));
      control.dispatchEvent(new Event('change', { bubbles: true }));
      return;
    }
    // Reuse each custom knob's keyboard path: step, bounds and callbacks stay identical.
    event.preventDefault();
    const key = event.deltaY < 0 ? 'ArrowUp' : 'ArrowDown';
    control.dispatchEvent(new KeyboardEvent('keydown', { key, code: key, bubbles: true, cancelable: true }));
  };
  root.addEventListener('wheel', wheel, { passive: false });
  return () => root.removeEventListener('wheel', wheel);
}
