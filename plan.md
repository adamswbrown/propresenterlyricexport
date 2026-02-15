# Web Proxy — Implementation Plan & Status

Remote browser access to the ProPresenter Lyrics Export app, designed for
outbound-only tunnels (Cloudflare Tunnel / Tailscale Funnel).

---

## What's Been Built

### Phase 1 — Express Server & Auth (`fb973bb`, `05de883`, `181b222`)

**Server core** (`src/server/index.ts`):
- Express app with Helmet CSP, CORS, body parsing, trust-proxy
- Session middleware (6-hour secure cookies, `sameSite: lax`)
- Passport initialization for Google OAuth
- Health check at `GET /health` (unauthenticated)
- Auth middleware on all `/api/*` routes
- Static file serving from `dist-web/` + SPA fallback
- Startup banner showing OAuth status, bearer token, tunnel instructions

**Authentication** (`src/server/middleware/auth.ts`, `src/server/routes/auth.ts`):
- Google OAuth via Passport (`GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`)
- Bearer token fallback (auto-generated UUID, printed on startup)
- Token stored at `~/.propresenter-words/web-auth.json` (mode 0600)
- Auth priority: Passport session → `Authorization: Bearer` header → `?token=` query param
- Rate limiting: 20 attempts / 15 minutes on auth endpoints
- Routes: `GET /auth/status`, `GET /auth/google`, `GET /auth/google/callback`, `GET /auth/me`, `POST /auth/logout`

**API routes** (all under `/api`, all require auth):

| File | Routes | Purpose |
|------|--------|---------|
| `routes/connection.ts` | `GET /status`, `GET /playlists`, `GET /libraries` | ProPresenter connection test, playlist/library listing |
| `routes/export.ts` | `POST /export`, `GET /export/:id/progress`, `GET /export/:id/download` | Background PPTX export with SSE progress streaming |
| `routes/settings.ts` | `GET /settings`, `PUT /settings` | Load/save app config (`~/.propresenter-words/web-settings.json`) |
| `routes/aliases.ts` | `GET /aliases`, `PUT /aliases/:title`, `DELETE /aliases/:title` | Song name override mappings |
| `routes/fonts.ts` | `GET /fonts`, `GET /fonts/:name/check` | Cross-platform font detection (25+ curated fonts) |
| `routes/service-generator.ts` | `POST /service/parse-pdf`, `POST /service/match-songs`, `POST /service/match-verses`, `POST /service/build-playlist`, `POST /service/create-playlist`, `POST /service/focus-item`, `GET /libraries/:ids/search` | Full service generator workflow |

**Export progress streaming** (`routes/export.ts`):
- `POST /api/export` returns `{jobId}` immediately
- Client subscribes to `GET /api/export/:id/progress` (SSE)
- Progress events: `info`, `song:success`, `song:error`, `song:skip`, `pptx:start`, `pptx:complete`, `done`
- On `done`, response includes `downloadUrl` for PPTX file
- Jobs auto-cleaned after 30 minutes

**PDF upload** (`routes/service-generator.ts`):
- Multer middleware: 20MB max, temp directory storage
- Temp file cleaned up after parsing

---

### Phase 2 — Web React UI (`86ba60e`, `8fa14b7`)

**Vite build** (`vite.config.web.ts`):
- Root: `src/web/`, output: `dist-web/`
- Alias `@electron` → `electron/renderer/src/` to share existing React components
- Dev proxy: `/api`, `/auth`, `/health` → Express on `:3100`
- React plugin with Fast Refresh

**Entry point** (`src/web/main.tsx`):
- Calls `installWebApiShim()` before React mounts
- Renders `<AuthGate />` wrapping the shared `<App />` component

**Auth gate** (`src/web/AuthGate.tsx`):
- Checks `/auth/me` on mount
- Unauthenticated → `<LoginPage />`
- Authenticated → `<App />` + top-right user menu (avatar, name, Users button, Sign out)

**Login page** (`src/web/LoginPage.tsx`):
- Checks `/auth/status` to determine available auth methods
- "Sign in with Google" button (if OAuth configured) → `/auth/google`
- Bearer token input form (always available)
- Error handling for failed OAuth redirects

