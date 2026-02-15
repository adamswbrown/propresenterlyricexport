import React, { useEffect, useState } from 'react';
import { listUsers, addUser, removeUser, toggleAdmin, UserInfo } from '../gui/api-client';

/**
 * User management panel.
 *
 * All authenticated users can view the list.
 * Only admins can add/remove users and toggle admin status.
 * Bearer-token users are always treated as admin.
 */
export function UserManagement({ onClose }: { onClose: () => void }): JSX.Element {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCurrentAdmin, setIsCurrentAdmin] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    loadUsers();
  }, []);

  async function loadUsers(): Promise<void> {
    setLoading(true);
    try {
      const data = await listUsers();
      setUsers(data.users);
      setIsCurrentAdmin(data.isAdmin);
    } catch (err: any) {
      setError(err.message || 'Failed to load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleAdd(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const email = newEmail.trim();
    if (!email) return;

    setAdding(true);
    setError(null);
    try {
      const data = await addUser(email);
      setUsers(data.users);
      setNewEmail('');
    } catch (err: any) {
      setError(err.message || 'Failed to add user');
    } finally {
      setAdding(false);
    }
  }

  async function handleRemove(email: string): Promise<void> {
    setError(null);
    try {
      const data = await removeUser(email);
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || 'Failed to remove user');
    }
  }

  async function handleToggleAdmin(email: string, currentlyAdmin: boolean): Promise<void> {
    setError(null);
    try {
      const data = await toggleAdmin(email, !currentlyAdmin);
      setUsers(data.users);
    } catch (err: any) {
      setError(err.message || 'Failed to update admin status');
    }
  }

  return (
    <div className="settings-overlay" role="dialog" aria-modal="true">
      <div className="settings-modal" style={{ maxWidth: 520 }}>
        <div className="modal-header">
          <div>
            <h2>Manage Users</h2>
            <span className="hint">
              {isCurrentAdmin
                ? 'Add or remove users who can sign in via Google OAuth.'
                : 'Only admins can modify this list. Contact your administrator.'}
            </span>
          </div>
          <button
            className="icon-button"
            type="button"
            aria-label="Close"
            onClick={onClose}
          >
            x
          </button>
        </div>

        {error && <p className="um-error">{error}</p>}

        {isCurrentAdmin && (
          <form className="um-add-form" onSubmit={handleAdd}>
            <input
              type="email"
              placeholder="user@example.com"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              className="um-email-input"
              disabled={adding}
            />
            <button
              className="accent"
              type="submit"
              disabled={adding || !newEmail.trim()}
            >
              {adding ? 'Adding...' : 'Add User'}
            </button>
          </form>
        )}

        <div className="um-user-list">
          {loading ? (
            <p className="empty-state">Loading users...</p>
          ) : users.length === 0 ? (
            <p className="empty-state">
              No users in allowlist.{isCurrentAdmin ? ' Add an email above.' : ''}
            </p>
          ) : (
            users.map(user => (
              <div key={user.email} className="um-user-row">
                <div className="um-user-info">
                  {user.picture && (
                    <img
                      className="um-user-avatar"
                      src={user.picture}
                      alt=""
                      referrerPolicy="no-referrer"
                    />
                  )}
                  {!user.picture && <div className="um-user-avatar-placeholder" />}
                  <div className="um-user-details">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span className="um-user-email">{user.email}</span>
                      {user.isAdmin && <span className="um-admin-badge">Admin</span>}
                    </div>
                    {user.name && (
                      <span className="um-user-name">{user.name}</span>
                    )}
                    {user.lastLogin && (
                      <span className="um-user-last-login">
                        Last login: {new Date(user.lastLogin).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                {isCurrentAdmin && (
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <button
                      className="um-admin-toggle"
                      type="button"
                      onClick={() => handleToggleAdmin(user.email, user.isAdmin)}
                      title={user.isAdmin ? 'Remove admin' : 'Make admin'}
                    >
                      {user.isAdmin ? 'Demote' : 'Admin'}
                    </button>
                    <button
                      className="um-remove-btn"
                      type="button"
                      onClick={() => handleRemove(user.email)}
                      title={`Remove ${user.email}`}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="modal-footer">
          <button className="ghost" type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
