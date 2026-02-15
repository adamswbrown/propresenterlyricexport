/**
 * ProPresenter Lyrics Export — Web Proxy Server
 *
 * Express server that wraps the existing ProPresenterClient and services
 * behind authenticated HTTP endpoints. Designed to be exposed via an
 * outbound-only tunnel (Cloudflare Tunnel or Tailscale Funnel).
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';

import { authMiddleware, ensureAuthToken } from './middleware/auth';
import { connectionRoutes } from './routes/connection';
import { exportRoutes } from './routes/export';
import { settingsRoutes } from './routes/settings';
import { aliasRoutes } from './routes/aliases';
import { fontRoutes } from './routes/fonts';
import { serviceGeneratorRoutes } from './routes/service-generator';

const PORT = parseInt(process.env.WEB_PORT || '3100', 10);
const HOST = process.env.WEB_HOST || '0.0.0.0';

const app = express();

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'blob:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
    },
  },
}));

// CORS — in tunnel mode the origin is the tunnel domain
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : undefined; // undefined = allow all (single-user tool)

app.use(cors({
  origin: allowedOrigins || true,
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Health check (unauthenticated — useful for tunnel monitoring)
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth middleware on all /api routes
app.use('/api', authMiddleware);

// Mount API routes
app.use('/api', connectionRoutes);
app.use('/api', exportRoutes);
app.use('/api', settingsRoutes);
app.use('/api', aliasRoutes);
app.use('/api', fontRoutes);
app.use('/api', serviceGeneratorRoutes);

// Serve static React build (production)
const staticDir = path.join(__dirname, '..', '..', 'dist-web');
app.use(express.static(staticDir));

// SPA fallback — serve index.html for non-API routes
app.get('*', (_req, res) => {
  const indexPath = path.join(staticDir, 'index.html');
  res.sendFile(indexPath, (err) => {
    if (err) {
      res.status(404).json({ error: 'Not found' });
    }
  });
});

export function startServer(): void {
  const token = ensureAuthToken();

  app.listen(PORT, HOST, () => {
    console.log('');
    console.log('  ProPresenter Lyrics Export — Web Proxy');
    console.log('  ======================================');
    console.log(`  Server:  http://${HOST}:${PORT}`);
    console.log(`  Health:  http://${HOST}:${PORT}/health`);
    console.log('');
    console.log(`  Auth token: ${token}`);
    console.log('  (share this with your remote user)');
    console.log('');
    console.log('  Expose via tunnel:');
    console.log(`    cloudflared tunnel run --url http://localhost:${PORT} <tunnel-name>`);
    console.log('    — or —');
    console.log(`    tailscale serve --bg ${PORT}`);
    console.log('');
  });
}

// Direct execution
if (require.main === module) {
  startServer();
}

export { app };
