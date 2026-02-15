/**
 * User allowlist for the web proxy.
 *
 * Only Google accounts whose email appears in the allowlist can sign in.
 * Stored at ~/.propresenter-words/web-users.json
 *
 * Format:
 * {
 *   "allowedEmails": ["alice@gmail.com", "bob@example.com"],
 *   "sessions": {
 *     "alice@gmail.com": { "name": "Alice", "picture": "...", "lastLogin": "..." }
 *   }
 * }
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const CONFIG_DIR = path.join(os.homedir(), '.propresenter-words');
const USERS_FILE = path.join(CONFIG_DIR, 'web-users.json');

export interface UserProfile {
  email: string;
  name: string;
  picture?: string;
  lastLogin: string;
}

interface UsersConfig {
  allowedEmails: string[];
  sessions: Record<string, UserProfile>;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadUsersConfig(): UsersConfig {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      return { allowedEmails: [], sessions: {} };
    }
    const data = fs.readFileSync(USERS_FILE, 'utf-8');
    const parsed = JSON.parse(data);
    return {
      allowedEmails: parsed.allowedEmails || [],
      sessions: parsed.sessions || {},
    };
  } catch {
    return { allowedEmails: [], sessions: {} };
  }
}

function saveUsersConfig(config: UsersConfig): void {
  ensureConfigDir();
  fs.writeFileSync(USERS_FILE, JSON.stringify(config, null, 2), 'utf-8');
  try {
    fs.chmodSync(USERS_FILE, 0o600);
  } catch { /* Windows */ }
}

/**
 * Check if an email is in the allowlist.
 * Comparison is case-insensitive.
 */
export function isEmailAllowed(email: string): boolean {
  const config = loadUsersConfig();
  const normalizedEmail = email.toLowerCase().trim();
  return config.allowedEmails.some(e => e.toLowerCase().trim() === normalizedEmail);
}

/**
 * Get the list of allowed emails.
 */
export function getAllowedEmails(): string[] {
  return loadUsersConfig().allowedEmails;
}

/**
 * Add an email to the allowlist.
 */
export function addAllowedEmail(email: string): void {
  const config = loadUsersConfig();
  const normalizedEmail = email.toLowerCase().trim();
  if (!config.allowedEmails.some(e => e.toLowerCase().trim() === normalizedEmail)) {
    config.allowedEmails.push(normalizedEmail);
    saveUsersConfig(config);
  }
}

/**
 * Remove an email from the allowlist.
 */
export function removeAllowedEmail(email: string): boolean {
  const config = loadUsersConfig();
  const normalizedEmail = email.toLowerCase().trim();
  const before = config.allowedEmails.length;
  config.allowedEmails = config.allowedEmails.filter(e => e.toLowerCase().trim() !== normalizedEmail);
  if (config.allowedEmails.length !== before) {
    // Also remove their session record
    delete config.sessions[normalizedEmail];
    saveUsersConfig(config);
    return true;
  }
  return false;
}

/**
 * Record a user login (update their profile info).
 */
export function recordLogin(profile: UserProfile): void {
  const config = loadUsersConfig();
  config.sessions[profile.email.toLowerCase().trim()] = {
    ...profile,
    lastLogin: new Date().toISOString(),
  };
  saveUsersConfig(config);
}

/**
 * Get the path to the users file (for display in CLI/startup logs).
 */
export function getUsersFilePath(): string {
  return USERS_FILE;
}

/**
 * Initialize the users file if it doesn't exist.
 * Optionally seeds it with an initial admin email.
 */
export function ensureUsersFile(initialEmail?: string): void {
  if (!fs.existsSync(USERS_FILE)) {
    const config: UsersConfig = {
      allowedEmails: initialEmail ? [initialEmail.toLowerCase().trim()] : [],
      sessions: {},
    };
    saveUsersConfig(config);
  }
}
