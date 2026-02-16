/**
 * Viewer routes — public, no authentication required.
 *
 * Serves a real-time slide viewer for congregation members to follow
 * along on their phones/tablets. Mounted at /viewer on the web proxy.
 */

import { Router, Request, Response } from 'express';
import http from 'http';
import path from 'path';
import { viewerService } from '../services/viewer-service';
import { getConnectionConfig } from '../services/settings-store';

export const viewerRoutes = Router();

// Track SSE clients
const sseClients = new Set<Response>();

// ── SSE broadcasting ──

viewerService.on('slideChange', (status) => {
  const thumbUrl = (status.presentationUuid && status.slideIndex >= 0)
    ? `/viewer/api/thumbnail/${status.presentationUuid}/${status.slideIndex}?t=${Date.now()}`
    : null;

  const message = JSON.stringify({
    type: 'slideChange',
    thumbnail: thumbUrl,
    index: status.slideIndex,
    currentText: status.currentText,
    nextTitle: status.nextText ? status.nextText.split('\n')[0] : '',
    presentationUuid: status.presentationUuid,
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${message}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
});

viewerService.on('disconnected', () => {
  const message = JSON.stringify({
    type: 'disconnected',
    status: viewerService.getStatus(),
  });
  for (const client of sseClients) {
    try {
      client.write(`data: ${message}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
});

// ── Static assets ──

const viewerPublicDir = path.join(__dirname, '..', '..', '..', 'viewer', 'public');

viewerRoutes.get('/viewer', (_req: Request, res: Response) => {
  res.sendFile(path.join(viewerPublicDir, 'index.html'));
});

viewerRoutes.get('/viewer/styles.css', (_req: Request, res: Response) => {
  res.sendFile(path.join(viewerPublicDir, 'styles.css'));
});

viewerRoutes.get('/viewer/viewer.js', (_req: Request, res: Response) => {
  res.sendFile(path.join(viewerPublicDir, 'viewer.js'));
});

viewerRoutes.get('/viewer/apple-touch-icon.png', (_req: Request, res: Response) => {
  res.sendFile(path.join(viewerPublicDir, 'apple-touch-icon.png'));
});

viewerRoutes.get('/viewer/icon.svg', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'image/svg+xml');
  res.sendFile(path.join(viewerPublicDir, 'icon.svg'));
});

// ── API routes ──

viewerRoutes.get('/viewer/api/status', (_req: Request, res: Response) => {
  res.json(viewerService.getStatus());
});

viewerRoutes.get('/viewer/api/slide', (_req: Request, res: Response) => {
  const slide = viewerService.getCurrentSlide();
  if (slide.presentationUuid && slide.slideIndex >= 0) {
    res.json({
      ...slide,
      thumbnail: `/viewer/api/thumbnail/${slide.presentationUuid}/${slide.slideIndex}?t=${Date.now()}`,
    });
  } else {
    res.json(slide);
  }
});

// Direct thumbnail proxy — fetches JPEG from ProPresenter API
viewerRoutes.get('/viewer/api/thumbnail/:uuid/:index', (req: Request, res: Response) => {
  const { host, port } = getConnectionConfig();
  if (!host) {
    res.status(503).json({ error: 'Not configured' });
    return;
  }

  const url = `http://${host}:${port}/v1/presentation/${req.params.uuid}/thumbnail/${req.params.index}`;

  http.get(url, { timeout: 5000 }, (ppRes) => {
    if (ppRes.statusCode !== 200) {
      res.status(ppRes.statusCode || 502).end();
      return;
    }
    res.setHeader('Content-Type', ppRes.headers['content-type'] || 'image/jpeg');
    res.setHeader('Cache-Control', 'no-cache');
    ppRes.pipe(res);
  }).on('error', () => {
    res.status(502).json({ error: 'Failed to fetch thumbnail' });
  });
});

// SSE endpoint
viewerRoutes.get('/viewer/events', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  sseClients.add(res);

  // Send initial state
  const status = viewerService.getStatus();
  res.write(`data: ${JSON.stringify({ type: status.connected ? 'connected' : 'disconnected', status })}\n\n`);

  // If already connected with a slide, send current state immediately
  const slide = viewerService.getCurrentSlide();
  if (slide.presentationUuid && slide.slideIndex >= 0) {
    const thumbUrl = `/viewer/api/thumbnail/${slide.presentationUuid}/${slide.slideIndex}?t=${Date.now()}`;
    res.write(`data: ${JSON.stringify({
      type: 'slideChange',
      thumbnail: thumbUrl,
      index: slide.slideIndex,
      currentText: slide.currentText,
      nextTitle: '',
      presentationUuid: slide.presentationUuid,
    })}\n\n`);
  }

  req.on('close', () => {
    sseClients.delete(res);
  });
});
