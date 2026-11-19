export interface RecentFile {
  id: string;
  name: string;
  path: string;
}

export interface DesktopAudioFile {
  token: string;
  name: string;
  data: Uint8Array;
}

export interface DesktopAPI {
  getRecentFiles(): Promise<RecentFile[]>;
  clearRecentFiles(): Promise<void>;
  pickAudioFiles(): Promise<DesktopAudioFile[]>;
  openRecent(id: string): Promise<DesktopAudioFile>;
  confirmOpened(token: string): Promise<void>;
  rememberFile(file: File): Promise<void>;
  openExternalUrl?(url: string): Promise<void>;
}

interface TauriInternals {
  invoke: <T = unknown>(cmd: string, args?: Record<string, unknown>) => Promise<T>;
}

declare global {
  interface Window {
    audioToolzDesktop?: DesktopAPI;
    __TAURI_INTERNALS__?: TauriInternals;
  }
}

let cachedTauriApi: DesktopAPI | undefined;

function createTauriBridge(tauri: TauriInternals): DesktopAPI {
  return {
    getRecentFiles: () => tauri.invoke<RecentFile[]>('get_recent_files'),
    clearRecentFiles: () => tauri.invoke<void>('clear_recent_files'),
    pickAudioFiles: async () => {
      const files = await tauri.invoke<Array<{ token: string; name: string; data: number[] }>>('pick_audio_files');
      return files.map((f) => ({
        token: f.token,
        name: f.name,
        data: new Uint8Array(f.data),
      }));
    },
    openRecent: async (id: string) => {
      const file = await tauri.invoke<{ token: string; name: string; data: number[] }>('open_recent', { id });
      return {
        token: file.token,
        name: file.name,
        data: new Uint8Array(file.data),
      };
    },
    confirmOpened: (token: string) => tauri.invoke<void>('confirm_opened', { token }),
    rememberFile: (file: File) => {
      const maybePath = (file as File & { path?: string }).path;
      return maybePath ? tauri.invoke<void>('remember_file', { path: maybePath }) : Promise.resolve();
    },
    openExternalUrl: (url: string) => tauri.invoke<void>('open_community_url', { url }),
  };
}

export const desktop = (): DesktopAPI | undefined => {
  if (typeof window === 'undefined') return undefined;
  if (window.__TAURI_INTERNALS__) {
    if (!cachedTauriApi) {
      cachedTauriApi = createTauriBridge(window.__TAURI_INTERNALS__);
    }
    return cachedTauriApi;
  }
  return window.audioToolzDesktop;
};

export const RECENT_FILES_CHANGED = 'audio-toolz:recent-files-changed';

export function notifyRecentFilesChanged() {
  window.dispatchEvent(new Event(RECENT_FILES_CHANGED));
}

export function fileFromDesktop(payload: DesktopAudioFile): File {
  return new File([new Uint8Array(payload.data).buffer], payload.name);
}

export async function decodeAudioFallback(buffer: ArrayBuffer) {
  const tauri = window.__TAURI_INTERNALS__;
  if (!tauri) throw new Error('Décodeur de secours indisponible hors de Tauri.');
  const raw = await tauri.invoke<ArrayBuffer>('decode_audio_fallback', {
    data: Array.from(new Uint8Array(buffer)),
  });
  const data = new DataView(raw);
  if (data.byteLength < 8) throw new Error('Réponse du décodeur incomplète.');
  const sampleRate = data.getUint32(0, true);
  const count = data.getUint32(4, true);
  const frames = (data.byteLength - 8) / (4 * count);
  if (!sampleRate || !count || !Number.isSafeInteger(frames) || frames < 1) {
    throw new Error('Piste audio vide ou invalide.');
  }
  const channels = Array.from({ length: count }, () => new Float32Array(frames));
  for (let frame = 0, offset = 8; frame < frames; frame++) {
    for (let c = 0; c < count; c++, offset += 4) channels[c][frame] = data.getFloat32(offset, true);
  }
  return { channels, sampleRate };
}
