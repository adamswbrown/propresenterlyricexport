/**
 * Cloudflare Tunnel middleware.
 *
 * When the Express server sits behind a Cloudflare Tunnel, Cloudflare's
 * edge adds several headers to every request:
 *
 *   CF-Connecting-IP  — the real client IP (most reliable)
 *   CF-Ray            — unique request ID (useful for debugging)
 *   CF-IPCountry      — two-letter country code of the client
 *
 * This middleware:
 *   1. Extracts the real client IP and attaches it to req.realIp
 *   2. Attaches cf-ray and country for logging
 *   3. Optionally logs each request with the real IP
 */

import { Request, Response, NextFunction } from 'express';

// Extend Express Request with Cloudflare fields
declare global {
  namespace Express {
    interface Request {
      realIp?: string;
      cfRay?: string;
      cfCountry?: string;
    }
  }
}

/**
 * Whether the current request came through Cloudflare
 * (detected by the presence of CF-Connecting-IP header).
 */
export function isCloudflareRequest(req: Request): boolean {
  return !!req.headers['cf-connecting-ip'];
}

/**
 * Extract the real client IP.
 * Priority: CF-Connecting-IP → X-Forwarded-For → req.ip
 */
export function getRealIp(req: Request): string {
  const cfIp = req.headers['cf-connecting-ip'];
  if (typeof cfIp === 'string') return cfIp;

  // X-Forwarded-For can be a comma-separated list; first entry is the client
  const xff = req.headers['x-forwarded-for'];
  if (typeof xff === 'string') {
    const first = xff.split(',')[0]?.trim();
    if (first) return first;
  }

  return req.ip || '127.0.0.1';
}

/**
 * Middleware: attach Cloudflare metadata to every request.
 */
export function cloudflareMiddleware(req: Request, _res: Response, next: NextFunction): void {
  req.realIp = getRealIp(req);
  req.cfRay = req.headers['cf-ray'] as string | undefined;
  req.cfCountry = req.headers['cf-ipcountry'] as string | undefined;
  next();
}

/**
 * Validate TUNNEL_URL at startup. Returns warnings (empty = all good).
 */
export function validateTunnelConfig(): string[] {
  const warnings: string[] = [];
  const tunnelUrl = process.env.TUNNEL_URL;

  if (!tunnelUrl) return warnings;

  // Must be HTTPS
  if (!tunnelUrl.startsWith('https://')) {
    warnings.push(`TUNNEL_URL should use https:// (got: ${tunnelUrl})`);
  }

  // No trailing slash
  if (tunnelUrl.endsWith('/')) {
    warnings.push(`TUNNEL_URL should not have a trailing slash (got: ${tunnelUrl})`);
  }

  // Must have a hostname
  try {
    const parsed = new URL(tunnelUrl);
    if (!parsed.hostname || parsed.hostname === 'localhost') {
      warnings.push('TUNNEL_URL should be a public hostname, not localhost');
    }
  } catch {
    warnings.push(`TUNNEL_URL is not a valid URL: ${tunnelUrl}`);
  }

  return warnings;
}

/**
 * Check if the tunnel is reachable by pinging TUNNEL_URL/health.
 * Returns null if TUNNEL_URL is not set.
 */
export async function checkTunnelReachable(): Promise<{
  configured: boolean;
  url: string | null;
  reachable: boolean;
  latencyMs?: number;
  error?: string;
}> {
  const tunnelUrl = process.env.TUNNEL_URL;
  if (!tunnelUrl) {
    return { configured: false, url: null, reachable: false };
  }

  const start = Date.now();
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);

    const res = await fetch(`${tunnelUrl}/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeout);

    const latencyMs = Date.now() - start;
    if (res.ok) {
      return { configured: true, url: tunnelUrl, reachable: true, latencyMs };
    }
    return {
      configured: true,
      url: tunnelUrl,
      reachable: false,
      latencyMs,
      error: `HTTP ${res.status}`,
    };
  } catch (err: any) {
    return {
      configured: true,
      url: tunnelUrl,
      reachable: false,
      error: err.message || 'Connection failed',
    };
  }
}
