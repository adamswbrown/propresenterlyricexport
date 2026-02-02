# ProPresenter Lyrics Export - Claude Project Guide

## Project Status: ✅ Production Ready

A command-line tool for extracting and exporting lyrics from ProPresenter 7 presentations across Windows, macOS, and Linux.

## Quick Facts

- **Language**: TypeScript/Node.js
- **Entry Points**:
  - Development: `npm start` (runs ts-node directly)
  - CLI: `npm run dev`
  - Executables: `executables/propresenter-lyrics-*` (4 platforms)
- **Main Files**: `src/cli.ts`, `src/propresenter-client.ts`, `src/lyrics-extractor.ts`, `src/pptx-exporter.ts`
- **Current Version**: 1.0.0
- **Key Dependency**: pptxgenjs@3.10.0 (MUST NOT upgrade - see Known Issues)

## Architecture

```
ProPresenterClient (API wrapper)
    ↓
LyricsExtractor (parse lyrics from API)
    ↓
PptxExporter (generate PowerPoint)
    ↓
CLI (interactive playlist selection)
    ↓
Executables (bundled with pkg)
```

## Building

```bash
# TypeScript only
npm run build

# Standalone executables (all 4 platforms)
npm run build:exe

# macOS native app
npm run build:macos
npm run build:macos:dmg
```

## Known Issues & Solutions

### ⚠️ pptxgenjs Bundling Issue
- **Problem**: Versions 3.11.0+ crash when bundled with `pkg` due to dynamic `fs` imports
- **Solution**: LOCKED at 3.10.0, image encoding DISABLED in PPTX export
- **Impact**: PPTX files generate without logo images (acceptable trade-off for bundling)
- **Fix Applied**: Image encoding commented out in `src/pptx-exporter.ts` lines 91-99, 129-137
- **DO NOT**: Upgrade pptxgenjs without resolving this first

### ✅ Recent Fixes (Feb 2, 2025)
1. **Electron GUI removed** - Focus on proven CLI tool
2. **Dependencies cleaned** - Down to 4 core packages
3. **Image encoding disabled** - Fixes dynamic import crashes in bundled executables
4. **All platforms tested** - macOS ARM64, Intel, Linux, Windows work correctly

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
├── cli.ts                    # Main entry point, command handling
├── propresenter-client.ts    # ProPresenter API wrapper
├── lyrics-extractor.ts       # Parse lyrics from slides
└── pptx-exporter.ts          # Generate PowerPoint files

dist/                         # Compiled TypeScript (generated)
executables/                  # Bundled executables (generated)
scripts/
├── build-macos-app.sh       # Create .app bundle
├── create-dmg.sh            # Create DMG installer
├── setup-mac.sh             # Interactive macOS setup
├── setup-windows.bat        # Interactive Windows setup (CMD)
└── setup-windows.ps1        # Interactive Windows setup (PowerShell)

Documentation/
├── README.md                # Overview
├── QUICK_START.md           # Setup guide
├── SETUP.md                 # Interactive setup instructions
├── DISTRIBUTION.md          # How to share executables
└── RELEASE_GUIDE.md         # Release workflow
```

## Future Enhancements

**Reasonable to Consider:**
- Connection retry logic with exponential backoff
- Cache ProPresenter version info to reduce API calls
- Store last-used connection settings locally
- Add JSON streaming for large exports

**Not Recommended:**
- Re-adding Electron GUI (bundling issues are fundamental)
- Upgrading pptxgenjs (causes crashes)
- Adding logo support to bundled executables (would require different PPTX library)
- Dynamic imports in bundled code (incompatible with pkg)

## Contact Points

- ProPresenter API: `renewedvision-propresenter@7.7.2`
- PPTX Generation: `pptxgenjs@3.10.0` (LOCKED VERSION)
- Bundling: `pkg@5.8.1`
- Build/Runtime: Node 18+

## Success Criteria

- ✅ CLI works interactively on all platforms
- ✅ All 4 platform executables build and run
- ✅ PPTX, JSON, text exports functional
- ✅ Connection validation with clear error messages
- ✅ No crashes or undefined behavior
- ✅ Executable file sizes reasonable (110-125MB per platform)
