import React, { useState } from 'react';
import { History, Keyboard, X } from 'lucide-react';
import { BrandLogo } from './BrandLogo';

interface InfoModalProps {
  open: boolean;
  onClose: () => void;
}

export const APP_VERSION = 'v1.4';

const CHANGELOG_ADDITIONS = [
  'Les dix derniers fichiers audio dans le menu Fichier, avec effacement de la liste',
  'Invitation a rejoindre la communaute Telegram Audio ToolZ',
  'Dossier portable stable : Audio ToolZ',
  'Defilement de la forme onde coloree ralenti et independant de la frequence ecran', 
  'Joindre plusieurs fichiers audio avec import et export de fichier .cue',
  'Menu Outils → Paramètres pour choisir les périphériques audio et micro',
  'Analyseur temps réel 3 vues : Oscilloscope, Spectre et Waveforme colorée selon le volume',
  'Lecture à l’envers (<<) et lecture en accéléré 2x (>>)',
  'Mini-contrôles (Lecture, Pause, Boucle, Stop) lorsque Contrôle est réduit',
];

const CHANGELOG_FIXES = [
  'Bouton Lecture démarrant au début de la piste et Boucle dédiée à la sélection',
  'Isolation réelle des canaux Gauche (G) et Droite (D) au décochement',
  'Effets DSP appliqués uniquement sur la sélection avec assombrissement du hors-sélection',
  'Recentrage parfait de l’accueil et suppression des éléments superflus dans Contrôle',
];

export const InfoModal: React.FC<InfoModalProps> = ({ open, onClose }) => {
  const [activeTab, setActiveTab] = useState<'shortcuts' | 'changelog'>('shortcuts');

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="info-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
    >
      <div
        className="w-full max-w-2xl rounded-xl border shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-strong)',
        }}
      >
        <div
          className="flex items-center justify-between px-4 py-3 border-b shrink-0"
          style={{
            backgroundColor: 'var(--bg-elevated)',
            borderColor: 'var(--border-subtle)',
          }}
        >
          <div className="flex items-center gap-2.5">
            <h2
              id="info-modal-title"
              className="text-sm font-display font-semibold"
              style={{ color: 'var(--text-primary)' }}
            >
              À propos · Licence GNU GPL v3
            </h2>
            <span
              data-testid="app-version-badge"
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

        <div className="p-6 space-y-5 overflow-y-auto text-xs leading-relaxed">
          {/* Grand logo centré en haut */}
          <div className="flex flex-col items-center justify-center gap-1.5 pt-1">
            <BrandLogo size={84} showWordmark wordmarkClassName="text-3xl" />
            <span
              className="font-mono-tabular text-[11px]"
              style={{ color: 'var(--text-muted)' }}
            >
              Version {APP_VERSION}
            </span>
          </div>

          <div
            className="p-4 rounded-lg border text-center space-y-1.5"
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
              L&apos;outil pensé et développé avec passion pour les amoureux de
              la création musicale. Édition audio de précision, détection des BPM
              calée sur les kicks, effets DSP, enregistrement et export
              multi-formats (WAV, MP3, FLAC, OGG).
            </p>
          </div>

          <section className="p-4 rounded-lg border text-center space-y-3"
            style={{ backgroundColor: 'var(--bg-input)', borderColor: 'var(--accent-primary)', color: 'var(--text-primary)' }}>
            <h3 className="font-semibold">Rejoignez la communaute Audio ToolZ</h3>
            <p>Venez discuter du logiciel, partager vos idees, poser vos questions et echanger avec la communaute.</p>
            <a href="https://t.me/Audio_ToolZ" target="_blank" rel="noopener noreferrer"
              className="inline-block px-4 py-2 rounded-md font-semibold"
              style={{ backgroundColor: 'var(--accent-primary)', color: '#fff' }}>
              Rejoindre la communaute Telegram
            </a>
          </section>
          {/* Sélecteur Raccourcis / Changelog */}
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
              aria-pressed={activeTab === 'shortcuts'}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  activeTab === 'shortcuts' ? 'var(--accent-primary)' : 'transparent',
                color: activeTab === 'shortcuts' ? '#ffffff' : 'var(--text-secondary)',
              }}
            >
              <Keyboard className="w-3.5 h-3.5" />
              Raccourcis clavier &amp; souris
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('changelog')}
              aria-pressed={activeTab === 'changelog'}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium cursor-pointer transition-colors"
              style={{
                backgroundColor:
                  activeTab === 'changelog' ? 'var(--accent-primary)' : 'transparent',
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
                ['Clic gauche', 'Départ de lecture'],
                ['Clic droit', 'Créer la sélection / boucle'],
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
            <div
              data-testid="changelog-panel"
              className="grid grid-cols-1 md:grid-cols-2 gap-4"
            >
              <div
                className="p-3.5 rounded-lg border space-y-2"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <h3
                  className="text-xs font-display font-semibold"
                  style={{ color: 'var(--accent-secondary)' }}
                >
                  Ajouts ({APP_VERSION})
                </h3>
                <ul className="space-y-1.5 list-disc pl-4" style={{ color: 'var(--text-secondary)' }}>
                  {CHANGELOG_ADDITIONS.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div
                className="p-3.5 rounded-lg border space-y-2"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  borderColor: 'var(--border-subtle)',
                }}
              >
                <h3
                  className="text-xs font-display font-semibold"
                  style={{ color: 'var(--text-primary)' }}
                >
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
    </div>
  );
};

