# Remaining Implementation Plan - Service Generator

## Overview

This document outlines the remaining work to complete the ProPresenter Service Generator feature. The foundation is built (library configuration, template management, playlist creation), but the core PDF-to-service workflow needs implementation.

---

## Phase 5: Electron UI for PDF Upload and Service Generation (In Progress)

### ✅ Completed
- Service Generator modal with library configuration
- Template playlist filtering and selection
- Playlist creation from template with progress tracking
- Settings persistence across sessions
- **Mode toggle architecture** - Separate view for Service Generator
- **Feature flag** - Enable/disable Service Generator in settings

### 🔄 Remaining Work

#### 5.0 Architecture Refactor (IN PROGRESS)

**Objective:** Refactor from modal-based to mode toggle with dedicated view.

**Implementation:**
- Add `mode` state: `'export' | 'serviceGen'`
- Create `<ServiceGeneratorView>` component with sidebar navigation
- Add `enableServiceGenerator` setting (defaults to false)
- Conditionally show 📖 button based on feature flag
- Migrate existing configuration UI to new view
- Implement step-based navigation (Setup → Upload → Parse → Match → Verse → Build)

**Benefits:**
- Full-screen space for complex workflows
- Clear separation of concerns
- Can hide feature for users who don't need it
- Scalable for future steps

#### 5.1 PDF Upload Interface

**Objective:** Allow users to upload/select PDF service orders for parsing.

**UI Design:**
```
Service Generator Modal (Current State)
├── Library Configuration (✅ Complete)
├── Template Selection (✅ Complete)
└── PDF Upload Section (⏳ TO DO)
    ├── File picker button
    ├── Drag-and-drop zone
    ├── Selected file display
    └── "Parse PDF" button
```

**Implementation Tasks:**
1. Add PDF file picker using Electron dialog
   - Update `electron/main/index.ts` with IPC handler
   - Update `electron/preload/index.ts` with API method
   - Add UI button in Service Generator modal

2. Add drag-and-drop support (optional enhancement)
   - Implement drop zone in React
   - Handle file validation (PDF only)

3. Display selected file info
   - Show filename, file size
   - Allow clearing selection

**Files to Modify:**
- `electron/main/index.ts` - Add `choosePDF` IPC handler
- `electron/preload/index.ts` - Add `choosePDF` API method
- `electron/renderer/src/App.tsx` - Add PDF picker UI and state

---

#### 5.2 PDF Parsing and Preview

**Objective:** Parse uploaded PDF and display extracted service order structure.

**UI Design:**
```
After PDF uploaded:
├── Parsed Service Structure
│   ├── Song 1: "Amazing Grace"
│   ├── Bible Verse: John 3:16
│   ├── Song 2: "How Great Thou Art"
│   ├── Bible Verse: Psalm 23:1-3
│   └── Song 3: "10,000 Reasons"
└── Actions
    ├── "Edit Order" button (optional)
    └── "Continue to Matching" button
```

**Implementation Tasks:**
1. Wire up PDF parser service
   - Import `PDFParserService` from Phase 1
   - Add IPC handler in main process
   - Call parser and return extracted items

2. Display parsed structure
   - Create `ParsedItem` component
   - Show item type (song/verse/heading)
   - Show extracted text

3. Error handling
   - Invalid PDF format
   - No recognizable items found
   - Parsing errors

**Files to Modify:**
- `electron/main/index.ts` - Add `parsePDF` IPC handler
- `electron/renderer/src/App.tsx` - Add parsed items state and display
- `src/services/pdf-parser.service.ts` - Ensure Electron compatibility

---

#### 5.3 Song Matching Interface

**Objective:** Match parsed songs against configured ProPresenter libraries with confidence scoring.

**UI Design:**
```
For each parsed song:
├── Original Text: "Amazing Grace"
├── Matching Options:
│   ├── ✅ "Amazing Grace (My Chains Are Gone)" - 95% match
│   ├── ⚪ "Amazing Grace" - 85% match
│   └── ⚪ "Amazing Grace (Traditional)" - 80% match
├── Manual Search (if no match found)
└── Skip Song (exclude from playlist)
```