**API client shim** (`src/gui/api-client.ts`):
- `installWebApiShim()` assigns `webApi` to `window.api` so existing Electron components work unmodified in browser
- `isElectron()` checks `window.__ELECTRON_API__` (set by Electron preload, absent in web)
- All 20+ methods implemented via `fetch()` + session cookies
- File dialogs (`chooseLogo`, `choosePDF`) use HTML5 `<input type="file">`
- `openExternal()` / `downloadFont()` use `window.open()`
- Export progress: stores callback via `onExportProgress()`, auto-connects SSE inside `startExport()` when jobId arrives
- 401/403 auto-redirect: `window.location.reload()` triggers AuthGate re-check

**Electron preload** (`electron/preload/index.ts`):
- Added `contextBridge.exposeInMainWorld('__ELECTRON_API__', true)` flag

**Web CSS** (`src/web/web-overrides.css`):
- Hides Electron titlebar, reduces top padding
- Login card, user menu, loading spinner, user management panel styles

---

### Phase 3 — User Management & Admin Roles (`1b25106`)

**User store** (`src/server/services/user-store.ts`):
- File: `~/.propresenter-words/web-users.json`
- Schema: `{allowedEmails, adminEmails, sessions}`
- Functions: `isEmailAllowed`, `isAdmin`, `addAllowedEmail`, `removeAllowedEmail`, `setAdmin`, `recordLogin`, `getAllUsers`
- First user auto-seeded as admin on `ensureUsersFile()`

**User API** (`src/server/routes/users.ts`):
- `GET /api/users` — list all users (any authenticated user)
- `POST /api/users` — add email (admin only)
- `DELETE /api/users/:email` — remove user (admin only)
- `PATCH /api/users/:email/admin` — toggle admin (admin only)
- Bearer-token auth = automatic admin (server operator)

**User management UI** (`src/web/UserManagement.tsx`):
- Modal opened from user menu
- Admins: add/remove users, promote/demote admins
- Non-admins: read-only user list with "contact administrator" message
- Shows avatars, names, last login dates, admin badges

**Auth route update** (`routes/auth.ts`):
- `/auth/me` now includes `isAdmin: true|false`

**CSP updates** (`src/server/index.ts`):
- Allows Google Fonts (`fonts.googleapis.com`, `fonts.gstatic.com`)
- Allows Google profile pictures (`lh3.googleusercontent.com`)

---

### Phase 4 — CLI User Management (`c496b47`)

**CLI commands** (`src/cli.ts`):
- `npm start -- users list` — show all allowed users with admin status
- `npm start -- users add alice@gmail.com` — add to allowlist
- `npm start -- users add alice@gmail.com --admin` — add + grant admin
- `npm start -- users remove alice@gmail.com` — remove from allowlist
- `npm start -- users admin alice@gmail.com` — toggle admin status

No ProPresenter connection required. Operates directly on `~/.propresenter-words/web-users.json`.

---

## Architecture

```
Browser (remote)
    │
    │  HTTPS via tunnel
    ▼
┌──────────────────────────────────────────────────┐
│              Express Server (:3100)               │
│                                                    │
│  Middleware: Helmet │ CORS │ Session │ Passport    │
│  Auth: Google OAuth + Bearer token                 │
│                                                    │
│  /health ─── unauthenticated health check          │
│  /auth/* ─── OAuth flow + session mgmt             │
│  /api/*  ─── authenticated API (all routes below)  │
│                                                    │
│  ┌────────────────────────────────────────────┐   │
│  │ connection │ export │ settings │ aliases    │   │
│  │ fonts │ service-generator │ users          │   │
│  └──────────────┬─────────────────────────────┘   │
│                 │                                   │
│  ┌──────────────▼─────────────────────────────┐   │
│  │ ProPresenterClient  │  LyricsExtractor     │   │
│  │ PptxExporter        │  SongMatcher         │   │
│  │ PDFParser           │  AliasStore          │   │
│  └────────────────────────────────────────────┘   │
│                                                    │
│  Static: dist-web/ (React SPA)                     │
│  SPA fallback → index.html                         │
└──────────────────────────────────────────────────┘
    │
    │  HTTP to local ProPresenter
    ▼
┌──────────────────┐
│  ProPresenter 7   │
│  (localhost:1025)  │
└──────────────────┘
```

**API client shim** — the key to code reuse:
```
Electron mode:  App.tsx → window.api → IPC → main process
Web mode:       App.tsx → window.api → webApi (fetch) → Express → ProPresenter
```
Existing React components (`App.tsx`, `ServiceGeneratorView.tsx`) work in both modes
without modification because `installWebApiShim()` assigns `webApi` to `window.api`
before React mounts. `window.__ELECTRON_API__` distinguishes real Electron from shimmed.

