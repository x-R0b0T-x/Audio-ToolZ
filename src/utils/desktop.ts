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
