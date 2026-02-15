/**
 * Export routes — PPTX generation with SSE progress
 *
 * Maps to IPC handlers: export:start, export:progress
 *
 * Flow:
 *   1. POST /api/export → starts export, returns { jobId }
 *   2. GET  /api/export/:id/progress → SSE stream of progress events
 *   3. GET  /api/export/:id/download → download the generated PPTX file
 */

import { Router, Request, Response } from 'express';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ProPresenterClient } from '../../propresenter-client';
import { collectPlaylistLyrics, PlaylistProgressEvent } from '../../services/playlist-exporter';
import { exportToPowerPoint, PptxTextStyle } from '../../pptx-exporter';
import { findLogoPath } from '../../services/logo';
import { loadSettings, saveSettings, AppSettings } from '../services/settings-store';

export const exportRoutes = Router();

interface ExportJob {
  id: string;
  status: 'pending' | 'running' | 'complete' | 'error';
  progress: any[];
  filePath?: string;
  fileName?: string;
  error?: string;
  createdAt: number;
  /** SSE listeners waiting for events */
  listeners: Set<Response>;
}

// In-memory job store (single-user tool, no need for persistence)
const jobs = new Map<string, ExportJob>();

// Clean up old jobs every 30 minutes
setInterval(() => {
  const threshold = Date.now() - 30 * 60 * 1000;
  for (const [id, job] of jobs) {
    if (job.createdAt < threshold) {
      if (job.filePath) {
        try { fs.unlinkSync(job.filePath); } catch { /* ignore */ }
      }
      jobs.delete(id);
    }
  }
}, 30 * 60 * 1000);

function sanitizeColor(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.replace(/^#/, '').trim();
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'playlist';
}

function broadcastEvent(job: ExportJob, event: any): void {
  job.progress.push(event);
  const data = `data: ${JSON.stringify(event)}\n\n`;
  for (const listener of job.listeners) {
    try {
      listener.write(data);
    } catch {
      job.listeners.delete(listener);
    }
  }
}

function forwardProgress(job: ExportJob, playlistId: string, event: PlaylistProgressEvent): void {
  switch (event.type) {
    case 'library:search':
      broadcastEvent(job, { playlistId, type: 'info', message: `Scanning ${event.libraryName} library...` });
      break;
    case 'library:not-found':
      broadcastEvent(job, { playlistId, type: 'warning', message: `Library "${event.libraryName}" not found.` });
      break;
    case 'playlist:start':
      broadcastEvent(job, { playlistId, type: 'info', message: `Found ${event.totalItems} playlist items. Collecting lyric slides...` });
      break;
    case 'playlist:item:success':
      broadcastEvent(job, { playlistId, type: 'song:success', itemName: event.item.name });
      break;
    case 'playlist:item:error':
      broadcastEvent(job, { playlistId, type: 'song:error', itemName: event.item.name, message: event.error });
      break;
    case 'playlist:item:skip':
      broadcastEvent(job, { playlistId, type: 'song:skip', itemName: event.item.name });
      break;
    case 'complete':
      broadcastEvent(job, { playlistId, type: 'collection:complete', totalSongs: event.totalSongs });
      break;
  }
}

/**
 * POST /api/export
 * Start a PPTX export. Returns { jobId }.
 */
exportRoutes.post('/export', async (req: Request, res: Response) => {
  const {
    playlistId,
    playlistName,
    libraryFilter,
    includeSongTitles,
    styleOverrides,
    logoPath,
  } = req.body;

  if (!playlistId || !playlistName) {
    res.status(400).json({ error: 'playlistId and playlistName are required' });
    return;
  }

  const jobId = crypto.randomUUID();
  const job: ExportJob = {
    id: jobId,
    status: 'pending',
    progress: [],
    createdAt: Date.now(),
    listeners: new Set(),
  };
  jobs.set(jobId, job);

  // Start export in background (don't await)
  runExport(job, { playlistId, playlistName, libraryFilter, includeSongTitles, styleOverrides, logoPath });

  res.json({ jobId });
});

/**
 * GET /api/export/:id/progress
 * Server-Sent Events stream for export progress.
 */
exportRoutes.get('/export/:id/progress', (req: Request, res: Response) => {
  const job = jobs.get(String(req.params.id));
  if (!job) {
    res.status(404).json({ error: 'Export job not found' });
    return;
  }

  // Set up SSE
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no', // Disable nginx/Cloudflare buffering
  });

  // Send any events that already happened (replay)
  for (const event of job.progress) {
    res.write(`data: ${JSON.stringify(event)}\n\n`);
  }

  // If already done, send final event and close
  if (job.status === 'complete') {
    res.write(`data: ${JSON.stringify({ type: 'done', downloadUrl: `/api/export/${job.id}/download` })}\n\n`);
    res.end();
    return;
  }
  if (job.status === 'error') {
    res.write(`data: ${JSON.stringify({ type: 'error', message: job.error })}\n\n`);
    res.end();
    return;
  }

  // Keepalive: send a comment every 30s to prevent Cloudflare's
  // 100-second idle timeout from dropping the connection.
  // SSE comments (lines starting with ':') are ignored by EventSource.
  const keepalive = setInterval(() => {
    try {
      res.write(':keepalive\n\n');
    } catch {
      clearInterval(keepalive);
    }
  }, 30_000);

  // Register as listener for future events
  job.listeners.add(res);

  req.on('close', () => {
    clearInterval(keepalive);
    job.listeners.delete(res);
  });
});

