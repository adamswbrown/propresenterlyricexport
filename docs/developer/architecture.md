# Architecture & Design

Understanding the ProPresenter Lyrics Export codebase.

## Dual Distribution Architecture

The project supports two distribution paths from a single shared codebase:

```
┌────────────────────────────────────────────────┐
│ Shared Core Engine (src/)                      │
│ • ProPresenterClient - API wrapper             │
│ • LyricsExtractor - Heuristic parsing          │
│ • PptxExporter - PowerPoint generation         │
│ • Services: song matching, playlist building   │
└────────────────────────────────────────────────┘
         ↙                                    ↘
┌──────────────────────┐          ┌──────────────────────┐
│ CLI Path (src/cli)   │          │ Electron Path        │
│ • Terminal UI        │          │ • electron/main/     │
│ • Commands           │          │ • electron/renderer/ │
│ • Interactive mode   │          │ • React components   │
└──────────────────────┘          └──────────────────────┘
         ↓                                      ↓
┌──────────────────────┐          ┌──────────────────────┐
│ Distribution: pkg    │          │ Distribution:        │
│ • Standalone binary  │          │ electron-builder     │
│ (macOS/Windows)      │          │ • .zip (macOS)       │
│                      │          │ • .exe (Windows)     │
└──────────────────────┘          └──────────────────────┘
```

**Key insight:** Changes to `src/` affect both paths. UI changes stay isolated.

## Core Components

### ProPresenterClient (propresenter-client.ts)

**Purpose:** Network API wrapper for ProPresenter 7

**Key methods:**
- `connect()` - Establish connection
- `getPlaylists()` - Fetch all playlists
- `getPresentation(uuid)` - Get presentation details
- `getLibraries()` - List libraries

**Features:**
- Automatic connection timeout (10 seconds)
- Error recovery
- Graceful fallbacks

**Timeout handling:**
```typescript
const presentation = await client.getPresentation(uuid)
  .catch(() => defaultPresentation);
```

### LyricsExtractor (lyrics-extractor.ts)

**Purpose:** Parse presentation slides into structured lyrics

**Input:** Raw slides from ProPresenter API

**Output:** `ExtractedLyrics` with:
- Title
- Sections (verse, chorus, bridge, etc.)
- Full lyrics text
- Metadata

**Heuristics:**
- Skip short/empty lyrics (<3 chars)
- Filter scripture references ("John 3:16")
- Match group name patterns ("Verse 1", "Chorus")
- Preserve formatting

### PptxExporter (pptx-exporter.ts)

**Purpose:** Generate PowerPoint presentations

**Library:** pptxgenjs 3.10.0 (LOCKED)

**Features:**
- Black background, white text by default
- Custom fonts, colors, sizes
- Logo insertion (disabled due to bundling issue)
- Title and lyric slides

**Styling chain:**
```typescript
const style = {
  textColor: overrides.textColor || '#ffffff',
  fontFace: overrides.fontFace || 'Arial',
  fontSize: overrides.fontSize || 44,
};
```

## Service Layer

Services in `src/services/` handle complex business logic:

### PlaylistExporter
Orchestrates end-to-end export:
1. Library filtering
2. Playlist traversal
3. Batch lyric extraction
4. Progress event emission

**Uses:** Progress event pattern for UI feedback

### SongMatcher
Fuzzy matching engine for song titles:
- Levenshtein distance
- Confidence scoring (0-100%)
- Multiple match candidates

### BibleFetcher
Verse reference lookup (future enhancement)

### PlaylistBuilder
Constructs ProPresenter playlists from parsed data (Service Generator)

## Data Models

### Playlist Structure

```typescript
interface PlaylistNode {
  uuid?: string;        // Unique identifier
  name: string;         // Display name
  breadcrumb: string[]; // Full path
  isHeader: boolean;    // Folder vs. item
  children: PlaylistNode[];
}
```

