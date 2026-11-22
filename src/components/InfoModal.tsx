import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import robotUrl from '../features/easter-egg/333.png?url';
import { RELEASE_ADDITIONS, RELEASE_FIXES } from '../releaseNotes';
interface InfoModalProps { open: boolean; onClose: () => void; }
export const APP_VERSION = 'v1.6 dev';
export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  const [box, setBox] = useState({ x: 0, y: 0, w: 640, h: 680 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const w = Math.max(360, Math.min(640, window.innerWidth - 24));
    const h = Math.max(320, Math.min(680, window.innerHeight - 24));
    setBox({ w, h, x: Math.max(0, (window.innerWidth - w) / 2), y: Math.max(0, (window.innerHeight - h) / 2) });
    const clampToViewport = () => {
      setBox((b) => {
        const nw = Math.max(360, Math.min(b.w, window.innerWidth - 16));
        const nh = Math.max(320, Math.min(b.h, window.innerHeight - 16));
        return { w: nw, h: nh, x: Math.max(0, Math.min(window.innerWidth - nw, b.x)), y: Math.max(0, Math.min(window.innerHeight - nh, b.y)) };
      });
    };
    window.addEventListener('resize', clampToViewport);
    return () => { window.removeEventListener('resize', clampToViewport); drag.current = null; resize.current = null; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const move = (e: MouseEvent) => {
      const d = drag.current;
      if (d) setBox((b) => ({ ...b, x: Math.max(0, Math.min(window.innerWidth - b.w, e.clientX - d.x)), y: Math.max(0, Math.min(window.innerHeight - b.h, e.clientY - d.y)) }));
      const r = resize.current;
      if (r) setBox((b) => ({ ...b, w: Math.max(420, Math.min(window.innerWidth - b.x - 8, r.w + e.clientX - r.x)), h: Math.max(360, Math.min(window.innerHeight - b.y - 8, r.h + e.clientY - r.y)) }));
    };
    const stop = () => { drag.current = null; resize.current = null; };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', stop);
    window.addEventListener('blur', stop);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', stop);
      window.removeEventListener('blur', stop);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);
  if (!open) return null;
  return <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="fixed z-50 rounded-xl border border-[var(--border-strong)] shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] text-[var(--text-primary)]" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] cursor-grab select-none" onMouseDown={(e) => { if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return; drag.current = { x: e.clientX - box.x, y: e.clientY - box.y }; }}>
      <h2 id="about-title" className="text-sm font-semibold">À propos · {APP_VERSION}</h2>
      <button type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="p-4 flex-1 min-h-0 overflow-y-auto text-xs space-y-4">
      <div className="flex flex-col items-center gap-2 text-center"><img src={robotUrl} alt="Robot violet aux yeux verts" className="h-28 w-28 object-contain" /><h3 className="text-2xl font-display font-bold">Audio ToolZ</h3></div>
      <section aria-labelledby="about-changelog-title" className="space-y-4"><h3 id="about-changelog-title" className="text-sm font-semibold">Changelog</h3>{[['Nouveautés et allègement', RELEASE_ADDITIONS], ['Corrections et confort', RELEASE_FIXES]].map(([heading, items]) => <section key={heading as string}><h4 className="font-semibold mb-2 text-[var(--accent-secondary)]">{heading as string}</h4><ul className="list-disc pl-4 space-y-2">{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul></section>)}</section>
    </div>
    <div aria-label="Redimensionner la fenêtre À propos" title="Glisser pour redimensionner" onMouseDown={(e) => { if (e.button !== 0) return; e.preventDefault(); resize.current = { x: e.clientX, y: e.clientY, w: box.w, h: box.h }; }} className="absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize" style={{ background: 'linear-gradient(135deg, transparent 50%, var(--accent-primary) 50%)', opacity: 0.7 }} />
  </div>;
};
