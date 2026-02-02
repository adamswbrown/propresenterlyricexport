import { app, BrowserWindow, dialog, ipcMain } from 'electron';
import path from 'path';
import Store from 'electron-store';
import { ProPresenterClient } from '../../src/propresenter-client';
import { collectPlaylistLyrics, PlaylistProgressEvent } from '../../src/services/playlist-exporter';
import { mapPlaylistTree, PlaylistTreeNode } from '../../src/utils/playlist-utils';
import { findLogoPath } from '../../src/services/logo';
import { exportToPowerPoint, DEFAULT_PPTX_TEXT_STYLE, PptxTextStyle } from '../../src/pptx-exporter';

interface AppSettings {
  host: string;
  port: number;
  libraryFilter: string | null;
  includeSongTitles: boolean;
  textColor: string;
  fontFace: string;
  fontSize: number;
  titleFontSize: number;
  bold: boolean;
  italic: boolean;
  logoPath?: string | null;
  lastPlaylistId?: string;
}

interface ConnectionConfig {
  host: string;
  port: number;
}

interface ExportPayload extends ConnectionConfig {
  playlistId: string;
  playlistName: string;
  libraryFilter?: string | null;
  includeSongTitles?: boolean;
  styleOverrides?: Partial<PptxTextStyle>;
  logoPath?: string | null;
}

const DEFAULT_HOST = process.env.PROPRESENTER_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(process.env.PROPRESENTER_PORT || '1025', 10);
const DEFAULT_LIBRARY = process.env.PROPRESENTER_LIBRARY || 'Worship';

const settings = new Store<AppSettings>({
  name: 'settings',
  defaults: {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    libraryFilter: DEFAULT_LIBRARY,
    includeSongTitles: true,
    textColor: DEFAULT_PPTX_TEXT_STYLE.textColor,
    fontFace: DEFAULT_PPTX_TEXT_STYLE.fontFace,
    fontSize: DEFAULT_PPTX_TEXT_STYLE.fontSize,
    titleFontSize: DEFAULT_PPTX_TEXT_STYLE.titleFontSize,
    bold: DEFAULT_PPTX_TEXT_STYLE.bold,
    italic: DEFAULT_PPTX_TEXT_STYLE.italic,
    logoPath: null,
  },
});

let mainWindow: BrowserWindow | null = null;

