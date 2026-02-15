/**
 * Authentication middleware for the web proxy.
 *
 * MVP: Shared bearer token stored at ~/.propresenter-words/web-auth.json
 * The token is auto-generated on first run and printed to the console.
 *
 * Future: Swap in OAuth / OpenID Connect via Passport.js.
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import * as crypto from 'crypto';

const CONFIG_DIR = path.join(os.homedir(), '.propresenter-words');
const AUTH_FILE = path.join(CONFIG_DIR, 'web-auth.json');

interface AuthConfig {
  token: string;
  createdAt: string;
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
  // Restrict permissions to owner only
  try {
    fs.chmodSync(AUTH_FILE, 0o600);
  } catch {
    // Windows doesn't support chmod — acceptable
  }
}

/**
 * Ensure an auth token exists. Creates one if missing.
 * Returns the current token.
 */
export function ensureAuthToken(): string {
  let config = loadAuthConfig();
  if (!config || !config.token) {
    config = {
      token: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
    };
    saveAuthConfig(config);
  }
  return config.token;
}

/**
 * Regenerate the auth token (for rotation).
 */
export function regenerateAuthToken(): string {
  const config: AuthConfig = {
    token: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  saveAuthConfig(config);
  return config.token;
}

/**
 * Rate limiter for auth attempts — 20 attempts per 15 minutes
 */
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many authentication attempts. Try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Express middleware that validates the Bearer token.
 *
 * Token can be provided via:
 *   - Authorization: Bearer <token>
 *   - ?token=<token> query parameter (convenience for SSE EventSource)
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const config = loadAuthConfig();
  if (!config || !config.token) {
    res.status(500).json({ error: 'Server auth not configured. Restart the server.' });
    return;
  }

  // Extract token from header or query
  let token: string | undefined;

  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.slice(7).trim();
  }

  if (!token && typeof req.query.token === 'string') {
    token = req.query.token;
  }

  if (!token) {
    res.status(401).json({ error: 'Authentication required. Provide Authorization: Bearer <token>' });
    return;
  }

  // Constant-time comparison to prevent timing attacks
  const expected = Buffer.from(config.token, 'utf-8');
  const provided = Buffer.from(token, 'utf-8');

  if (expected.length !== provided.length || !crypto.timingSafeEqual(expected, provided)) {
    res.status(403).json({ error: 'Invalid authentication token' });
    return;
  }

  next();
}
