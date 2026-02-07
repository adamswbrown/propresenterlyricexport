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
// PDFParser is lazy-loaded in the pdf:parse handler to avoid DOMMatrix errors at startup
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

  // When payload.libraryFilter is explicitly null, use null (export all items)
  // Only fall back to stored setting if payload.libraryFilter is undefined
  const libraryFilter = payload.libraryFilter !== undefined 
    ? (payload.libraryFilter?.trim() || null)
    : (settings.get('libraryFilter') || null);

  const result = await collectPlaylistLyrics(client, payload.playlistId, {
    libraryFilter,
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
  try {
    console.log(`[playlists:list] Connecting to ${config.host}:${config.port}...`);

    // Try direct fetch first to bypass renewedvision-propresenter library timeout issues
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`http://${config.host}:${config.port}/v1/playlists`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log(`[playlists:list] Got ${(data as any[]).length} playlists via direct fetch`);

      // Parse the raw response into our format
      const playlists = (data as any[]).map((item: any) => ({
        uuid: item.id?.uuid || item.uuid || '',
        name: item.id?.name || item.name || 'Unnamed',
        type: item.field_type || item.type || 'unknown',
        isHeader: item.field_type === 'header' || item.type === 'header',
        children: item.children ? item.children.map((child: any) => ({
          uuid: child.id?.uuid || child.uuid || '',
          name: child.id?.name || child.name || 'Unnamed',
          type: child.field_type || child.type || 'unknown',
          isHeader: child.field_type === 'header' || child.type === 'header',
        })) : undefined,
      }));

      return mapPlaylistTree(playlists);
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      console.error('[playlists:list] Direct fetch failed:', fetchError.message);
      // Fall back to library approach
      const client = createClient(config);
      await client.connect();
      console.log('[playlists:list] Connected via library, fetching playlists...');
      const playlists = await client.getPlaylists();
      console.log(`[playlists:list] Got ${playlists.length} playlists via library`);
      return mapPlaylistTree(playlists);
    }
  } catch (error: any) {
    console.error('[playlists:list] Error:', error);
    throw error;
  }
});

ipcMain.handle('libraries:list', async (_event, config: ConnectionConfig) => {
  try {
    console.log(`[libraries:list] Connecting to ${config.host}:${config.port}...`);
    const client = createClient(config);
    await client.connect();
    console.log('[libraries:list] Connected, fetching libraries...');
    const libraries = await client.getLibraries();
    console.log(`[libraries:list] Got ${libraries.length} libraries`);
    return libraries;
  } catch (error: any) {
    console.error('[libraries:list] Error:', error);
    throw error;
  }
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
      libraryFilter: payload.libraryFilter !== undefined 
        ? (payload.libraryFilter?.trim() || null)
        : (settings.get('libraryFilter') ?? null),
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
    const { PDFParser } = await import('../../src/services/pdf-parser');
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
      isKidsVideo: section.isKidsVideo === true,  // Only if explicitly marked as kids
      praiseSlot: section.praiseSlot // praise1, praise2, praise3, or kids
    }));
    
    // Include special service type for warnings and service-specific handling
    const specialServiceType = result.specialServiceType;
    
    return { success: true, items, specialServiceType };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to parse PDF' };
  }
});

// Song item type for matching - includes whether it's a kids video and special service awareness
type SongItemToMatch = {
  text: string;
  isKidsVideo?: boolean;
  praiseSlot?: string;
  specialServiceType?: string | null;  // Type of service (remembrance, christmas, etc.)
};