function createWindow(): void {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 840,
    minWidth: 1100,
    minHeight: 720,
    title: 'ProPresenter Lyrics',
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#050913',
    webPreferences: {
      preload: process.env.ELECTRON_PRELOAD || path.join(__dirname, '../preload/index.js'),
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    mainWindow.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

function createClient(config: ConnectionConfig): ProPresenterClient {
  return new ProPresenterClient(config);
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'playlist';
}

function defaultOutputPath(playlistName: string): string {
  const suggested = `${slugify(playlistName)}-${Date.now()}.pptx`;
  return path.join(app.getPath('documents'), suggested);
}

function sanitizeColor(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/^#/, '').trim();
}

function resolveStyleOverrides(payload: ExportPayload): Partial<PptxTextStyle> {
  const stored: Partial<PptxTextStyle> = {
    textColor: settings.get('textColor'),
    fontFace: settings.get('fontFace'),
    fontSize: settings.get('fontSize'),
    titleFontSize: settings.get('titleFontSize'),
    bold: settings.get('bold'),
    italic: settings.get('italic'),
  };

  const overrides: Partial<PptxTextStyle> = {
    ...stored,
    ...payload.styleOverrides,
  };

  return {
    ...overrides,
    textColor: sanitizeColor(overrides.textColor),
  };
}

function forwardProgress(playlistId: string, event: PlaylistProgressEvent, window: BrowserWindow['webContents']): void {
  switch (event.type) {
    case 'library:search':
      window.send('export:progress', { playlistId, type: 'info', message: `Scanning ${event.libraryName} library...` });
      break;
    case 'library:not-found':
      window.send('export:progress', {
        playlistId,
        type: 'warning',
        message: `Library "${event.libraryName}" not found. Export will include every song in the playlist.`,
      });
      break;
    case 'playlist:start':
      window.send('export:progress', {
        playlistId,
        type: 'info',
        message: `Found ${event.totalItems} playlist items. Collecting lyric slides...`,
      });
      break;
    case 'playlist:item:success':
      window.send('export:progress', {
        playlistId,
        type: 'song:success',
        itemName: event.item.name,
      });
      break;
    case 'playlist:item:error':
      window.send('export:progress', {
        playlistId,
        type: 'song:error',
        itemName: event.item.name,
        message: event.error,
      });
      break;
    case 'playlist:item:skip':
      window.send('export:progress', {
        playlistId,
        type: 'song:skip',
        itemName: event.item.name,
      });
      break;
    case 'complete':
      window.send('export:progress', {
        playlistId,
        type: 'collection:complete',
        totalSongs: event.totalSongs,
      });
      break;
  }
}

async function runPlaylistExport(
  payload: ExportPayload,
  targetPath: string,
  window: BrowserWindow['webContents']
): Promise<string> {
  const client = createClient({ host: payload.host, port: payload.port });
  await client.connect();

  const result = await collectPlaylistLyrics(client, payload.playlistId, {
    libraryFilter: payload.libraryFilter?.trim() || settings.get('libraryFilter') || null,
    onProgress: (event) => forwardProgress(payload.playlistId, event, window),
  });

  if (result.songs.length === 0) {
    throw new Error('No lyric slides found in this playlist.');
  }

  window.send('export:progress', {
    playlistId: payload.playlistId,
    type: 'pptx:start',
    totalSongs: result.songs.length,
  });

  const includeSongTitles =
    payload.includeSongTitles ?? settings.get('includeSongTitles') ?? true;

  const logoPath =
    payload.logoPath?.trim() || settings.get('logoPath') || findLogoPath([path.join(app.getAppPath(), 'logo.png')]);

  const lyricsOnly = result.songs.map(entry => entry.lyrics);
  const finalPath = await exportToPowerPoint(lyricsOnly, {
    outputPath: targetPath,
    logoPath,
    includeSongTitles,
    styleOverrides: resolveStyleOverrides(payload),
  });

  window.send('export:progress', {
    playlistId: payload.playlistId,
    type: 'pptx:complete',
    outputPath: finalPath,
  });

  return finalPath;
}

ipcMain.handle('settings:load', () => settings.store);
ipcMain.handle('settings:save', (_event, data: Partial<AppSettings>) => {
  settings.set(data);
  return settings.store;
});

ipcMain.handle('logo:choose', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Logo Image',
    properties: ['openFile'],
    filters: [
      { name: 'Images', extensions: ['png', 'jpg', 'jpeg'] },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle('connection:test', async (_event, config: ConnectionConfig) => {
  const client = createClient(config);
  return client.connect();
});

ipcMain.handle('playlists:list', async (_event, config: ConnectionConfig) => {
  const client = createClient(config);
  await client.connect();
  const playlists = await client.getPlaylists();
  return mapPlaylistTree(playlists);
});

ipcMain.handle('libraries:list', async (_event, config: ConnectionConfig) => {
  const client = createClient(config);
  await client.connect();
  return client.getLibraries();
});

ipcMain.handle('export:start', async (event, payload: ExportPayload) => {
  const target = await dialog.showSaveDialog({
    title: 'Save PPTX Export',
    defaultPath: defaultOutputPath(payload.playlistName),
    buttonLabel: 'Export',
    filters: [{ name: 'PowerPoint', extensions: ['pptx'] }],
  });

  if (target.canceled || !target.filePath) {
    return { canceled: true };
  }

  try {
    const outputPath = await runPlaylistExport(payload, target.filePath, event.sender);
    const valuesToPersist: Partial<AppSettings> = {
      lastPlaylistId: payload.playlistId,
      libraryFilter: payload.libraryFilter ?? settings.get('libraryFilter') ?? null,
    };
    if (typeof payload.includeSongTitles === 'boolean') {
      valuesToPersist.includeSongTitles = payload.includeSongTitles;
    }
    if (payload.styleOverrides) {
      if (payload.styleOverrides.textColor) {
        valuesToPersist.textColor = sanitizeColor(payload.styleOverrides.textColor) || settings.get('textColor');
      }
      if (payload.styleOverrides.fontFace) {
        valuesToPersist.fontFace = payload.styleOverrides.fontFace;
      }
      if (typeof payload.styleOverrides.fontSize === 'number') {
        valuesToPersist.fontSize = payload.styleOverrides.fontSize;
      }
      if (typeof payload.styleOverrides.titleFontSize === 'number') {
        valuesToPersist.titleFontSize = payload.styleOverrides.titleFontSize;
      }
      if (typeof payload.styleOverrides.bold === 'boolean') {
        valuesToPersist.bold = payload.styleOverrides.bold;
      }
      if (typeof payload.styleOverrides.italic === 'boolean') {
        valuesToPersist.italic = payload.styleOverrides.italic;
      }
    }
    if (payload.logoPath) {
      valuesToPersist.logoPath = payload.logoPath;
    }
    settings.set(valuesToPersist);
    return { canceled: false, outputPath };
  } catch (error: any) {
    event.sender.send('export:progress', {
      playlistId: payload.playlistId,
      type: 'error',
      message: error?.message || 'Export failed',
    });
    throw error;
  }
});
