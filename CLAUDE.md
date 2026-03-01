# ProPresenter Lyrics Export - Claude Project Guide

## Project Status: Production Ready (v3.1.0)

A multi-app platform for extracting, exporting, and remotely accessing worship song lyrics from ProPresenter 7. Ships as three separate Electron apps plus standalone CLI executables. Cross-platform support for macOS and Windows.

## Quick Facts

- **Language**: TypeScript/Node.js + React (Electron GUIs) + vanilla JS (Viewer client)
- **Current Version**: 3.1.0 (Lyrics app), 1.0.0 (Viewer app), 1.1.0 (Web Proxy app)
- **Node Version**: 18+ (runtime), 20 (CI)
- **Key Dependencies**:
  - pptxgenjs@3.10.0 (LOCKED - see Known Issues)
  - electron@31.2.0, electron-vite@2.3.0, electron-builder@24.13.3
  - express@5.2.1, passport@0.7.0, passport-google-oauth20@2.0.0
  - react@18.3.1, fuse.js@7.1.0
- **Documentation**: GitHub Pages at https://adamswbrown.github.io/propresenterlyricexport/

## Three Apps

### 1. ProPresenter Lyrics (Main Desktop App)
Full desktop application for playlist browsing, lyrics export, PPTX generation, and service planning.
- Entry: `electron/main/index.ts` (Electron main), `electron/renderer/src/App.tsx` (React UI)
- Dev: `npm run electron:dev`
- Build: `npm run electron:build && npm run electron:package`
- Config: `electron.vite.config.ts`, `electron-builder.config.js`
- Output: `release/ProPresenter-Lyrics-{version}-mac.zip`, `release/ProPresenter-Lyrics-{version}-win.exe`

### 2. ProPresenter Viewer (Tray App)
Lightweight menu bar/tray app serving a real-time slide viewer for congregation devices (phones, tablets, browsers).
- Entry: `viewer-app/electron/main/index.ts`
- Dev: `npm run viewer:dev`
- Build: `npm run viewer:build && npm run viewer:package`
- Config: `viewer-app/electron-vite.config.ts`, `viewer-app/electron-builder.config.js`
- Output: `release-viewer/ProPresenter-Viewer-{version}-mac.zip`, `release-viewer/ProPresenter-Viewer-{version}-win.exe`
- Static viewer files: `viewer/public/` (viewer.js, index.html)
- Uses SSE for real-time slide updates, auto-reconnect on connection loss

### 3. ProPresenter Web Proxy (Tray App)
Menu bar/tray app providing secure remote access via Cloudflare Tunnel with Google OAuth.
- Entry: `proxy-app/electron/main/index.ts` (manages child processes: `pp-web-server` + `cloudflared`)
- Dev: `npm run proxy:dev`
- Build: `npm run proxy:package` (builds web server executable first, then packages tray app)
- Config: `proxy-app/electron-vite.config.ts`, `proxy-app/electron-builder.config.js`
- Output: `release-proxy/ProPresenter-WebProxy-{version}-mac.zip`, `release-proxy/ProPresenter-WebProxy-{version}-win.exe`
- Embeds `pp-web-server` standalone executable as an extra resource

### CLI (Standalone Executables)
Interactive command-line tool for status checks, exports, and alias management.
- Entry: `src/cli.ts`
- Dev: `npm start -- status` or `npm start -- pptx`
- Build: `npm run build:exe` (uses `pkg`)
- Output: `executables/propresenter-lyrics-{platform}`

## Architecture

