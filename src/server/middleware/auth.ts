/**
 * Authentication middleware for the web proxy.
 *
 * Supports two auth methods:
 *   1. Google OAuth session (primary — browser users)
 *   2. Bearer token fallback (for SSE EventSource which can't send cookies,
 *      and for programmatic/API access)
 *
 * The bearer token is auto-generated on first run and stored at
 * ~/.propresenter-words/web-auth.json. It's printed to the console
 * on startup for the admin.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';
import { getRealIp } from './cloudflare';

const CONFIG_DIR = path.join(os.homedir(), '.propresenter-words');
const AUTH_FILE = path.join(CONFIG_DIR, 'web-auth.json');

interface AuthConfig {
  token: string;
  sessionSecret: string;
  createdAt: string;
  googleClientId?: string;
  googleClientSecret?: string;
}

function ensureConfigDir(): void {
  if (!fs.existsSync(CONFIG_DIR)) {
    fs.mkdirSync(CONFIG_DIR, { recursive: true });
  }
}

function loadAuthConfig(): AuthConfig | null {
  try {
    if (!fs.existsSync(AUTH_FILE)) return null;
    const data = fs.readFileSync(AUTH_FILE, 'utf-8');
    return JSON.parse(data) as AuthConfig;
  } catch {
    return null;
  }
}

function saveAuthConfig(config: AuthConfig): void {
  ensureConfigDir();
  fs.writeFileSync(AUTH_FILE, JSON.stringify(config, null, 2), 'utf-8');
  try {
    fs.chmodSync(AUTH_FILE, 0o600);
  } catch { /* Windows */ }
}

/**
 * Ensure auth config exists with token + session secret.
 * Returns the config.
 */
export function ensureAuthConfig(): AuthConfig {
  let config = loadAuthConfig();
  if (!config || !config.token) {
    config = {
      token: crypto.randomUUID(),
      sessionSecret: crypto.randomBytes(32).toString('hex'),
      createdAt: new Date().toISOString(),
      googleClientId: process.env.GOOGLE_CLIENT_ID,
      googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
    };
    saveAuthConfig(config);
  }
  // Ensure sessionSecret exists (migration from older config)
  if (!config.sessionSecret) {
    config.sessionSecret = crypto.randomBytes(32).toString('hex');
    saveAuthConfig(config);
  }
  // Allow env vars to override stored Google credentials
  if (process.env.GOOGLE_CLIENT_ID) {
    config.googleClientId = process.env.GOOGLE_CLIENT_ID;
  }
  if (process.env.GOOGLE_CLIENT_SECRET) {
    config.googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
  }
  return config;
}

/**
 * Get session secret for express-session.
 */
export function getSessionSecret(): string {
  return ensureAuthConfig().sessionSecret;
}

/**
 * Get bearer token (for display / API access).
 */
export function getBearerToken(): string {
  return ensureAuthConfig().token;
}

/**
 * Check if Google OAuth is configured.
 */
export function isGoogleOAuthConfigured(): boolean {
  const config = ensureAuthConfig();
  return !!(config.googleClientId && config.googleClientSecret);
}

/**
 * Get Google OAuth credentials.
 */
export function getGoogleCredentials(): { clientId: string; clientSecret: string } | null {
  const config = ensureAuthConfig();
  if (!config.googleClientId || !config.googleClientSecret) return null;
  return { clientId: config.googleClientId, clientSecret: config.googleClientSecret };
}

/**
 * Rate limiter for auth endpoints — 20 attempts per 15 minutes.
 * Uses CF-Connecting-IP when behind Cloudflare so all clients
 * aren't lumped under the tunnel's single IP.
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  keyGenerator: (req: Request) => getRealIp(req),
  message: { error: 'Too many authentication attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Express middleware that checks authentication.
 *
 * Allows access if ANY of these are true:
 *   1. req.isAuthenticated() — valid Google OAuth session
 *   2. Valid Bearer token in Authorization header
 *   3. Valid token in ?token= query param (for SSE EventSource)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check 1: Google OAuth session
  if (req.isAuthenticated && req.isAuthenticated()) {
    next();
    return;
  }

  // Check 2+3: Bearer token
  const config = loadAuthConfig();
  if (!config || !config.token) {
    res.status(500).json({ error: 'Server auth not configured. Restart the server.' });
    return;
  }

  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({
      error: 'Authentication required',
      loginUrl: '/auth/google',
    });
    return;
  }

  // Constant-time comparison
  const expected = Buffer.from(config.token, 'utf-8');
  const provided = Buffer.from(token, 'utf-8');

  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    res.status(403).json({ error: 'Invalid authentication token' });
    return;
  }

  next();
}
