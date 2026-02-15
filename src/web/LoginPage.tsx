import React, { useEffect, useState } from 'react';
import { getAuthStatus, redirectToLogin, setBearerToken } from '../gui/api-client';

/**
 * Login page shown when the user is not authenticated.
 *
 * If Google OAuth is configured → shows "Sign in with Google" button.
 * Always shows a bearer-token fallback form.
 */
export function LoginPage({ onTokenLogin }: { onTokenLogin: () => void }): JSX.Element {
  const [googleAvailable, setGoogleAvailable] = useState(false);
  const [tokenInput, setTokenInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAuthStatus()
      .then(status => {
        setGoogleAvailable(status.googleOAuth);
      })
      .catch(() => {
        // Server unreachable — show token-only login
      })
      .finally(() => setLoading(false));
  }, []);

  // Check URL for error params (e.g. from failed OAuth)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const err = params.get('error');
    if (err === 'access_denied') {
      setError('Access denied. Your email may not be in the allowlist.');
    } else if (err === 'oauth_not_configured') {
      setError('Google OAuth is not configured on the server.');
    } else if (err) {
      setError(`Login error: ${err}`);
    }
    // Clean URL params
    if (err) {
      window.history.replaceState({}, '', '/');
    }
  }, []);

  function handleTokenSubmit(e: React.FormEvent): void {
    e.preventDefault();
    const token = tokenInput.trim();
    if (!token) return;

    setError(null);
    setBearerToken(token);

    // Verify the token by checking /auth/me with it
    fetch('/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(res => res.json())
      .then(data => {
        if (data.authenticated) {
          onTokenLogin();
        } else {
          setError('Invalid token.');
        }
      })
      .catch(() => {
        setError('Could not reach the server.');
      });
  }

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner" />
      </div>
    );
  }

  return (
    <div className="login-container">
      <div className="login-card">
        <h1>ProPresenter Lyrics</h1>
        <p className="eyebrow">Remote Access</p>

        {error && <p className="login-error">{error}</p>}

        {googleAvailable && (
          <>
            <button
              className="login-google-btn"
              type="button"
              onClick={() => redirectToLogin()}
            >
              Sign in with Google
            </button>
            <div className="login-divider">or use a token</div>
          </>
        )}

        <form className="login-token-form" onSubmit={handleTokenSubmit}>
          <label>
            Bearer token
            <input
              type="password"
              value={tokenInput}
              onChange={e => setTokenInput(e.target.value)}
              placeholder="Paste token from server console"
              autoComplete="off"
            />
          </label>
          <button className="login-token-submit" type="submit">
            Sign in with token
          </button>
        </form>

        <p className="login-hint">
          {googleAvailable
            ? 'Ask your administrator for access, or use the bearer token printed in the server console.'
            : 'Enter the bearer token shown in the server console on startup.'}
        </p>
      </div>
    </div>
  );
}