```
Core Engine (shared by all apps):
  ProPresenterClient (src/propresenter-client.ts) - API wrapper
  LyricsExtractor (src/lyrics-extractor.ts)       - Parse lyrics from slides
  PptxExporter (src/pptx-exporter.ts)             - Generate PowerPoint files

Shared Services (src/services/):
  alias-store.ts       - Song alias persistence (~/.propresenter-words/aliases.json)
  song-matcher.ts      - Fuzzy matching with Fuse.js + alias support
  pdf-parser.ts        - Parse order-of-service PDFs
  playlist-builder.ts  - Build playlists from matched songs
  playlist-exporter.ts - Export lyrics from playlists
  bible-fetcher.ts     - Fetch Bible verses
  logo.ts              - Logo handling for PPTX

Web Server (src/server/):
  index.ts             - Express app definition (startServer)
  web-server.ts        - pkg executable entry point
  middleware/
    auth.ts            - Google OAuth + bearer token middleware
    cloudflare.ts      - Cloudflare Tunnel header extraction
  routes/
    auth.ts            - /auth/* (login, callback, logout, status)
    connection.ts      - /api/connection/* (status, test)
    export.ts          - /api/export/pptx (SSE progress streaming)
    settings.ts        - /api/settings (connection config)
    aliases.ts         - /api/aliases (song mapping CRUD)
    fonts.ts           - /api/fonts (font list with install status)
    service-generator.ts - /api/service/* (service builder endpoints)
    users.ts           - /api/users (manage allowed emails)
    launch.ts          - /api/launch/propresenter (remote launch on Windows)
    viewer.ts          - /viewer (static files + SSE slide updates)
  services/
    logger.ts          - Structured logging with 14-day file rotation
    user-store.ts      - Email allowlist (~/.propresenter-words/users.json)
    settings-store.ts  - Connection config persistence
    viewer-service.ts  - Polls ProPresenter for slide changes, emits events
    viewer-instance.ts - Singleton viewer service instance

Web UI (src/web/) - Browser-based SPA served by the Express server:
  main.tsx             - Entry point, shims window.api with fetch-based client
  AuthGate.tsx         - OAuth/bearer token gate
  LoginPage.tsx        - Google sign-in page
  UserManagement.tsx   - Admin email allowlist management
  Built with: vite.config.web.ts -> dist-web/

Types (src/types/):
  bible.ts, playlist.ts, service-order.ts, song-match.ts
```

### Distribution Flow

```
Path 1: Desktop App (Electron)
  electron/main/index.ts -> electron/renderer/src/App.tsx -> Core Engine
  Built with: electron-vite + electron-builder

Path 2: Viewer App (Electron Tray)
  viewer-app/electron/main/index.ts -> Express server -> viewer/public/*
  Built with: electron-vite + electron-builder

Path 3: Web Proxy App (Electron Tray)
  proxy-app/electron/main/index.ts -> spawns pp-web-server + cloudflared
  Built with: electron-vite + electron-builder + pkg (for pp-web-server)

Path 4: CLI Executables
  src/cli.ts -> Core Engine -> Text/JSON/PPTX
  Built with: tsc + pkg
```

## Building

### Development

```bash
# Desktop app with hot reload
npm run electron:dev

# Viewer tray app
npm run viewer:dev

# Web proxy tray app
npm run proxy:dev

# Web server (Express) + Web UI (Vite) separately
npm run web:dev:server   # Express on port 3100
npm run web:dev:ui       # Vite dev server with proxy to 3100

# CLI from source
npm start -- status --host 192.168.68.58 --port 61166
npm start -- pptx
```

### Production Builds

```bash
# Desktop app
npm run electron:build && npm run electron:package

# Viewer app
npm run viewer:build && npm run viewer:package

# Web proxy app (builds web server exe first)
npm run proxy:package

# CLI executables (macOS ARM64, Intel, Windows)
npm run build:exe

# Web server executable only
npm run build:web-exe

# Web UI only
npm run web:build:ui
```

### Automated Releases (GitHub Actions)

- Trigger: Push version tag (e.g., `v3.1.0`) or manual workflow_dispatch
- Workflow: `.github/workflows/release.yml`
- Builds all three apps for macOS + Windows in parallel
- Release notes: reads from `release-notes.md`
- Publishes 6 artifacts to GitHub Releases:
  - `ProPresenter-Lyrics-{version}-mac.zip` / `-win.exe`
  - `ProPresenter-Viewer-{version}-mac.zip` / `-win.exe`
  - `ProPresenter-WebProxy-{version}-mac.zip` / `-win.exe`

## Build Outputs (Generated Directories)

```
dist/              - Compiled CLI/server TypeScript (tsc)
dist-electron/     - Main app Electron bundles (main, preload, renderer)
dist-web/          - Compiled web React UI (Vite)
dist-viewer/       - Viewer app Electron bundles
dist-proxy/        - Proxy app Electron bundles
executables/       - Standalone binaries (CLI, pp-web-server)
release/           - Main app packages (.zip, .dmg, .exe)
release-viewer/    - Viewer app packages
release-proxy/     - Proxy app packages
```

## Release Process (Major.Minor.Hotfix)

**CRITICAL: Always complete ALL steps in order to avoid incomplete releases.**

### Versioning
- **MAJOR**: Breaking changes (e.g., `3.0.0`)
- **MINOR**: New features (e.g., `3.1.0`)
- **HOTFIX**: Bug fixes (e.g., `3.0.1`)

Note: Each app has its own version in its `electron-builder.config.js` (`extraMetadata.version`). The main app version lives in `package.json`.

