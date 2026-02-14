# Changelog

All notable changes to ProPresenter Lyrics Export will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.4.2] - 2026-02-14

### Added
- **Skip Verses Button** - Verse step can now be explicitly skipped if Bible presentations aren't in the library yet
  - "Skip Verses" button shown at both top and bottom of the verse step
  - Navigating back from Build resets the skip state so you can re-engage
- **YouTube Search for Kids Songs** - One-click "Search YouTube" button for unmatched kids songs
  - Kids songs are typically YouTube videos; this opens a YouTube search with the song name pre-filled
- **Cross-Library Fallback for Kids Matching** - When a kids song isn't found in the Kids library, the matcher now automatically searches all libraries as a fallback
  - If a better match is found in any library (worship, service content), it uses that instead

### Improved
- **Not-Found Guidance** - All not-found states now show clear, consistent messaging:
  - Kids songs: "Copy Song Name" + "Search YouTube" + step-by-step to import into Kids library and Rescan
  - Worship songs: "Copy Song Name" + "Search CCLI" + step-by-step to import into Worship library and Rescan
  - Bible verses: "Copy Reference" (first action) + "Bible Gateway" + step-by-step to create in ProPresenter Bible panel (Cmd+B), save to Service Content library, and Rescan
  - All states explain: "Make sure it's been imported into ProPresenter"
- **Copy Actions Promoted** - Copy buttons are now the first action in all not-found panels, making it easy to paste into YouTube/CCLI/ProPresenter Bible panel

## [2.4.1] - 2026-02-09

### Fixed
- **Nested Folder Playlists in Electron GUI** - Playlists inside folders now appear correctly in the Electron desktop app
  - The playlists:list IPC handler was only parsing one level of children, losing nested playlists
  - Replaced flat mapping with recursive parseItems() helper to handle arbitrary nesting depth
  - Matches the pattern already used in ProPresenterClient.parsePlaylistItems()
  - Fixes issue #6 (folder-based playlist export follow-up)

## [2.4.0] - 2026-02-07

### Added
- **Song Alias/Override Mapping** - Persistent mappings for songs listed under different names in the order of service
  - When the PDF says "Be Thou My Vision" but your library has "You Are My Vision", create an alias to auto-match
  - Aliases are checked before fuzzy matching with 100% confidence
  - Shared between CLI and Desktop App (stored at `~/.propresenter-words/aliases.json`)
- **CLI Alias Commands** - `alias list`, `alias add`, `alias remove` for managing song mappings from the terminal
  - `alias add` connects to ProPresenter and lets you interactively search the library
- **Inline Library Search** - Search ProPresenter libraries directly from the match review step
  - Click "Search Library" on any song to find and select any presentation
  - Searches are scoped to the relevant library (worship, kids, or service content)
  - No need to leave the app to fix a wrong match
- **Save as Alias** - One-click button to save manual overrides as persistent aliases for future services
  - Only shown for worship songs (not kids videos)
- **Bible Verse Library Search** - Inline search for Bible verses in the service content library
  - Search for specific verse presentations when auto-matching doesn't find the right one
  - Scoped to the service content library only

### Fixed
- **Library Search Scoping** - Search is now scoped to the relevant library instead of searching all libraries
  - Worship songs search the worship library only
  - Kids videos search the kids library only
  - Bible verses search the service content library only
- **Bible Verse Matching** - Fixed verse matching showing worship songs instead of only Bible content
  - Now pre-filters to presentations with translation markers (NIV, ESV, NLT, KJV, etc.)
  - Replaced overly broad partial word matching with targeted book + chapter matching
  - Falls back to all presentations if no translation-marked items found
- **Override Display** - Manual overrides from library search now show "(Override)" instead of misleading "100%" confidence
- **Auto-advance After Playlist Creation** - App now automatically advances to the Upload PDF step after creating a playlist

## [2.3.3] - 2026-02-07

### Fixed
- **Library Filter Not Respecting "All items in playlist"** - Fixed exports failing when "All items in playlist" was selected
  - When library filter was set to blank/"All items in playlist", the app incorrectly fell back to the stored "Worship" default
  - Playlists with items from non-Worship libraries (Kids, STEAM, etc.) would fail with "No lyric slides found" error
  - Filter logic now correctly distinguishes between explicit `null` (user wants all items) and `undefined` (use stored setting)
  - Both export and settings persistence now use consistent null-checking pattern

## [2.3.2] - 2026-02-06

### Fixed
- **Playlist Build 404 Error** - Fixed playlist update failing with HTTP 404 when building service playlists
  - ProPresenter's PUT API rejects presentation items with empty `id.uuid` for certain presentations
  - New items now use the `presentation_uuid` as `id.uuid` instead of empty string
  - All playlist items are now cleaned before PUT to strip extra fields from GET responses
  - Also fixed in `createPlaylistFromTemplate` to prevent same issue when copying playlists
