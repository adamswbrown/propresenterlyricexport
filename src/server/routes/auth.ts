/**
 * Authentication routes — Google OAuth + session management
 *
 * Routes:
 *   GET  /auth/google           — Initiate Google OAuth flow
 *   GET  /auth/google/callback  — OAuth callback (Google redirects here)
 *   GET  /auth/me               — Get current user info (or 401)
 *   POST /auth/logout           — Destroy session
 *   GET  /auth/status           — Auth config status (is OAuth configured?)
 */

import { Router, Request, Response, NextFunction } from 'express';
import passport from 'passport';
import { Strategy as GoogleStrategy, Profile } from 'passport-google-oauth20';
import {
  getGoogleCredentials,
  isGoogleOAuthConfigured,
  authRateLimiter,
  getBearerToken,
} from '../middleware/auth';
import {
  isEmailAllowed,
  recordLogin,
  getAllowedEmails,
  getUsersFilePath,
} from '../services/user-store';

export const authRoutes = Router();

// ── Passport serialization ─────────────────────────────────────────────

interface SerializedUser {
  email: string;
  name: string;
  picture?: string;
}

passport.serializeUser((user: any, done) => {
  done(null, {
    email: user.email,
    name: user.name,
    picture: user.picture,
  } as SerializedUser);
});

passport.deserializeUser((obj: SerializedUser, done) => {
  done(null, obj);
});

// ── Configure Google strategy (deferred until credentials are available) ──

let googleStrategyConfigured = false;

export function configureGoogleStrategy(callbackBaseUrl: string): boolean {
  const creds = getGoogleCredentials();
  if (!creds) return false;

  const callbackURL = `${callbackBaseUrl}/auth/google/callback`;

  passport.use(new GoogleStrategy(
    {
      clientID: creds.clientId,
      clientSecret: creds.clientSecret,
      callbackURL,
      scope: ['email', 'profile'],
    },
    (
      _accessToken: string,
      _refreshToken: string,
      profile: Profile,
      done: (error: any, user?: any) => void
    ) => {
      const email = profile.emails?.[0]?.value;
      if (!email) {
        return done(new Error('No email returned from Google'));
      }

      // Check allowlist
      if (!isEmailAllowed(email)) {
        return done(null, false);
      }

      const user = {
        email: email.toLowerCase().trim(),
        name: profile.displayName || email,
        picture: profile.photos?.[0]?.value,
      };

      // Record the login
      recordLogin({ ...user, lastLogin: new Date().toISOString() });

      return done(null, user);
    }
  ));

  googleStrategyConfigured = true;
  return true;
}

// ── Routes ─────────────────────────────────────────────────────────────

/**
 * GET /auth/status
 * Returns whether Google OAuth is configured and how many users are allowed.
 * Unauthenticated — used by the login page to decide what to show.
 */
authRoutes.get('/auth/status', (_req: Request, res: Response) => {
  const oauthConfigured = isGoogleOAuthConfigured() && googleStrategyConfigured;
  const allowedEmails = getAllowedEmails();

  res.json({
    googleOAuth: oauthConfigured,
    bearerTokenAvailable: true,
    allowedUserCount: allowedEmails.length,
    usersFilePath: getUsersFilePath(),
  });
});

/**
 * GET /auth/google
 * Start Google OAuth flow. Redirects to Google's consent screen.
 */
authRoutes.get('/auth/google', authRateLimiter, (req: Request, res: Response, next: NextFunction) => {
  if (!googleStrategyConfigured) {
    res.status(503).json({
      error: 'Google OAuth not configured',
      hint: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET environment variables, then restart.',
    });
    return;
  }

  passport.authenticate('google', {
    scope: ['email', 'profile'],
  })(req, res, next);
});

/**
 * GET /auth/google/callback
 * Google redirects here after consent. Creates session on success.
 */
authRoutes.get('/auth/google/callback',
  (req: Request, res: Response, next: NextFunction) => {
    if (!googleStrategyConfigured) {
      res.redirect('/?error=oauth_not_configured');
      return;
    }

    passport.authenticate('google', {
      failureRedirect: '/?error=access_denied',
      failureMessage: true,
    })(req, res, next);
  },
  (_req: Request, res: Response) => {
    // Successful authentication — redirect to the app
    res.redirect('/');
  }
);

/**
 * GET /auth/me
 * Get current authenticated user info.
 * Returns 401 if not authenticated.
 */
authRoutes.get('/auth/me', (req: Request, res: Response) => {
  if (req.isAuthenticated && req.isAuthenticated()) {
    const user = req.user as SerializedUser;
    res.json({
      authenticated: true,
      method: 'google',
      email: user.email,
      name: user.name,
      picture: user.picture,
    });
    return;
  }

  // Check bearer token in header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.slice(7).trim();
    const expected = getBearerToken();
    if (token === expected) {
      res.json({
        authenticated: true,
        method: 'bearer_token',
        email: null,
        name: 'API User',
      });
      return;
    }
  }

  res.status(401).json({
    authenticated: false,
    loginUrl: '/auth/google',
  });
});

/**
 * POST /auth/logout
 * Destroy the current session.
 */
authRoutes.post('/auth/logout', (req: Request, res: Response) => {
  if (req.logout) {
    req.logout((err) => {
      if (err) {
        res.status(500).json({ error: 'Logout failed' });
        return;
      }
      req.session?.destroy(() => {
        res.json({ success: true });
      });
    });
  } else {
    req.session?.destroy(() => {
      res.json({ success: true });
    });
  }
});