### Release Checklist

1. Ensure all code changes are committed (`git status` must be clean)
2. Update version in `package.json` (and app-specific configs if needed)
3. Update `CHANGELOG.md` with new section
4. Update `release-notes.md` with user-facing release notes
5. Commit version changes: `git commit -m "vX.Y.Z: Release notes summary"`
6. Tag: `git tag vX.Y.Z`
7. Push main branch: `git push origin main`
8. Push tag (triggers CI): `git push origin vX.Y.Z`

### Fixing a Bad Release

```bash
git tag -d vX.Y.Z                # Delete local tag
git push origin :vX.Y.Z          # Delete remote tag
# Fix and commit changes
git tag vX.Y.Z                   # Re-create tag
git push origin main && git push origin vX.Y.Z
```

## Environment Variables

### ProPresenter Connection
| Variable | Default | Description |
|----------|---------|-------------|
| `PROPRESENTER_HOST` | `127.0.0.1` | ProPresenter API host |
| `PROPRESENTER_PORT` | `61166` (CLI) / `1025` (proxy) | ProPresenter API port |

### Web Server
| Variable | Default | Description |
|----------|---------|-------------|
| `WEB_PORT` | `3100` | Web server port |
| `WEB_HOST` | `0.0.0.0` | Web server bind address |
| `NODE_ENV` | - | Set to `production` for secure cookies |

### Authentication
| Variable | Default | Description |
|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | - | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | - | Google OAuth client secret |
| `TUNNEL_URL` | - | Cloudflare Tunnel public URL |
| `CORS_ORIGIN` | - | Comma-separated allowed CORS origins |

### PPTX Export
| Variable | Default | Description |
|----------|---------|-------------|
| `PPTX_FONT_FACE` | - | Font family for PPTX |
| `PPTX_FONT_SIZE` | - | Font size for PPTX |
| `PPTX_TITLE_FONT_SIZE` | - | Title font size |
| `PPTX_FONT_BOLD` | - | Bold text flag |
| `PPTX_FONT_ITALIC` | - | Italic text flag |
| `PPTX_TEXT_COLOR` | - | Text color |

## Persistent Data

All stored in `~/.propresenter-words/`:
- `aliases.json` - Song alias/override mappings
- `users.json` - Email allowlist for web proxy
- `web-auth.json` - Bearer token and session secret
- `sessions/` - File-based session store (6-hour TTL, auto-pruned)
- `logs/` - Structured request logs (14-day rotation)

Electron settings (via `electron-store`):
- `propresenter-viewer` - Viewer app settings (host, port)
- `propresenter-proxy` - Proxy app settings (host, port, OAuth, tunnel)

## Known Issues & Constraints

### pptxgenjs Bundling Issue
- **Problem**: Versions 3.11.0+ crash when bundled with `pkg` due to dynamic `fs` imports
- **Solution**: LOCKED at 3.10.0, logo embedding guarded by `process.pkg` detection
- **Impact**: CLI executables (pkg) skip logo embedding; Electron and web server embed logos normally
- **Fix**: `src/pptx-exporter.ts` checks `(process as any).pkg` - when truthy, `addImage` is skipped
- **DO NOT** upgrade pptxgenjs without resolving this

### Dynamic Imports in pkg
- `pkg` does not support dynamic `require()` or `import()` at runtime
- All static assets must be declared in `package.json` `pkg.assets`
- Current assets: `dist-web/**/*`, `viewer/public/**/*`

### Tray Apps on macOS
- Both tray apps use `LSUIElement: true` to hide from dock
- Icon paths differ between packaged and dev modes (`process.resourcesPath` vs relative paths)
- macOS GUI apps don't inherit shell PATH; `cloudflared` path is searched explicitly

## File Structure

