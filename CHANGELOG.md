# Changelog

All notable changes to ProPresenter Lyrics Export will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.3.2] - 2026-02-06

### Fixed
- **Playlist Build 404 Error** - Fixed playlist update failing with HTTP 404 when building service playlists
  - ProPresenter's PUT API rejects presentation items with empty `id.uuid` for certain presentations
  - New items now use the `presentation_uuid` as `id.uuid` instead of empty string
  - All playlist items are now cleaned before PUT to strip extra fields from GET responses
  - Also fixed in `createPlaylistFromTemplate` to prevent same issue when copying playlists

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
