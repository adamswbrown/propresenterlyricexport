/**
 * Structured logger for the web proxy server.
 *
 * Writes JSON-lines to ~/.propresenter-words/logs/ with automatic rotation.
 * Each log file covers one day; files older than LOG_RETENTION_DAYS are pruned
 * on startup.
 *
 * Usage:
 *   import { log } from './services/logger';
 *   log.info('Server started', { port: 3100 });
 *   log.warn('Slow request', { ms: 2300 });
 *   log.error('Export failed', { error: err.message });
 */

import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const LOG_DIR = path.join(os.homedir(), '.propresenter-words', 'logs');
const LOG_RETENTION_DAYS = parseInt(process.env.LOG_RETENTION_DAYS || '14', 10);

type LogLevel = 'info' | 'warn' | 'error';

function ensureLogDir(): void {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true });
  }
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10); // YYYY-MM-DD
}

function logFilePath(): string {
  return path.join(LOG_DIR, `web-${todayStamp()}.log`);
}

function formatLine(level: LogLevel, message: string, data?: Record<string, any>): string {
  const entry: Record<string, any> = {
    ts: new Date().toISOString(),
    level,
    msg: message,
  };
  if (data) {
    Object.assign(entry, data);
  }
  return JSON.stringify(entry);
}

function write(level: LogLevel, message: string, data?: Record<string, any>): void {
  const line = formatLine(level, message, data);

  // Console output (always)
  const consoleMethod = level === 'error' ? console.error : level === 'warn' ? console.warn : console.log;
  consoleMethod(`[${level.toUpperCase()}] ${message}`, data ? JSON.stringify(data) : '');

  // File output
  try {
    ensureLogDir();
    fs.appendFileSync(logFilePath(), line + '\n', 'utf-8');
  } catch {
    // Don't crash the server if logging fails
  }
}

/**
 * Prune log files older than LOG_RETENTION_DAYS.
 * Called once on server startup.
 */
export function pruneOldLogs(): void {
  try {
    ensureLogDir();
    const files = fs.readdirSync(LOG_DIR);
    const cutoff = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
      if (!file.startsWith('web-') || !file.endsWith('.log')) continue;
      const filePath = path.join(LOG_DIR, file);
      try {
        const stat = fs.statSync(filePath);
        if (stat.mtimeMs < cutoff) {
          fs.unlinkSync(filePath);
        }
      } catch { /* skip files we can't stat */ }
    }
  } catch { /* ignore prune errors */ }
}

export const log = {
  info: (message: string, data?: Record<string, any>) => write('info', message, data),
  warn: (message: string, data?: Record<string, any>) => write('warn', message, data),
  error: (message: string, data?: Record<string, any>) => write('error', message, data),
  /** Path to the log directory (for display in startup banner) */
  dir: LOG_DIR,
};
