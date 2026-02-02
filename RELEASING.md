# How to Create a Release

This guide explains how to create a new release of ProPresenter Lyrics Export using the automated GitHub Actions workflow.

## Prerequisites

- Main branch is in a releasable state
- All tests pass
- App icons are in place (✓ already done)
- electron-builder configuration is set up (✓ already done)

## Release Process

### 1. Update Version Number

Use npm's version command to update package.json:

```bash
# For bug fixes (1.0.0 → 1.0.1)
npm version patch

# For new features (1.0.0 → 1.1.0)
npm version minor

# For breaking changes (1.0.0 → 2.0.0)
npm version major
```

This will:
- Update version in `package.json`
- Create a git commit with the new version
- Create a git tag (e.g., `v1.0.1`)

### 2. Push to GitHub

Push both the commit and the tag:

```bash
git push origin main --tags
```

### 3. Automated Build

GitHub Actions will automatically:

1. **Run tests** on Ubuntu
2. **Build macOS artifacts**:
   - CLI executables (x64, arm64)
   - macOS app bundle
   - DMG installer
   - Electron app
3. **Build Windows artifacts**:
   - Electron app (NSIS installer)
4. **Create GitHub Release**:
   - Auto-generated release notes
   - All artifacts attached

### 4. Monitor the Build

1. Go to: https://github.com/adamswbrown/propresenterlyricexport/actions
2. Watch the "Release Bundles" workflow
3. Build takes ~10-15 minutes total

### 5. Verify the Release

Once complete:

1. Go to: https://github.com/adamswbrown/propresenterlyricexport/releases
2. Find your new release (e.g., `v1.0.1`)
3. Verify all artifacts are present:
   - macOS CLI binaries (zip)
   - macOS app bundle (zip)
   - macOS DMG installer
   - macOS Electron apps (dmg/zip)
   - Windows Electron installer (.exe)

### 6. Test the Downloads

Download and test the built artifacts:

**macOS:**
```bash
# Download and extract CLI
unzip cli-binaries.zip
./propresenter-lyrics-macos-arm64 status

# Mount and test DMG
open ProPresenterLyrics-macOS-arm64.dmg
```

**Windows:**
```powershell
# Run the installer
.\ProPresenter-Lyrics-Setup-1.0.1.exe
```

## Release Notes

GitHub automatically generates release notes based on:
- Merged pull requests
- Commit messages
- PR labels (feature, bug, documentation, etc.)

To customize release notes:
1. Go to the release on GitHub
2. Click "Edit release"
3. Modify the auto-generated notes
4. Click "Update release"

## Versioning Strategy

We use [Semantic Versioning](https://semver.org/):

- **MAJOR** (X.0.0): Breaking changes
  - Example: Removing features, changing APIs

- **MINOR** (0.X.0): New features (backward compatible)
  - Example: Adding export formats, new commands

- **PATCH** (0.0.X): Bug fixes
  - Example: Fixing connection issues, typos

## Pre-release Versions

For beta testing:

```bash
# Create a pre-release (1.0.0 → 1.0.1-beta.0)
npm version prerelease --preid=beta
git push origin main --tags
```

Mark as pre-release on GitHub:
1. Go to the release
2. Click "Edit release"
3. Check "This is a pre-release"
4. Click "Update release"

## Troubleshooting

### Build Failed

1. Check GitHub Actions logs
2. Common issues:
   - Missing dependencies
   - TypeScript errors
   - Icon files not found

### Missing Artifacts

If some artifacts are missing:
1. Check the workflow logs for errors
2. Verify paths in `.github/workflows/release.yml`
3. Ensure all build scripts work locally

### Artifacts Too Large

GitHub has a 2GB limit per artifact. If exceeded:
1. Use compression
2. Exclude unnecessary files in electron-builder config
3. Consider splitting builds

## Manual Build (Local Testing)

To test the build locally before pushing:

```bash
# Build CLI executables
npm run build:exe

# Build macOS app
npm run build:macos
npm run build:macos:dmg

# Build Electron app
npm run electron:package
```

Check output in:
- `executables/` - CLI binaries
- `ProPresenter Lyrics.app` - macOS app bundle
- `*.dmg` - DMG installer
- `release/` - Electron apps

## Quick Reference

```bash
# Complete release workflow
npm version patch              # Update version
git push origin main --tags    # Trigger GitHub Actions
# Wait for build (10-15 min)
# Test downloads from GitHub Releases
```

## Support

For issues with the release process:
- Check [GitHub Actions logs](https://github.com/adamswbrown/propresenterlyricexport/actions)
- Review [RELEASE_PLAN.md](./RELEASE_PLAN.md) for detailed architecture
- Open an issue on GitHub

---

**Note**: The release workflow is fully automated. You only need to:
1. Run `npm version`
2. Push the tag
3. Wait for GitHub Actions