**Implementation Tasks:**
1. Wire up song matcher service
   - Import `SongMatcherService` from Phase 2
   - Add IPC handler for matching
   - Query configured libraries (worship, kids)

2. Display match results
   - Create `SongMatchResult` component
   - Show confidence percentage
   - Allow user to select best match

3. Handle low/no confidence
   - Allow manual library search
   - Allow skipping song entirely
   - Show warning for confidence < 70%

4. Batch matching optimization
   - Match all songs at once
   - Show progress for multiple songs
   - Cache results

**Files to Modify:**
- `electron/main/index.ts` - Add `matchSongs` IPC handler
- `electron/renderer/src/App.tsx` - Add matching UI and state
- `src/services/song-matcher.service.ts` - Ensure proper library filtering

**Complexity:** High - requires sophisticated UI for reviewing/editing matches

---

#### 5.4 Bible Verse Fetching Interface

**Objective:** Fetch NIV verses from Bible API and preview content.

**UI Design:**
```
For each parsed verse:
├── Reference: "John 3:16"
├── Preview:
│   │ "For God so loved the world that he gave his one and only Son,
│   │  that whoever believes in him shall not perish but have eternal life."
├── Options:
│   ├── ✅ Include verse
│   ├── Format: [Dropdown: Full text | Reference only | Title slide]
│   └── Edit reference (if incorrect)
```

**Implementation Tasks:**
1. Wire up Bible API service
   - Import `BibleAPIService` from Phase 3
   - Add IPC handler for verse fetching
   - Handle rate limiting / API errors

2. Display verse preview
   - Create `VersePreview` component
   - Show full text with formatting
   - Show verse reference

3. Formatting options
   - Full text (multiple slides if long)
   - Reference only (title slide)
   - Skip verse

4. Error handling
   - Invalid reference format
   - API unavailable
   - Rate limit exceeded

**Files to Modify:**
- `electron/main/index.ts` - Add `fetchVerses` IPC handler
- `electron/renderer/src/App.tsx` - Add verse preview UI
- `src/services/bible-api.service.ts` - Add error handling

---

#### 5.5 Playlist Building and Review

**Objective:** Assemble final playlist from matched songs and verses, show preview before creation.

**UI Design:**
```
Final Playlist Preview:
├── Playlist Name: [Input field]
├── Items (16 total):
│   ├── 1. Amazing Grace (My Chains Are Gone) [Song]
│   ├── 2. John 3:16 [Bible Verse]
│   ├── 3. How Great Thou Art [Song]
│   ├── 4. Psalm 23:1-3 [Bible Verse]
│   └── ... (remaining items)
└── Actions:
    ├── "Reorder Items" (drag and drop)
    ├── "Remove Item" (per item)
    └── "Create Playlist" button
```

**Implementation Tasks:**
1. Wire up playlist builder service
   - Import `PlaylistBuilderService` from Phase 4
   - Assemble items from matched songs and verses
   - Add presentation items from service content library

2. Display playlist preview
   - Create `PlaylistPreview` component
   - Show item order with drag-and-drop reordering
   - Show item types with icons

3. Final review and editing
   - Allow removing items
   - Allow reordering (react-beautiful-dnd or similar)
   - Show item count

4. Create playlist
   - Reuse existing `createPlaylistFromTemplate` flow
   - Populate with service-specific items instead
   - Show progress during creation

**Files to Modify:**
- `electron/main/index.ts` - Add `buildPlaylist` IPC handler
- `electron/renderer/src/App.tsx` - Add playlist preview UI
- `src/services/playlist-builder.service.ts` - Ensure proper item formatting

---

## Phase 6: Error Handling and Edge Case Management (Pending)

### 6.1 ProPresenter Connection Errors

**Scenarios:**
- ProPresenter not running
- Network connection lost mid-operation
- API version mismatch
- Authentication errors (future ProPresenter versions)

