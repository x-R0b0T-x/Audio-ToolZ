export interface RecentFile { id: string; name: string; path: string; }
export interface DesktopAudioFile { token: string; name: string; data: Uint8Array; }
export interface DesktopAPI {
  getRecentFiles(): Promise<RecentFile[]>;
  clearRecentFiles(): Promise<void>;
  pickAudioFiles(): Promise<DesktopAudioFile[]>;
  openRecent(id: string): Promise<DesktopAudioFile>;
  confirmOpened(token: string): Promise<void>;
  rememberFile(file: File): Promise<void>;
}
declare global { interface Window { audioToolzDesktop?: DesktopAPI; } }
export const desktop = (): DesktopAPI | undefined => window.audioToolzDesktop;
export const RECENT_FILES_CHANGED = 'audio-toolz:recent-files-changed';
export function notifyRecentFilesChanged() { window.dispatchEvent(new Event(RECENT_FILES_CHANGED)); }
export function fileFromDesktop(payload: DesktopAudioFile): File {
  return new File([new Uint8Array(payload.data).buffer], payload.name);
}
