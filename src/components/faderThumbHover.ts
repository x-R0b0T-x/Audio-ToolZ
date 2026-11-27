import './faderRings.css';
const HOVER = 'data-thumb-hover';
const GRAB = 'data-thumb-grab';
let hovered: HTMLInputElement | null = null;
let grabbed: HTMLInputElement | null = null;
const isFader = (n: EventTarget | null): n is HTMLInputElement => n instanceof HTMLInputElement && n.type === 'range' && (n.classList.contains('studio-slider') || !!n.closest('.zonyx-advanced'));
function onThumb(input: HTMLInputElement, e: PointerEvent) {
  const r = input.getBoundingClientRect(), min = Number(input.min || 0), max = Number(input.max || 100);
  const f = max > min ? Math.max(0, Math.min(1, (Number(input.value) - min) / (max - min))) : 0;
  if (r.height > r.width) {
    const half = 9, y = r.top + half + (r.height - half * 2) * (1 - f);
    return Math.abs(e.clientY - y) <= half + 2 && Math.abs(e.clientX - (r.left + r.width / 2)) <= half + 2;
  }
  const half = input.classList.contains('studio-slider') ? 11 : 13, x = r.left + half + (r.width - half * 2) * f;
  return Math.abs(e.clientX - x) <= half + 2 && Math.abs(e.clientY - (r.top + r.height / 2)) <= half + 2;
}
if (typeof document !== 'undefined') {
  document.addEventListener('pointermove', e => {
    const t = isFader(e.target) ? e.target : null;
    const next = t && !t.disabled && onThumb(t, e) ? t : null;
    if (next !== hovered) { hovered?.removeAttribute(HOVER); next?.setAttribute(HOVER, 'true'); hovered = next; }
  }, true);
  document.addEventListener('pointerdown', e => {
    if (e.button === 0 && isFader(e.target) && !e.target.disabled) { grabbed = e.target; grabbed.setAttribute(GRAB, 'true'); }
  }, true);
  const release = () => { grabbed?.removeAttribute(GRAB); grabbed = null; };
  document.addEventListener('pointerup', release, true);
  document.addEventListener('pointercancel', release, true);
  window.addEventListener('blur', release);
}
export {};