**Implementation:**
1. Connection health checks before operations
2. Graceful degradation (show what's possible offline)
3. Retry logic with exponential backoff
4. Clear error messages with recovery steps

---

### 6.2 PDF Parsing Errors

**Scenarios:**
- Invalid PDF format
- Encrypted/password-protected PDFs
- No text content (scanned images)
- Unrecognized service order format

**Implementation:**
1. PDF validation before parsing
2. Multiple parsing strategies (fallback logic)
3. Clear error messages with examples
4. Manual item entry fallback

---

### 6.3 Song Matching Edge Cases

**Scenarios:**
- Song not found in any library
- Multiple high-confidence matches (ambiguous)
- Song name variations (abbreviations, special characters)
- Library contains duplicates

**Implementation:**
1. Confidence threshold tuning (70% minimum recommended)
2. Manual search fallback
3. Fuzzy matching improvements (handle abbreviations)
4. Duplicate detection and selection

---

### 6.4 Bible API Issues

**Scenarios:**
- API unavailable (network issues)
- Invalid verse reference
- Rate limiting exceeded
- Verse not found in NIV translation

**Implementation:**
1. API health check before operations
2. Cache verse responses (reduce API calls)
3. Reference validation before API call
4. Fallback to manual verse entry

---

### 6.5 Playlist Creation Failures

**Scenarios:**
- Playlist name already exists
- ProPresenter API errors during creation
- Missing presentation files
- Invalid item structures

**Implementation:**
1. Playlist name uniqueness check
2. Validation before API calls
3. Rollback on partial failure
4. Clear error messages with retry option

---

## Phase 7: Testing and Refinement (Pending)

### 7.1 Unit Tests

**Coverage Targets:**
- PDF parser: Pattern recognition, text extraction
- Song matcher: Fuzzy matching algorithm, confidence scoring
- Bible API: Reference parsing, verse fetching
- Playlist builder: Item assembly, format validation

**Tools:**
- Jest for testing framework
- Mock ProPresenter API responses
- Sample PDFs for parser testing

---

### 7.2 Integration Tests

**Test Scenarios:**
1. End-to-end: PDF upload → song matching → verse fetching → playlist creation
2. Error recovery: API failures, network issues, invalid inputs
3. Performance: Large service orders (20+ songs), multiple simultaneous operations
4. Settings persistence: Library selections, template choices

---

### 7.3 User Acceptance Testing

**Test Cases:**
1. Real service orders from multiple churches
2. Various PDF formats and layouts
3. Different ProPresenter library structures
4. Edge cases: Unusual song names, obscure verses

---

### 7.4 Performance Optimization

**Targets:**
- PDF parsing: < 2 seconds
- Song matching: < 5 seconds for 10 songs
- Verse fetching: < 3 seconds for 5 verses
- Playlist creation: < 10 seconds total

**Optimizations:**
1. Batch API calls where possible
2. Cache song library data
3. Parallel processing for independent operations
4. Progress indicators for long operations

---

## Implementation Priority

### Priority 1 (Must Have)
- ✅ Library configuration
- ✅ Template selection and playlist creation
- 🔄 PDF upload interface (5.1)
- 🔄 PDF parsing and preview (5.2)
- 🔄 Song matching interface (5.3)
- 🔄 Playlist building and creation (5.5)

### Priority 2 (Should Have)
- 🔄 Bible verse fetching interface (5.4)
- Error handling for connection issues (6.1)
- Error handling for parsing issues (6.2)
- Error handling for matching issues (6.3)

### Priority 3 (Nice to Have)
- Drag-and-drop PDF upload
- Manual item reordering in playlist preview
- Integration tests (7.2)
- Performance optimization (7.4)

### Priority 4 (Future Enhancements)
- Save service templates (reusable patterns)
- Export service order to other formats (Word, Google Docs)
- Multi-language verse support (ESV, KJV, etc.)
- Automatic song selection based on theme/season

---

## Time Estimates

Based on complexity and current progress:

| Phase | Task | Estimated Time | Complexity |
|-------|------|----------------|------------|
| 5.1 | PDF Upload Interface | 2-3 hours | Low |
| 5.2 | PDF Parsing Preview | 3-4 hours | Medium |
| 5.3 | Song Matching Interface | 6-8 hours | High |
| 5.4 | Bible Verse Interface | 3-4 hours | Medium |
| 5.5 | Playlist Building | 4-5 hours | Medium-High |
| 6.x | Error Handling | 4-6 hours | Medium |
| 7.x | Testing & Refinement | 8-10 hours | Medium |

**Total Estimated Time:** 30-40 hours

**Note:** Song matching interface (5.3) is the most complex due to:
- Multiple match results per song
- Confidence scoring UI
- Manual search fallback
- User selection/override logic

---

## Technical Considerations

### Service Integration

All backend services (Phases 1-4) are already implemented:
- ✅ `PDFParserService` - Ready for integration
- ✅ `SongMatcherService` - Ready for integration
- ✅ `BibleAPIService` - Ready for integration
- ✅ `PlaylistBuilderService` - Ready for integration

**Integration Pattern:**
```typescript
// In electron/main/index.ts
import { PDFParserService } from '../src/services/pdf-parser.service';
import { SongMatcherService } from '../src/services/song-matcher.service';
// ... etc

ipcMain.handle('parsePDF', async (event, filePath: string) => {
  const parser = new PDFParserService();
  return await parser.parse(filePath);
});
```

---

### State Management

Current approach uses React `useState` hooks. For Phase 5 completion, consider:

**Option 1: Continue with useState (Recommended for now)**
- Simple, works well for current complexity
- Easy to debug and maintain
- Sufficient for single-modal workflow

**Option 2: Upgrade to useReducer**
- Better for complex state with multiple steps
- Centralized state transitions
- Easier to test

**Option 3: Add state management library (Zustand/Redux)**
- Only if workflow becomes significantly more complex
- Overkill for current scope
- Consider for future if adding multi-step wizards

---

### UI/UX Patterns

**Wizard Pattern (Recommended):**
```
Step 1: Upload PDF → Step 2: Review Parsing → Step 3: Match Songs →
Step 4: Fetch Verses → Step 5: Review Playlist → Step 6: Create
```

**Benefits:**
- Clear progression
- User can go back to previous steps
- Easy to save partial progress

**Implementation:**
- Add step state: `currentStep` (1-6)
- Show progress indicator
- "Back" and "Next" buttons
- Validate each step before proceeding

---

## Dependencies to Add

**For drag-and-drop reordering:**
```bash
npm install react-beautiful-dnd
npm install @types/react-beautiful-dnd --save-dev
```

**For PDF drop zone (if implementing):**
```bash
npm install react-dropzone
npm install @types/react-dropzone --save-dev
```

---

## Success Criteria

### Minimum Viable Product (MVP)
- ✅ User can configure libraries
- ✅ User can select template playlist
- ✅ User can create playlist from template
- ⏳ User can upload PDF service order
- ⏳ System parses PDF and extracts songs/verses
- ⏳ System matches songs to ProPresenter libraries
- ⏳ System creates playlist with matched items
- ⏳ Errors are handled gracefully with helpful messages

### Enhanced Product
- ⏳ User can manually override song matches
- ⏳ User can reorder playlist items before creation
- ⏳ System fetches and displays Bible verse text
- ⏳ System shows progress for long operations
- ⏳ System caches data to reduce API calls
- ⏳ Full test coverage (unit + integration)

---

## Notes for Future Development

### Potential Enhancements
1. **Service Templates:** Save parsed service structures as templates for reuse
2. **Batch Processing:** Process multiple service orders at once
3. **Schedule Integration:** Import from PCO, Planning Center, etc.
4. **Song Usage Analytics:** Track which songs are used most frequently
5. **Verse Library:** Cache frequently used verses for offline use
6. **Multi-language Support:** Support for non-English song libraries

### Architecture Improvements
1. **Service Worker:** Move heavy processing off main thread
2. **Background Sync:** Queue operations for when connection restored
3. **Undo/Redo:** Allow reverting playlist operations
4. **Auto-save:** Persist workflow progress in case of crashes

---

**Last Updated:** 2026-02-03
**Status:** Phase 5 partially complete, Phases 6-7 pending
**Next Milestone:** PDF upload and parsing UI (5.1-5.2)
