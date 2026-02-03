# Changelog

All notable changes to ProPresenter Lyrics Export will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