/**
 * GET /api/export/:id/download
 * Download the generated PPTX file.
 */
exportRoutes.get('/export/:id/download', (req: Request, res: Response) => {
  const job = jobs.get(String(req.params.id));
  if (!job) {
    res.status(404).json({ error: 'Export job not found' });
    return;
  }
  if (job.status !== 'complete' || !job.filePath) {
    res.status(400).json({ error: 'Export not yet complete' });
    return;
  }

  const fileName = job.fileName || 'export.pptx';
  res.download(job.filePath, fileName, (err) => {
    if (err && !res.headersSent) {
      res.status(500).json({ error: 'Failed to send file' });
    }
  });
});

async function runExport(
  job: ExportJob,
  payload: {
    playlistId: string;
    playlistName: string;
    libraryFilter?: string | null;
    includeSongTitles?: boolean;
    styleOverrides?: Partial<PptxTextStyle>;
    logoPath?: string | null;
  }
): Promise<void> {
  job.status = 'running';

  try {
    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });
    await client.connect();

    const effectiveLibraryFilter = payload.libraryFilter !== undefined
      ? (payload.libraryFilter?.trim() || null)
      : (settings.libraryFilter || null);

    const result = await collectPlaylistLyrics(client, payload.playlistId, {
      libraryFilter: effectiveLibraryFilter,
      onProgress: (event) => forwardProgress(job, payload.playlistId, event),
    });

    if (result.songs.length === 0) {
      throw new Error('No lyric slides found in this playlist.');
    }

    broadcastEvent(job, {
      playlistId: payload.playlistId,
      type: 'pptx:start',
      totalSongs: result.songs.length,
    });

    const effectiveIncludeSongTitles =
      payload.includeSongTitles ?? settings.includeSongTitles ?? true;

    const effectiveLogoPath =
      payload.logoPath?.trim() || settings.logoPath || findLogoPath([]);

    // Resolve style overrides (merge stored + payload)
    const storedStyle: Partial<PptxTextStyle> = {
      textColor: settings.textColor,
      fontFace: settings.fontFace,
      fontSize: settings.fontSize,
      titleFontSize: settings.titleFontSize,
      bold: settings.bold,
      italic: settings.italic,
    };
    const mergedStyle: Partial<PptxTextStyle> = {
      ...storedStyle,
      ...payload.styleOverrides,
    };
    mergedStyle.textColor = sanitizeColor(mergedStyle.textColor);

    // Write to temp directory
    const fileName = `${slugify(payload.playlistName)}-${Date.now()}.pptx`;
    const outputPath = path.join(os.tmpdir(), fileName);

    const lyricsOnly = result.songs.map(entry => entry.lyrics);
    await exportToPowerPoint(lyricsOnly, {
      outputPath,
      logoPath: effectiveLogoPath || undefined,
      includeSongTitles: effectiveIncludeSongTitles,
      styleOverrides: mergedStyle,
    });

    job.status = 'complete';
    job.filePath = outputPath;
    job.fileName = fileName;

    broadcastEvent(job, {
      playlistId: payload.playlistId,
      type: 'pptx:complete',
      downloadUrl: `/api/export/${job.id}/download`,
    });

    // Send terminal SSE event and close all listeners
    const doneData = `data: ${JSON.stringify({ type: 'done', downloadUrl: `/api/export/${job.id}/download` })}\n\n`;
    for (const listener of job.listeners) {
      try {
        listener.write(doneData);
        listener.end();
      } catch { /* ignore */ }
    }
    job.listeners.clear();

    // Persist relevant settings
    const valuesToPersist: Partial<AppSettings> = {
      lastPlaylistId: payload.playlistId,
    };
    if (effectiveLibraryFilter !== undefined) {
      valuesToPersist.libraryFilter = effectiveLibraryFilter;
    }
    if (typeof payload.includeSongTitles === 'boolean') {
      valuesToPersist.includeSongTitles = payload.includeSongTitles;
    }
    if (payload.styleOverrides) {
      if (payload.styleOverrides.textColor) valuesToPersist.textColor = sanitizeColor(payload.styleOverrides.textColor) || settings.textColor;
      if (payload.styleOverrides.fontFace) valuesToPersist.fontFace = payload.styleOverrides.fontFace;
      if (typeof payload.styleOverrides.fontSize === 'number') valuesToPersist.fontSize = payload.styleOverrides.fontSize;
      if (typeof payload.styleOverrides.titleFontSize === 'number') valuesToPersist.titleFontSize = payload.styleOverrides.titleFontSize;
      if (typeof payload.styleOverrides.bold === 'boolean') valuesToPersist.bold = payload.styleOverrides.bold;
      if (typeof payload.styleOverrides.italic === 'boolean') valuesToPersist.italic = payload.styleOverrides.italic;
    }
    if (payload.logoPath) valuesToPersist.logoPath = payload.logoPath;
    saveSettings(valuesToPersist);

  } catch (error: any) {
    job.status = 'error';
    job.error = error.message || 'Export failed';

    broadcastEvent(job, {
      playlistId: payload.playlistId,
      type: 'error',
      message: job.error,
    });

    // Close all listeners
    const errData = `data: ${JSON.stringify({ type: 'error', message: job.error })}\n\n`;
    for (const listener of job.listeners) {
      try {
        listener.write(errData);
        listener.end();
      } catch { /* ignore */ }
    }
    job.listeners.clear();
  }
}
