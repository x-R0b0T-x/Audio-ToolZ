import React, { useEffect, useRef, useState } from 'react';
import { Download } from 'lucide-react';
import {
  IconBpm,
  IconControlPanel,
  IconCopy,
  IconCut,
  IconFade,
  IconHelp,
  IconNew,
  IconNormalize,
  IconOpen,
  IconPaste,
  IconRedo,
  IconSilence,
  IconSpeedPitch,
  IconTrimSelection,
  IconUndo,
  IconVolume,
  IconZoomFit,
  IconZoomIn,
  IconZoomOut,
  IconZoomSelection,
} from './StudioIcons';
import { BrandLogo } from './BrandLogo';
import type { EffectModalId } from '../audio/types';

interface TopMenuBarProps {
  hasDocument: boolean;
  hasSelection: boolean;
  hasClipboard: boolean;
  hasCueTracks: boolean;
  canUndo: boolean;
  canRedo: boolean;
  hasBpm: boolean;
  showBeatGrid: boolean;
  controlOpen: boolean;
  onToggleControlWindow: () => void;
  onDetectBpm: () => void;
  onNewEmpty: () => void;
  onOpenFile: () => void;
  onOpenExport: () => void;
  onOpenJoinFiles: () => void;
  onImportCue: () => void;
  onExportCue: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onCut: () => void;
  onCopy: () => void;
  onPaste: () => void;
  onSilence: () => void;
  onTrim: () => void;
  onSelectAll: () => void;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomSelection: () => void;
  onZoomReset: () => void;
  onOpenEffect: (effect: EffectModalId) => void;
  onOpenSettings: () => void;
  onOpenInfo: () => void;
}

type MenuKey = 'fichier' | 'edition' | 'effets' | 'outils' | null;

