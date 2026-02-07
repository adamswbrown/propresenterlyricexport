/**
 * Song Alias Store
 * Persistent storage for song name → ProPresenter presentation mappings.
 * Used by both CLI and Electron GUI.
 *
 * Aliases are stored in a JSON file at ~/.propresenter-words/aliases.json
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface SongAlias {
  uuid: string;    // ProPresenter presentation UUID
  name: string;    // ProPresenter presentation name (for display)
}

export type AliasMap = Record<string, SongAlias>;

const CONFIG_DIR = path.join(os.homedir(), '.propresenter-words');
const ALIASES_FILE = path.join(CONFIG_DIR, 'aliases.json');

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

/**
 * Load all aliases from disk
 */
export function loadAliases(): AliasMap {
  try {
    if (!fs.existsSync(ALIASES_FILE)) {
      return {};
    }
    const data = fs.readFileSync(ALIASES_FILE, 'utf-8');
    return JSON.parse(data) as AliasMap;
  } catch {
    return {};
  }
}

/**
 * Save all aliases to disk
 */
export function saveAliases(aliases: AliasMap): void {
  ensureConfigDir();
  fs.writeFileSync(ALIASES_FILE, JSON.stringify(aliases, null, 2), 'utf-8');
}

/**
 * Add or update a single alias
 */
export function setAlias(songTitle: string, target: SongAlias): void {
  const aliases = loadAliases();
  const key = normalizeName(songTitle);
  aliases[key] = { ...target, };
  // Store the original title for display
  (aliases[key] as any)._originalTitle = songTitle;
  saveAliases(aliases);
}

/**
 * Remove an alias by song title
 */
export function removeAlias(songTitle: string): boolean {
  const aliases = loadAliases();
  const key = normalizeName(songTitle);
  if (key in aliases) {
    delete aliases[key];
    saveAliases(aliases);
    return true;
  }
  return false;
}

/**
 * Get an alias by song title
 */
export function getAlias(songTitle: string): SongAlias | undefined {
  const aliases = loadAliases();
  return aliases[normalizeName(songTitle)];
}

/**
 * Convert alias map to the format SongMatcher expects: Record<string, string>
 * Maps normalized song title → presentation UUID
 */
export function aliasesToCustomMappings(aliases: AliasMap): Record<string, string> {
  const mappings: Record<string, string> = {};
  for (const [key, value] of Object.entries(aliases)) {
    mappings[key] = value.uuid;
  }
  return mappings;
}

/**
 * Normalize a song title for use as alias key.
 * Must match the normalization in SongMatcher so lookups work.
 */
function normalizeName(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Get the path to the aliases file (for display in CLI)
 */
export function getAliasFilePath(): string {
  return ALIASES_FILE;
}
