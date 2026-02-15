/**
 * JSON file-based settings store for the web proxy.
 * Replaces electron-store with a simple JSON file at
 * ~/.propresenter-words/web-settings.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { DEFAULT_PPTX_TEXT_STYLE } from '../../pptx-exporter';

const CONFIG_DIR = path.join(os.homedir(), '.propresenter-words');
const SETTINGS_FILE = path.join(CONFIG_DIR, 'web-settings.json');

export interface AppSettings {
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

const DEFAULT_HOST = process.env.PROPRESENTER_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(process.env.PROPRESENTER_PORT || '1025', 10);
const DEFAULT_LIBRARY = process.env.PROPRESENTER_LIBRARY || 'Worship';

const DEFAULT_SETTINGS: AppSettings = {
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
};

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

export function loadSettings(): AppSettings {
  try {
    if (!fs.existsSync(SETTINGS_FILE)) {
      return { ...DEFAULT_SETTINGS };
    }
    const data = fs.readFileSync(SETTINGS_FILE, 'utf-8');
    const stored = JSON.parse(data);
    return { ...DEFAULT_SETTINGS, ...stored };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = loadSettings();
  const merged = { ...current, ...partial };
  ensureConfigDir();
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(merged, null, 2), 'utf-8');
  return merged;
}

export function getConnectionConfig(): { host: string; port: number } {
  const s = loadSettings();
  return { host: s.host, port: s.port };
}
