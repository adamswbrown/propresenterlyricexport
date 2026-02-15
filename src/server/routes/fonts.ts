/**
 * Font routes — list curated fonts with install status
 *
 * Maps to IPC handlers: fonts:list, fonts:check
 *
 * Note: fonts:download (opening browser) is client-side in web mode,
 * so we don't need a server endpoint for it.
 */

import { Router, Request, Response } from 'express';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

const execAsync = promisify(exec);

export const fontRoutes = Router();

interface FontOption {
  name: string;
  category: 'sans-serif' | 'serif' | 'display';
  downloadUrl?: string;
}

interface FontStatus {
  name: string;
  category: 'sans-serif' | 'serif' | 'display';
  installed: boolean;
  downloadUrl?: string;
}

const CURATED_FONTS: FontOption[] = [
  // Sans-serif
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
  // Serif
  { name: 'Georgia', category: 'serif' },
  { name: 'Times New Roman', category: 'serif' },
  { name: 'Palatino Linotype', category: 'serif' },
  { name: 'Book Antiqua', category: 'serif' },
  { name: 'Cambria', category: 'serif' },
  { name: 'Garamond', category: 'serif' },
  { name: 'Merriweather', category: 'serif', downloadUrl: 'https://fonts.google.com/specimen/Merriweather' },
  { name: 'Playfair Display', category: 'serif', downloadUrl: 'https://fonts.google.com/specimen/Playfair+Display' },
  { name: 'Lora', category: 'serif', downloadUrl: 'https://fonts.google.com/specimen/Lora' },
  // Display
  { name: 'Impact', category: 'display' },
  { name: 'Oswald', category: 'display', downloadUrl: 'https://fonts.google.com/specimen/Oswald' },
  { name: 'Bebas Neue', category: 'display', downloadUrl: 'https://fonts.google.com/specimen/Bebas+Neue' },
];

async function checkFontInstalled(fontName: string): Promise<boolean> {
  const platform = process.platform;
  const normalizedName = fontName.toLowerCase().replace(/\s+/g, '');

  if (platform === 'darwin') {
    const fontDirs = [
      '/System/Library/Fonts',
      '/Library/Fonts',
      path.join(os.homedir(), 'Library/Fonts'),
    ];

    for (const dir of fontDirs) {
      try {
        const files = await fs.promises.readdir(dir);
        const found = files.some(file => {
          const normalizedFile = file.toLowerCase().replace(/\s+/g, '');
          return normalizedFile.includes(normalizedName) ||
                 normalizedFile.includes(fontName.toLowerCase().replace(/\s+/g, '-'));
        });
        if (found) return true;
      } catch { /* directory not accessible */ }
    }

    try {
      const { stdout } = await execAsync(`fc-list : family | grep -i "${fontName}"`);
      return stdout.trim().length > 0;
    } catch { /* fc-list not available */ }

    return false;
  }

  if (platform === 'win32') {
    const fontDirs = [
      path.join(process.env.WINDIR || 'C:\\Windows', 'Fonts'),
      path.join(os.homedir(), 'AppData', 'Local', 'Microsoft', 'Windows', 'Fonts'),
    ];

    for (const dir of fontDirs) {
      try {
        const files = await fs.promises.readdir(dir);
        const found = files.some(file => {
          const normalizedFile = file.toLowerCase().replace(/\s+/g, '');
          return normalizedFile.includes(normalizedName) ||
                 normalizedFile.includes(fontName.toLowerCase().replace(/\s+/g, '-'));
        });
        if (found) return true;
      } catch { /* directory not accessible */ }
    }

    return false;
  }

  // Linux
  try {
    const { stdout } = await execAsync(`fc-list : family | grep -i "${fontName}"`);
    return stdout.trim().length > 0;
  } catch {
    return false;
  }
}

/**
 * GET /api/fonts
 * List all curated fonts with installation status.
 */
fontRoutes.get('/fonts', async (_req: Request, res: Response) => {
  try {
    const results: FontStatus[] = await Promise.all(
      CURATED_FONTS.map(async (font) => ({
        name: font.name,
        category: font.category,
        installed: await checkFontInstalled(font.name),
        downloadUrl: font.downloadUrl,
      }))
    );
    res.json(results);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check fonts' });
  }
});

/**
 * GET /api/fonts/:name/check
 * Check if a specific font is installed.
 */
fontRoutes.get('/fonts/:name/check', async (req: Request, res: Response) => {
  try {
    const fontName = decodeURIComponent(String(req.params.name));
    const curated = CURATED_FONTS.find(f => f.name.toLowerCase() === fontName.toLowerCase());

    const status: FontStatus = {
      name: curated?.name || fontName,
      category: curated?.category || 'sans-serif',
      installed: await checkFontInstalled(fontName),
      downloadUrl: curated?.downloadUrl,
    };

    res.json(status);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check font' });
  }
});
