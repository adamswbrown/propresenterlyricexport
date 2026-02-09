/// <reference types="vite/client" />

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

type ParsePDFResult = {
  success: boolean;
  items?: ParsedServiceItem[];
  specialServiceType?: string | null;
  error?: string;
};

type ParsedServiceItem = {
  type: 'song' | 'kids_video' | 'verse' | 'heading';
  text: string;
  reference?: string;
  isKidsVideo?: boolean;
  praiseSlot?: 'praise1' | 'praise2' | 'praise3' | 'kids';
};

type SongMatchResult = {
  songName: string;
  praiseSlot?: 'praise1' | 'praise2' | 'praise3' | 'kids';
  matches: Array<{ uuid: string; name: string; library: string; confidence: number }>;
  bestMatch?: { uuid: string; name: string; library: string; confidence: number };
  requiresReview: boolean;
  selectedMatch?: { uuid: string; name: string };
};

interface ElectronAPI {
  loadSettings: () => Promise<SettingsPayload>;
  saveSettings: (data: SettingsPayload) => Promise<void>;
  testConnection: (config: ConnectionConfig) => Promise<ConnectionResult>;
  fetchPlaylists: (config: ConnectionConfig) => Promise<any[]>;
  fetchLibraries: (config: ConnectionConfig) => Promise<any[]>;
  startExport: (payload: ExportPayload) => Promise<{ success: boolean; outputPath?: string; error?: string; canceled?: boolean }>;
  chooseLogo: () => Promise<{ canceled: boolean; filePath: string | undefined }>;
  createPlaylistFromTemplate: (config: ConnectionConfig, templateId: string, playlistName: string) => Promise<{ success: boolean; playlistId?: string; error?: string }>;
  // Shell utilities
  openExternal: (url: string) => Promise<{ success: boolean }>;
  onExportProgress: (callback: (event: ProgressEventPayload) => void) => () => void;
  // Font management
  listFonts: () => Promise<FontStatus[]>;
  checkFont: (fontName: string) => Promise<FontStatus | null>;
  downloadFont: (url: string) => Promise<{ success: boolean }>;
  // Song Aliases
  loadAliases: () => Promise<Record<string, { uuid: string; name: string }>>;
  saveAlias: (songTitle: string, target: { uuid: string; name: string }) => Promise<Record<string, { uuid: string; name: string }>>;
  removeAlias: (songTitle: string) => Promise<{ removed: boolean; aliases: Record<string, { uuid: string; name: string }> }>;
  // Library search
  searchPresentations: (
    config: ConnectionConfig,
    libraryIds: string[],
    query: string
  ) => Promise<{ success: boolean; results: Array<{ uuid: string; name: string; library: string }>; error?: string }>;
  // Service Generator
  choosePDF: () => Promise<{ canceled: boolean; filePath?: string }>;
  parsePDF: (filePath: string) => Promise<ParsePDFResult>;
  matchSongs: (
    songItems: Array<{ text: string; isKidsVideo?: boolean; praiseSlot?: string; specialServiceType?: string | null }>,
    config: ConnectionConfig,
    libraryIds: string[],
    kidsLibraryId?: string,
    serviceContentLibraryId?: string
  ) => Promise<{ success: boolean; results?: SongMatchResult[]; error?: string }>;
  fetchVerses: (references: string[]) => Promise<any[]>;
  matchVerses: (
    verseReferences: string[],
    config: ConnectionConfig,
    serviceContentLibraryId: string
  ) => Promise<{
    success: boolean;
    results?: Array<{
      reference: string;
      matches: Array<{ uuid: string; name: string; confidence: number }>;
      bestMatch?: { uuid: string; name: string; confidence: number };
      requiresReview: boolean;
      selectedMatch?: { uuid: string; name: string };
    }>;
    error?: string;
  }>;
  buildServicePlaylist: (config: ConnectionConfig, playlistId: string, items: any[]) => Promise<{ success: boolean; error?: string }>;
  focusPlaylistItem: (config: ConnectionConfig, playlistId: string, headerName: string) => Promise<{ success: boolean; error?: string; index?: number }>;
}

declare global {
  interface Window {
    api: ElectronAPI;
  }
}

export {};
