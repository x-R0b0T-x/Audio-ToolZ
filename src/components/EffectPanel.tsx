import React, { useEffect, useRef, useState } from 'react';
import { constrainPanel, type PanelBox } from './effectUiMath';
import './effectPanel.css';
type Props = React.ComponentPropsWithoutRef<'section'> & { minWidth?: number; minHeight?: number };
export function EffectPanel({ children, minWidth = 420, minHeight = 260, style, ...props }: Props) {
  const ref = useRef<HTMLElement>(null), drag = useRef<{ x: number; y: number; box: PanelBox } | null>(null);
  const [box, setBox] = useState<PanelBox | null>(null);
  const constrain = (b: PanelBox) => constrainPanel(b, window.innerWidth, window.innerHeight, minWidth, minHeight);
  useEffect(() => {
    const resize = () => setBox(old => old ? constrainPanel(old, window.innerWidth, window.innerHeight, minWidth, minHeight) : null);
    window.addEventListener('resize', resize); return () => window.removeEventListener('resize', resize);
  }, [minWidth, minHeight]);
  const initialBox = () => {
    const r = ref.current!.getBoundingClientRect(); return { left: r.left, top: r.top, width: r.width, height: r.height };
  };
  return <section {...props} ref={ref} style={{ ...style, ...(box ? { position: 'fixed', ...box, maxWidth: 'none', maxHeight: 'none' } : {}) }}>
    {children}
    <button type="button" className="atz-resize-grip" aria-label="Redimensionner la fenêtre d’effet" title="Glisser pour redimensionner · Double-clic : taille initiale · Flèches : ajuster"
      onDoubleClick={() => { drag.current = null; setBox(null); }}
      onPointerDown={e => {
        if (e.button !== 0) return;
        e.preventDefault(); e.stopPropagation(); e.currentTarget.focus(); e.currentTarget.setPointerCapture(e.pointerId);
        const measured = constrain(initialBox()); drag.current = { x: e.clientX, y: e.clientY, box: measured }; setBox(measured);
      }}
      onPointerMove={e => { const d = drag.current; if (d) setBox(constrain({ ...d.box, width: d.box.width + e.clientX - d.x, height: d.box.height + e.clientY - d.y })); }}
      onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }} onLostPointerCapture={() => { drag.current = null; }}
      onKeyDown={e => {
        if (e.key === 'Home') { e.preventDefault(); setBox(null); return; }
        if (!['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
        e.preventDefault(); const b = box ?? initialBox(), step = e.shiftKey ? 2 : 12;
        setBox(constrain({ ...b, width: b.width + (e.key === 'ArrowRight' ? step : e.key === 'ArrowLeft' ? -step : 0), height: b.height + (e.key === 'ArrowDown' ? step : e.key === 'ArrowUp' ? -step : 0) }));
      }}><svg viewBox="0 0 20 20" aria-hidden="true"><path d="M18 2V18H2Z" fill="#39ff14"/><path d="m9 16 7-7m-3 7 3-3" stroke="#173619" strokeWidth="1"/></svg></button>
  </section>;
}
