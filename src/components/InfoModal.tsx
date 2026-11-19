import React, { useState, useRef, useEffect } from 'react';
import { History, Keyboard, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const APP_VERSION = 'v1.5';

const CHANGELOG_ADDITIONS = [
  'Tauri v2 + WebView2 ultra-léger (~8 Mo)',
  'Faders verticaux de précision avec rendu et écoute en direct instantanée',
  'Fenêtre À propos déplaçable, redimensionnable et centrée',
  'Analyseur temps réel ultra-détaillé style GoldWave à défilement ralenti',
  'Fermeture automatique de tous les menus au clic extérieur',
  'Ancrage permanent de la fenêtre de contrôle lors du redimensionnement',
];

const CHANGELOG_FIXES = [
  'Maintien de la position relative du panneau de contrôle lors du redimensionnement',
  'Pré-écoute continue sans clic superflu sur les faders DSP',
  'Réduction de la vitesse de la waveform temps réel pour un suivi chirurgical des crêtes',
];

export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'changelog'>('shortcuts');
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [size, setSize] = useState({ w: 680, h: 560 });
  const draggingRef = useRef(false);
  const dragOffsetRef = useRef({ x: 0, y: 0 });
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) {
      setPos({
        x: Math.max(20, Math.round((window.innerWidth - size.w) / 2)),
        y: Math.max(20, Math.round((window.innerHeight - size.h) / 2)),
      });
    }
  }, [open, size.w, size.h]);

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      if (!draggingRef.current) return;
      setPos({
        x: Math.max(10, Math.min(window.innerWidth - 100, e.clientX - dragOffsetRef.current.x)),
        y: Math.max(10, Math.min(window.innerHeight - 80, e.clientY - dragOffsetRef.current.y)),
      });
    };
    const onUp = () => { draggingRef.current = false; };
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, []);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed z-50 rounded-xl border shadow-2xl flex flex-col overflow-hidden resize"
      style={{
        left: `${pos.x}px`,
        top: `${pos.y}px`,
        width: `${size.w}px`,
        height: `${size.h}px`,
        minWidth: '420px',
        minHeight: '380px',
        backgroundColor: 'var(--bg-surface)',
        borderColor: 'var(--border-strong)',
      }}
      ref={modalRef}
    >
      <div
        className="flex items-center justify-between px-4 py-2.5 border-b shrink-0 cursor-grab active:cursor-grabbing select-none"
        style={{
          backgroundColor: 'var(--bg-elevated)',
          borderColor: 'var(--border-subtle)',
        }}
        onMouseDown={(e) => {
          if ((e.target as HTMLElement).closest('button')) return;
          draggingRef.current = true;
          dragOffsetRef.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
        }}
      >
        <div className="flex items-center gap-2.5">
          <h2 className="text-sm font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
            À propos · Licence GNU GPL v3
          </h2>
          <span
            className="px-2 py-0.5 rounded font-mono-tabular text-[11px] font-semibold border"
            style={{
              backgroundColor: 'var(--bg-input)',
              borderColor: 'var(--border-strong)',
              color: 'var(--accent-secondary)',
            }}
          >
            {APP_VERSION}
          </span>
        </div>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-[var(--bg-hover)] cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-5 space-y-4 overflow-y-auto text-xs leading-relaxed flex-1">
        <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
          <BrandLogo size={74} showWordmark wordmarkClassName="text-2xl" />
          <span className="font-mono-tabular text-[11px]" style={{ color: 'var(--text-muted)' }}>
            Version {APP_VERSION}
          </span>
        </div>

        <div
          className="p-3.5 rounded-lg border text-center space-y-1.5"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
            color: 'var(--text-secondary)',
          }}
        >
          <p className="font-semibold" style={{ color: 'var(--text-primary)' }}>
            Logiciel libre sous licence GNU GPL v3
          </p>
          <p>
            L&apos;outil pensé et développé avec passion pour les amoureux de la création musicale.
          </p>
        </div>

        <section
          className="p-3.5 rounded-lg border text-center space-y-2"
          style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}
        >
          <h3 className="font-semibold">Rejoignez la communauté Audio ToolZ</h3>
          <p>Venez discuter du logiciel, partager vos idées et échanger avec la communauté.</p>
          <a
            href="https://t.me/Audio_ToolZ"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-block px-4 py-2 rounded-md font-semibold text-white"
            style={{ backgroundColor: 'var(--accent-primary)' }}
          >
            Rejoindre la communauté Telegram
          </a>
        </section>

        <div
          className="flex items-center gap-1 p-1 rounded-lg border"
          style={{
            backgroundColor: 'var(--bg-input)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <button
            type="button"
            onClick={() => setActiveTab('shortcuts')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: activeTab === 'shortcuts' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'shortcuts' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <Keyboard className="w-3.5 h-3.5" />
            Raccourcis clavier & souris
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('changelog')}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
            style={{
              backgroundColor: activeTab === 'changelog' ? 'var(--accent-primary)' : 'transparent',
              color: activeTab === 'changelog' ? '#ffffff' : 'var(--text-secondary)',
            }}
          >
            <History className="w-3.5 h-3.5" />
            Changelog ({APP_VERSION})
          </button>
        </div>

        {activeTab === 'shortcuts' ? (
          <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 font-mono-tabular">
            {[
              ['Clic gauche', 'Départ de lecture / début de sélection'],
              ['Clic droit', 'Définir la fin de sélection'],
              ['Glisser ligne', 'Ajuster début / fin'],
              ['Molette souris', 'Zoom sur le pointeur'],
              ['Espace', 'Lecture / Pause'],
              ['Ctrl+B', 'Détecteur BPM / Kicks'],
              ['Ctrl+Z / Ctrl+Y', 'Annuler / Rétablir'],
              ['Ctrl+X / C / V', 'Couper / Copier / Coller'],
              ['Suppr', 'Silence sur sélection'],
              ['Ctrl+T', 'Rogner à la sélection'],
              ['Ctrl+A', 'Tout sélectionner'],
              ['Ctrl+O / Ctrl+E', 'Ouvrir / Exporter'],
            ].map(([keys, desc]) => (
              <div
                key={keys}
                className="flex items-center justify-between py-1 border-b"
                style={{ borderColor: 'var(--border-subtle)' }}
              >
                <span style={{ color: 'var(--accent-secondary)' }}>{keys}</span>
                <span style={{ color: 'var(--text-secondary)' }}>{desc}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div
              className="p-3.5 rounded-lg border space-y-2"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
            >
              <h3 className="text-xs font-display font-semibold" style={{ color: 'var(--accent-secondary)' }}>
                Nouveautés ({APP_VERSION})
              </h3>
              <ul className="space-y-1.5 list-disc pl-4" style={{ color: 'var(--text-secondary)' }}>
                {CHANGELOG_ADDITIONS.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
            <div
              className="p-3.5 rounded-lg border space-y-2"
              style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--border-subtle)' }}
            >
              <h3 className="text-xs font-display font-semibold" style={{ color: 'var(--text-primary)' }}>
                Corrections
              </h3>
              <ul className="space-y-1.5 list-disc pl-4" style={{ color: 'var(--text-secondary)' }}>
                {CHANGELOG_FIXES.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};