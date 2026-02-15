import React, { useCallback, useEffect, useState } from 'react';
import { checkAuth, logout } from '../gui/api-client';
import { LoginPage } from './LoginPage';
import { UserManagement } from './UserManagement';
import App from '@electron/App';

type AuthUser = {
  email?: string;
  name?: string;
  picture?: string;
  method?: string;
  isAdmin?: boolean;
};

/**
 * AuthGate wraps the main App component.
 *
 * - On mount, checks /auth/me to see if user has a valid session.
 * - If authenticated → renders the App + user menu.
 * - If not → renders the LoginPage.
 */
export function AuthGate(): JSX.Element {
  const [checking, setChecking] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [showUserMgmt, setShowUserMgmt] = useState(false);

  const verifyAuth = useCallback(() => {
    setChecking(true);
    checkAuth()
      .then(data => {
        if (data.authenticated) {
          setUser({
            email: data.email,
            name: data.name,
            picture: data.picture,
            method: data.method,
            isAdmin: (data as any).isAdmin,
          });
        } else {
          setUser(null);
        }
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => setChecking(false));
  }, []);

  useEffect(() => {
    verifyAuth();
  }, [verifyAuth]);

  async function handleLogout(): Promise<void> {
    await logout();
    setUser(null);
  }

  if (checking) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onTokenLogin={verifyAuth} />;
  }

  return (
    <>
      <div className="web-user-menu">
        {user.picture && (
          <img
            className="web-user-avatar"
            src={user.picture}
            alt=""
            referrerPolicy="no-referrer"
          />
        )}
        <span className="web-user-name">
          {user.name || user.email || 'API User'}
        </span>
        <button
          className="web-logout-btn"
          type="button"
          onClick={() => setShowUserMgmt(true)}
        >
          Users
        </button>
        <button
          className="web-logout-btn"
          type="button"
          onClick={handleLogout}
        >
          Sign out
        </button>
      </div>
      <App />
      {showUserMgmt && (
        <UserManagement onClose={() => setShowUserMgmt(false)} />
      )}
    </>
  );
}
