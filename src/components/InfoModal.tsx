import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import robotUrl from '../features/q7m4n2/333.png?url';
import { RELEASE_ADDITIONS, RELEASE_FIXES } from '../releaseNotes';
import { AboutRobot } from './AboutRobot';
import './aboutPresentation.css';
import './aboutLayout.css';
import './aboutFx.css';

interface InfoModalProps { open: boolean; onClose: () => void; }
export const APP_VERSION = 'v1.6';
const DEFAULT_WIDTH = 500;
const WAVE_PATH = Array.from({ length: 4 }, (_, i) => { const o = i * 200; return `M${o} 50 H${o + 55} L${o + 65} 46 L${o + 75} 50 L${o + 85} 50 L${o + 93} 14 L${o + 105} 88 L${o + 115} 36 L${o + 123} 50 H${o + 200}`; }).join(' ');

export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  const [communityError, setCommunityError] = useState('');
  const [resizing, setResizing] = useState(false);
  const openCommunity = (event: React.MouseEvent<HTMLAnchorElement>) => {
    const bridge = (window as unknown as { __TAURI_INTERNALS__?: { invoke: (command: string, args: Record<string, unknown>) => Promise<unknown> } }).__TAURI_INTERNALS__;
    if (!bridge) return;
    event.preventDefault();
    setCommunityError('');
    void bridge.invoke('open_community_url', { url: event.currentTarget.href }).catch(() => setCommunityError('Impossible d’ouvrir le lien dans le navigateur.'));
  };
  const [box, setBox] = useState({ x: 0, y: 0, w: DEFAULT_WIDTH, h: 680 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  const resize = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const w = Math.max(360, Math.min(DEFAULT_WIDTH, window.innerWidth - 24));
    const h = Math.max(320, Math.min(680, window.innerHeight - 24));
    setResizing(false);
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
      if (r) setBox((b) => ({ ...b, w: Math.max(360, Math.min(window.innerWidth - b.x - 8, r.w + e.clientX - r.x)), h: Math.max(320, Math.min(window.innerHeight - b.y - 8, r.h + e.clientY - r.y)) }));
    };
    const stop = () => { drag.current = null; resize.current = null; setResizing(false); };
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
  return <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="atz-about-dialog fixed z-50 rounded-xl border border-[var(--border-strong)] shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] text-[var(--text-primary)]" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] cursor-grab select-none" onMouseDown={(e) => { if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return; drag.current = { x: e.clientX - box.x, y: e.clientY - box.y }; }}>
      <h2 id="about-title" className="text-sm font-semibold"><span data-atz-brand="audio">Audio </span><span data-atz-brand="tool">Tool</span><span data-atz-brand="z">Z</span> {APP_VERSION.split(' ')[0]}</h2>
      <button type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="atz-about-body">
      <div className="atz-about-brand">
        <div className="atz-about-hero"><div className="atz-about-fx" aria-hidden="true"><span className="atz-about-fx-wave"><svg viewBox="0 0 800 100" preserveAspectRatio="none" focusable="false"><path d={WAVE_PATH} vectorEffect="non-scaling-stroke" /></svg></span></div><AboutRobot src={robotUrl} /><div className="atz-about-actions">
          <a className="atz-about-community" href="https://t.me/Audio_ToolZ" target="_blank" rel="noopener noreferrer" onClick={openCommunity}>Rejoindre la communauté Telegram</a>
          <a className="atz-about-community" href="https://github.com/x-R0b0T-x/Audio-ToolZ" target="_blank" rel="noopener noreferrer" onClick={openCommunity}>Visiter le dépôt GitHub</a>
          <a className="atz-about-community" href="https://www.paypal.com/ncp/payment/GAUJE54VM28T8" target="_blank" rel="noopener noreferrer" onClick={openCommunity}>Faire un don</a>
        </div></div>
        {communityError && <p className="atz-about-community-error" role="alert">{communityError}</p>}
      </div>
      <section aria-labelledby="about-changelog-title" className="atz-about-changes">
        <h3 id="about-changelog-title" className="text-sm font-bold">Changelog depuis la version 1.5</h3>
        <div className="atz-about-scroll" role="region" aria-labelledby="about-changelog-title" tabIndex={0}>
          {[['Nouveautés et améliorations', RELEASE_ADDITIONS], ['Corrections et confort', RELEASE_FIXES]].map(([heading, items]) => <section key={heading as string}><h4 className="font-semibold mb-2 text-[var(--accent-secondary)]">{heading as string}</h4><ul className="list-disc pl-4 space-y-2">{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul></section>)}
        </div>
      </section>
    </div>
    <div aria-label="Redimensionner la fenêtre À propos" title="Glisser pour redimensionner" data-resizing={resizing ? 'true' : undefined} className="atz-about-resize absolute bottom-0 right-0 w-4 h-4 cursor-nwse-resize" onMouseDown={(e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      resize.current = { x: e.clientX, y: e.clientY, w: box.w, h: box.h };
      setResizing(true);
    }} />
  </div>;
};