- **Window Not Draggable** - Added title bar drag region so the window can be moved like a native macOS app
  - The `hiddenInset` title bar style hid the native drag area without providing a replacement
  - Both Export and Service Generator views now have a draggable title bar zone

### Improved
- **Kids Video Detection** - Kids videos now show "Import to Kids library" guidance instead of CCLI search buttons
  - Contextual look-ahead detects kids videos even when title doesn't explicitly say "kids"
  - Unmatched kids videos no longer block the workflow (can be imported manually)
- **Bible Verse Auto-Search** - Verses are now automatically searched when entering the verse matching step
  - No more manual "Search" button click required
  - Shows results immediately with count of matches found
- **Bible Verse Manual Workflow** - Improved UI for verses not found in library
  - Dropdown now shows "None of these / Add manually" as default option
  - Clearer guidance for manual verse import

## [2.3.1] - 2026-02-06

### Fixed
- **App Crash on Launch** - Fixed `DOMMatrix is not defined` error that prevented the desktop app from opening
  - The `pdf-parse` library (used by Service Generator) requires browser APIs unavailable in Electron's main process
  - PDF parser is now lazy-loaded only when a PDF is actually parsed, keeping app startup clean
  - Added lightweight `DOMMatrix` polyfill for the Node.js environment so PDF parsing works correctly

## [2.3.0] - 2026-02-04

