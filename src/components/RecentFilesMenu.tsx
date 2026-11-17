import React, { useEffect, useState } from 'react';
import { desktop, RECENT_FILES_CHANGED, type RecentFile } from '../utils/desktop';
export function RecentFilesMenu({ onOpen }: { onOpen: (id: string) => void }) {
  const [entries, setEntries] = useState<RecentFile[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    const refresh = () => {
      const api = desktop();
      if (api) void api.getRecentFiles().then((items) => { if (active) setEntries(items); }).catch(() => { if (active) setError('Historique indisponible.'); });
    };
    refresh();
    window.addEventListener(RECENT_FILES_CHANGED, refresh);
    return () => { active = false; window.removeEventListener(RECENT_FILES_CHANGED, refresh); };
  }, []);
  const clear = async () => {
    try { await desktop()?.clearRecentFiles(); setEntries([]); setError(''); }
    catch { setError('Impossible de vider la liste.'); }
  };
  return <div className="mt-1 pt-1 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
    <p className="px-2.5 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>Fichiers récents</p>
    {!entries.length && <p className="px-2.5 py-1 text-xs" style={{ color: 'var(--text-secondary)' }}>{desktop() ? 'Aucun fichier récent' : 'Disponible dans la version Windows'}</p>}
    <div className="max-h-64 overflow-y-auto">
      {entries.map((entry) => <button key={entry.id} type="button" role="menuitem" title={entry.path} onClick={() => onOpen(entry.id)} className="w-full text-left px-2.5 py-1.5 rounded text-xs truncate cursor-pointer hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-primary)' }}>{entry.name}</button>)}
    </div>
    {error && <p role="alert" className="px-2.5 text-xs" style={{ color: 'var(--record-color)' }}>{error}</p>}
    <button type="button" role="menuitem" disabled={!entries.length} onClick={() => void clear()} className="w-full text-left px-2.5 py-1.5 rounded text-xs cursor-pointer disabled:opacity-40 hover:bg-[var(--bg-hover)]" style={{ color: 'var(--text-secondary)' }}>Supprimer les fichiers récents</button>
  </div>;
}