---

## File Inventory

```
src/server/
├── index.ts                       # Express app, middleware, route mounting
├── middleware/
│   └── auth.ts                    # Dual auth (OAuth + bearer), rate limiter
├── routes/
│   ├── auth.ts                    # /auth/* (OAuth flow, /me, logout)
│   ├── connection.ts              # /api/status, playlists, libraries
│   ├── export.ts                  # /api/export (SSE progress, download)
│   ├── settings.ts                # /api/settings (load/save)
│   ├── aliases.ts                 # /api/aliases (CRUD)
│   ├── fonts.ts                   # /api/fonts (detection)
│   ├── service-generator.ts       # /api/service/* (PDF, matching, playlist)
│   └── users.ts                   # /api/users (admin-gated CRUD)
└── services/
    └── user-store.ts              # User allowlist + admin persistence

src/web/
├── index.html                     # SPA shell
├── main.tsx                       # Entry: shim + AuthGate
├── AuthGate.tsx                   # Auth check → LoginPage or App
├── LoginPage.tsx                  # Google OAuth + bearer token login
├── UserManagement.tsx             # Admin user management modal
└── web-overrides.css              # Web-specific styles

src/gui/
└── api-client.ts                  # Unified API (Electron IPC / web fetch)

vite.config.web.ts                 # Vite build for web SPA
electron/preload/index.ts          # __ELECTRON_API__ flag
```

---

## Persistence Files

All stored in `~/.propresenter-words/`:

| File | Contents |
|------|----------|
| `web-auth.json` | Bearer token, session secret, optional OAuth credentials (mode 0600) |
| `web-users.json` | Allowed emails, admin emails, login sessions (mode 0600) |
| `web-settings.json` | ProPresenter host/port, style prefs, library selections |
| `aliases.json` | Song name → {uuid, name} override mappings (shared with Electron) |

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `WEB_PORT` | `3100` | Server listen port |
| `WEB_HOST` | `0.0.0.0` | Server listen address |
| `TUNNEL_URL` | — | Public URL for OAuth callback (e.g., `https://pp.yourdomain.com`) |
| `GOOGLE_CLIENT_ID` | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | — | Google OAuth client secret |
| `CORS_ORIGIN` | `*` | Comma-separated allowed origins |
| `NODE_ENV` | — | Set `production` for secure cookies |
| `PROPRESENTER_HOST` | `127.0.0.1` | ProPresenter API host (fallback) |
| `PROPRESENTER_PORT` | `1025` | ProPresenter API port (fallback) |

---

## Dev Workflow

```bash
# Terminal 1 — Express server
npm run web:dev:server

# Terminal 2 — Vite dev server (proxies /api + /auth to Express)
npm run web:dev:ui

# Open http://localhost:5173 in browser
```

**Production build:**
```bash
npm run web:build         # tsc + vite build → dist-web/
npm run web:start         # node dist/server/index.js (serves dist-web/)
```

---

## Remaining / Optional

These are non-blocking polish items. The core implementation is complete.

- [ ] **Logo upload endpoint** — web `chooseLogo()` captures a filename via file input, but the server needs the actual file to embed in PPTX. Would need a multer upload endpoint (similar to PDF upload) + server-side storage.
- [ ] **`verses:fetch` implementation** — currently a stub returning empty text. Bible verses are managed as ProPresenter presentations, so this is acceptable. Could integrate a Bible API if desired.
- [ ] **Setup documentation** — step-by-step guide for Google Cloud Console OAuth setup, tunnel configuration, first-user seeding.
- [ ] **Electron build verification** — confirm `electron-vite build` + `electron-builder` still produce working packages with the preload `__ELECTRON_API__` change.
- [ ] **Production hardening** — persistent session store (e.g., file-based) instead of in-memory MemoryStore, HTTPS termination notes, log rotation.

---

## Commit History

```
c496b47  Add CLI user management commands for web proxy allowlist
1b25106  Add admin-gated user management, dev proxy, CSP and session fixes
8fa14b7  Add dist-web/ to .gitignore
86ba60e  Add web React UI with auth gate, login page, and Vite build
181b222  Reduce session cookie maxAge to 6 hours
05de883  Add Google OAuth with email allowlist for web proxy auth
fb973bb  Add Express web proxy server for authenticated remote access
```
