/**
 * Launch route — start ProPresenter from the web interface.
 *
 * POST /api/propresenter/launch
 *   Launches ProPresenter on the host machine and polls until
 *   the API is reachable (or times out).
 *
 * GET  /api/propresenter/running
 *   Quick check: is the ProPresenter process running?
 */

import { Router, Request, Response } from 'express';
import {
  isProPresenterRunning,
  launchAndWaitForAPI,
} from '../services/launch-propresenter';
import { loadSettings } from '../services/settings-store';
import { log } from '../services/logger';

export const launchRoutes = Router();

/**
 * GET /api/propresenter/running
 * Returns { running: boolean } — lightweight process check.
 */
launchRoutes.get('/propresenter/running', async (_req: Request, res: Response) => {
  try {
    const running = await isProPresenterRunning();
    res.json({ running });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to check process status' });
  }
});

/**
 * POST /api/propresenter/launch
 * Launch ProPresenter and wait for the API to become available.
 *
 * Response:
 *   { success, launched, ready, error? }
 *   - launched: true if we actually started the process (false if it was already running)
 *   - ready: true if the API responded before the timeout
 */
launchRoutes.post('/propresenter/launch', async (_req: Request, res: Response) => {
  try {
    const settings = loadSettings();
    const host = settings.host || '127.0.0.1';
    const port = settings.port || 1025;

    log.info('Launch ProPresenter requested', { host, port });

    const result = await launchAndWaitForAPI(host, port);

    if (result.ready) {
      log.info('ProPresenter is ready', { launched: result.launched });
    } else {
      log.warn('ProPresenter launch: API not ready in time', {
        launched: result.launched,
        error: result.error,
      });
    }

    res.json({
      success: result.ready,
      launched: result.launched,
      ready: result.ready,
      error: result.error,
    });
  } catch (error: any) {
    log.error('Failed to launch ProPresenter', { error: error.message });
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to launch ProPresenter',
    });
  }
});
