/**
 * Unified API client for the React UI.
 *
 * In Electron mode  → delegates to window.api (IPC via preload)
 * In Web/browser mode → uses fetch() to the Express server
 *
 * Components import `api` from this module instead of touching window.api
 * directly. The detection is automatic: if window.api exists we're in
 * Electron, otherwise we're in a browser talking to the web proxy.
 *
 * Auth: In web mode, Google OAuth sessions handle auth via cookies.
 * The bearer token is only used as a fallback (SSE EventSource
 * can't send cookies, so it uses ?token= query param).
 */

// ── Helpers ────────────────────────────────────────────────────────────

const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.api !== undefined;

/**
 * Bearer token — only needed for SSE EventSource connections
 * (which can't send session cookies). For normal fetch() calls
 * the session cookie handles auth automatically.
 */
let bearerToken: string | null = null;

export function setBearerToken(token: string): void {
  bearerToken = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pp-bearer-token', token);
  }
}

export function getBearerToken(): string | null {
  if (bearerToken) return bearerToken;
  if (typeof localStorage !== 'undefined') {
    bearerToken = localStorage.getItem('pp-bearer-token');
  }
  return bearerToken;
}

export function clearBearerToken(): void {
  bearerToken = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('pp-bearer-token');
  }
}

function jsonHeaders(): Record<string, string> {
  return { 'Content-Type': 'application/json' };
}

