/**
 * User management routes — admin-only endpoints for managing the allowlist.
 *
 * Only admins (emails in adminEmails) can add/remove users.
 * Bearer-token auth is also treated as admin (server operator).
 *
 * Routes:
 *   GET    /api/users              — List all allowed users + session info
 *   POST   /api/users              — Add a user email to the allowlist
 *   DELETE /api/users/:email       — Remove a user from the allowlist
 *   PATCH  /api/users/:email/admin — Toggle admin status
 */

import { Router, Request, Response } from 'express';
import {
  getAllUsers,
  getAllowedEmails,
  addAllowedEmail,
  removeAllowedEmail,
  isAdmin,
  setAdmin,
} from '../services/user-store';

export const userRoutes = Router();

/**
 * Check if the current request is from an admin.
 * Admins are:
 *   - Users whose email is in the adminEmails list
 *   - Bearer-token users (server operator)
 */
function isRequestAdmin(req: Request): boolean {
  // Bearer-token auth = server operator = admin
  if (!req.isAuthenticated || !req.isAuthenticated()) {
    // If we got here, auth middleware passed, so it must be bearer token
    return true;
  }

  const user = req.user as { email?: string } | undefined;
  if (!user?.email) return false;
  return isAdmin(user.email);
}

/**
 * Admin-only middleware for mutating user operations.
 */
function requireAdmin(req: Request, res: Response, next: () => void): void {
  if (!isRequestAdmin(req)) {
    res.status(403).json({ error: 'Admin access required' });
    return;
  }
  next();
}

/**
 * GET /api/users
 * List all allowed users with their session info (name, picture, last login).
 * Also returns whether the current user is an admin.
 */
userRoutes.get('/users', (req: Request, res: Response) => {
  const currentIsAdmin = isRequestAdmin(req);
  const users = getAllUsers();
  res.json({ users, total: users.length, isAdmin: currentIsAdmin });
});

/**
 * POST /api/users
 * Add a user email to the allowlist. Admin-only.
 * Body: { email: "user@example.com" }
 */
userRoutes.post('/users', requireAdmin, (req: Request, res: Response) => {
  const { email } = req.body || {};

  if (!email || typeof email !== 'string') {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const normalized = email.toLowerCase().trim();

  // Basic email validation
  if (!normalized.includes('@') || !normalized.includes('.')) {
    res.status(400).json({ error: 'Invalid email address' });
    return;
  }

  const existing = getAllowedEmails();
  if (existing.some(e => e.toLowerCase().trim() === normalized)) {
    const users = getAllUsers();
    res.json({ success: true, message: 'User already in allowlist', email: normalized, users, total: users.length });
    return;
  }

  addAllowedEmail(normalized);
  const users = getAllUsers();
  res.json({ success: true, message: 'User added', email: normalized, users, total: users.length });
});

/**
 * DELETE /api/users/:email
 * Remove a user from the allowlist. Admin-only.
 */
userRoutes.delete('/users/:email', requireAdmin, (req: Request, res: Response) => {
  const email = decodeURIComponent(String(req.params.email));

  if (!email) {
    res.status(400).json({ error: 'Email is required' });
    return;
  }

  const removed = removeAllowedEmail(email);
  if (!removed) {
    res.status(404).json({ error: 'User not found in allowlist' });
    return;
  }

  const users = getAllUsers();
  res.json({ success: true, message: 'User removed', email, users, total: users.length });
});

/**
 * PATCH /api/users/:email/admin
 * Toggle admin status for a user. Admin-only.
 * Body: { admin: true | false }
 */
userRoutes.patch('/users/:email/admin', requireAdmin, (req: Request, res: Response) => {
  const email = decodeURIComponent(String(req.params.email));
  const { admin } = req.body || {};

  if (typeof admin !== 'boolean') {
    res.status(400).json({ error: 'admin field (boolean) is required' });
    return;
  }

  const success = setAdmin(email, admin);
  if (!success) {
    res.status(404).json({ error: 'User not found in allowlist' });
    return;
  }

  const users = getAllUsers();
  res.json({ success: true, users, total: users.length });
});
