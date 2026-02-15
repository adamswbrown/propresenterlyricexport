/**
 * Settings routes — load and save app settings
 *
 * Maps to IPC handlers: settings:load, settings:save
 */

import { Router, Request, Response } from 'express';
import { loadSettings, saveSettings } from '../services/settings-store';

export const settingsRoutes = Router();

/**
 * GET /api/settings
 * Load current settings.
 */
settingsRoutes.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    res.json(settings);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to load settings' });
  }
});

/**
 * PUT /api/settings
 * Update settings (partial merge).
 */
settingsRoutes.put('/settings', (req: Request, res: Response) => {
  try {
    const updated = saveSettings(req.body);
    res.json(updated);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to save settings' });
  }
});
