# Release and Distribution Guide

This guide explains how to build and release ProPresenter Lyrics for all platforms.

## Quick Build Commands

```bash
# Build all executable binaries (Windows, macOS, Linux)
npm run build:exe

# Build macOS native app bundle (ARM64)
npm run build:macos

# Create macOS DMG installer (for distribution)
npm run build:macos:dmg
```

## Building for Each Platform

### 1. Standalone Executables (All Platforms)

Build cross-platform CLI executables:

```bash
npm run build:exe
```

**Output:** `executables/` folder containing:
- `propresenter-lyrics-win-x64.exe` (112 MB) - Windows
- `propresenter-lyrics-macos-x64` (126 MB) - macOS Intel
- `propresenter-lyrics-macos-arm64` (121 MB) - macOS ARM64
- `propresenter-lyrics-linux-x64` (120 MB) - Linux

**Use case:** Direct distribution, CI/CD, custom installers

See [DISTRIBUTION.md](./DISTRIBUTION.md) for detailed setup.

### 2. macOS Native App Bundle

Build a native macOS application:

```bash
npm run build:macos
```

**Output:** `ProPresenter Lyrics.app` folder

**Features:**
- Native macOS .app bundle structure
- ARM64 (Apple Silicon) optimized
- Launchable from Applications folder
- Command-line accessible

**Use case:** macOS users who prefer app bundles

See [MACOS_APP.md](./MACOS_APP.md) for details.

### 3. macOS Distribution (DMG)

Create a disk image installer for easy macOS distribution:

```bash
npm run build:macos:dmg
```

**Output:** `ProPresenterLyrics-macOS-arm64.dmg` (39 MB)

**Use case:** GitHub Releases, website downloads, direct sharing

**Distribution steps:**
1. Upload to GitHub Releases
2. Share via website/email
3. Users mount DMG and drag app to Applications

## Release Workflow

### Step 1: Prepare the Release

```bash
# Update version in package.json
npm version patch  # or minor, major

# Rebuild everything
npm run build:exe
npm run build:macos
npm run build:macos:dmg

# Commit changes
git add package.json
git commit -m "Release v1.0.1"
git tag v1.0.1
```

### Step 2: Create GitHub Release

```bash
# Create release draft
gh release create v1.0.1 --draft --generate-notes

# Upload all artifacts
gh release upload v1.0.1 \
  executables/propresenter-lyrics-win-x64.exe \
  executables/propresenter-lyrics-macos-x64 \
  executables/propresenter-lyrics-macos-arm64 \
  executables/propresenter-lyrics-linux-x64 \
  ProPresenterLyrics-macOS-arm64.dmg

# Publish the release
gh release edit v1.0.1 --draft=false
```

### Step 3: Push to Repository

```bash
# Push commits and tags
git push origin main
git push origin --tags
```

## Platform-Specific Release Notes

### Windows Users

**Distribute:** `propresenter-lyrics-win-x64.exe`

```
# Installation
1. Download propresenter-lyrics-win-x64.exe
2. Place in a folder (e.g., C:\Tools\)
3. Add folder to PATH (optional, for global access)
4. Run: propresenter-lyrics-win-x64.exe status
```

### macOS Intel Users

**Distribute:** `propresenter-lyrics-macos-x64`

```
# Installation
1. Download propresenter-lyrics-macos-x64
2. Make executable: chmod +x propresenter-lyrics-macos-x64
3. Run: ./propresenter-lyrics-macos-x64 status
```

**Or use the app bundle:**
1. Download `ProPresenterLyrics-macOS-arm64.dmg` (works on Intel too)
2. Mount and drag to Applications
3. Use from Applications folder

### macOS ARM64 (M1/M2/M3) Users

**Recommended:** `ProPresenterLyrics-macOS-arm64.dmg`

- Native DMG installer
- Drag-and-drop installation
- App bundle convenience

**Alternative:** `propresenter-lyrics-macos-arm64`
- Command-line tool
- Direct execution

See [MACOS_APP.md](./MACOS_APP.md) for details.

### Linux Users

**Distribute:** `propresenter-lyrics-linux-x64`

```
# Installation
1. Download propresenter-lyrics-linux-x64
2. Make executable: chmod +x propresenter-lyrics-linux-x64
3. Run: ./propresenter-lyrics-linux-x64 status
4. Optional: Copy to /usr/local/bin for global access
```

## File Sizes (Reference)

| File | Size | Compressed |
|------|------|-----------|
| Windows exe | 112 MB | ~30 MB (zip) |
| macOS Intel | 126 MB | ~34 MB (zip) |
| macOS ARM64 | 121 MB | ~32 MB (zip) |
| Linux | 120 MB | ~32 MB (zip) |
| DMG Installer | 39 MB | Already compressed |

## Version Management

### Semantic Versioning

Follow [Semantic Versioning](https://semver.org/):

- **MAJOR**: Breaking API changes (1.0.0 → 2.0.0)
- **MINOR**: New features, backwards compatible (1.0.0 → 1.1.0)
- **PATCH**: Bug fixes, no API changes (1.0.0 → 1.0.1)

### Update Process

```bash
# Bump version (updates package.json and creates git tag)
npm version patch

# Or manually:
# 1. Edit package.json version
# 2. Run: git tag v1.0.1

# Rebuild with new version
npm run build:exe
npm run build:macos
npm run build:macos:dmg
```

## GitHub Actions CI/CD (Optional)

Create `.github/workflows/release.yml` to automate builds:

```yaml
name: Release

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: macos-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'

      - run: npm install
      - run: npm run build:exe
      - run: npm run build:macos
      - run: npm run build:macos:dmg

      - uses: softprops/action-gh-release@v1
        with:
          files: |
            executables/propresenter-lyrics-*
            ProPresenterLyrics-macOS-arm64.dmg
```

## Troubleshooting

### Build fails on "command not found"

Ensure you're in the project root and have Node.js installed:

```bash
npm --version  # Should be 6+
node --version  # Should be 16+
```

### DMG creation fails (macOS only)

The DMG script requires `hdiutil` (included on macOS). If it fails:

```bash
# Verify hdiutil is available
which hdiutil

# Try again with sudo
sudo scripts/create-dmg.sh
```

### Executable size is large

Yes, the binaries are 110-125 MB each because they bundle:
- Complete Node.js runtime
- All dependencies (ProPresenter API client, PowerPoint generator)
- Everything needed to run standalone

This is expected and necessary for distribution without requiring Node.js.

## Archive and Upload

### Create Release Archive

```bash
# Create ZIP with all executables
zip -r propresenter-lyrics-all-platforms.zip executables/

# Create DMG separately (already compressed)
# ProPresenterLyrics-macOS-arm64.dmg is ready to share
```

### Verify Downloaded Executables

```bash
# macOS/Linux - Check file type
file propresenter-lyrics-macos-arm64

# Windows - Check executable
dir /B propresenter-lyrics-win-x64.exe

# All - Test execution
./propresenter-lyrics-macos-arm64 --help
```

## Rollback Plan

If a release has issues:

```bash
# Remove the tag
git tag -d v1.0.1
git push origin :refs/tags/v1.0.1

# Delete the GitHub release
gh release delete v1.0.1

# Revert commits if needed
git reset --hard <previous-commit>
```

## Support and Feedback

- **Bug reports**: GitHub Issues
- **Feature requests**: GitHub Discussions
- **Questions**: GitHub Discussions or README

---

**Last updated**: February 2, 2026
**Version**: 1.0.0