### Added
- **Service Library Structure Guide** - Comprehensive documentation on organizing ProPresenter libraries for Service Generator
  - Explains three-library setup: Worship (songs), Service Content (videos/ceremony), Kids (children's content)
  - Clarifies how Service Generator routes different content types to appropriate libraries
  - Provides setup instructions for ProPresenter Preferences → Libraries
  - Helps prevent library organization issues that cause matching failures

- **Worship Slot Manual Override** - Right-click context menu in Step 4 to reassign songs to different worship slots
  - Useful when automatic detection places a song in the wrong section
  - Select from: Praise 1, Praise 2, Praise 3, or Kids
  - Immediately updates the display with new slot assignment

### Improved
- **PDF Format Documentation** - Enhanced with clearer expectations for PDF structure
  - Better explanation of hierarchical document structure Service Generator expects
  - Clarified how videos are distinguished (kids vs. non-kids based on keywords)
  - Added examples of content organization within ProPresenter libraries
  - Explains normalization of scripture references for matching
  - Improved guidance for custom PDF creation

- **Service Generator Documentation** - Better organization and clarity
  - Moved "Adding Bible Verses to ProPresenter" tutorial to Step 5 for contextual relevance
  - Removed duplicate "Service Build Complete" screenshot
  - Improved flow from problem identification to solution

## [2.2.3] - 2026-02-04

### Fixed
- **Service Generator Bible Verse Matching** - Bible verse references now match correctly against ProPresenter presentations with different formatting
  - Fixed matching between PDF references (e.g., "Luke 2:21-40") and presentation names (e.g., "Luke 2_21-40 (NIV)-1")
  - Now normalizes punctuation (colons, underscores, hyphens) during matching
  - Verses automatically matched with 85%+ confidence are now auto-selected

- **Service Generator Playlist Preservation** - Playlist sections with no new items are now preserved
  - Fixed issue where Bible verses without matches were causing entire sections to be cleared
  - Only replaces items when actual replacements are provided

### Improved
- **Build Playlist UX** - Button text now shows accurate count of items being added
  - Displays "Add N Songs + M Verses" instead of just "Add N Songs"
  - Success message shows "Added X items" for clarity
  - Properly pluralizes song/verse labels

## [2.2.2] - 2026-02-04

### Fixed
- **Service Generator Bible Verses** - Bible verses from PDF service orders are now properly added to playlists
  - Fixed issue where Bible verses were shown in the build preview but not included in the final playlist
  - Verses now correctly added to the "Reading" section of the generated playlist
  - Matches songs and verses with equal priority during playlist generation

## [2.2.1] - 2026-02-04

### Improved
- **Playlist Tree Expansion** - All nested folder levels now expanded by default
  - Deeply nested playlists are now immediately visible without manual clicking
  - Users can still collapse folders as needed for better organization
  - Makes browsing large nested playlist structures faster and easier

## [2.2.0] - 2026-02-04

### Added
- **🎯 Service Generator** - Revolutionary workflow that automates Sunday service playlist creation from PDF service orders
  - **What it does**: Upload a PDF service order (from Planning Center, Proclaim, ChurchPlanner, etc.) and automatically populate your ProPresenter playlist with matched songs, Bible passages, and service structure
  - **Time-saving automation**: What typically takes 15-20 minutes of manual playlist building now takes 2-3 minutes
  - **6-Step Guided Workflow** with validation and step-by-step progress:
    1. **Setup** - Configure your worship library, kids library, service content library, and target playlist (one-time setup)
    2. **Upload PDF** - Drag-and-drop or browse to select your service order PDF
    3. **Parse** - Intelligent PDF parsing automatically extracts songs, Bible verses, service sections, and kids videos
    4. **Match Songs** - Fuzzy-match engine finds songs in your ProPresenter library with confidence scoring
       - Auto-selects high-confidence matches (>90%)
       - Shows alternatives for uncertain matches
       - Manual override support to choose correct song
    5. **Bible** - Match Bible verse references against your existing Service Content library presentations
       - Automatically finds matching verses (e.g., "Romans 12:1-2")
       - Shows confidence scores for each match
       - Fallback: copy to clipboard, open Bible Gateway, manually add to ProPresenter
    6. **Build** - Automatically populates your target playlist with matched items in correct order

  - **Intelligent Parsing**:
    - Detects worship slots automatically (Praise 1, Praise 2, Praise 3)
    - Kids video detection and separate library matching for children's content
    - Service announcements, prayers, and special content automatically categorized
    - Handles multiple formats and PDF layouts intelligently

  - **Workflow Protection**:
    - Step-by-step validation prevents proceeding with incomplete data
    - Visual completion indicators (✓) show which steps are ready
    - Locked steps clearly indicate what must be completed before advancing
    - Clear feedback messages guide you through each step

  - **Professional Result**: After completion, your ProPresenter playlist is built with proper structure:
    - All songs matched to your library with time markers
    - Bible passages linked to Service Content presentations
    - Service announcements and transitions properly positioned
    - Just Drop in your Birthday Bucket, Sermon and Kids Talk PPTs (TIP: Use the Import PPT as Presenration feature for editable slides!)
    - Ready for immediate use in your Sunday service

- **Bible Verse Matching** - Professional Bible reference matching system
  - Searches across your Service Content library for matching verse presentations
  - Confidence scoring shows match quality
  - Fallback workflow for unmached verses:
    - One-click copy reference to clipboard
    - One-click open reference in Bible Gateway
    - Focus ProPresenter's Bible reading panel (Cmd+B) for manual addition

### Improved
- **Step Validation Gating** - Professional workflow ensuring data integrity
  - Prevents advancing with incomplete song matches or verse selections
  - Visual indicators show completed (✓) and locked (🔒) steps
  - Clear error messages explain what's needed before proceeding
  - Ensures no data is lost in the build process

## [2.1.1] - 2026-02-03

### Added
- **ProPresenter Auto-Launch** - Desktop app now automatically launches ProPresenter if not running
  - Detects if ProPresenter is running (macOS/Windows)
  - Launches ProPresenter automatically on Connect
  - Polls API with 20-second timeout waiting for startup
  - Better status messages during connection process

### Fixed
- Version display showing "undefined.undefined.undefined" in status bar
- Handle missing/unavailable version data from ProPresenter API gracefully
- Enhanced error messages distinguishing between different connection failure types:
  - ProPresenter not running (auto-launched)
  - Network API disabled (shows setup instructions)
  - Connection errors (wrong host/port)

### Improved
- Connection workflow with real-time status updates
- No immediate failure if ProPresenter isn't running
- Clear guidance on how to fix configuration issues

## [2.1.0] - 2026-02-03

### Added
- **Font Detection & Curated Dropdown** - Smart font selection in the desktop app settings
  - Cross-platform font detection (macOS, Windows, Linux)
  - 25+ curated presentation-ready fonts organized by category:
    - Sans-serif: Red Hat Display, Arial, Helvetica, Verdana, Open Sans, Roboto, Lato, Montserrat, Poppins, etc.
    - Serif: Georgia, Times New Roman, Palatino, Cambria, Merriweather, Playfair Display, Lora
    - Display: Impact, Oswald, Bebas Neue
  - Visual indicators showing which fonts are installed (✓) vs missing (○)
  - One-click download buttons for missing fonts (opens Google Fonts)
  - Refresh button to re-scan fonts after installation
  - Real-time font status indicator with installation state

### Changed
- Font family input replaced with curated dropdown in desktop app settings
- Settings modal now shows font availability status

### Improved
- Better user experience for font selection and management
- Prevents font typos and invalid font names in PPTX exports

## [1.0.1] - 2026-02-02

### Added
- Electron desktop app with full React UI
- Professional app icons for macOS (.icns) and Windows (.ico)
- GitHub Actions automated release workflow
- Settings persistence using electron-store
- Connection validation before operations

### Changed
- Documentation reorganized into `docs/` folder
- Added package-lock.json for CI/CD reliability

### Fixed
- PPTX export bundling issues with pptxgenjs
- Image encoding disabled to avoid dynamic import crashes

## [1.0.0] - 2026-01-15

### Added
- Initial release
- CLI tool for extracting lyrics from ProPresenter 7
- Multiple export formats: Text, JSON, PowerPoint (PPTX)
- Interactive playlist selection
- Worship library integration
- Cross-platform support (macOS ARM64/Intel, Windows)
- Standalone executables (no Node.js required)
- Setup scripts for macOS and Windows
- PowerPoint styling customization via environment variables
