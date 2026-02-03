# AI Coding Agent Instructions for ProPresenter Lyrics Export

## Project Overview

ProPresenter Lyrics Export is a **dual-distribution TypeScript/Node.js toolkit** for extracting worship song lyrics from ProPresenter 7 presentations. It ships as both a desktop app (Electron + React) and CLI executables. The codebase prioritizes a **shared core engine** (CLI/services) with two separate UI layers (terminal + Electron GUI).

**Current Status**: Production (v2.1.1) – Desktop app fully featured; CLI legacy-compatible.

## Critical Architecture Pattern: Shared Core + Dual Distribution

```
┌─────────────────────────────────────────────────────┐
│ Shared Core Engine (src/)                           │
│ • ProPresenterClient - Network API wrapper          │
│ • LyricsExtractor - Heuristic lyric detection       │
│ • PptxExporter - PowerPoint generation              │
│ • Services: playlist-exporter, bible-fetcher, etc.  │
└─────────────────────────────────────────────────────┘
         ↙                                      ↘
┌──────────────────────┐          ┌──────────────────────┐
│ CLI Path (src/cli.ts)│          │ Electron Path        │
│ • Terminal UI        │          │ • electron/main/     │
│ • Interactive mode   │          │ • electron/renderer/ │
│ • Interactive export │          │ • React UI           │
└──────────────────────┘          └──────────────────────┘
         ↓                                      ↓
┌──────────────────────┐          ┌──────────────────────┐
│ Distribution: pkg    │          │ Distribution:        │
│ Standalone binaries  │          │ electron-builder     │
│ (macOS ARM/Intel,    │          │ macOS .zip / Win exe │
│  Windows)            │          │                      │
└──────────────────────┘          └──────────────────────┘
```

**Key Insight**: Changes to `src/` affect both paths. UI changes stay isolated in `cli.ts` or `electron/`. When touching core logic, test both paths.

## Essential Data Models

### Key Types (src/types/)
- **Playlist** models – Hierarchical structure with header items and children
- **Song Match** – Fuzzy matching result with confidence score
- **Service Order** – Template structure for service generation

### Core Flow: From ProPresenter → Lyrics → Export

1. **ProPresenterClient** (`src/propresenter-client.ts`)
   - Wraps `renewedvision-propresenter` SDK (v7.7.2)
   - Methods: `connect()`, `getPlaylists()`, `getPresentation()`, `getLibraryItems()`
   - Timeout: 10 seconds (slow network compatible)

2. **LyricsExtractor** (`src/lyrics-extractor.ts`)
   - Converts raw slides → structured `ExtractedLyrics` with `LyricSection[]`
   - Heuristic detection: group name patterns (verse/chorus/bridge), scripture filters, announcement patterns
   - Returns: title, sections, full text, slide counts

3. **PlaylistExporter** (`src/services/playlist-exporter.ts`)
   - Orchestrates: library filtering → song UUID collection → lyrics batch extraction
   - Progress events (typed discriminated union) for UI feedback
   - Respects library filters (default: "Worship")

4. **PptxExporter** (`src/pptx-exporter.ts`)
   - Generates PowerPoint using `pptxgenjs@3.10.0` (LOCKED – see Known Issues)
   - Default style: black bg, white text, custom fonts, optional logo
   - Logo detection: searches workspace paths via `src/services/logo.ts`

### Connection Config
```typescript
interface ConnectionConfig {
  host: string;     // Default: PROPRESENTER_HOST env or 127.0.0.1
  port: number;     // Default: PROPRESENTER_PORT env or 1025
}
```
**Env Variables**: PROPRESENTER_HOST, PROPRESENTER_PORT, PROPRESENTER_LIBRARY (default: "Worship")

## Build & Distribution: Key Commands

### Development
```bash
# Run CLI from source (hot reload ready)
npm start -- status
npm start -- pptx

# Compile TypeScript
npm run build

# Run Electron in dev mode (hot reload)
npm run electron:dev
```

### Production Builds
```bash
# Standalone executables (pkg) → executables/propresenter-lyrics-*
npm run build:exe
# ⚠️ Creates: macOS ARM64, Intel, Windows binaries

# Electron app (electron-builder) → release/mac-arm64/ or release/win-unpacked/
npm run electron:package

# Bundle everything for release
npm run release:bundle
```

**GitHub Actions Workflow**: On version tag (e.g., `v2.1.1`), `release.yml` auto-builds all artifacts.

