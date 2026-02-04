import { app, BrowserWindow, dialog, ipcMain, shell } from 'electron';
import path from 'path';
import fs from 'fs';
import { exec } from 'child_process';
import { promisify } from 'util';
import Store from 'electron-store';

const execAsync = promisify(exec);
import { ProPresenterClient } from '../../src/propresenter-client';
import { collectPlaylistLyrics, PlaylistProgressEvent } from '../../src/services/playlist-exporter';
import { mapPlaylistTree, PlaylistTreeNode } from '../../src/utils/playlist-utils';
import { findLogoPath } from '../../src/services/logo';
import { exportToPowerPoint, DEFAULT_PPTX_TEXT_STYLE, PptxTextStyle } from '../../src/pptx-exporter';
import { PDFParser } from '../../src/services/pdf-parser';
import { SongMatcher } from '../../src/services/song-matcher';
import { BibleFetcher } from '../../src/services/bible-fetcher';
import { PlaylistBuilder } from '../../src/services/playlist-builder';

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
  // Service Generator
  enableServiceGenerator?: boolean;
  worshipLibraryId?: string | null;
  kidsLibraryId?: string | null;
  serviceContentLibraryId?: string | null;
  templatePlaylistId?: string | null;
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

// Curated font list optimized for lyrics/presentation readability
interface FontOption {
  name: string;
  category: 'sans-serif' | 'serif' | 'display';
  downloadUrl?: string;
}

