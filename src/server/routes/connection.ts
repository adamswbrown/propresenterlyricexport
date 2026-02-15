/**
 * Connection routes — status, playlists, libraries
 *
 * Maps to IPC handlers: connection:test, playlists:list, libraries:list
 */

import { Router, Request, Response } from 'express';
import { ProPresenterClient } from '../../propresenter-client';
import { mapPlaylistTree } from '../../utils/playlist-utils';
import { loadSettings } from '../services/settings-store';

export const connectionRoutes = Router();

/**
 * GET /api/status
 * Test connection to ProPresenter, return version info.
 */
connectionRoutes.get('/status', async (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });
    const versionInfo = await client.connect();

    res.json({
      success: true,
      ...versionInfo,
    });
  } catch (error: any) {
    res.json({
      success: false,
      error: error.message || 'Failed to connect to ProPresenter',
    });
  }
});

/**
 * GET /api/playlists
 * List all playlists as a tree.
 */
connectionRoutes.get('/playlists', async (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    const { host, port } = settings;

    // Try direct fetch first (same strategy as Electron main process)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    try {
      const response = await fetch(`http://${host}:${port}/v1/playlists`, {
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const parseItems = (items: any[]): any[] => items.map((item: any) => ({
        uuid: item.id?.uuid || item.uuid || '',
        name: item.id?.name || item.name || 'Unnamed',
        type: item.field_type || item.type || 'unknown',
        isHeader: item.field_type === 'header' || item.type === 'header',
        children: (item.items || item.children) ? parseItems(item.items || item.children) : undefined,
      }));

      const playlists = parseItems(data as any[]);
      res.json(mapPlaylistTree(playlists));
    } catch (fetchError: any) {
      clearTimeout(timeoutId);
      // Fall back to library approach
      const client = new ProPresenterClient({ host, port });
      await client.connect();
      const playlists = await client.getPlaylists();
      res.json(mapPlaylistTree(playlists));
    }
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch playlists' });
  }
});

/**
 * GET /api/libraries
 * List all ProPresenter libraries.
 */
connectionRoutes.get('/libraries', async (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });
    await client.connect();
    const libraries = await client.getLibraries();
    res.json(libraries);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch libraries' });
  }
});