export const TopMenuBar: React.FC<TopMenuBarProps> = ({
  hasDocument,
  hasSelection,
  hasClipboard,
  hasCueTracks,
  canUndo,
  canRedo,
  hasBpm,
  showBeatGrid,
  controlOpen,
  onToggleControlWindow,
  onDetectBpm,
  onNewEmpty,
  onOpenFile,
  onOpenExport,
  onOpenJoinFiles,
  onImportCue,
  onExportCue,
  onUndo,
  onRedo,
  onCut,
  onCopy,
  onPaste,
  onSilence,
  onTrim,
  onSelectAll,
  onZoomIn,
  onZoomOut,
  onZoomSelection,
  onZoomReset,
  onOpenEffect,
  onOpenSettings,
  onOpenInfo,
}) => {
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const menuContainerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleOutside = (e: MouseEvent) => {
      if (
        menuContainerRef.current &&
        !menuContainerRef.current.contains(e.target as Node)
      ) {
        setOpenMenu(null);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenMenu(null);
    };
    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEsc);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, []);

  const runAndClose = (fn: () => void) => {
    setOpenMenu(null);
    fn();
  };

  return (
    <div ref={menuContainerRef} className="shrink-0 select-none">
      {/* Top Bar: [Logo + Fichier/Édition/Effets/Outils on left] | [Centered "Audio ToolZ" in logo colors] | [Export on right] */}
      <header
        className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 h-12 border-b"
        style={{
          backgroundColor: 'var(--bg-surface)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <BrandLogo size={28} showWordmark={false} />

          <nav
            aria-label="Menu principal"
            className="flex items-center gap-1 relative"
          >
          {/* Fichier */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'fichier'}
              onClick={() =>
                setOpenMenu(openMenu === 'fichier' ? null : 'fichier')
              }
              className="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  openMenu === 'fichier' ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Fichier
            </button>
            {openMenu === 'fichier' && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-60 rounded-lg border p-1.5 shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <MenuItem
                  label="Ouvrir un fichier audio..."
                  shortcut="Ctrl+O"
                  onClick={() => runAndClose(onOpenFile)}
                />
                <MenuItem
                  label="Nouveau document vierge"
                  shortcut="Ctrl+N"
                  onClick={() => runAndClose(onNewEmpty)}
                />
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
                <MenuItem
                  label="Exporter (WAV, MP3, FLAC, OGG)..."
                  shortcut="Ctrl+E"
                  disabled={!hasDocument}
                  onClick={() => runAndClose(onOpenExport)}
                />
              </div>
            )}
          </div>

          {/* Édition */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'edition'}
              onClick={() =>
                setOpenMenu(openMenu === 'edition' ? null : 'edition')
              }
              className="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  openMenu === 'edition' ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Édition
            </button>
            {openMenu === 'edition' && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-60 rounded-lg border p-1.5 shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <MenuItem
                  label="Annuler"
                  shortcut="Ctrl+Z"
                  disabled={!canUndo}
                  onClick={() => runAndClose(onUndo)}
                />
                <MenuItem
                  label="Rétablir"
                  shortcut="Ctrl+Y"
                  disabled={!canRedo}
                  onClick={() => runAndClose(onRedo)}
                />
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
                <MenuItem
                  label="Couper"
                  shortcut="Ctrl+X"
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(onCut)}
                />
                <MenuItem
                  label="Copier"
                  shortcut="Ctrl+C"
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(onCopy)}
                />
                <MenuItem
                  label="Coller au curseur"
                  shortcut="Ctrl+V"
                  disabled={!hasDocument || !hasClipboard}
                  onClick={() => runAndClose(onPaste)}
                />
                <MenuItem
                  label="Mettre en silence"
                  shortcut="Suppr"
                  disabled={!hasDocument}
                  onClick={() => runAndClose(onSilence)}
                />
                <MenuItem
                  label="Garder la sélection (Rogner)"
                  shortcut="Ctrl+T"
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(onTrim)}
                />
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
                <MenuItem
                  label="Tout sélectionner"
                  shortcut="Ctrl+A"
                  disabled={!hasDocument}
                  onClick={() => runAndClose(onSelectAll)}
                />
              </div>
            )}
          </div>

          {/* Effets */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'effets'}
              onClick={() =>
                setOpenMenu(openMenu === 'effets' ? null : 'effets')
              }
              className="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  openMenu === 'effets' ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Effets
            </button>
            {openMenu === 'effets' && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-64 rounded-lg border p-1.5 shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <MenuItem
                  label="Volume..."
                  tooltip={
                    !hasSelection
                      ? 'Sélectionnez une zone audio pour appliquer cet effet'
                      : undefined
                  }
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(() => onOpenEffect('volume'))}
                />
                <MenuItem
                  label="Normaliser (Pic dB)..."
                  tooltip={
                    !hasSelection
                      ? 'Sélectionnez une zone audio pour appliquer cet effet'
                      : undefined
                  }
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(() => onOpenEffect('normalize'))}
                />
                <MenuItem
                  label="Fondus (Entrée / Sortie)..."
                  tooltip={
                    !hasSelection
                      ? 'Sélectionnez une zone audio pour appliquer cet effet'
                      : undefined
                  }
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(() => onOpenEffect('fade'))}
                />
                <MenuItem
                  label="Vitesse et Hauteur (Pitch)..."
                  tooltip={
                    !hasSelection
                      ? 'Sélectionnez une zone audio pour appliquer cet effet'
                      : undefined
                  }
                  disabled={!hasDocument || !hasSelection}
                  onClick={() => runAndClose(() => onOpenEffect('speed-pitch'))}
                />
              </div>
            )}
          </div>

          {/* Outils */}
          <div className="relative">
            <button
              type="button"
              aria-expanded={openMenu === 'outils'}
              onClick={() =>
                setOpenMenu(openMenu === 'outils' ? null : 'outils')
              }
              className="px-3 py-1.5 rounded-md text-sm font-medium whitespace-nowrap shrink-0 transition-colors cursor-pointer"
              style={{
                backgroundColor:
                  openMenu === 'outils' ? 'var(--bg-hover)' : 'transparent',
                color: 'var(--text-primary)',
              }}
            >
              Outils
            </button>
            {openMenu === 'outils' && (
              <div
                role="menu"
                className="absolute left-0 top-full mt-1 w-72 rounded-lg border p-1.5 shadow-xl z-50"
                style={{
                  backgroundColor: 'var(--bg-elevated)',
                  borderColor: 'var(--border-strong)',
                }}
              >
                <MenuItem
                  label={
                    hasBpm
                      ? showBeatGrid
                        ? 'Masquer la grille BPM / Kicks'
                        : 'Afficher la grille BPM / Kicks'
                      : 'Détecter le BPM (Repères de kicks)'
                  }
                  shortcut="Ctrl+B"
                  disabled={!hasDocument}
                  onClick={() => runAndClose(onDetectBpm)}
                />
                <MenuItem
                  label="Joindre des fichiers (Mix / .cue)..."
                  onClick={() => runAndClose(onOpenJoinFiles)}
                />
                <MenuItem
                  label="Importer un fichier .cue sur la piste..."
                  disabled={!hasDocument}
                  onClick={() => runAndClose(onImportCue)}
                />
                <MenuItem
                  label="Extraire le fichier .cue du mix..."
                  disabled={!hasDocument || !hasCueTracks}
                  onClick={() => runAndClose(onExportCue)}
                />
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
                <MenuItem
                  label={
                    controlOpen
                      ? 'Masquer la fenêtre de contrôle'
                      : 'Afficher la fenêtre de contrôle'
                  }
                  onClick={() => runAndClose(onToggleControlWindow)}
                />
                <div
                  className="my-1 h-px"
                  style={{ backgroundColor: 'var(--border-subtle)' }}
                />
                <MenuItem
                  label="Paramètres..."
                  onClick={() => runAndClose(onOpenSettings)}
                />
                <MenuItem
                  label="À propos & Licence GPL v3..."
                  onClick={() => runAndClose(onOpenInfo)}
                />
              </div>
            )}
          </div>
        </nav>
        </div>

        <div className="flex items-center justify-center select-none pointer-events-none">
          <span
            data-testid="header-brand-title"
            className="text-lg font-display font-bold tracking-tight whitespace-nowrap"
          >
            <span style={{ color: '#f8f8f2' }}>Audio </span>
            <span style={{ color: '#45f882' }}>Tool</span>
            <span style={{ color: '#bd93f9' }}>Z</span>
          </span>
        </div>

        <div className="flex items-center justify-end shrink-0">
          <button
            type="button"
            disabled={!hasDocument}
            onClick={onOpenExport}
            aria-label="Exporter (WAV, MP3, FLAC, OGG)"
            title="Exporter le fichier audio (Ctrl+E)"
            className="w-9 h-8 inline-flex items-center justify-center rounded-md transition-opacity disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
            style={{
              backgroundColor: 'var(--accent-primary)',
              color: '#ffffff',
            }}
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 100% Pure Flush Icon Toolbar (Zero text labels) */}
      <div
        className="flex items-center justify-between gap-2 px-3 py-1.5 border-b"
        style={{
          backgroundColor: 'var(--bg-canvas)',
          borderColor: 'var(--border-subtle)',
        }}
      >
        <div className="flex items-center gap-1 min-w-0 overflow-x-auto">
          {/* Fichier */}
          <ToolButton
            icon={<IconOpen />}
            label="Ouvrir un fichier audio (Ctrl+O)"
            onClick={onOpenFile}
          />
          <ToolButton
            icon={<IconNew />}
            label="Nouveau document vierge (Ctrl+N)"
            onClick={onNewEmpty}
          />

          <ToolbarDivider />

          {/* Historique */}
          <ToolButton
            icon={<IconUndo />}
            label="Annuler (Ctrl+Z)"
            disabled={!canUndo}
            onClick={onUndo}
          />
          <ToolButton
            icon={<IconRedo />}
            label="Rétablir (Ctrl+Y)"
            disabled={!canRedo}
            onClick={onRedo}
          />

          <ToolbarDivider />

          {/* Édition */}
          <ToolButton
            icon={<IconCut />}
            label="Couper la sélection (Ctrl+X)"
            disabled={!hasDocument || !hasSelection}
            onClick={onCut}
          />
          <ToolButton
            icon={<IconCopy />}
            label="Copier la sélection (Ctrl+C)"
            disabled={!hasDocument || !hasSelection}
            onClick={onCopy}
          />
          <ToolButton
            icon={<IconPaste />}
            label="Coller au curseur (Ctrl+V)"
            disabled={!hasDocument || !hasClipboard}
            onClick={onPaste}
          />
          <ToolButton
            icon={<IconSilence />}
            label="Mettre en silence (Suppr)"
            disabled={!hasDocument}
            onClick={onSilence}
          />
          <ToolButton
            icon={<IconTrimSelection />}
            label="Garder la sélection (Rogner gauche/droite)"
            tooltip="Garder la sélection — Supprimer tout à gauche et à droite (Ctrl+T)"
            highlight={hasDocument && hasSelection}
            disabled={!hasDocument || !hasSelection}
            onClick={onTrim}
          />

          <ToolbarDivider />

          {/* Zoom */}
          <ToolButton
            icon={<IconZoomIn />}
            label="Zoom avant"
            disabled={!hasDocument}
            onClick={onZoomIn}
          />
          <ToolButton
            icon={<IconZoomOut />}
            label="Zoom arrière"
            disabled={!hasDocument}
            onClick={onZoomOut}
          />
          <ToolButton
            icon={<IconZoomSelection />}
            label="Zoom sur la sélection"
            disabled={!hasDocument || !hasSelection}
            onClick={onZoomSelection}
          />
          <ToolButton
            icon={<IconZoomFit />}
            label="Vue totale"
            disabled={!hasDocument}
            onClick={onZoomReset}
          />

          <ToolbarDivider />

          {/* Effets v1 (uniquement sur une sélection active) */}
          <ToolButton
            icon={<IconVolume />}
            label="Volume..."
            tooltip={
              hasDocument && !hasSelection
                ? 'Volume... (sélectionnez une zone audio)'
                : 'Volume...'
            }
            disabled={!hasDocument || !hasSelection}
            onClick={() => onOpenEffect('volume')}
          />
          <ToolButton
            icon={<IconNormalize />}
            label="Normaliser (Pic dB)..."
            tooltip={
              hasDocument && !hasSelection
                ? 'Normaliser... (sélectionnez une zone audio)'
                : 'Normaliser (Pic dB)...'
            }
            disabled={!hasDocument || !hasSelection}
            onClick={() => onOpenEffect('normalize')}
          />
          <ToolButton
            icon={<IconFade />}
            label="Fondus (Entrée / Sortie)..."
            tooltip={
              hasDocument && !hasSelection
                ? 'Fondus... (sélectionnez une zone audio)'
                : 'Fondus (Entrée / Sortie)...'
            }
            disabled={!hasDocument || !hasSelection}
            onClick={() => onOpenEffect('fade')}
          />
          <ToolButton
            icon={<IconSpeedPitch />}
            label="Vitesse et Hauteur (Pitch)..."
            tooltip={
              hasDocument && !hasSelection
                ? 'Vitesse et Hauteur... (sélectionnez une zone audio)'
                : 'Vitesse et Hauteur (Pitch)...'
            }
            disabled={!hasDocument || !hasSelection}
            onClick={() => onOpenEffect('speed-pitch')}
          />

          <ToolbarDivider />

          {/* Détecteur de BPM / Kicks */}
          <ToolButton
            icon={<IconBpm />}
            label="Détecteur de BPM (Repères de kicks)"
            tooltip="Détecteur de BPM automatique (65–300 BPM) : afficher/masquer la grille calée sur les kicks (Ctrl+B)"
            highlight={hasDocument && showBeatGrid}
            pressed={hasDocument && showBeatGrid}
            disabled={!hasDocument}
            onClick={onDetectBpm}
          />
        </div>

        {/* Right icon-only controls: Contrôle panel toggle & Aide/GPL */}
        <div className="flex items-center gap-1 shrink-0">
          <ToolButton
            icon={<IconControlPanel />}
            label={
              controlOpen
                ? 'Masquer la fenêtre de contrôle'
                : 'Afficher la fenêtre de contrôle'
            }
            highlight={controlOpen}
            pressed={controlOpen}
            onClick={onToggleControlWindow}
          />
          <ToolButton
            icon={<IconHelp />}
            label="Licence GPL v3 et raccourcis"
            onClick={onOpenInfo}
          />
        </div>
      </div>
    </div>
  );
};

