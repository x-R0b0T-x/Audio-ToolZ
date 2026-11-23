import './effectInteractions.css';
import { installControlWheel } from './controlWheel';
export function anchoredControlPosition(width: number, height: number, canvas: { right: number; bottom: number } | null): { right: number; bottom: number } {
  if (!canvas) return { right: 8, bottom: 28 };
  return { right: Math.max(4, width - canvas.right + 8), bottom: Math.max(4, height - canvas.bottom + 24 + 2) };
}
export function installMenuHover(root: HTMLElement): () => void {
  const removeWheel = installControlWheel(root);
  const hover = (event: PointerEvent) => {
    if (event.pointerType === 'touch' || !(event.target instanceof Element)) return;
    const target = event.target.closest<HTMLButtonElement>('header nav > div > button[aria-expanded]');
    if (!target || !root.contains(target) || target.disabled || target.getAttribute('aria-expanded') === 'true') return;
    const nav = target.closest('nav');
    if (nav?.querySelector('button[aria-expanded="true"]')) target.click();
  };
  root.addEventListener('pointerover', hover);
  return () => { root.removeEventListener('pointerover', hover); removeWheel(); };
}
