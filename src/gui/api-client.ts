/**
 * Unified API client for the React UI.
 *
 * In Electron mode  → delegates to window.api (IPC via preload)
 * In Web/browser mode → uses fetch() to the Express server
 *
 * Components import `api` from this module instead of touching window.api
 * directly. The detection is automatic: if window.api exists we're in
 * Electron, otherwise we're in a browser talking to the web proxy.
 */

// ── Helpers ────────────────────────────────────────────────────────────

const isElectron = (): boolean =>
  typeof window !== 'undefined' && window.api !== undefined;

/** Auth token stored after login */
let authToken: string | null = null;

export function setAuthToken(token: string): void {
  authToken = token;
  if (typeof localStorage !== 'undefined') {
    localStorage.setItem('pp-web-token', token);
  }
}

export function getAuthToken(): string | null {
  if (authToken) return authToken;
  if (typeof localStorage !== 'undefined') {
    authToken = localStorage.getItem('pp-web-token');
  }
  return authToken;
}

export function clearAuthToken(): void {
  authToken = null;
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('pp-web-token');
  }
}

function headers(extra?: Record<string, string>): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', ...extra };
  const token = getAuthToken();
  if (token) h['Authorization'] = `Bearer ${token}`;
  return h;
}

async function get<T = any>(path: string): Promise<T> {
  const res = await fetch(path, { headers: headers() });
  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function post<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function put<T = any>(path: string, body?: any): Promise<T> {
  const res = await fetch(path, {
    method: 'PUT',
    headers: headers(),
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
}

async function del<T = any>(path: string): Promise<T> {
  const res = await fetch(path, { method: 'DELETE', headers: headers() });
  if (res.status === 401 || res.status === 403) {
    clearAuthToken();
    throw new Error('Authentication failed');
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  return res.json();
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

    // The web version returns a jobId. The caller uses onExportProgress
    // to subscribe to SSE events and eventually gets a download URL.
    return { canceled: false, jobId };
  },

  /**
   * Subscribe to export progress via SSE.
   * Returns an unsubscribe function.
   */
  onExportProgress: (callback: (event: any) => void, jobId?: string) => {
    if (!jobId) return () => {};

    const token = getAuthToken();
    const url = `/api/export/${jobId}/progress${token ? `?token=${encodeURIComponent(token)}` : ''}`;
    const source = new EventSource(url);

    source.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        // When export completes, trigger browser download
        if (data.type === 'done' && data.downloadUrl) {
          const downloadToken = getAuthToken();
          const downloadUrl = `${data.downloadUrl}${downloadToken ? `?token=${encodeURIComponent(downloadToken)}` : ''}`;
          const a = document.createElement('a');
          a.href = downloadUrl;
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
          // In web mode we can't get a filesystem path.
          // Return the file name for display; actual upload would happen separately.
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
          // Store the File object so parsePDF can access it
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

    const token = getAuthToken();
    const fetchHeaders: Record<string, string> = {};
    if (token) fetchHeaders['Authorization'] = `Bearer ${token}`;

    const res = await fetch('/api/service/parse-pdf', {
      method: 'POST',
      headers: fetchHeaders,
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
