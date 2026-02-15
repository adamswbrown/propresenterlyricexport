/**
 * Settings routes — load and save app settings
 *
 * Maps to IPC handlers: settings:load, settings:save
 * Also handles logo file uploads for the web proxy.
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { loadSettings, saveSettings } from '../services/settings-store';

export const settingsRoutes = Router();

// Logo upload directory
const UPLOADS_DIR = path.join(os.homedir(), '.propresenter-words', 'uploads');

function ensureUploadsDir(): void {
  if (!fs.existsSync(UPLOADS_DIR)) {
    fs.mkdirSync(UPLOADS_DIR, { recursive: true });
  }
}

// Multer for logo uploads — store with original extension
const logoUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => {
      ensureUploadsDir();
      cb(null, UPLOADS_DIR);
    },
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || '.png';
      cb(null, `logo${ext}`);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/png', 'image/jpeg', 'image/jpg'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only PNG and JPEG images are accepted'));
    }
  },
});

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

/**
 * POST /api/logo/upload
 * Upload a logo image for PPTX export.
 * Stores to ~/.propresenter-words/uploads/logo.<ext>
 * and saves the path to settings.
 */
settingsRoutes.post('/logo/upload', logoUpload.single('file'), (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No image file uploaded' });
      return;
    }

    const logoPath = req.file.path;
    saveSettings({ logoPath });

    res.json({ success: true, filePath: logoPath });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to upload logo' });
  }
});

/**
 * DELETE /api/logo
 * Clear the logo setting.
 */
settingsRoutes.delete('/logo', (_req: Request, res: Response) => {
  try {
    saveSettings({ logoPath: null });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Failed to clear logo' });
  }
});
