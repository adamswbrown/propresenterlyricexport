# ProPresenter Lyrics Export - Claude Project Guide

## Project Status: ✅ Production Ready

A modern desktop + CLI toolkit for extracting and exporting lyrics from ProPresenter 7 presentations. Available as an Electron desktop app (recommended) or standalone CLI executables. Cross-platform support for macOS and Windows.

## Quick Facts

- **Language**: TypeScript/Node.js + React (Electron GUI)
- **Distribution**:
  - **Desktop App** (Electron): macOS .zip, Windows .exe installer
  - **CLI Executables**: macOS (ARM64/Intel), Windows standalone binaries
- **Entry Points**:
  - Desktop App Dev: `npm run electron:dev`
  - CLI Dev: `npm start` or `npm run dev`
  - Production Builds: GitHub Actions automated releases
- **Main Files**:
  - CLI: `src/cli.ts`, `src/propresenter-client.ts`, `src/lyrics-extractor.ts`, `src/pptx-exporter.ts`
  - Electron: `electron/main.ts`, `src/gui/` (React components)
- **Current Version**: 1.0.1
- **Key Dependencies**:
  - pptxgenjs@3.10.0 (LOCKED - see Known Issues)
  - electron@31.2.0
  - react@18.3.1

## Architecture

**Core Engine (Shared):**
```
ProPresenterClient (API wrapper)
    ↓
LyricsExtractor (parse lyrics from API)
    ↓
PptxExporter (generate PowerPoint)
```

**Distribution Paths:**
```
Path 1: Desktop App (Recommended)
  Electron Main Process → React GUI → Core Engine → PPTX Export
  Built with: electron-vite + electron-builder
  Output: .zip (macOS), .exe (Windows)

Path 2: CLI Executables
  CLI Interactive Mode → Core Engine → Text/JSON/PPTX Export
  Built with: TypeScript + pkg
  Output: Standalone binaries (macOS ARM64, Intel, Windows)
```

**Automated Releases:**
- GitHub Actions workflow on version tags
- Builds both Electron apps and CLI executables
- Publishes to GitHub Releases automatically

## Building

**Development:**
```bash
# Run Electron desktop app (dev mode with hot reload)
npm run electron:dev

# Run CLI from source
npm start -- status
npm start -- pptx
```

**Production Builds:**
```bash
# Build Electron app (uses electron-builder)
npm run electron:build      # Compile TypeScript + React
npm run electron:package    # Package into distributable

# Build standalone CLI executables (uses pkg)
npm run build:exe          # macOS ARM64, Intel, Windows

# Build macOS app bundle + DMG (legacy, optional)
npm run build:macos
npm run build:macos:dmg

# Build everything (automated via GitHub Actions)
npm run release:bundle
```

**GitHub Actions Automated Release:**
- Trigger: Push version tag (e.g., `v1.0.2`)
- Builds: macOS Electron .zip + Windows Electron .exe
- Publishes: GitHub Releases with all artifacts
- See: `.github/workflows/release.yml`

## Known Issues & Solutions

### ⚠️ pptxgenjs Bundling Issue
- **Problem**: Versions 3.11.0+ crash when bundled with `pkg` due to dynamic `fs` imports
- **Solution**: LOCKED at 3.10.0, image encoding DISABLED in PPTX export
- **Impact**: PPTX files generate without logo images (acceptable trade-off for bundling)
- **Fix Applied**: Image encoding commented out in `src/pptx-exporter.ts` lines 91-99, 129-137
- **DO NOT**: Upgrade pptxgenjs without resolving this first

### ✅ Recent Updates (Feb 2, 2026)
1. **Electron GUI added** - Full desktop app with React UI for playlist management
2. **App icons created** - Professional .icns (macOS) and .ico (Windows) icons
3. **GitHub Actions workflow** - Automated releases on version tags
4. **Documentation reorganized** - All docs moved to `docs/` folder
5. **package-lock.json added** - Fixed `npm ci` errors in CI/CD
6. **CLI still available** - Standalone executables maintained alongside Electron

## Development Workflow

### Making Changes
1. Edit TypeScript files in `src/`
2. Run `npm run build` to compile
3. Test with `npm start -- [command]`
4. When ready: `npm run build:exe` to rebuild all platform executables

### Testing
```bash
# Test CLI directly
npm start -- status --host 192.168.68.58 --port 61166

# Test interactive mode
npm start -- pptx

# Test built executable
./executables/propresenter-lyrics-macos-arm64 pptx 3 output.pptx
```

