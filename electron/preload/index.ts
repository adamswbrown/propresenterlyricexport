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
  // Service Generator
  enableServiceGenerator?: boolean;
  worshipLibraryId?: string | null;
  kidsLibraryId?: string | null;
  serviceContentLibraryId?: string | null;
  templatePlaylistId?: string | null;
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
  createPlaylistFromTemplate: (config: ConnectionConfig, templateId: string, playlistName: string) =>
    ipcRenderer.invoke('playlist:create-from-template', config, templateId, playlistName),
  // Shell utilities
  openExternal: (url: string): Promise<{ success: boolean }> => ipcRenderer.invoke('shell:openExternal', url),
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
  // Song Aliases
  loadAliases: (): Promise<Record<string, { uuid: string; name: string }>> => ipcRenderer.invoke('aliases:load'),
  saveAlias: (songTitle: string, target: { uuid: string; name: string }): Promise<Record<string, { uuid: string; name: string }>> =>
    ipcRenderer.invoke('aliases:save', songTitle, target),
  removeAlias: (songTitle: string): Promise<{ removed: boolean; aliases: Record<string, { uuid: string; name: string }> }> =>
    ipcRenderer.invoke('aliases:remove', songTitle),
  searchPresentations: (
    config: ConnectionConfig,
    libraryIds: string[],
    query: string
  ): Promise<{ success: boolean; results: Array<{ uuid: string; name: string; library: string }>; error?: string }> =>
    ipcRenderer.invoke('library:search-presentations', config, libraryIds, query),
  // Service Generator
  choosePDF: () => ipcRenderer.invoke('pdf:choose'),
  parsePDF: (filePath: string) => ipcRenderer.invoke('pdf:parse', filePath),
  matchSongs: (
    songItems: Array<{ text: string; isKidsVideo?: boolean; praiseSlot?: string }>,
    config: ConnectionConfig,
    libraryIds: string[],
    kidsLibraryId?: string
  ) => ipcRenderer.invoke('songs:match', songItems, config, libraryIds, kidsLibraryId),
  fetchVerses: (references: string[]) => ipcRenderer.invoke('verses:fetch', references),
  matchVerses: (
    verseReferences: string[],
    config: ConnectionConfig,
    serviceContentLibraryId: string
  ): Promise<{
    success: boolean;
    results?: Array<{
      reference: string;
      matches: Array<{ uuid: string; name: string; confidence: number }>;
      bestMatch?: { uuid: string; name: string; confidence: number };
      requiresReview: boolean;
      selectedMatch?: { uuid: string; name: string };
    }>;
    error?: string;
  }> => ipcRenderer.invoke('verses:match', verseReferences, config, serviceContentLibraryId),
  buildServicePlaylist: (config: ConnectionConfig, playlistId: string, items: any[]) =>
    ipcRenderer.invoke('playlist:build-service', config, playlistId, items),
  focusPlaylistItem: (config: ConnectionConfig, playlistId: string, headerName: string): Promise<{ success: boolean; error?: string; index?: number }> =>
    ipcRenderer.invoke('playlist:focus-item', config, playlistId, headerName),
  // Auto-updater
  getVersion: (): Promise<string> => ipcRenderer.invoke('updater:get-version'),
  checkForUpdates: (): Promise<{ success: boolean; version?: string; error?: string }> =>
    ipcRenderer.invoke('updater:check'),
  downloadUpdate: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('updater:download'),
  installUpdate: (): Promise<void> => ipcRenderer.invoke('updater:install'),
  onUpdateAvailable: (callback: (info: { version: string; releaseNotes?: string }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { version: string; releaseNotes?: string }) => callback(data);
    ipcRenderer.on('updater:update-available', handler);
    return () => { ipcRenderer.removeListener('updater:update-available', handler); };
  },
  onUpdateNotAvailable: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('updater:update-not-available', handler);
    return () => { ipcRenderer.removeListener('updater:update-not-available', handler); };
  },
  onUpdateDownloadProgress: (callback: (progress: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => void) => {
    const handler = (_event: IpcRendererEvent, data: { percent: number; bytesPerSecond: number; transferred: number; total: number }) => callback(data);
    ipcRenderer.on('updater:download-progress', handler);
    return () => { ipcRenderer.removeListener('updater:download-progress', handler); };
  },
  onUpdateDownloaded: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on('updater:update-downloaded', handler);
    return () => { ipcRenderer.removeListener('updater:update-downloaded', handler); };
  },
  onUpdateError: (callback: (error: string) => void) => {
    const handler = (_event: IpcRendererEvent, data: string) => callback(data);
    ipcRenderer.on('updater:error', handler);
    return () => { ipcRenderer.removeListener('updater:error', handler); };
  },
};

contextBridge.exposeInMainWorld('api', api);
contextBridge.exposeInMainWorld('__ELECTRON_API__', true);

export type ElectronAPI = typeof api;

declare global {
  interface Window {
    api: ElectronAPI;
  }
}
