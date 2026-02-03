# ProPresenter Service Generator - Work Log

## Project Overview

Building an automated service generation system for ProPresenter 7 that:
1. Parses PDF service orders to extract songs and Bible verses
2. Matches songs against ProPresenter libraries using fuzzy matching
3. Fetches NIV Bible verses from Bible API
4. Assembles playlists with proper ProPresenter items
5. Provides an Electron UI for the entire workflow

## Current Status: Phase 5 (In Progress)

**Completed Phases:**
- ✅ Phase 1: PDF parser with text extraction and pattern recognition
- ✅ Phase 2: Fuzzy song matching engine with confidence scoring
- ✅ Phase 3: Bible API integration for NIV verse fetching
- ✅ Phase 4: Playlist assembly and ProPresenter API integration
- 🔄 Phase 5: Electron UI for PDF upload and service generation (IN PROGRESS)
- ⏳ Phase 6: Error handling and edge case management (PENDING)
- ⏳ Phase 7: Testing and refinement (PENDING)

---

## Work Completed

### 1. Library Selection Interface (Phase 5)

**Objective:** Add configuration for multiple ProPresenter libraries used in service generation.

**Implementation:**
- Added library configuration fields to Electron settings
- Created dropdowns for:
  - Worship Library (main song library)
  - Kids Songs Library (children's ministry songs)
  - Service Content Library (liturgy, announcements, etc.)
  - Template Playlist (base playlist structure to copy)
- Files modified:
  - [electron/preload/index.ts](electron/preload/index.ts) - Added library fields to `SettingsPayload` type
  - [electron/main/index.ts](electron/main/index.ts) - Updated `AppSettings` interface
  - [electron/renderer/src/App.tsx](electron/renderer/src/App.tsx) - Added library dropdowns and state management

### 2. Service Generator Modal Separation (Phase 5)

**Objective:** Move Service Generator settings to a dedicated modal to reduce UI clutter.

**Rationale:** Service generation features won't be used by all users, so they should be less prominent and potentially hideable.

**Implementation:**
- Created separate "Service Generator" modal with book icon (📖)
- Moved all service-related configuration out of main settings
- Added dedicated button in header for Service Generator access
- Files modified:
  - [electron/renderer/src/App.tsx:636-723](electron/renderer/src/App.tsx#L636-L723) - Service Generator modal
  - [electron/renderer/src/styles.css:526-569](electron/renderer/src/styles.css#L526-L569) - Settings section styling

### 3. Template Playlist Filtering (Phase 5)

**Objective:** Filter template playlist dropdown to only show playlists inside "TEMPLATE" folder.

**Challenge:** ProPresenter API doesn't expose template flag, despite UI having template designation.

**Solution:** Implemented folder-based filtering:
- All template playlists must be inside a folder named "TEMPLATE"
- Recursive tree traversal to find playlists with `parentName === 'TEMPLATE'`
- Used React `useMemo` for performance optimization

**Implementation:**
- Added `parentName` tracking to `PlaylistTreeNode` type
- Implemented `templatePlaylists` memo with recursive flattening
- Files modified:
  - [electron/renderer/src/App.tsx:261-277](electron/renderer/src/App.tsx#L261-L277) - Template filtering logic
  - [src/utils/playlist-utils.ts:9-16,48-66](src/utils/playlist-utils.ts#L9-L16) - Added `parentName` to tree mapping

### 4. Playlist Creation from Template (Phase 5)

**Objective:** Implement functionality to create new playlists by copying all items from a template.

**Challenges & Solutions:**

#### Challenge 1: Missing `name` Field Error
- **Error:** `400 Json deserialize error: missing field 'name'`
- **Root Cause:** Items missing required `id: { name, index, uuid }` structure
- **Fix:** Added proper item structure with all required fields

#### Challenge 2: Empty Playlist Created
- **Error:** Playlist created but contained 0 items
- **Root Cause:** POST `/v1/playlists` only creates playlist shell, doesn't populate items
- **Fix:** Implemented two-step process:
  1. POST to create empty playlist
  2. PUT to `/v1/playlist/{id}` with items array to populate

#### Challenge 3: API Structure Mismatch
- **Error:** `400 Json deserialize error: missing field 'name'` (again)
- **Root Cause:** API expects flat `{ name, items }` structure, not `{ id: { name }, items }`
- **Fix:** Corrected playlist creation payload structure
- **Verification:** User confirmed with API documentation and curl tests

**Final Implementation:**
```typescript
async createPlaylistFromTemplate(templatePlaylistId: string, newPlaylistName: string): Promise<string> {
  // Step 1: Fetch template items
  const templateResult = await this.client.playlistPlaylistIdGet(templatePlaylistId);
  const templateItems = templateResult.data.items || [];

  // Step 2: Clean items (keep name, remove UUIDs to create new items)
  const cleanedItems = templateItems.map((item: any, index: number) => ({
    id: { name: item.id?.name || item.name || 'Untitled', index, uuid: '' },
    type: item.type,
    is_hidden: item.is_hidden || false,
    is_pco: item.is_pco || false,
    // Add type-specific fields...
  }));

  // Step 3: Create empty playlist
  const createResponse = await fetch(`http://${host}:${port}/v1/playlists`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: newPlaylistName }),
  });

  // Step 4: Populate with items
  const updateResponse = await fetch(`http://${host}:${port}/v1/playlist/${newPlaylistId}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cleanedItems),
  });

  return newPlaylistId;
}
```

**Files modified:**
- [src/propresenter-client.ts](src/propresenter-client.ts) - Added `createPlaylistFromTemplate` method
- [electron/main/index.ts](electron/main/index.ts) - Added IPC handler for template creation
- [electron/renderer/src/App.tsx:475-524](electron/renderer/src/App.tsx#L475-L524) - UI handler

### 5. Progress Bar Implementation (Phase 5)

**Objective:** Show user feedback during playlist creation process.

**Implementation:**
- Added `creationProgress` state to track operation status
- Updated handler to set progress messages:
  - "Creating playlist..." (during operation)
  - "Playlist created successfully!" (on completion)
  - Clears after 1 second
- Created progress display UI with accent color styling
- Files modified:
  - [electron/renderer/src/App.tsx:144,491-514,747](electron/renderer/src/App.tsx#L144) - Progress state and logic
  - [electron/renderer/src/styles.css:337-345](electron/renderer/src/styles.css#L337-L345) - `.progress-text` styling

---

## Technical Architecture

### Core Services (Backend)

```
src/
├── services/
│   ├── pdf-parser.service.ts        (Phase 1) - Extracts text from PDF
│   ├── song-matcher.service.ts      (Phase 2) - Fuzzy matches songs
│   ├── bible-api.service.ts         (Phase 3) - Fetches NIV verses
│   └── playlist-builder.service.ts  (Phase 4) - Assembles playlists
├── propresenter-client.ts           (Phase 4) - API wrapper
└── utils/
    └── playlist-utils.ts            (Phase 5) - Tree/list utilities
```

### Electron UI (Frontend)

```
electron/
├── main/index.ts                    - Main process, IPC handlers
├── preload/index.ts                 - Preload script, API bridge
└── renderer/src/
    ├── App.tsx                      - Main React component
    └── styles.css                   - Global styles
```

### IPC Communication Flow

```
Renderer (React) → Preload API → Main Process → Services → ProPresenter API
                                              ↓
                                         electron-store
                                      (Settings persistence)
```

---

## Key Files and Line References

### Configuration & Types
- [electron/preload/index.ts:8-21](electron/preload/index.ts#L8-L21) - `SettingsPayload` type with library fields
- [electron/main/index.ts](electron/main/index.ts) - `AppSettings` interface
- [electron/renderer/src/App.tsx:5-36](electron/renderer/src/App.tsx#L5-L36) - React component types

### State Management
- [electron/renderer/src/App.tsx:110-148](electron/renderer/src/App.tsx#L110-L148) - Settings state initialization
- [electron/renderer/src/App.tsx:150-167](electron/renderer/src/App.tsx#L150-L167) - Load persisted settings
- [electron/renderer/src/App.tsx:450-467](electron/renderer/src/App.tsx#L450-L467) - Save settings handler

### Template Filtering
- [electron/renderer/src/App.tsx:261-277](electron/renderer/src/App.tsx#L261-L277) - `templatePlaylists` useMemo
- [src/utils/playlist-utils.ts:48-66](src/utils/playlist-utils.ts#L48-L66) - `mapPlaylistTree` with parentName

### Playlist Creation
- [src/propresenter-client.ts](src/propresenter-client.ts) - `createPlaylistFromTemplate` method
- [electron/renderer/src/App.tsx:475-524](electron/renderer/src/App.tsx#L475-L524) - UI handler with progress tracking

### UI Components
- [electron/renderer/src/App.tsx:636-723](electron/renderer/src/App.tsx#L636-L723) - Service Generator modal
- [electron/renderer/src/App.tsx:725-769](electron/renderer/src/App.tsx#L725-L769) - Create Playlist modal
- [electron/renderer/src/App.tsx:771-779](electron/renderer/src/App.tsx#L771-L779) - Formatting settings modal

### Styling
- [electron/renderer/src/styles.css:337-345](electron/renderer/src/styles.css#L337-L345) - Progress text
- [electron/renderer/src/styles.css:526-569](electron/renderer/src/styles.css#L526-L569) - Settings sections and selects

---

## Known Issues & Limitations

### 1. Template Flag Not Available
- **Issue:** ProPresenter API doesn't expose template designation flag
- **Workaround:** Folder-based approach (TEMPLATE folder)
- **Impact:** Users must organize templates in specific folder structure

### 2. PPTX Image Encoding Disabled
- **Issue:** pptxgenjs 3.11.0+ crashes with `pkg` bundling due to dynamic imports
- **Solution:** Locked at 3.10.0, image encoding disabled
- **Impact:** Logo images not included in CLI-generated PPTX files (Electron OK)
- **Reference:** [src/pptx-exporter.ts:91-99,129-137](src/pptx-exporter.ts)

---

## Testing Performed

### Manual Testing
1. ✅ Library dropdown population from ProPresenter API
2. ✅ Settings persistence across app restarts
3. ✅ Template playlist filtering (only shows TEMPLATE folder contents)
4. ✅ Playlist creation with all items copied
5. ✅ Progress messages display during creation
6. ✅ Error handling for missing template/empty playlist name
7. ✅ Playlist refresh after creation

### Error Scenarios Tested
1. ✅ Missing playlist name - shows error message
2. ✅ No template selected - shows error message
3. ✅ API errors during creation - displays error to user
4. ✅ Empty TEMPLATE folder - shows helpful hint message

---

## Dependencies

### Core Backend
- `renewedvision-propresenter@7.7.2` - ProPresenter 7 API client
- `pptxgenjs@3.10.0` - PowerPoint generation (LOCKED VERSION)
- `pdf-parse@1.1.1` - PDF text extraction
- `fuse.js@6.6.2` - Fuzzy matching
- `node-fetch@3.3.0` - HTTP requests

### Electron Stack
- `electron@31.2.0` - Desktop app framework
- `react@18.3.1` - UI framework
- `electron-store@8.1.0` - Settings persistence
- `electron-vite@2.3.0` - Build tooling
- `electron-builder@24.13.3` - Packaging

---

## Development Commands

```bash
# Run Electron app in development mode
npm run electron:dev

# Build TypeScript + React
npm run electron:build

# Package Electron app for distribution
npm run electron:package

# Run CLI from source
npm start -- status

# Build standalone CLI executables
npm run build:exe
```

---

### 8. Service Generator Backend Integration (Phase 5 - Feb 3, 2026)

**Objective:** Wire up Service Generator UI to existing backend services.

**Implementation:**
- Added 5 new IPC API methods in [electron/preload/index.ts](electron/preload/index.ts:92-98):
  - `choosePDF()` - PDF file picker dialog
  - `parsePDF(filePath)` - Parse PDF and extract items
  - `matchSongs(songs, config, libraryIds)` - Match songs to libraries
  - `fetchVerses(references)` - Fetch Bible verses
  - `buildServicePlaylist(config, playlistId, items)` - Build final playlist

- Added 5 new IPC handlers in [electron/main/index.ts](electron/main/index.ts:653-693):
  - Imported existing services: `PDFParser`, `SongMatcher`, `BibleFetcher`, `PlaylistBuilder`
  - Connected IPC calls to service methods
  - Implemented error handling and result formatting

**Result:** Backend infrastructure complete for service generation workflow.

---

### 9. Service Generator Workflow UI (Phase 5 - Feb 3, 2026)

**Objective:** Implement PDF upload, parsing, and workflow progression.

**Implementation:**

**Upload Step** ([ServiceGeneratorView.tsx:195-298](electron/renderer/src/ServiceGeneratorView.tsx:195-298)):
- PDF file picker with `window.api.choosePDF()`
- Auto-parse on selection with progress notification
- Display selected PDF with item count
- Clear button to reset workflow

**Parse Step** ([ServiceGeneratorView.tsx:300-421](electron/renderer/src/ServiceGeneratorView.tsx:300-421)):
- Display all parsed items with icons (🎵 songs, 📖 verses, 📋 headings)
- Show item counts and statistics
- Auto-start song matching on "Continue" button
- Navigate back to upload or forward to matching

**Workflow State** ([ServiceGeneratorView.tsx:62-68](electron/renderer/src/ServiceGeneratorView.tsx:62-68)):
- `pdfPath` and `pdfName` - Selected PDF file
- `parsedItems` - Extracted items from PDF
- `matchResults` - Song matching results
- `verseResults` - Bible verse fetching results
- `isProcessing` - Loading state for async operations

**Result:** First 3 steps (Setup, Upload, Parse) fully functional.

---

### 10. Working Playlist Selection (Phase 5 - Feb 3, 2026)

**Objective:** Auto-select created playlists and track working playlist throughout workflow.

**Implementation:**
- Added `selectedPlaylistName` and `selectedPlaylistId` state
- Auto-select on successful playlist creation
- Display selected playlist with checkmark (✓) in Setup step
- Show working playlist badge in all subsequent steps
- Prevent proceeding to Upload without playlist selection

**Result:** Clear workflow progression with persistent playlist context.

---

### 11. PDF Parser Simplification (Phase 5 - Feb 3, 2026)

**Objective:** Simplify PDF parsing to only extract items that need ProPresenter matching.

**Problem:** Parser was extracting too many items (birthday names, headers, sermon sections) that are handled via PowerPoint import by the minister.

**Implementation:**
- Modified [pdf-parser.ts:64-92](src/services/pdf-parser.ts:64-92) to only extract:
  - **Songs** - Lines starting with `PRAISE:` (without "(Video)")
  - **Kids Videos** - Lines starting with `PRAISE:` containing "(Video)"
  - **Bible Verses** - Lines starting with `BIBLE READING:`
- Removed extraction for section headers and placeholder content
- Updated IPC handler to distinguish `'song'` vs `'kids_video'` types
- Updated UI to show 🎵 for songs and 🎬 for kids videos

**Result:** Parser now focuses only on items requiring ProPresenter matching.

---

### 12. Praise Slot Tracking (Phase 5 - Feb 3, 2026)

**Objective:** Track which praise slot each song belongs to based on its position in the service order.

**Logic:**
| After this section marker | Songs labeled as |
|---------------------------|------------------|
| Call to Worship / Opening Prayer | **Praise 1** |
| Praying for Others / Prayers for Others | **Praise 2** |
| Time of Prayerful Reflection | **Praise 3** |
| (Video) marker | **Kids** |

**Implementation:**
- Added `PraiseSlot` type to [service-order.ts:8](src/types/service-order.ts:8): `'praise1' | 'praise2' | 'praise3' | 'kids'`
- Added `praiseSlot` field to `ServiceSection` interface
- Modified [pdf-parser.ts:70-119](src/services/pdf-parser.ts:70-119):
  - Tracks `currentPraiseSlot` state while scanning lines
  - Detects section markers to update current slot
  - Assigns praise slot to each song (kids videos always get `'kids'`)
- Updated IPC handler to pass `praiseSlot` to UI
- Added `formatPraiseSlot()` helper in [ServiceGeneratorView.tsx:46-54](electron/renderer/src/ServiceGeneratorView.tsx:46-54)
- Updated parse step UI to show colored badges:
  - Teal badge for Praise 1/2/3
  - Yellow badge for Kids

**Result:** Songs now display their service position context (e.g., "Song | Praise 2").

---

## Next Steps

See [plans/remaining-implementation.md](plans/remaining-implementation.md) for detailed implementation plan.

**Current Focus:** Songs-only workflow (Phase 5 priority)
1. ✅ PDF upload and parsing - COMPLETE
2. ✅ PDF parser simplification (songs, kids videos, verses only) - COMPLETE
3. ✅ Praise slot tracking (Praise 1/2/3, Kids) - COMPLETE
4. 🔄 Song matching IPC handler - IN PROGRESS (currently placeholder)
5. 🔄 Match Step UI with confidence scores - IN PROGRESS
6. ⏳ Build Step UI and playlist assembly - PENDING
7. ⏳ Bible verse workflow - DEFERRED (will add after songs working)
8. ⏳ End-to-end testing - PENDING

**Strategy:** Get complete song workflow working end-to-end first (upload → parse → match → build), then add verse functionality.

---

## Contributors

- Adam Brown - Project development
- Claude Opus 4.5 - AI pair programming assistant

---

**Last Updated:** 2026-02-03
**Version:** 2.1.1
**Status:** Phase 5 in progress - PDF parsing complete with praise slot tracking, implementing song matching