Recursive structure allows arbitrary nesting depth.

### Lyrics Data

```typescript
interface ExtractedLyrics {
  title: string;
  sections: LyricSection[];
  fullText: string;
  slideCount: number;
}

interface LyricSection {
  name: string;      // "Verse 1", "Chorus"
  lyrics: string;
  slideCount: number;
}
```

### Presentation Item

```typescript
interface Presentation {
  uuid: string;
  title: string;
  album?: string;
  artist?: string;
  copyright?: string;
  lyrics: string;
  slideCount: number;
}
```

## Design Patterns

### Error Handling - Graceful Degradation

```typescript
// Try feature, fall back to default if unavailable
const libraries = await client.getLibraries()
  .catch(() => []);
```

When a feature fails, the app continues with sensible defaults.

### Progress Events - Discriminated Union

```typescript
type ProgressEvent =
  | { type: 'export:start'; playlistId: string }
  | { type: 'song:extracted'; songTitle: string }
  | { type: 'export:complete'; outputPath: string };

// Type-safe event handling
if (event.type === 'export:complete') {
  console.log(event.outputPath); // Safe to access
}
```

Used for real-time UI updates and logging.

### Settings Persistence (Electron)

```typescript
const store = new Store<AppSettings>({
  name: 'settings',
  defaults: { ... }
});

// Auto-saved to platform-specific locations
store.set('lastPlaylistId', id);
```

### IPC Communication (Electron ↔ Renderer)

```typescript
// Main process
ipcMain.handle('export:playlist', async (event, config) => {
  return await performExport(config);
});

// Renderer process
const result = await window.api.exportPlaylist(config);
```

Two-way communication with async/await pattern.

## Heuristic Lyric Detection

The LyricsExtractor uses these rules:

1. **Skip certain content:**
   - Verses shorter than 3 characters
   - Empty or whitespace-only text
   - Scripture references (pattern matching)
   - URLs

2. **Detect section names:**
   - Matches patterns like "Verse 1", "Chorus", "Bridge"
   - Case-insensitive matching
   - Supports variations

3. **Structure output:**
   - Group slides into sections
   - Preserve ordering
   - Count slides per section

**Example:**
```
Slide 1: "Verse 1"  → Section header
Slide 2: "Lyrics..." → Section content
Slide 3: "Chorus"   → New section
Slide 4: "Lyrics..." → Section content
```

## Important Constraints

### pptxgenjs Bundling Issue

**Problem:** Versions 3.11.0+ use dynamic `require()` for font encoding, which pkg can't bundle.

**Solution:** Locked at 3.10.0, image encoding disabled.

**Impact:** PPTX exports work fine; logos can't be embedded in CLI bundles.

**Code location:** Lines 91-99 and 129-137 in `src/pptx-exporter.ts`

**Never:** Upgrade pptxgenjs without resolving this first.

## File Organization Rules

- **src/** - Shared core (no UI, no platform-specific code)
- **electron/** - Electron-only (IPC, store, file dialogs)
- **src/services/** - Reusable business logic
- **src/utils/** - Pure utility functions
- **src/types/** - TypeScript interfaces
- **dist/** - Compiled JavaScript (generated)
- **executables/** - Built executables (generated)

## Testing Strategy

### CLI Testing
```bash
npm start -- status
npm start -- pptx <uuid> test-output
```

Test both paths after core logic changes:
1. CLI: `npm start -- [command]`
2. Desktop: `npm run electron:dev`

### Connection Testing
```bash
npm start -- status --debug  # Shows raw API responses
```

### PPTX Validation
- Export a playlist
- Validate file opens in PowerPoint
- Check slide structure and formatting
- Verify font rendering

## Next Steps

- **[Setup](./setup.md)** - Development environment
- **[Building](./building.md)** - Create releases
- **[Contributing](./contributing.md)** - Code conventions
- **[Release Process](./release-process.md)** - Publishing
