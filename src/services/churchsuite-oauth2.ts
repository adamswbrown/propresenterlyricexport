import type { ChurchSuiteConfig, ChurchSuiteOAuth2Tokens } from '../types/churchsuite';

/**
 * ChurchSuite OAuth2 service implementing the Client Credentials grant flow.
 *
 * Token endpoint: https://login.churchsuite.com/oauth2/token
 * API base:       https://api.churchsuite.com/v2
 *
 * Credentials (Client ID + Client Secret) are generated from a user's
 * API Secrets tab in ChurchSuite admin.
 */

const TOKEN_URL = 'https://login.churchsuite.com/oauth2/token';
const TOKEN_EXPIRY_BUFFER_MS = 60_000; // Refresh 60 s before actual expiry

/** Request an access token using Client Credentials grant. */
export async function requestAccessToken(
  clientId: string,
  clientSecret: string
): Promise<ChurchSuiteOAuth2Tokens> {
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');

  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Authorization: `Basic ${credentials}`,
    },
    body: 'grant_type=client_credentials',
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Token request failed (${res.status}): ${text}`);
  }

  const data = (await res.json()) as {
    access_token: string;
    token_type: string;
    expires_in?: number;
  };

  return {
    accessToken: data.access_token,
    expiresAt: Date.now() + (data.expires_in ?? 3600) * 1000,
  };
}

/** Check whether the current tokens are still valid (with a buffer). */
export function isTokenValid(config: ChurchSuiteConfig): boolean {
  if (!config.accessToken || !config.tokenExpiresAt) return false;
  return config.tokenExpiresAt - TOKEN_EXPIRY_BUFFER_MS > Date.now();
}
