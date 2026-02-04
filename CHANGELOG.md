# Changelog

All notable changes to ProPresenter Lyrics Export will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [2.2.0] - 2026-02-04

### Added
- **Service Generator** - New workflow to automate Sunday service playlist creation from PDF service orders
  - Upload a PDF service order (from Planning Center, etc.) and automatically build your ProPresenter playlist
  - **6-Step Guided Workflow**:
    1. **Setup** - Select target playlist, worship library, and template
    2. **Upload PDF** - Choose your service order PDF
    3. **Parse** - Automatically extracts songs, Bible verses, and service sections
    4. **Match Songs** - Fuzzy-matches song titles to your ProPresenter library with confidence scores
    5. **Bible** - Matches verse references against your Service Content library
    6. **Build** - Populates your ProPresenter playlist with matched items
  - Smart song matching with confidence scoring (auto-selects high-confidence matches)
  - Support for multiple worship slots (Praise 1, Praise 2, Praise 3, Kids)
  - Kids video detection with separate library matching

- **Bible Verse Matching** - Automatically match Bible references against your Service Content library
  - Searches for existing verse presentations by reference (e.g., "Romans 12:1-2")
  - Shows confidence scores and allows selecting from multiple matches
  - Manual workflow fallback when no library match found:
    - Copy reference to clipboard
    - Open in Bible Gateway
    - Focus ProPresenter on Reading section (Cmd+B for Bible panel)

### Improved
- **Step Validation Gating** - Cannot proceed to next step until current step is complete
  - Prevents advancing with incomplete song matches or verse selections
  - Visual indicators show completed (✓) and locked steps
  - Clear feedback on what's needed to proceed

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
