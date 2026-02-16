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
  typeof window !== 'undefined' && !!(window as any).__ELECTRON_API__;

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
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getBearerToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Handle auth failures — in web mode, reload the page so AuthGate
 * re-checks and shows the login screen.
 */
function handleAuthFailure(): never {
  if (typeof window !== 'undefined' && !(window as any).__ELECTRON_API__) {
    window.location.reload();
  }
  throw new Error('Authentication failed');
}

async function get<T = any>(path: string): Promise<T> {
  const res = await fetch(path, {
    headers: jsonHeaders(),
    credentials: 'include', // Send session cookies
  });
  if (res.status === 401 || res.status === 403) handleAuthFailure();
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
  if (res.status === 401 || res.status === 403) handleAuthFailure();
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
  if (res.status === 401 || res.status === 403) handleAuthFailure();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function del<T = any>(path: string): Promise<T> {
  const res = await fetch(path, {
    method: 'DELETE',
    headers: jsonHeaders(),
    credentials: 'include',
  });
  if (res.status === 401 || res.status === 403) handleAuthFailure();
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
  const headers: Record<string, string> = {};
  const token = getBearerToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch('/auth/me', { credentials: 'include', headers });
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

// ── Export progress ───────────────────────────────────────────────────
//
// Electron pattern:
//   useEffect(() => {
//     const unsub = window.api.onExportProgress(callback);
//     return unsub;
//   }, []);
//   ...
//   await window.api.startExport(payload);
//
// In web mode we need to store the callback first, then when
// startExport returns a jobId, we auto-connect SSE to pipe events.

let _progressCallback: ((event: any) => void) | null = null;
let _activeSSE: EventSource | null = null;

function connectSSE(jobId: string): void {
  // Close any previous SSE connection
  if (_activeSSE) {
    _activeSSE.close();
    _activeSSE = null;
  }

  const token = getBearerToken();
  const url = `/api/export/${jobId}/progress${token ? `?token=${encodeURIComponent(token)}` : ''}`;
  const source = new EventSource(url);

  source.onmessage = (event) => {
    try {
      const data = JSON.parse(event.data);

      // Map server events to the Electron progress event format
      const mapped = {
        playlistId: data.playlistId || jobId,
        type: data.type || 'info',
        message: data.message,
        itemName: data.itemName,
        totalSongs: data.totalSongs,
        outputPath: data.outputPath,
      };

      // When export completes, trigger browser download
      if (data.type === 'done' && data.downloadUrl) {
        mapped.type = 'pptx:complete';
        mapped.outputPath = data.downloadUrl;
        // Use fetch so the bearer token is included in the request
        fetch(data.downloadUrl, { headers: jsonHeaders(), credentials: 'include' })
          .then(r => {
            const disposition = r.headers.get('content-disposition') || '';
            const match = disposition.match(/filename="?([^"]+)"?/);
            const fileName = match ? match[1] : 'export.pptx';
            return r.blob().then(blob => ({ blob, fileName }));
          })
          .then(({ blob, fileName }) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = fileName;
            a.style.display = 'none';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
          })
          .catch(() => { /* download fallback handled by UI */ });
      }

      _progressCallback?.(mapped);
    } catch { /* ignore parse errors */ }
  };

  source.onerror = () => {
    source.close();
    _activeSSE = null;
  };

  _activeSSE = source;
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

  // Export — matches Electron's interface:
  //   startExport(payload) → { success, canceled, outputPath?, error? }
  //   onExportProgress(callback) → unsubscribe
  startExport: async (payload: any) => {
    const { jobId } = await post('/api/export', {
      playlistId: payload.playlistId,
      playlistName: payload.playlistName,
      libraryFilter: payload.libraryFilter,
      includeSongTitles: payload.includeSongTitles,
      styleOverrides: payload.styleOverrides,
      logoPath: payload.logoPath,
    });

    // Auto-connect SSE for progress if a callback is registered
    if (_progressCallback && jobId) {
      connectSSE(jobId);
    }

    // Return a shape compatible with what App.tsx expects
    return { canceled: false, success: true, jobId };
  },

  /**
   * Register a callback for export progress events.
   * Mirrors Electron's window.api.onExportProgress(callback) → unsubscribe.
   * The actual SSE connection is established later when startExport runs.
   */
  onExportProgress: (callback: (event: any) => void) => {
    _progressCallback = callback;
    return () => {
      _progressCallback = null;
      if (_activeSSE) {
        _activeSSE.close();
        _activeSSE = null;
      }
    };
  },

  // Logo — file input + upload to server
  chooseLogo: async () => {
    return new Promise<{ canceled: boolean; filePath?: string }>((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/png,image/jpeg';
      input.onchange = async () => {
        if (input.files && input.files[0]) {
          try {
            const formData = new FormData();
            formData.append('file', input.files[0]);
            const res = await fetch('/api/logo/upload', {
              method: 'POST',
              credentials: 'include',
              body: formData,
            });
            if (!res.ok) throw new Error(`Upload failed: ${res.status}`);
            const data = await res.json();
            resolve({ canceled: false, filePath: data.filePath });
          } catch {
            resolve({ canceled: false, filePath: input.files[0].name });
          }
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

// ── window.api shim for web mode ──────────────────────────────────────

/**
 * Install webApi as window.api so existing React components
 * (App.tsx, ServiceGeneratorView.tsx) work without modification.
 *
 * Call this BEFORE mounting React in the web entry point.
 */
export function installWebApiShim(): void {
  if (typeof window !== 'undefined' && !(window as any).__ELECTRON_API__) {
    (window as any).api = webApi;
  }
}

// ── Public API ─────────────────────────────────────────────────────────

/**
 * The unified API. In Electron, delegates to window.api.
 * In browser, uses fetch to the Express server.
 */
export const api: any = new Proxy({} as any, {
  get(_target, prop: string) {
    if (isElectron()) {
      return (window as any).api[prop];
    }
    return (webApi as any)[prop];
  },
});

/**
 * Whether we're running in a web browser (not Electron).
 */
export const isWebMode = (): boolean => !isElectron();

// ── User management (web-only) ───────────────────────────────────────

export type UserInfo = {
  email: string;
  name?: string;
  picture?: string;
  lastLogin?: string;
  isAdmin: boolean;
};

async function patch<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: 'PATCH',
    headers: jsonHeaders(),
    credentials: 'include',
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) handleAuthFailure();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

export async function listUsers(): Promise<{ users: UserInfo[]; total: number; isAdmin: boolean }> {
  return get('/api/users');
}

export async function addUser(email: string): Promise<{ success: boolean; message: string; users: UserInfo[]; total: number }> {
  return post('/api/users', { email });
}

export async function removeUser(email: string): Promise<{ success: boolean; users: UserInfo[]; total: number }> {
  return del(`/api/users/${encodeURIComponent(email)}`);
}

export async function toggleAdmin(email: string, admin: boolean): Promise<{ success: boolean; users: UserInfo[]; total: number }> {
  return patch(`/api/users/${encodeURIComponent(email)}/admin`, { admin });
}