function ToolbarDivider() {
  return (
    <div
      className="w-px h-5 mx-1 shrink-0"
      style={{ backgroundColor: 'var(--border-subtle)' }}
    />
  );
}

function ToolButton({
  icon,
  label,
  tooltip,
  highlight,
  pressed,
  disabled,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tooltip?: string;
  highlight?: boolean;
  pressed?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={tooltip ?? label}
      aria-label={label}
      aria-pressed={pressed}
      className="w-8 h-8 inline-flex items-center justify-center rounded-md border shrink-0 transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)] hover:border-[var(--border-strong)]"
      style={{
        backgroundColor: highlight ? 'var(--accent-soft)' : 'var(--bg-surface)',
        borderColor: highlight ? 'var(--accent-primary)' : 'var(--border-subtle)',
      }}
    >
      {icon}
    </button>
  );
}

function MenuItem({
  label,
  shortcut,
  tooltip,
  disabled,
  active,
  onClick,
}: {
  label: string;
  shortcut?: string;
  tooltip?: string;
  disabled?: boolean;
  active?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      title={tooltip}
      disabled={disabled}
      onClick={onClick}
      className="w-full flex items-center justify-between gap-4 px-2.5 py-1.5 rounded text-xs font-medium text-left whitespace-nowrap transition-colors cursor-pointer disabled:opacity-35 disabled:cursor-not-allowed hover:bg-[var(--bg-hover)]"
      style={{
        color: active ? 'var(--accent-secondary)' : 'var(--text-primary)',
      }}
    >
      <span>{label}</span>
      {shortcut && (
        <span
          className="font-mono-tabular text-[11px]"
          style={{ color: 'var(--text-muted)' }}
        >
          {shortcut}
        </span>
      )}
    </button>
  );
}
