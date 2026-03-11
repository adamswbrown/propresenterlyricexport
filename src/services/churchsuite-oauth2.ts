import type { ChurchSuiteConfig, ChurchSuiteOAuth2Tokens } from '../types/churchsuite';
import * as crypto from 'crypto';
import * as http from 'http';

/**
 * ChurchSuite OAuth2 service implementing the Authorization Code flow.
 *
 * OAuth endpoints live at: https://{account}.churchsuite.com/oauth
 * - Authorize: /oauth/authorize
 * - Token:     /oauth/token
 *
 * For desktop (Electron) apps we spin up a temporary loopback HTTP server
 * to receive the authorization callback, avoiding the need for a hosted
 * redirect URI.
 */

const LOOPBACK_HOST = '127.0.0.1';
const LOOPBACK_PORT = 51839; // Arbitrary high port for the callback server
const REDIRECT_URI = `http://${LOOPBACK_HOST}:${LOOPBACK_PORT}/callback`;
const TOKEN_EXPIRY_BUFFER_MS = 60_000; // Refresh 60 s before actual expiry

function oauthBaseUrl(account: string): string {
  return `https://${account}.churchsuite.com/oauth`;
}

/** Build the authorization URL the user should visit in their browser. */
export function getAuthorizationUrl(account: string, clientId: string, state: string): string {
  const base = oauthBaseUrl(account);
  const params = new URLSearchParams({
    response_type: 'code',
    client_id: clientId,
    redirect_uri: REDIRECT_URI,
    state,
  });
  return `${base}/authorize?${params.toString()}`;
}

/** Exchange an authorization code for access + refresh tokens. */
export async function exchangeCodeForTokens(
  account: string,
  clientId: string,
  clientSecret: string,
  code: string
): Promise<ChurchSuiteOAuth2Tokens> {
  const tokenUrl = `${oauthBaseUrl(account)}/token`;

  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    code,
    redirect_uri: REDIRECT_URI,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token exchange failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

/** Refresh an expired access token using the refresh token. */
export async function refreshAccessToken(
  account: string,
  clientId: string,
  clientSecret: string,
  refreshToken: string
): Promise<ChurchSuiteOAuth2Tokens> {
  const tokenUrl = `${oauthBaseUrl(account)}/token`;

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  });

  const res = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token refresh failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    refresh_token?: string;
    expires_in?: number;
    token_type: string;
  };

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken, // Keep old refresh token if not rotated
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

/** Check whether the current tokens are still valid (with a buffer). */
export function isTokenValid(config: ChurchSuiteConfig): boolean {
  if (!config.accessToken || !config.tokenExpiresAt) return false;
  return config.tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS > Date.now();
}

/** Check whether token can be refreshed. */
export function canRefresh(config: ChurchSuiteConfig): boolean {
  return Boolean(config.refreshToken);
}

/**
 * Start a temporary loopback HTTP server to capture the OAuth2 callback.
 * Returns a promise that resolves with the authorization code and state.
 *
 * The server automatically shuts down after receiving the callback or
 * after the timeout (default 120 s).
 */
export function listenForCallback(
  timeoutMs = 120_000
): { promise: Promise<{ code: string; state: string }>; abort: () => void } {
  let server: http.Server | null = null;
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  let settled = false;

  const promise = new Promise<{ code: string; state: string }>((resolve, reject) => {
    server = http.createServer((req, res) => {
      const url = new URL(req.url || '/', `http://${LOOPBACK_HOST}:${LOOPBACK_PORT}`);

      if (url.pathname !== '/callback') {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const code = url.searchParams.get('code');
      const state = url.searchParams.get('state');
      const error = url.searchParams.get('error');

      // Send a user-friendly HTML page
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      if (code) {
        res.end('<html><body style="font-family:system-ui;text-align:center;padding:60px"><h2>Authorised!</h2><p>You can close this tab and return to the app.</p></body></html>');
      } else {
        res.end(`<html><body style="font-family:system-ui;text-align:center;padding:60px"><h2>Authorization Failed</h2><p>${error || 'Unknown error'}</p></body></html>`);
      }

      settled = true;
      cleanup();

      if (code && state) {
        resolve({ code, state });
      } else {
        reject(new Error(error || 'Authorization callback missing code'));
      }
    });

    server.listen(LOOPBACK_PORT, LOOPBACK_HOST, () => {
      // Server ready
    });

    server.on('error', (err) => {
      if (!settled) {
        settled = true;
        reject(err);
      }
    });

    timeoutHandle = setTimeout(() => {
      if (!settled) {
        settled = true;
        cleanup();
        reject(new Error('OAuth2 authorization timed out'));
      }
    }, timeoutMs);
  });

  function cleanup() {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
    if (server) {
      server.close();
      server = null;
    }
  }

  return {
    promise,
    abort: () => {
      if (!settled) {
        settled = true;
        cleanup();
      }
    },
  };
}

/** Generate a random state parameter to protect against CSRF. */
export function generateState(): string {
  return crypto.randomBytes(16).toString('hex');
}

/** The redirect URI used by this OAuth2 implementation. */
export const OAUTH2_REDIRECT_URI = REDIRECT_URI;
