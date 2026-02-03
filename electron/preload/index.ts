import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron';

type ConnectionConfig = {
  host: string;
  port: number;
};

type ConnectionResult = {
  success: boolean;
  version?: string;
  name?: string;
  platform?: string;
  error?: string;
  needsManualLaunch?: boolean;
  proPresenterRunning?: boolean;
};

type SettingsPayload = {
  host?: string;
  port?: number;
  libraryFilter?: string | null;
  includeSongTitles?: boolean;
  textColor?: string;
  fontFace?: string;
  fontSize?: number;
  titleFontSize?: number;
  bold?: boolean;
  italic?: boolean;
  logoPath?: string | null;
  lastPlaylistId?: string;
};

interface ExportPayload extends ConnectionConfig {
  playlistId: string;
  playlistName: string;
  libraryFilter?: string | null;
  includeSongTitles?: boolean;
  styleOverrides?: {
    textColor?: string;
    fontFace?: string;
    fontSize?: number;
    titleFontSize?: number;
    bold?: boolean;
    italic?: boolean;
  };
  logoPath?: string | null;
}

type ProgressEventPayload = {
  playlistId: string;
  type: string;
  message?: string;
  itemName?: string;
  totalSongs?: number;
  outputPath?: string;
};

type FontStatus = {
  name: string;
  category: 'sans-serif' | 'serif' | 'display';
  installed: boolean;
  downloadUrl?: string;
};

const api = {
  loadSettings: () => ipcRenderer.invoke('settings:load'),
  saveSettings: (data: SettingsPayload) => ipcRenderer.invoke('settings:save', data),
  testConnection: (config: ConnectionConfig): Promise<ConnectionResult> => ipcRenderer.invoke('connection:test', config),
  fetchPlaylists: (config: ConnectionConfig) => ipcRenderer.invoke('playlists:list', config),
  fetchLibraries: (config: ConnectionConfig) => ipcRenderer.invoke('libraries:list', config),
  startExport: (payload: ExportPayload) => ipcRenderer.invoke('export:start', payload),
  chooseLogo: () => ipcRenderer.invoke('logo:choose'),
  onExportProgress: (callback: (event: ProgressEventPayload) => void) => {
    const handler = (_event: IpcRendererEvent, data: ProgressEventPayload) => callback(data);
    ipcRenderer.on('export:progress', handler);
    return () => {
      ipcRenderer.removeListener('export:progress', handler);
    };
  },
  // Font management
  listFonts: (): Promise<FontStatus[]> => ipcRenderer.invoke('fonts:list'),
  checkFont: (fontName: string): Promise<FontStatus | null> => ipcRenderer.invoke('fonts:check', fontName),
  downloadFont: (url: string): Promise<{ success: boolean }> => ipcRenderer.invoke('fonts:download', url),
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronAPI = typeof api;

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