## Critical Known Issues

### ⚠️ pptxgenjs Bundling Limitation
- **Problem**: Versions 3.11.0+ fail in `pkg` bundles due to dynamic `fs` imports
- **Solution**: **Locked at 3.10.0** – DO NOT UPGRADE without resolving bundling
- **Impact**: Image encoding disabled (lines 91–99, 129–137 in `pptx-exporter.ts`)
- **Workaround**: PPTX export works; logo images omitted from PowerPoint

### Windows/macOS Signing
- Electron builds on macOS require codesigning for distribution (see `electron-builder.config.js`)
- Windows requires certificate for trusted installer

## Code Conventions & Patterns

### 1. Error Handling – Graceful Degradation
```typescript
// Pattern: Try ProPresenter feature, fall back if unavailable
const libraries = await client.getLibraries().catch(() => []);

// CLI feedback: errors → console.error, then continue
try { /* core logic */ } catch (e) { 
  console.error('Error:', e.message); 
  process.exit(1); 
}
```

### 2. Progress Events – Discriminated Union Type
Used in Electron main process to update UI:
```typescript
type PlaylistProgressEvent =
  | { type: 'library:search'; libraryName: string }
  | { type: 'playlist:item:success'; item: PlaylistItem }
  // ... more variants
export interface PlaylistCollectionOptions {
  onProgress?: (event: PlaylistProgressEvent) => void;
}
```

### 3. Settings Persistence – Electron Store
```typescript
const settings = new Store<AppSettings>({ name: 'settings', defaults: {...} });
// Auto-saved to platform-specific locations (~/Library/Application Support/...)
```

### 4. IPC Communication (Electron ↔ Renderer)
Main process registers handlers; renderer invokes:
```typescript
ipcMain.handle('export:playlist', async (event, payload) => { ... });
// Renderer: const result = await window.api.exportPlaylist(payload);
```

### 5. Heuristic Lyric Detection
Group name patterns and slide text analysis (see `lyrics-extractor.ts`):
- Skip short (<3 char), empty, scripture references (John 3:16), URLs
- Match lyric sections (verse/chorus/bridge/etc.)
- Preserve section structure in output

## Testing Strategies

- **CLI Testing**: `npm start -- [command]` with real ProPresenter instance
- **Connection Testing**: `npm start -- status` confirms host/port
- **Export Testing**: Export to local file, validate PPTX/JSON structure
- **Debug Mode**: `npm start -- --debug` shows raw API responses
- **Font Testing**: Verify font detection works on target OS (Electron GUI feature)

## File Organization Rules

- **src/**: Shared core (no UI imports)
- **electron/**: Electron-only (IPC, store, file dialogs)
- **src/services/**: Reusable business logic (playlist, lyrics, fonts)
- **src/utils/**: Pure functions (type conversions, formatting)
- **scripts/**: Build/setup bash/PowerShell scripts

## When Making Changes

1. **Touching core logic** (ProPresenterClient, LyricsExtractor, PptxExporter)?
   - Test both `npm start -- pptx` (CLI) and `npm run electron:dev` (app)
   - Verify compiled version: `npm run build && npm start -- status`

2. **Adding CLI command**?
   - Update `src/cli.ts` (command parser + handler)
   - Update help text and README command table

3. **Adding Electron feature**?
   - Implement in `electron/main/index.ts` (IPC handler)
   - Add React component in `electron/renderer/src/App.tsx`
   - Test with `npm run electron:dev`

4. **Changing build process**?
   - Update `electron-builder.config.js` (Electron) or `package.json` scripts
   - Test: `npm run electron:package` (app) and `npm run build:exe` (CLI)

5. **Updating deps** (especially pptxgenjs)?
   - DO NOT upgrade pptxgenjs (bundling blocker)
   - Test both distribution paths after dep changes

## References

- **Architecture**: [CLAUDE.md](../CLAUDE.md) – Shared core, dual distribution
- **Development**: [docs/DEVELOPING.md](../docs/DEVELOPING.md) – Dev commands, structure
- **Distribution**: [docs/DISTRIBUTION.md](../docs/DISTRIBUTION.md) – Release process
- **SDK Docs**: [renewedvision-propresenter](https://www.npmjs.com/package/renewedvision-propresenter) – Network API
- **GUI Library**: [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) – PPTX generation (v3.10.0 locked)