ipcMain.handle('songs:match', async (_event, songItems: SongItemToMatch[], config: ConnectionConfig, libraryIds: string[], kidsLibraryId?: string, serviceContentLibraryId?: string) => {
  try {
    const { ProPresenterClient } = await import('../../src/propresenter-client');
    const { SongMatcher } = await import('../../src/services/song-matcher');

    // ProPresenter API is REST/HTTP - no persistent connection needed
    const client = new ProPresenterClient(config);
    const matcher = new SongMatcher(0.7); // 70% confidence threshold

    // Get library names for display
    const libraries = await client.getLibraries();

    // Fetch presentations from worship libraries (non-kids, non-service-content)
    const worshipPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];
    for (const libraryId of libraryIds) {
      if (!libraryId || libraryId === kidsLibraryId || libraryId === serviceContentLibraryId) continue;
      try {
        const presentations = await client.getLibraryPresentations(libraryId);
        const library = libraries.find(l => l.uuid === libraryId);
        const libraryName = library?.name || 'Unknown';

        for (const pres of presentations) {
          worshipPresentations.push({
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

    // Fetch presentations from service content library (for videos)
    const serviceContentPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];
    if (serviceContentLibraryId) {
      try {
        const presentations = await client.getLibraryPresentations(serviceContentLibraryId);
        const library = libraries.find(l => l.uuid === serviceContentLibraryId);
        const libraryName = library?.name || 'Service Content';

        for (const pres of presentations) {
          serviceContentPresentations.push({
            uuid: pres.uuid,
            name: pres.name,
            library: libraryName,
            libraryId: serviceContentLibraryId
          });
        }
      } catch (err) {
        console.error(`Failed to fetch service content library ${serviceContentLibraryId}:`, err);
      }
    }

    // Fetch presentations from kids library separately
    const kidsPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];
    if (kidsLibraryId) {
      try {
        const presentations = await client.getLibraryPresentations(kidsLibraryId);
        const library = libraries.find(l => l.uuid === kidsLibraryId);
        const libraryName = library?.name || 'Kids';

        for (const pres of presentations) {
          kidsPresentations.push({
            uuid: pres.uuid,
            name: pres.name,
            library: libraryName,
            libraryId: kidsLibraryId
          });
        }
      } catch (err) {
        console.error(`Failed to fetch kids library ${kidsLibraryId}:`, err);
      }
    }

    console.log(`[songs:match] Loaded ${worshipPresentations.length} worship songs, ${serviceContentPresentations.length} service content items, ${kidsPresentations.length} kids songs`);

    // Debug: Log received songItems
    console.log(`[songs:match] Received ${songItems.length} song items:`);
    for (const item of songItems) {
      console.log(`  - text="${item.text}" (type=${typeof item.text}) isKids=${item.isKidsVideo} slot=${item.praiseSlot} service=${item.specialServiceType}`);
    }

    // Match each song against the appropriate library
    const results = [];
    for (let i = 0; i < songItems.length; i++) {
      const item = songItems[i];
      
      // Determine library to search based on content type:
      // - Kids videos (explicitly marked): Kids library
      // - Non-kids videos (videos in special services, transition videos, closing videos): Service Content library
      // - Songs: Worship library
      
      const isKids = item.isKidsVideo || item.praiseSlot === 'kids';
      const isVideo = item.praiseSlot === 'kids_video' || (item.text && item.text.includes('(Video)'));
      const isNonKidsVideo = isVideo && !isKids;

      // Ensure text is a string
      const songText = typeof item.text === 'string' ? item.text : String(item.text || '');
      if (!songText) {
        console.warn(`[songs:match] Skipping item ${i} - no text`);
        continue;
      }

      // Choose which library to match against
      let presentationsToMatch: Array<{ uuid: string; name: string; library: string; libraryId: string }>;
      let matchContext: string;

      if (isKids) {
        // Kids content goes to kids library
        presentationsToMatch = kidsPresentations;
        matchContext = `kids`;
      } else if (isNonKidsVideo) {
        // Non-kids videos (closing videos, transition videos, special service videos) go to Service Content
        presentationsToMatch = serviceContentPresentations;
        matchContext = `service video (${item.specialServiceType || 'regular'})`;
      } else {
        // Regular songs go to worship library
        presentationsToMatch = worshipPresentations;
        matchContext = 'worship';
      }

      console.log(`[songs:match] Matching "${songText}" (${matchContext}) against ${presentationsToMatch.length} presentations`);

      // Create service section for matcher
      const songSection = {
        type: 'song' as const,
        title: songText,
        position: i
      };

      // Match this single song
      const matches = await matcher.matchSongs([songSection], presentationsToMatch);
      const match = matches[0];

      results.push({
        songName: match.pdfTitle,
        praiseSlot: item.praiseSlot,
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
      });
    }

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

// Match Bible verses against service content library
ipcMain.handle('verses:match', async (_event, verseReferences: string[], config: ConnectionConfig, serviceContentLibraryId: string) => {
  try {
    if (!serviceContentLibraryId) {
      // No service content library configured, return empty matches
      return {
        success: true,
        results: verseReferences.map(ref => ({
          reference: ref,
          matches: [],
          bestMatch: undefined,
          requiresReview: true,
          selectedMatch: undefined
        }))
      };
    }

    const { ProPresenterClient } = await import('../../src/propresenter-client');

    // ProPresenter API is REST/HTTP - no persistent connection needed
    const client = new ProPresenterClient(config);

    // Fetch presentations from service content library
    const presentations = await client.getLibraryPresentations(serviceContentLibraryId);
    console.log(`[verses:match] Loaded ${presentations.length} presentations from service content library`);

    // Match each verse reference against presentations
    const results = verseReferences.map(reference => {
      const normalizedRef = reference.toLowerCase().trim();
      // Normalize: remove punctuation (colons, underscores, hyphens, parentheses) for better matching
      const normalizedRefStripped = normalizedRef.replace(/[:\-_()]/g, '').trim();

      // Find presentations that contain the reference in their name
      const matches = presentations
        .filter(pres => {
          const presName = pres.name.toLowerCase();
          const presNameStripped = presName.replace(/[:\-_()]/g, '').trim();
          
          // Check if presentation name contains the reference
          // e.g., "Luke 12:35-59" should match "Luke 12_35-59 (NIV)-1"
          return presName.includes(normalizedRef) ||
                 presNameStripped.includes(normalizedRefStripped) ||
                 normalizedRef.includes(presName) ||
                 normalizedRefStripped.includes(presNameStripped) ||
                 // Also check for partial book/chapter match
                 presName.split(/[:\s\-_()]+/).some(part => normalizedRef.includes(part) && part.length > 2);
        })
        .map(pres => {
          // Calculate a simple confidence based on string similarity
          const presName = pres.name.toLowerCase();
          const presNameStripped = presName.replace(/[:\-_()]/g, '').trim();
          let confidence = 0;
          if (presName === normalizedRef || presNameStripped === normalizedRefStripped) {
            confidence = 100;
          } else if (presName.includes(normalizedRef) || normalizedRef.includes(presName) ||
                     presNameStripped.includes(normalizedRefStripped) || normalizedRefStripped.includes(presNameStripped)) {
            confidence = 85;
          } else {
            confidence = 60;
          }
          return {
            uuid: pres.uuid,
            name: pres.name,
            confidence
          };
        })
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5); // Top 5 matches

      const bestMatch = matches[0];
      const requiresReview = !bestMatch || bestMatch.confidence < 85;

      return {
        reference,
        matches,
        bestMatch,
        requiresReview,
        selectedMatch: bestMatch && !requiresReview ? { uuid: bestMatch.uuid, name: bestMatch.name } : undefined
      };
    });

    return { success: true, results };
  } catch (error: any) {
    console.error('Bible verse matching error:', error);
    return { success: false, error: error.message || 'Failed to match Bible verses' };
  }
});

// Focus ProPresenter on a specific playlist item (by header name)
ipcMain.handle('playlist:focus-item', async (_event, config: ConnectionConfig, playlistId: string, headerName: string) => {
  try {
    // Step 1: Fetch playlist items to find the header index
    const getResponse = await fetch(`http://${config.host}:${config.port}/v1/playlist/${playlistId}`);
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch playlist: ${getResponse.status}`);
    }
    const playlistData = await getResponse.json() as any;
    const items = playlistData.items || [];

    // Step 2: Find the header matching the name (case-insensitive)
    const normalizedSearch = headerName.toLowerCase().trim();
    let targetIndex = -1;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type === 'header') {
        const itemName = (item.id?.name || item.name || '').toLowerCase().trim();
        if (itemName.includes(normalizedSearch) || normalizedSearch.includes(itemName)) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      return { success: false, error: `Could not find "${headerName}" section in playlist` };
    }

    // Step 3: Focus the playlist first
    const focusResponse = await fetch(`http://${config.host}:${config.port}/v1/playlist/${playlistId}/focus`, {
      method: 'GET'
    });

    // Step 4: Trigger the specific item to select it
    // ProPresenter API: POST /v1/playlist/{id}/{index}/trigger
    const triggerResponse = await fetch(`http://${config.host}:${config.port}/v1/playlist/${playlistId}/${targetIndex}/trigger`, {
      method: 'GET'
    });

    return { success: true, index: targetIndex };
  } catch (error: any) {
    console.error('Playlist focus error:', error);
    return { success: false, error: error.message || 'Failed to focus playlist item' };
  }
});

ipcMain.handle('playlist:build-service', async (_event, config: ConnectionConfig, playlistId: string, items: any[]) => {
  try {
    // Items should be an array of { type, uuid, name, praiseSlot } representing songs/videos
    // praiseSlot can be: 'praise1', 'praise2', 'praise3', 'kids'

    console.log(`[playlist:build-service] Config: host=${config.host}, port=${config.port}, playlistId=${playlistId}`);

    // Step 1: Fetch current playlist items to preserve structure
    const getUrl = `http://${config.host}:${config.port}/v1/playlist/${playlistId}`;
    console.log(`[playlist:build-service] GET ${getUrl}`);
    const getResponse = await fetch(getUrl);
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch playlist: ${getResponse.status}`);
    }
    const playlistData = await getResponse.json() as any;
    const currentItems = playlistData.items || [];
    console.log(`[playlist:build-service] Found ${currentItems.length} existing items`);

    // Step 2: Group incoming items by praise slot
    const itemsBySlot: Record<string, any[]> = {
      praise1: [],
      praise2: [],
      praise3: [],
      kids: [],
      reading: []
    };
    for (const item of items) {
      const slot = item.praiseSlot || 'praise1';
      if (itemsBySlot[slot]) {
        itemsBySlot[slot].push(item);
      }
    }
    console.log('[playlist:build-service] Items by slot:',
      Object.entries(itemsBySlot).map(([k, v]) => `${k}: ${v.length}`).join(', '));

    // Step 3: Map header names to slots
    // These are the headers we look for in the template
    const headerToSlot: Record<string, string> = {
      'praise 1': 'praise1',
      'praise1': 'praise1',
      'praise 2': 'praise2',
      'praise2': 'praise2',
      'praise 3': 'praise3',
      'praise3': 'praise3',
      'kids talk': 'kids',
      'kids': 'kids',
      'kids song': 'kids',
      'kids video': 'kids',
      'reading': 'reading',
      'bible': 'reading'
    };

    // Step 4: Build new playlist by replacing items in each section
    const newItems: any[] = [];
    let currentSlot: string | null = null;
    let skipUntilNextHeader = false;

    for (let i = 0; i < currentItems.length; i++) {
      const item = currentItems[i];
      const isHeader = item.type === 'header';
      const itemName = (item.id?.name || item.name || '').toLowerCase().trim();

      if (isHeader) {
        // Check if this header marks a praise section
        const matchedSlot = headerToSlot[itemName];
        console.log(`[playlist:build-service] Header "${itemName}" -> slot: ${matchedSlot || 'NONE'}`);

        if (matchedSlot) {
          const slotItemCount = (itemsBySlot[matchedSlot] || []).length;
          console.log(`[playlist:build-service]   Will insert ${slotItemCount} items for slot "${matchedSlot}"`);

          // This is a praise section header - keep the header
          newItems.push(item);

          // Insert our matched songs for this slot
          const slotItems = itemsBySlot[matchedSlot] || [];
          for (const songItem of slotItems) {
            newItems.push({
              id: {
                name: songItem.name,
                uuid: songItem.uuid,
                index: newItems.length
              },
              type: 'presentation',
              is_hidden: false,
              is_pco: false,
              presentation_info: {
                presentation_uuid: songItem.uuid,
                arrangement_name: '',
                arrangement_uuid: ''
              },
              destination: 'presentation'
            });
          }

          // Only skip original items if we're replacing with new ones
          // If no new items, keep the originals
          if (slotItems.length > 0) {
            currentSlot = matchedSlot;
            skipUntilNextHeader = true;
          } else {
            // No replacements - keep existing items in this slot
            skipUntilNextHeader = false;
            currentSlot = null;
          }
        } else {
          // This is a different header (Birthday Blessings, Announcements, etc.)
          // Stop skipping and keep this header
          skipUntilNextHeader = false;
          currentSlot = null;
          newItems.push(item);
        }
      } else {
        // Non-header item
        if (skipUntilNextHeader) {
          // Skip this item - it's a placeholder in a praise section we're replacing
          continue;
        } else {
          // Keep this item - it's not in a praise section
          newItems.push(item);
        }
      }
    }

    // Step 5: Clean all items before sending - ProPresenter PUT expects specific fields only
    // Raw GET response items contain extra fields that cause PUT to return 404
    // CRITICAL: presentation items must have a valid id.uuid (use presentation_uuid as fallback)
    const cleanedItems = newItems.map((item: any, index: number) => {
      // For presentations, ensure id.uuid is set - ProPresenter rejects items with empty uuid
      let itemUuid = item.id?.uuid || '';
      if (item.type === 'presentation' && !itemUuid && item.presentation_info?.presentation_uuid) {
        itemUuid = item.presentation_info.presentation_uuid;
      }

      const cleaned: any = {
        id: {
          name: item.id?.name || item.name || 'Untitled',
          index: index,
          uuid: itemUuid,
        },
        type: item.type,
        is_hidden: item.is_hidden || false,
        is_pco: item.is_pco || false,
      };

      // For headers, include color
      if (item.type === 'header') {
        if (item.header_color) {
          cleaned.header_color = item.header_color;
        }
      }

      // For presentations, include presentation info and duration
      if (item.type === 'presentation') {
        if (item.presentation_info) {
          cleaned.presentation_info = {
            presentation_uuid: item.presentation_info.presentation_uuid,
            arrangement_name: item.presentation_info.arrangement_name || '',
            arrangement_uuid: item.presentation_info.arrangement_uuid || '',
          };
        }
        if (item.duration) {
          cleaned.duration = item.duration;
        }
      }

      // Include destination if present
      if (item.destination) {
        cleaned.destination = item.destination;
      }

      return cleaned;
    });

    console.log(`[playlist:build-service] Built ${cleanedItems.length} items (was ${currentItems.length})`);

    // Step 6: Send PUT request with cleaned items
    const putBody = JSON.stringify(cleanedItems);
    console.log(`[playlist:build-service] PUT http://${config.host}:${config.port}/v1/playlist/${playlistId} (${putBody.length} bytes, ${cleanedItems.length} items)`);

    const putResponse = await fetch(`http://${config.host}:${config.port}/v1/playlist/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: putBody,
    });

    console.log(`[playlist:build-service] PUT response: ${putResponse.status}`);

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      console.error(`[playlist:build-service] PUT failed: ${putResponse.status} ${errorText}`);
      throw new Error(`Failed to update playlist: ${putResponse.status} ${errorText}`);
    }

    return { success: true, itemCount: cleanedItems.length };
  } catch (error: any) {
    console.error('Playlist build error:', error);
    return { success: false, error: error.message || 'Failed to build playlist' };
  }
});