### Common Commands
```bash
# Check connection
propresenter-lyrics status

# Export playlist to text
propresenter-lyrics export 3

# Export playlist to PowerPoint (interactive)
propresenter-lyrics pptx

# Export specific playlist directly
propresenter-lyrics pptx 3 my-service
```

## Environment Variables

```bash
export PROPRESENTER_HOST=192.168.68.58
export PROPRESENTER_PORT=61166
```

These can be set in shell profile or passed per-command:
```bash
propresenter-lyrics status --host 192.168.68.58 --port 61166
```

## Git Workflow

All recent work has been committed with proper messages. Key commits:
- Clean up Electron and GUI code
- Fix PPTX export bundling issues
- Disable image encoding to avoid dynamic import crashes

Always commit meaningful changes with context about WHY, not just WHAT.

## File Structure

```
src/
├── cli.ts                    # CLI entry point, command handling
├── propresenter-client.ts    # ProPresenter API wrapper (shared)
├── lyrics-extractor.ts       # Parse lyrics from slides (shared)
├── pptx-exporter.ts          # Generate PowerPoint files (shared)
└── gui/                      # Electron React components
    ├── App.tsx               # Main Electron UI
    ├── components/           # React components
    └── styles/               # CSS modules

electron/
├── main.ts                   # Electron main process
├── preload.ts                # Electron preload script
└── renderer.ts               # Electron renderer entry

dist/                         # Compiled CLI TypeScript (generated)
dist-electron/                # Compiled Electron bundles (generated)
executables/                  # CLI executables (generated)
release/                      # Electron packages (generated)

assets/
├── icon.icns                 # macOS app icon
├── icon.ico                  # Windows app icon
└── icon.png                  # 512x512 source image

.github/workflows/
└── release.yml               # Automated release workflow

scripts/
├── generate-icons.sh         # Create app icons from logo.png
├── setup-mac.sh             # Interactive macOS setup
└── setup-windows.ps1        # Interactive Windows setup (PowerShell)

docs/                         # All documentation
├── DEVELOPING.md            # Development guide
├── DISTRIBUTION.md          # Distribution guide
├── QUICK_START.md           # Quick start guide
├── RELEASING.md             # Release creation guide
└── SETUP.md                 # Setup instructions

Configuration/
├── electron-builder.config.js  # Electron packaging config
├── electron.vite.config.ts    # Electron build config
├── package.json               # Dependencies and scripts
└── tsconfig.json              # TypeScript config
```

## Future Enhancements

**Reasonable to Consider:**
- Connection retry logic with exponential backoff
- Cache ProPresenter version info to reduce API calls
- Electron auto-updater integration (electron-updater)
- Code signing for macOS and Windows (requires certificates)
- DMG background images for macOS installer
- Real-time playlist updates in Electron GUI

**Already Implemented:**
- ✅ Electron desktop app with React UI
- ✅ Automated GitHub Actions releases
- ✅ Professional app icons
- ✅ Settings persistence (electron-store)
- ✅ Connection validation before operations

**Not Recommended:**
- Upgrading pptxgenjs beyond 3.10.0 (causes crashes in CLI executables)
- Adding logo support to CLI bundled executables (would require different PPTX library)
- Dynamic imports in pkg-bundled code (incompatible)

## Contact Points

- ProPresenter API: `renewedvision-propresenter@7.7.2`
- PPTX Generation: `pptxgenjs@3.10.0` (LOCKED VERSION)
- Bundling: `pkg@5.8.1`
- Build/Runtime: Node 18+

## Success Criteria

**Desktop App (Electron):**
- ✅ macOS and Windows builds complete successfully
- ✅ App icons display correctly
- ✅ Settings persist between sessions
- ✅ PPTX export generates correct files
- ✅ Connection validation with clear error messages
- ✅ Professional UI/UX

**CLI Executables:**
- ✅ Interactive mode works on all platforms
- ✅ Standalone binaries (macOS ARM64, Intel, Windows)
- ✅ PPTX, JSON, text exports functional
- ✅ No crashes or undefined behavior
- ✅ Reasonable file sizes (110-125MB per binary)

**Infrastructure:**
- ✅ GitHub Actions automated releases
- ✅ Version tagging workflow
- ✅ Documentation organized in docs/ folder
- ✅ Professional README for end users
