import React, { useEffect, useRef, useState } from 'react';
import { constrainPanel, type PanelBox } from './effectUiMath';
import './effectPanel.css';
type Props = React.ComponentPropsWithoutRef<'section'> & { minWidth?: number; minHeight?: number };
export function EffectPanel({ children, minWidth = 520, minHeight = 480, style, ...props }: Props) {
  const advanced = !props.className?.includes('atz-legacy');
  const mw = Math.max(minWidth, advanced ? 1000 : 520), mh = Math.max(minHeight, advanced ? 620 : 480);
  const ref = useRef<HTMLElement>(null);
  const gesture = useRef<{ mode: 'move' | 'resize'; x: number; y: number; box: PanelBox } | null>(null);
  const [box, setBox] = useState<PanelBox | null>(null);
  const constrain = (b: PanelBox) => constrainPanel(b, window.innerWidth, window.innerHeight, mw, mh);
  const measure = (): PanelBox => { const r = ref.current!.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height }; };
  useEffect(() => {
    const resize = () => setBox(old => old ? constrainPanel(old, window.innerWidth, window.innerHeight, mw, mh) : null);
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, [mw, mh]);
  const begin = (e: React.PointerEvent<HTMLElement>, mode: 'move' | 'resize') => {
    if (e.button !== 0) return;
    e.preventDefault(); e.stopPropagation(); e.currentTarget.setPointerCapture(e.pointerId);
    const b = constrain(measure()); gesture.current = { mode, x: e.clientX, y: e.clientY, box: b }; setBox(b);
  };
  const move = (e: React.PointerEvent<HTMLElement>) => {
    const d = gesture.current; if (!d) return;
    const x = e.clientX - d.x, y = e.clientY - d.y;
    setBox(constrain(d.mode === 'move' ? { ...d.box, left: d.box.left + x, top: d.box.top + y } : { ...d.box, width: d.box.width + x, height: d.box.height + y }));
  };
  const end = () => { gesture.current = null; };
  return <section {...props} ref={ref} style={{ ...style, minWidth: `min(${mw}px, calc(100vw - 32px))`, minHeight: `min(${mh}px, calc(100vh - 32px))`, ...(box ? { position: 'fixed', ...box, maxWidth: 'none', maxHeight: 'none' } : {}) }}
    onPointerDown={e => {
      const t = e.target as Element;
      if (t.closest('header')?.parentElement === ref.current && !t.closest('button,input,select,textarea,a,[role="slider"]')) begin(e, 'move');
    }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={end}>
    {children}
    <button type="button" className="atz-resize-grip" aria-label="Redimensionner la fenêtre d’effet" title="Glisser pour redimensionner · Double-clic : taille initiale · Flèches : ajuster"
      onDoubleClick={() => { end(); setBox(null); }} onPointerDown={e => begin(e, 'resize')}
      onKeyDown={e => {
        if (e.key === 'Home') { e.preventDefault(); setBox(null); return; }
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault(); const b = box ?? measure(), step = e.shiftKey ? 2 : 12;
        setBox(constrain({ ...b, width: b.width + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), height: b.height + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0) }));
      }}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M18 2V18H2Z" fill="#39ff14"/><path d="m9 16 7-7m-3 7 3-3" stroke="#173619"/></svg></button>
  </section>;
}