```
src/
  cli.ts                          # CLI entry point
  index.ts                        # CLI exports
  propresenter-client.ts          # ProPresenter API wrapper (CORE)
  lyrics-extractor.ts             # Parse lyrics from slides (CORE)
  pptx-exporter.ts                # Generate PowerPoint (CORE)
  services/                       # Shared business logic
    alias-store.ts, song-matcher.ts, pdf-parser.ts,
    playlist-builder.ts, playlist-exporter.ts,
    bible-fetcher.ts, logo.ts
  types/                          # TypeScript type definitions
    bible.ts, playlist.ts, service-order.ts, song-match.ts
  utils/
    playlist-utils.ts
  server/                         # Express web server
    index.ts, web-server.ts
    middleware/  (auth.ts, cloudflare.ts)
    routes/     (auth, connection, export, settings, aliases,
                 fonts, service-generator, users, launch, viewer)
    services/   (logger, user-store, settings-store,
                 viewer-service, viewer-instance)
  web/                            # Browser-based SPA
    main.tsx, index.html, AuthGate.tsx, LoginPage.tsx,
    UserManagement.tsx
  gui/
    api-client.ts                 # Electron IPC client
  test-*.ts                       # Ad-hoc test scripts (no test framework)

electron/                         # Main desktop app
  main/index.ts                   # Electron main process
  preload/index.ts                # IPC bridge
  renderer/
    src/App.tsx                   # Main React UI
    src/ServiceGeneratorView.tsx  # Service Generator component
    index.html

viewer-app/                       # Viewer tray app
  electron-vite.config.ts
  electron-builder.config.js      # v1.0.0
  electron/
    main/index.ts                 # Tray app + Express server
    preload/index.ts
    renderer/src/TrayApp.tsx      # Settings UI

proxy-app/                        # Web proxy tray app
  electron-vite.config.ts
  electron-builder.config.js      # v1.1.0
  electron/
    main/index.ts                 # Manages pp-web-server + cloudflared
    preload/index.ts
    renderer/src/ProxyApp.tsx     # Settings UI

viewer/                           # Static viewer files
  public/
    index.html, viewer.js, setup.html, setup.js, styles.css
  config.json

assets/
  icon.icns, icon.ico, icon.png   # App icons

.github/workflows/
  release.yml                     # Multi-app release workflow

scripts/
  generate-icons.sh, setup-mac.sh, setup-windows.ps1,
  build-macos-app.sh, create-dmg.sh

docs/                             # GitHub Pages documentation
  index.md, getting-started.md, user-guide.md, faq.md
  guides/   (service-generator, cli-guide, pptx-export,
             viewer, proxy-app, web-proxy-setup)
  developer/ (index, setup, architecture, building,
              contributing, release-process)
  _config.yml
```

## Authentication Architecture (Web Proxy)

The web server supports two auth methods:
1. **Google OAuth** (primary) - Passport strategy with email allowlist
2. **Bearer token** (fallback) - Auto-generated token stored in `~/.propresenter-words/web-auth.json`

Routes:
- `/health` - Unauthenticated health check
- `/auth/*` - Login/callback/logout/status (unauthenticated)
- `/viewer` - Public (no auth required)
- `/api/*` - All protected by `authMiddleware`

Sessions: File-based (`session-file-store`), 6-hour TTL, stored in `~/.propresenter-words/sessions/`.

## Real-Time Updates

- **Viewer**: `ViewerService` polls ProPresenter `/v1/status/slide` for changes, broadcasts via SSE to connected viewers with 15-second heartbeat
- **PPTX Export**: Progress streamed via SSE from `/api/export/pptx`
- **Auto-reconnect**: Viewers detect stale connections (no heartbeat in 25s) and auto-reconnect; page visibility API triggers refresh on return from background

## Git Workflow

- Always commit with context about WHY, not just WHAT
- Follow conventional commit style: `v3.1.0: Display app version in Lyrics and Web Proxy UIs`
- Keep `release-notes.md` updated for CI to use in GitHub Releases

## Testing

No formal test framework (no Jest/Vitest configuration). Ad-hoc test scripts exist:
- `src/test-pdf-parser.ts` - PDF parsing tests
- `src/test-song-matcher.ts` - Fuzzy matching tests
- `src/test-end-to-end.ts` - Integration test

Run manually: `npx ts-node src/test-pdf-parser.ts`

## Common Development Tasks

```bash
# Check ProPresenter connection
npm start -- status --host 192.168.68.58 --port 61166

# Export playlist interactively
npm start -- pptx

# Manage song aliases
npm start -- alias list
npm start -- alias add "PDF Name" "Library Name"
npm start -- alias remove "PDF Name"

# Run web server locally
npm run build && npm run web:build:ui && npm run web:start

# Run with Cloudflare tunnel
TUNNEL_URL=https://pp.example.com npm run web:start:tunnel
```

## Future Enhancements

**Reasonable to Consider:**
- Formal test suite (Vitest)
- Electron auto-updater integration (electron-updater)
- Code signing for macOS and Windows (requires certificates)
- Connection retry logic with exponential backoff

**Not Recommended:**
- Upgrading pptxgenjs beyond 3.10.0 (causes crashes in CLI executables)
- Adding logo support to CLI bundled executables (would require different PPTX library)
- Dynamic imports in pkg-bundled code (incompatible)
