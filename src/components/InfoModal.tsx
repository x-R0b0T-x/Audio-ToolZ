import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';
import { RELEASE_ADDITIONS, RELEASE_FIXES } from '../releaseNotes';
interface InfoModalProps { open: boolean; onClose: () => void; }
export const APP_VERSION = 'v1.5';
const shortcuts = [
  ['Clic gauche', 'Départ de lecture / début de sélection'], ['Clic droit', 'Fin de sélection'],
  ['Glisser une borne', 'Ajuster début / fin'], ['Molette', 'Zoom sur le pointeur'],
  ['Espace', 'Lecture / pause'], ['Ctrl+B', 'Détecteur BPM / kicks'],
  ['Ctrl+Z / Ctrl+Y', 'Annuler / rétablir'], ['Ctrl+X / C / V', 'Couper / copier / coller'],
  ['Suppr', 'Silence sur sélection'], ['Ctrl+T', 'Rogner à la sélection'],
  ['Ctrl+A', 'Tout sélectionner'], ['Ctrl+O / Ctrl+E', 'Ouvrir / exporter'],
  ['Double-clic sur un réglage d’effet', 'Valeur par défaut'],
];
export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  const [tab, setTab] = useState<'shortcuts' | 'changelog'>('shortcuts');
  const [box, setBox] = useState({ x: 0, y: 0, w: 640, h: 680 });
  const drag = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!open) return;
    const fit = () => { const w = Math.max(1, Math.min(640, window.innerWidth - 24)); const h = Math.max(1, Math.min(680, window.innerHeight - 24));
      setBox({ w, h, x: Math.max(0, (window.innerWidth - w) / 2), y: Math.max(0, (window.innerHeight - h) / 2) }); };
    fit(); window.addEventListener('resize', fit);
    return () => { window.removeEventListener('resize', fit); drag.current = null; };
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const move = (e: MouseEvent) => { const d = drag.current; if (d) setBox((b) => ({ ...b,
      x: Math.max(0, Math.min(window.innerWidth - b.w, e.clientX - d.x)), y: Math.max(0, Math.min(window.innerHeight - b.h, e.clientY - d.y)) })); };
    const stop = () => { drag.current = null; };
    window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop); window.addEventListener('blur', stop);
    return () => { window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); window.removeEventListener('blur', stop); };
  }, [open]);
  if (!open) return null;
  return <div role="dialog" aria-modal="true" aria-labelledby="about-title" className="fixed z-50 rounded-xl border border-[var(--border-strong)] shadow-2xl flex flex-col overflow-hidden bg-[var(--bg-surface)] text-[var(--text-primary)]" style={{ left: box.x, top: box.y, width: box.w, height: box.h }}>
    <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--border-subtle)] bg-[var(--bg-elevated)] cursor-grab select-none"
      onMouseDown={(e) => { if (e.button !== 0 || (e.target as HTMLElement).closest('button')) return; drag.current = { x: e.clientX - box.x, y: e.clientY - box.y }; }}>
      <h2 id="about-title" className="text-sm font-semibold">À propos · GNU GPL v3 · {APP_VERSION}</h2>
      <button type="button" aria-label="Fermer" onClick={onClose}><X size={18} /></button>
    </div>
    <div className="p-4 flex-1 min-h-0 overflow-y-auto text-xs space-y-4">
      <div className="flex justify-center"><BrandLogo size={48} showWordmark wordmarkClassName="text-2xl" /></div>
      <div className="text-center space-y-2"><p>Logiciel libre sous licence GNU GPL v3</p><p>L’outil pensé et développé avec passion pour les amoureux de la création musicale.</p></div>
      <section className="p-3 text-center border rounded-lg border-[var(--accent-primary)] space-y-2"><h3>Rejoignez la communauté Audio ToolZ</h3><p>Discutez du logiciel, partagez vos idées et échangez avec la communauté.</p><a href="https://t.me/Audio_ToolZ" target="_blank" rel="noopener noreferrer" className="inline-block px-3 py-2 rounded bg-[var(--accent-primary)] text-white">Rejoindre la communauté Telegram</a></section>
      <div className="flex gap-2">{(['shortcuts', 'changelog'] as const).map((v) => <button type="button" key={v} onClick={() => setTab(v)} aria-pressed={tab === v} className="flex-1 border rounded p-2 border-[var(--border-subtle)]" style={{ background: tab === v ? 'var(--accent-primary)' : 'var(--bg-elevated)', color: tab === v ? '#fff' : 'var(--text-primary)' }}>{v === 'shortcuts' ? 'Raccourcis clavier et souris' : 'Modifications depuis la 1.4'}</button>)}</div>
      {tab === 'shortcuts' ? <div className="space-y-2">{shortcuts.map(([key, text]) => <div key={key} className="flex flex-wrap justify-between gap-2 border-b border-[var(--border-subtle)] pb-1"><span className="text-[var(--accent-secondary)]">{key}</span><span>{text}</span></div>)}</div>
        : <div className="space-y-4">{[['Nouveautés et allègement', RELEASE_ADDITIONS], ['Corrections et confort', RELEASE_FIXES]].map(([heading, items]) => <section key={heading as string}><h3 className="font-semibold mb-2 text-[var(--accent-secondary)]">{heading as string}</h3><ul className="list-disc pl-4 space-y-2">{(items as string[]).map((item) => <li key={item}>{item}</li>)}</ul></section>)}</div>}
    </div>
  </div>;
};