async function get<T = any>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: jsonHeaders(),
    credentials: 'include', // Send session cookies
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function post<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: jsonHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function put<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: 'PUT',
    headers: jsonHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function del<T = any>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: 'DELETE',
    headers: jsonHeaders(),
    credentials: 'include',
  });
  if (res.status === 401 || res.status === 403) {
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

// ── Auth helpers ───────────────────────────────────────────────────────

/**
 * Check current auth status.
 */
export async function checkAuth(): Promise<{
  authenticated: boolean;
  method?: string;
  email?: string;
  name?: string;
  picture?: string;
  loginUrl?: string;
}> {
  const res = await fetch('/auth/me', { credentials: 'include' });
  return res.json();
}

/**
 * Check auth configuration (is Google OAuth available?).
 */
export async function getAuthStatus(): Promise<{
  googleOAuth: boolean;
  bearerTokenAvailable: boolean;
  allowedUserCount: number;
}> {
  const res = await fetch('/auth/status');
  return res.json();
}

/**
 * Log out (destroy session).
 */
export async function logout(): Promise<void> {
  await fetch('/auth/logout', { method: 'POST', credentials: 'include' });
}

/**
 * Redirect to Google OAuth login.
 */
export function redirectToLogin(): void {
  window.location.href = '/auth/google';
}

// ── Web implementations ────────────────────────────────────────────────

const webApi = {
  // Settings
  loadSettings: () => get('/api/settings'),
  saveSettings: (data: any) => put('/api/settings', data),

  // Connection
  testConnection: (_config?: any) => get('/api/status'),
  fetchPlaylists: (_config?: any) => get('/api/playlists'),
  fetchLibraries: (_config?: any) => get('/api/libraries'),

  // Export (async job-based)
  startExport: async (payload: any) => {
    const { jobId } = await post('/api/export', {
      playlistId: payload.playlistId,
      playlistName: payload.playlistName,
      libraryFilter: payload.libraryFilter,
      includeSongTitles: payload.includeSongTitles,
      styleOverrides: payload.styleOverrides,
      logoPath: payload.logoPath,
    });

    return { canceled: false, jobId };
  },

  /**
   * Subscribe to export progress via SSE.
   * Uses bearer token in query param since EventSource can't send cookies.
   * Returns an unsubscribe function.
   */
  onExportProgress: (callback: (event: any) => void, jobId?: string) => {
    if (!jobId) return () => {};

    // EventSource can't send cookies, so use bearer token as query param
    const token = getBearerToken();
    const url = `/api/export/${jobId}/progress${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // When export completes, trigger browser download
        if (data.type === 'done' && data.downloadUrl) {
          const a = document.createElement('a');
          a.href = data.downloadUrl;
          a.style.display = 'none';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }

        callback(data);
      } catch { /* ignore parse errors */ }
    };

    source.onerror = () => {
      source.close();
    };

    return () => {
      source.close();
    };
  },

  // Logo — web uses file input, not native dialog
  chooseLogo: async () => {
    return new Promise<{ canceled: boolean; filePath?: string }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg';
      input.onchange = () => {
        if (input.files && input.files[0]) {
          resolve({ canceled: false, filePath: input.files[0].name });
        } else {
          resolve({ canceled: true });
        }
      };
      input.click();
    });
  },

  // Playlist template
  createPlaylistFromTemplate: (_config: any, templateId: string, playlistName: string) =>
    post('/api/service/create-playlist', { templateId, playlistName }),

  // Shell — in web mode, just open in new tab
  openExternal: async (url: string) => {
    window.open(url, '_blank');
    return { success: true };
  },

  // Fonts
  listFonts: () => get('/api/fonts'),
  checkFont: (fontName: string) => get(`/api/fonts/${encodeURIComponent(fontName)}/check`),
  downloadFont: async (url: string) => {
    window.open(url, '_blank');
    return { success: true };
  },

  // Aliases
  loadAliases: () => get('/api/aliases'),
  saveAlias: (songTitle: string, target: { uuid: string; name: string }) =>
    put(`/api/aliases/${encodeURIComponent(songTitle)}`, target),
  removeAlias: (songTitle: string) =>
    del(`/api/aliases/${encodeURIComponent(songTitle)}`),

  // Library search
  searchPresentations: (_config: any, libraryIds: string[], query: string) =>
    get(`/api/libraries/${libraryIds.join(',')}/search?q=${encodeURIComponent(query)}`),

  // Service Generator — PDF upload via file input + multipart
  choosePDF: async () => {
    return new Promise<{ canceled: boolean; filePath?: string }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.pdf,application/pdf';
      input.onchange = () => {
        if (input.files && input.files[0]) {
          (webApi as any)._pendingPDFFile = input.files[0];
          resolve({ canceled: false, filePath: input.files[0].name });
        } else {
          resolve({ canceled: true });
        }
      };
      input.click();
    });
  },

  parsePDF: async (_filePath: string) => {
    const file = (webApi as any)._pendingPDFFile as File | undefined;
    if (!file) {
      return { success: false, error: 'No PDF file selected' };
    }
    delete (webApi as any)._pendingPDFFile;

    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch('/api/service/parse-pdf', {
      method: 'POST',
      credentials: 'include', // Session cookie handles auth
      body: formData,
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  },

  matchSongs: (
    songItems: any[],
    _config: any,
    libraryIds: string[],
    kidsLibraryId?: string,
    serviceContentLibraryId?: string
  ) => post('/api/service/match-songs', { songItems, libraryIds, kidsLibraryId, serviceContentLibraryId }),

  fetchVerses: (references: string[]) =>
    post('/api/service/fetch-verses', { references }),

  matchVerses: (
    verseReferences: string[],
    _config: any,
    serviceContentLibraryId: string
  ) => post('/api/service/match-verses', { verseReferences, serviceContentLibraryId }),

  buildServicePlaylist: (_config: any, playlistId: string, items: any[]) =>
    post('/api/service/build-playlist', { playlistId, items }),

  focusPlaylistItem: (_config: any, playlistId: string, headerName: string) =>
    post('/api/service/focus-item', { playlistId, headerName }),
};

// ── Public API ─────────────────────────────────────────────────────────

/**
 * The unified API. In Electron, delegates to window.api.
 * In browser, uses fetch to the Express server.
 */
export const api: any = new Proxy({} as any, {
  get(_target, prop: string) {
    if (isElectron()) {
      return (window.api as any)[prop];
    }
    return (webApi as any)[prop];
  },
});

/**
 * Whether we're running in a web browser (not Electron).
 */
export const isWebMode = (): boolean => !isElectron();
