/**
 * Alias routes — CRUD for song name overrides
 *
 * Maps to IPC handlers: aliases:load, aliases:save, aliases:remove
 */

import { Router, Request, Response } from 'express';
import { loadAliases, setAlias, removeAlias } from '../../services/alias-store';

export const aliasRoutes = Router();

/**
 * GET /api/aliases
 * Load all aliases.
 */
aliasRoutes.get('/aliases', (_req: Request, res: Response) => {
  try {
    const aliases = loadAliases();
    res.json(aliases);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load aliases' });
  }
});

/**
 * PUT /api/aliases/:songTitle
 * Add or update an alias.
 * Body: { uuid: string, name: string }
 */
aliasRoutes.put('/aliases/:songTitle', (req: Request, res: Response) => {
  try {
    const songTitle = decodeURIComponent(String(req.params.songTitle));
    const { uuid, name } = req.body;

    if (!uuid || !name) {
      res.status(400).json({ error: 'uuid and name are required' });
      return;
    }

    setAlias(songTitle, { uuid, name });
    const aliases = loadAliases();
    res.json(aliases);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save alias' });
  }
});

/**
 * DELETE /api/aliases/:songTitle
 * Remove an alias.
 */
aliasRoutes.delete('/aliases/:songTitle', (req: Request, res: Response) => {
  try {
    const songTitle = decodeURIComponent(String(req.params.songTitle));
    const removed = removeAlias(songTitle);
    const aliases = loadAliases();
    res.json({ removed, aliases });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to remove alias' });
  }
});
