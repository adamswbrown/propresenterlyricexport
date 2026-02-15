/**
 * ProPresenter Lyrics Export — Web Proxy Server
 *
 * Express server that wraps the existing ProPresenterClient and services
 * behind authenticated HTTP endpoints. Designed to be exposed via an
 * outbound-only tunnel (Cloudflare Tunnel or Tailscale Funnel).
 *
 * Authentication: Google OAuth (primary) + Bearer token (fallback/API)
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import session from 'express-session';
import passport from 'passport';
import path from 'path';

import {
  authMiddleware,
  ensureAuthConfig,
  getSessionSecret,
  getBearerToken,
} from './middleware/auth';
import { cloudflareMiddleware, validateTunnelConfig } from './middleware/cloudflare';
import { authRoutes, configureGoogleStrategy } from './routes/auth';
import { connectionRoutes } from './routes/connection';
import { exportRoutes } from './routes/export';
import { settingsRoutes } from './routes/settings';
import { aliasRoutes } from './routes/aliases';
import { fontRoutes } from './routes/fonts';
import { serviceGeneratorRoutes } from './routes/service-generator';
import { userRoutes } from './routes/users';
import { ensureUsersFile, getAllowedEmails, getUsersFilePath } from './services/user-store';

const PORT = parseInt(process.env.WEB_PORT || '3100', 10);
const HOST = process.env.WEB_HOST || '0.0.0.0';

const app = express();

// Trust proxy when behind a tunnel (Cloudflare, Tailscale, nginx)
app.set('trust proxy', 1);

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
      imgSrc: ["'self'", 'data:', 'blob:', 'https://lh3.googleusercontent.com'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'", 'https://fonts.gstatic.com'],
    },
  },
}));

// CORS — in tunnel mode the origin is the tunnel domain
const allowedOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(',')
  : undefined;

app.use(cors({
  origin: allowedOrigins || true,
  credentials: true,
}));

// Cloudflare: extract real client IP + CF headers before anything else
app.use(cloudflareMiddleware);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sessions (required for Passport OAuth)
app.use(session({
  secret: getSessionSecret(),
  resave: false,
  saveUninitialized: false,
  name: 'pp.sid',
  cookie: {
    secure: process.env.NODE_ENV === 'production' || !!process.env.TUNNEL_URL,
    httpOnly: true,
    maxAge: 6 * 60 * 60 * 1000, // 6 hours
    sameSite: 'lax',
  },
}));

// Passport initialization
app.use(passport.initialize());
app.use(passport.session());

// Health check (unauthenticated — useful for tunnel monitoring)
app.get('/health', async (req, res) => {
  const base: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  // Include tunnel info if configured
  const tunnelUrl = process.env.TUNNEL_URL;
  if (tunnelUrl) {
    base.tunnel = { configured: true, url: tunnelUrl };
  }

  // Show Cloudflare presence when CF headers are present
  if (req.cfRay) {
    base.cloudflare = { ray: req.cfRay, country: req.cfCountry };
  }

  // Deep tunnel check — only when ?check=tunnel is requested
  // (avoids recursive /health calls on every normal health check)
  if (req.query.check === 'tunnel' && tunnelUrl) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const start = Date.now();
      const tunnelRes = await fetch(`${tunnelUrl}/health`, { signal: controller.signal });
      clearTimeout(timeout);
      base.tunnel.reachable = tunnelRes.ok;
      base.tunnel.latencyMs = Date.now() - start;
    } catch (err: any) {
      base.tunnel.reachable = false;
      base.tunnel.error = err.message || 'Connection failed';
    }
  }

  res.json(base);
});

// Auth routes (unauthenticated — login/callback/status)
app.use(authRoutes);

// Auth middleware on all /api routes
app.use('/api', authMiddleware);

// Mount API routes
app.use('/api', connectionRoutes);
app.use('/api', exportRoutes);
app.use('/api', settingsRoutes);
app.use('/api', aliasRoutes);
app.use('/api', fontRoutes);
app.use('/api', serviceGeneratorRoutes);
app.use('/api', userRoutes);

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
  // Ensure config files exist
  ensureAuthConfig();
  ensureUsersFile();

  // Determine the callback base URL for Google OAuth
  const tunnelUrl = process.env.TUNNEL_URL || `http://localhost:${PORT}`;
  const oauthConfigured = configureGoogleStrategy(tunnelUrl);

  const token = getBearerToken();
  const allowedEmails = getAllowedEmails();

  // Validate tunnel config before starting
  const tunnelWarnings = validateTunnelConfig();

  app.listen(PORT, HOST, () => {
    console.log('');
    console.log('  ProPresenter Lyrics Export — Web Proxy');
    console.log('  ======================================');
    console.log(`  Server:  http://${HOST}:${PORT}`);
    console.log(`  Health:  http://${HOST}:${PORT}/health`);
    console.log('');

    // Cloudflare Tunnel status
    if (process.env.TUNNEL_URL) {
      console.log(`  Tunnel:  ${process.env.TUNNEL_URL}`);
      if (tunnelWarnings.length > 0) {
        for (const w of tunnelWarnings) {
          console.log(`  ⚠ ${w}`);
        }
      } else {
        console.log('  Tunnel config: OK');
      }
      console.log('');
    }

    // Google OAuth status
    if (oauthConfigured) {
      console.log('  Google OAuth: ENABLED');
      console.log(`  Callback URL: ${tunnelUrl}/auth/google/callback`);
      if (allowedEmails.length > 0) {
        console.log(`  Allowed users: ${allowedEmails.join(', ')}`);
      } else {
        console.log('  Allowed users: (none — add emails to allowlist)');
      }
      console.log(`  Users file:    ${getUsersFilePath()}`);
    } else {
      console.log('  Google OAuth: NOT CONFIGURED');
      console.log('  To enable, set environment variables:');
      console.log('    GOOGLE_CLIENT_ID=<your-client-id>');
      console.log('    GOOGLE_CLIENT_SECRET=<your-client-secret>');
      console.log('    TUNNEL_URL=https://pp.yourdomain.com');
      console.log('');
      console.log('  Using bearer token auth only (see below).');
    }

    console.log('');
    console.log(`  Bearer token: ${token}`);
    console.log('  (fallback auth for API access / SSE)');
    console.log('');
    if (!process.env.TUNNEL_URL) {
      console.log('  Expose via tunnel:');
      console.log(`    cloudflared tunnel run --url http://localhost:${PORT} <tunnel-name>`);
      console.log('    — or —');
      console.log(`    tailscale serve --bg ${PORT}`);
      console.log('');
    }
  });
}

// Direct execution
if (require.main === module) {
  startServer();
}

export { app };
