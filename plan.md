# Web Proxy — Implementation Plan & Status

Remote browser access to the ProPresenter Lyrics Export app, exposed via
**Cloudflare Tunnel** (outbound-only — no port forwarding, no firewall changes).

## Deployment Method: Cloudflare Tunnel

The web proxy runs on the same machine as ProPresenter and is exposed to the
internet through a Cloudflare Tunnel. This is the chosen approach because:

- **No inbound ports** — the tunnel makes an outbound connection to Cloudflare's edge; nothing listens on the public internet
- **Free tier** — Cloudflare Tunnels are free for personal use
- **Custom domain** — access at something like `https://pp.yourdomain.com`
- **Automatic HTTPS** — Cloudflare terminates TLS; Express sees plain HTTP behind `trust proxy`
- **DDoS protection** — Cloudflare's edge absorbs attacks before they reach the machine

### How It Works

```
Phone/Tablet (remote)
    │
    │  HTTPS
    ▼
Cloudflare Edge (pp.yourdomain.com)
    │
    │  Encrypted tunnel (outbound from your machine)
    ▼
cloudflared daemon ──► Express :3100 ──► ProPresenter :1025
   (on the Mac)          (on the Mac)       (on the Mac)
```

### Setup Steps

1. **Install cloudflared** on the Mac running ProPresenter:
   ```bash
   brew install cloudflared
   ```

2. **Authenticate with Cloudflare** (one-time):
   ```bash
   cloudflared tunnel login
   ```

3. **Create a tunnel** (one-time):
   ```bash
   cloudflared tunnel create propresenter
   ```
   This generates a tunnel UUID and credentials file.

4. **Route DNS** — point your subdomain to the tunnel:
   ```bash
   cloudflared tunnel route dns propresenter pp.yourdomain.com
   ```

5. **Configure Google OAuth** (one-time):
   - Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   - Create OAuth 2.0 credentials
   - Authorized redirect URI: `https://pp.yourdomain.com/auth/google/callback`
   - Copy Client ID and Client Secret

6. **Seed the first admin user**:
   ```bash
   npm start -- users add you@gmail.com --admin
   ```

7. **Start the server**:
   ```bash
   GOOGLE_CLIENT_ID=<id> \
   GOOGLE_CLIENT_SECRET=<secret> \
   TUNNEL_URL=https://pp.yourdomain.com \
   npm run web:start
   ```

8. **Start the tunnel** (separate terminal or as a service):
   ```bash
   cloudflared tunnel run --url http://localhost:3100 propresenter
   ```

9. **Open** `https://pp.yourdomain.com` on any device — sign in with Google.

### Running as a Background Service (Optional)

To keep the tunnel running after logout / on boot:

```bash
# Create config file
cat > ~/.cloudflared/config.yml << 'EOF'
tunnel: <tunnel-uuid>
credentials-file: ~/.cloudflared/<tunnel-uuid>.json
ingress:
  - hostname: pp.yourdomain.com
    service: http://localhost:3100
  - service: http_status:404
EOF

# Install as macOS launchd service
cloudflared service install
```

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
Browser (phone/tablet/laptop)
    │
    │  HTTPS
    ▼
Cloudflare Edge (pp.yourdomain.com)
    │
    │  cloudflared tunnel (outbound)
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
│   ├── auth.ts                    # Dual auth (OAuth + bearer), rate limiter
│   └── cloudflare.ts              # CF-Connecting-IP extraction, tunnel validation
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
| `TUNNEL_URL` | — | Cloudflare Tunnel public URL (e.g., `https://pp.yourdomain.com`) — used for OAuth callback |
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

**Production build + Cloudflare Tunnel:**
```bash
# Build
npm run web:build         # tsc + vite build → dist-web/

# Start server
GOOGLE_CLIENT_ID=<id> \
GOOGLE_CLIENT_SECRET=<secret> \
TUNNEL_URL=https://pp.yourdomain.com \
npm run web:start

# Start tunnel (separate terminal)
cloudflared tunnel run --url http://localhost:3100 propresenter
```

---

### Phase 5 — Cloudflare Tunnel Integration

The Express server and web UI exist but lacked the middleware and
plumbing to work reliably behind a Cloudflare Tunnel. This phase adds
everything needed so that `cloudflared → Express` works end-to-end.

**Cloudflare-aware middleware** (`src/server/middleware/cloudflare.ts`):
- Extracts real client IP from `CF-Connecting-IP` header (falls back to `req.ip`)
- Attaches `req.realIp`, `req.cfRay`, `req.cfCountry` to every request
- Logs requests with real IP + country when behind Cloudflare
- Validates `TUNNEL_URL` configuration at startup (scheme, no trailing slash)

**Rate limiter fix** (`src/server/middleware/auth.ts`):
- `keyGenerator` now uses `CF-Connecting-IP` when present, so rate limiting
  works correctly behind Cloudflare (instead of seeing all traffic as one IP)

**SSE keepalive** (`src/server/routes/export.ts`):
- Sends `:keepalive` comment every 30 seconds on SSE connections
- Prevents Cloudflare's 100-second idle timeout from dropping long exports
- Comment format (`:keepalive\n\n`) is invisible to EventSource clients

**Tunnel health check** (`src/server/routes/connection.ts`):
- `GET /health` now returns `tunnel.configured`, `tunnel.url`, and
  `tunnel.reachable` fields
- When `TUNNEL_URL` is set, pings `${TUNNEL_URL}/health` to verify
  end-to-end tunnel connectivity
- Useful for monitoring dashboards and debugging

**CLI tunnel commands** (`src/cli.ts`):
- `npm start -- tunnel config` — generates `~/.cloudflared/config.yml`
  from interactive prompts (tunnel UUID, hostname)
- `npm start -- tunnel status` — checks if the tunnel is reachable

**npm scripts** (`package.json`):
- `web:tunnel` — starts cloudflared tunnel pointing at `:3100`
- `web:start:tunnel` — starts Express server + cloudflared in parallel

---

## Remaining / Optional

These are non-blocking polish items. The core implementation is complete.

- [ ] **Logo upload endpoint** — web `chooseLogo()` captures a filename via file input, but the server needs the actual file to embed in PPTX. Would need a multer upload endpoint (similar to PDF upload) + server-side storage.
- [ ] **`verses:fetch` implementation** — currently a stub returning empty text. Bible verses are managed as ProPresenter presentations, so this is acceptable. Could integrate a Bible API if desired.
- [ ] **Setup documentation** — step-by-step guide for Google Cloud Console OAuth setup, tunnel configuration, first-user seeding.
- [x] **Electron build verification** — confirmed `electron-vite build` produces correct bundles; preload exposes `__ELECTRON_API__`, web build detects it correctly.
- [x] **Production hardening** — file-based session store (`session-file-store` at `~/.propresenter-words/sessions/`), structured JSON-lines logging with daily rotation + 14-day retention (`~/.propresenter-words/logs/`), request logging middleware.

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