const CURATED_FONTS: FontOption[] = [
  // Sans-serif fonts - clean and highly readable
  { name: 'Red Hat Display', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Red+Hat+Display' },
  { name: 'Arial', category: 'sans-serif' },
  { name: 'Helvetica', category: 'sans-serif' },
  { name: 'Verdana', category: 'sans-serif' },
  { name: 'Tahoma', category: 'sans-serif' },
  { name: 'Trebuchet MS', category: 'sans-serif' },
  { name: 'Segoe UI', category: 'sans-serif' },
  { name: 'SF Pro Display', category: 'sans-serif' },
  { name: 'Open Sans', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Open+Sans' },
  { name: 'Roboto', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Roboto' },
  { name: 'Lato', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Lato' },
  { name: 'Montserrat', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Montserrat' },
  { name: 'Source Sans Pro', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Source+Sans+Pro' },
  { name: 'Nunito', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Nunito' },
  { name: 'Poppins', category: 'sans-serif', downloadUrl: 'https://fonts.google.com/specimen/Poppins' },
  // Serif fonts - traditional and elegant
  { name: 'Georgia', category: 'serif' },
  { name: 'Times New Roman', category: 'serif' },
  { name: 'Palatino Linotype', category: 'serif' },
  { name: 'Book Antiqua', category: 'serif' },
  { name: 'Cambria', category: 'serif' },
  { name: 'Garamond', category: 'serif' },
  { name: 'Merriweather', category: 'serif', downloadUrl: 'https://fonts.google.com/specimen/Merriweather' },
  { name: 'Playfair Display', category: 'serif', downloadUrl: 'https://fonts.google.com/specimen/Playfair+Display' },
  { name: 'Lora', category: 'serif', downloadUrl: 'https://fonts.google.com/specimen/Lora' },
  // Display fonts - impactful for titles
  { name: 'Impact', category: 'display' },
  { name: 'Oswald', category: 'display', downloadUrl: 'https://fonts.google.com/specimen/Oswald' },
  { name: 'Bebas Neue', category: 'display', downloadUrl: 'https://fonts.google.com/specimen/Bebas+Neue' },
];

async function checkFontInstalled(fontName: string): Promise<boolean> {
  const platform = process.platform;

  if (platform === 'darwin') {
    // macOS: Use system_profiler or check font directories
    const fontDirs = [
      '/System/Library/Fonts',
      '/Library/Fonts',
      path.join(app.getPath('home'), 'Library/Fonts'),
    ];

    // Normalize font name for file matching
    const normalizedName = fontName.toLowerCase().replace(/\s+/g, '');

    for (const dir of fontDirs) {
      try {
        const files = await fs.promises.readdir(dir);
        const found = files.some(file => {
          const normalizedFile = file.toLowerCase().replace(/\s+/g, '');
          return normalizedFile.includes(normalizedName) ||
                 normalizedFile.includes(fontName.toLowerCase().replace(/\s+/g, '-'));
        });
        if (found) return true;
      } catch {
        // Directory doesn't exist or not accessible
      }
    }

    // Fallback: use fc-list if available
    try {
      const { stdout } = await execAsync(`fc-list : family | grep -i "${fontName}"`);
      return stdout.trim().length > 0;
    } catch {
      // fc-list not available or font not found
    }

    return false;
  }

  if (platform === 'win32') {
    // Windows: Check font directories
    const fontDirs = [
      path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'),
      path.join(app.getPath('home'), 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'),
    ];

    const normalizedName = fontName.toLowerCase().replace(/\s+/g, '');

    for (const dir of fontDirs) {
      try {
        const files = await fs.promises.readdir(dir);
        const found = files.some(file => {
          const normalizedFile = file.toLowerCase().replace(/\s+/g, '');
          return normalizedFile.includes(normalizedName) ||
                 normalizedFile.includes(fontName.toLowerCase().replace(/\s+/g, '-'));
        });
        if (found) return true;
      } catch {
        // Directory doesn't exist or not accessible
      }
    }

    return false;
  }

  // Linux: use fc-list
  try {
    const { stdout } = await execAsync(`fc-list : family | grep -i "${fontName}"`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

interface FontStatus {
  name: string;
  category: 'sans-serif' | 'serif' | 'display';
  installed: boolean;
  downloadUrl?: string;
}

async function getFontStatuses(): Promise<FontStatus[]> {
  const results = await Promise.all(
    CURATED_FONTS.map(async (font) => ({
      name: font.name,
      category: font.category,
      installed: await checkFontInstalled(font.name),
      downloadUrl: font.downloadUrl,
    }))
  );
  return results;
}

async function checkSingleFont(fontName: string): Promise<FontStatus | null> {
  const font = CURATED_FONTS.find(f => f.name.toLowerCase() === fontName.toLowerCase());
  if (font) {
    return {
      name: font.name,
      category: font.category,
      installed: await checkFontInstalled(font.name),
      downloadUrl: font.downloadUrl,
    };
  }
  // Check for custom font (not in curated list)
  return {
    name: fontName,
    category: 'sans-serif',
    installed: await checkFontInstalled(fontName),
  };
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

/**
 * Check if ProPresenter is running
 */
async function isProPresenterRunning(): Promise<boolean> {
  try {
    if (process.platform === 'darwin') {
      const { stdout } = await execAsync('pgrep -x ProPresenter');
      return stdout.trim().length > 0;
    } else if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq ProPresenter.exe" /NH');
      return stdout.includes('ProPresenter.exe');
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Launch ProPresenter application
 */
async function launchProPresenter(): Promise<void> {
  if (process.platform === 'darwin') {
    await execAsync('open -a ProPresenter');
  } else if (process.platform === 'win32') {
    // Try common installation paths
    const paths = [
      'C:\\Program Files\\Renewed Vision\\ProPresenter\\ProPresenter.exe',
      'C:\\Program Files (x86)\\Renewed Vision\\ProPresenter\\ProPresenter.exe',
    ];

    for (const path of paths) {
      try {
        await execAsync(`start "" "${path}"`);
        return;
      } catch {
        continue;
      }
    }
    throw new Error('ProPresenter installation not found');
  } else {
    throw new Error('Unsupported platform for auto-launch');
  }
}

/**
 * Poll API until available or timeout
 */
async function waitForAPI(
  config: ConnectionConfig,
  maxAttempts: number = 20,
  delayMs: number = 1000
): Promise<{ success: boolean; error?: string }> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const client = createClient(config);
      await client.connect();
      return { success: true };
    } catch (error: any) {
      // Check if it's a connection refused error (ProPresenter not ready)
      if (error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('Failed to connect')) {
        // Wait and retry
        await new Promise(resolve => setTimeout(resolve, delayMs));
        continue;
      }
      // Other errors (API disabled, wrong host, etc.)
      return {
        success: false,
        error: error.message || 'Unknown error'
      };
    }
  }

  return {
    success: false,
    error: 'Timeout waiting for ProPresenter API. Please enable Network API in ProPresenter settings (Preferences → Network → Enable Network).'
  };
}

ipcMain.handle('connection:test', async (_event, config: ConnectionConfig) => {
  try {
    // Step 1: Check if ProPresenter is running
    const isRunning = await isProPresenterRunning();

    if (!isRunning) {
      // Step 2: Launch ProPresenter
      try {
        await launchProPresenter();

        // Step 3: Wait for ProPresenter to start (give it a few seconds)
        await new Promise(resolve => setTimeout(resolve, 3000));
      } catch (launchError: any) {
        return {
          success: false,
          error: `Failed to launch ProPresenter: ${launchError.message}`,
          needsManualLaunch: true,
        };
      }
    }

    // Step 4: Poll API until available
    const result = await waitForAPI(config, 20, 1000);

    if (!result.success) {
      return {
        success: false,
        error: result.error || 'Failed to connect to ProPresenter API',
        proPresenterRunning: isRunning,
      };
    }

    // Step 5: Get version info on successful connection
    const client = createClient(config);
    const versionInfo = await client.connect();

    return {
      success: true,
      ...versionInfo,
    };
  } catch (error: any) {
    return {
      success: false,
      error: error.message || 'Unknown connection error',
    };
  }
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

// Font management IPC handlers
ipcMain.handle('fonts:list', async () => {
  return getFontStatuses();
});

ipcMain.handle('fonts:check', async (_event, fontName: string) => {
  return checkSingleFont(fontName);
});

ipcMain.handle('fonts:download', async (_event, url: string) => {
  await shell.openExternal(url);
  return { success: true };
});

// Open external URL in default browser
ipcMain.handle('shell:openExternal', async (_event, url: string) => {
  await shell.openExternal(url);
  return { success: true };
});
// Playlist template creation
ipcMain.handle('playlist:create-from-template', async (_event, config: ConnectionConfig, templateId: string, newPlaylistName: string) => {
  try {
    const client = createClient(config);
    await client.connect();
    const newPlaylistId = await client.createPlaylistFromTemplate(templateId, newPlaylistName);
    return { success: true, playlistId: newPlaylistId };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create playlist from template' };
  }
});

// Service Generator IPC handlers
ipcMain.handle('pdf:choose', async () => {
  const result = await dialog.showOpenDialog({
    title: 'Select Service Order PDF',
    properties: ['openFile'],
    filters: [
      { name: 'PDF Files', extensions: ['pdf'] },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  return { canceled: false, filePath: result.filePaths[0] };
});

ipcMain.handle('pdf:parse', async (_event, filePath: string) => {
  try {
    const parser = new PDFParser();
    const result = await parser.parsePDF(filePath);
    // Convert parsed service to simple items array for UI
    // Distinguish between regular songs and kids videos
    // Include praise slot for song ordering context
    const items = result.sections.map(section => ({
      type: section.type === 'video' ? 'kids_video'
          : section.type === 'song' ? 'song'
          : section.type === 'bible' ? 'verse'
          : 'heading',
      text: section.title,
      reference: section.type === 'bible' ? section.title : undefined,
      isKidsVideo: section.isVideo === true,
      praiseSlot: section.praiseSlot // praise1, praise2, praise3, or kids
    }));
    return { success: true, items };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to parse PDF' };
  }
});

ipcMain.handle('songs:match', async (_event, songNames: string[], config: ConnectionConfig, libraryIds: string[]) => {
  try {
    const { ProPresenterClient } = await import('../../src/propresenter-client');
    const { SongMatcher } = await import('../../src/services/song-matcher');

    // ProPresenter API is REST/HTTP - no persistent connection needed
    // Each API call is independent, client just stores host/port config
    const client = new ProPresenterClient(config);
    const matcher = new SongMatcher(0.7); // 70% confidence threshold

    // Fetch presentations from all specified libraries (fresh fetch each time)
    const allPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];

    for (const libraryId of libraryIds) {
      if (!libraryId) continue;
      try {
        const presentations = await client.getLibraryPresentations(libraryId);
        // Get library name for display
        const libraries = await client.getLibraries();
        const library = libraries.find(l => l.uuid === libraryId);
        const libraryName = library?.name || 'Unknown';

        for (const pres of presentations) {
          allPresentations.push({
            uuid: pres.uuid,
            name: pres.name,
            library: libraryName,
            libraryId: libraryId
          });
        }
      } catch (err) {
        console.error(`Failed to fetch library ${libraryId}:`, err);
      }
    }

    // Create service sections from song names for matcher
    const songSections = songNames.map((name, index) => ({
      type: 'song' as const,
      title: name,
      position: index
    }));

    // Match songs
    const matches = await matcher.matchSongs(songSections, allPresentations);

    // Convert to UI format
    const results = matches.map(match => ({
      songName: match.pdfTitle,
      praiseSlot: undefined, // Will be set by caller
      matches: match.matches.map(m => ({
        uuid: m.presentation.uuid,
        name: m.presentation.name,
        library: m.presentation.library,
        confidence: Math.round(m.confidence * 100)
      })),
      bestMatch: match.bestMatch ? {
        uuid: match.bestMatch.presentation.uuid,
        name: match.bestMatch.presentation.name,
        library: match.bestMatch.presentation.library,
        confidence: Math.round(match.bestMatch.confidence * 100)
      } : undefined,
      requiresReview: match.requiresReview,
      selectedMatch: match.bestMatch && !match.requiresReview ? {
        uuid: match.bestMatch.presentation.uuid,
        name: match.bestMatch.presentation.name
      } : undefined
    }));

    return { success: true, results };
  } catch (error: any) {
    console.error('Song matching error:', error);
    return { success: false, error: error.message || 'Failed to match songs' };
  }
});

ipcMain.handle('verses:fetch', async (_event, references: string[]) => {
  try {
    // TODO: Implement Bible verse fetching
    // This requires an API key for Bible API
    // For now, return placeholder results
    const verses = references.map(ref => ({
      reference: ref,
      text: `Placeholder text for ${ref}`,
      error: undefined
    }));
    return { success: true, verses };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch verses' };
  }
});

ipcMain.handle('playlist:build-service', async (_event, config: ConnectionConfig, playlistId: string, items: any[]) => {
  try {
    // Items should be an array of { type, uuid, name } representing songs/videos to add
    // We'll add these items to the playlist via PUT request

    // Build playlist items array for ProPresenter API
    const playlistItems = items.map((item, index) => {
      if (item.type === 'presentation') {
        // Library presentation (song or video)
        return {
          id: {
            name: item.name,
            uuid: '', // New item, no UUID yet
            index: index
          },
          type: 'presentation',
          is_hidden: false,
          is_pco: false,
          presentation_info: {
            presentation_uuid: item.uuid // UUID of the library presentation
          }
        };
      } else if (item.type === 'header') {
        // Section header
        return {
          id: {
            name: item.name,
            uuid: '',
            index: index
          },
          type: 'header',
          is_hidden: false,
          is_pco: false
        };
      }
      // Default to presentation type
      return {
        id: {
          name: item.name || 'Unknown',
          uuid: '',
          index: index
        },
        type: 'presentation',
        is_hidden: false,
        is_pco: false,
        presentation_info: {
          presentation_uuid: item.uuid
        }
      };
    });

    // Send PUT request to update playlist items
    const response = await fetch(`http://${config.host}:${config.port}/v1/playlist/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(playlistItems)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update playlist: ${response.status} ${errorText}`);
    }

    return { success: true, itemCount: items.length };
  } catch (error: any) {
    console.error('Playlist build error:', error);
    return { success: false, error: error.message || 'Failed to build playlist' };
  }
});