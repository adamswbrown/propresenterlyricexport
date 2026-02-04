# Building & Distribution

Create releases and distribute the application.

## Overview

The project supports multiple distribution targets:

1. **CLI Executables** - Standalone binaries (pkg)
2. **Electron App** - Desktop application (electron-builder)
3. **Source Code** - From npm/GitHub

## Building CLI Executables

### Build All Platforms

```bash
npm run build:exe
```

Creates three executables in `executables/`:
- `propresenter-lyrics-macos-x64` (macOS Intel)
- `propresenter-lyrics-macos-arm64` (macOS Apple Silicon)
- `propresenter-lyrics-win-x64.exe` (Windows)

### Size and Performance

- **Size:** 110-125MB each (Node.js + bundled modules)
- **Speed:** ~5 second startup, then fast
- **Dependencies:** None required (fully self-contained)

### Build Process

```bash
# 1. Compile TypeScript
npm run build

# 2. Run pkg on compiled code
pkg dist/cli.js --targets node18-macos-x64,node18-macos-arm64,node18-win-x64

# 3. Output to executables/
```

**Key flags:**
- `--assets logo.png` - Bundle assets
- `--options max-old-space-size=4096` - Memory limit

## Building Electron App

### Development Build

```bash
npm run electron:dev
```

Runs with hot reload and dev tools enabled.

### Production Build

```bash
# 1. Compile TypeScript and React
npm run electron:build

# 2. Package with electron-builder
npm run electron:package
```

Creates in `release/`:
- **macOS**: `.zip` file with app bundle
- **Windows**: `.exe` installer

### Configuration

**electron-builder.config.js:**
- App name and version
- File associations
- Code signing (optional)
- Installer options

## Automated Releases (GitHub Actions)

### Trigger a Release

```bash
# 1. Update version
vim package.json                    # Version: X.Y.Z
vim CHANGELOG.md                    # Add [X.Y.Z] section

# 2. Commit and tag
git add package.json CHANGELOG.md
git commit -m "v X.Y.Z: Release notes"
git tag vX.Y.Z

# 3. Push (triggers workflow)
git push origin main
git push origin vX.Y.Z
```

### What GitHub Actions Does

When you push a tag `vX.Y.Z`:

1. **Builds:** CLI executables for all platforms
2. **Builds:** Electron apps for macOS and Windows
3. **Creates:** GitHub Release
4. **Uploads:** All artifacts
5. **Publishes:** Automatically

**See:** `.github/workflows/release.yml`

## Distribution Files

### For End Users

**Desktop App:**
- macOS: `ProPresenter-Lyrics-vX.Y.Z-mac.zip` (50-80MB)
- Windows: `ProPresenter-Lyrics-vX.Y.Z-win.exe` (60-90MB)

**CLI Executables:**
- macOS Intel: `propresenter-lyrics-macos-x64` (120MB)
- macOS ARM: `propresenter-lyrics-macos-arm64` (120MB)
- Windows: `propresenter-lyrics-win-x64.exe` (120MB)

### For Distribution

```bash
# Create distribution package
mkdir propresenter-lyrics-v2.2.1
cp executables/* propresenter-lyrics-v2.2.1/
cp docs/getting-started.md propresenter-lyrics-v2.2.1/
zip -r propresenter-lyrics-v2.2.1.zip propresenter-lyrics-v2.2.1/
```

## Signing & Notarization

### macOS Code Signing (Optional)

For production releases, sign the app:

```bash
# In electron-builder.config.js
{
  mac: {
    certificateFile: '/path/to/certificate.p12',
    certificatePassword: process.env.CSC_KEY_PASSWORD,
    signingIdentity: 'Developer ID Application: ...'
  }
}
```

### macOS Notarization

Apple requires notarization for distribution:

```bash
# electron-builder handles this if configured
{
  mac: {
    notarize: {
      teamId: 'XXXXXXXXXX'  // Apple Team ID
    }
  }
}
```

## Troubleshooting Builds

### Build Fails on macOS

```bash
# Clear build artifacts
rm -rf dist dist-electron executables release

# Rebuild
npm run build
npm run build:exe
npm run electron:package
```

### pkg Bundling Error

```bash
# Usually pptxgenjs issue
# Check version in package.json (must be 3.10.0)
npm list pptxgenjs

# If wrong version
npm install pptxgenjs@3.10.0
```

### Electron Builder Issues

```bash
# Clear cache
rm -rf node_modules/.cache

# Reinstall
npm install

# Rebuild
npm run electron:build
npm run electron:package
```

## Testing Releases

Before publishing:

```bash
# Test CLI executable
./executables/propresenter-lyrics-macos-x64 status
./executables/propresenter-lyrics-macos-arm64 status

# Test Electron app
open release/mac-arm64/ProPresenter\ Lyrics.app

# On Windows
release/win-unpacked/ProPresenter Lyrics.exe
```

## Release Checklist

- [ ] All commits pushed to main
- [ ] Tests passing
- [ ] Version updated in package.json
- [ ] CHANGELOG.md updated with new version
- [ ] Code reviewed
- [ ] All changes committed
- [ ] Tag created (`git tag vX.Y.Z`)
- [ ] Tag pushed (`git push origin vX.Y.Z`)
- [ ] GitHub Actions workflow completes
- [ ] Artifacts verified in Release
- [ ] Release notes look good

## Performance Optimization

### Reduce Executable Size

```bash
# Current: ~120MB per executable

# To reduce:
1. Tree-shake unused code
2. Minify bundle
3. Remove debug symbols

# In package.json scripts:
"build:exe": "... --compress Brotli"
```

### Faster Startup

```bash
# CLI startup is ~5 seconds (Node.js overhead)
# To improve:
1. Use V8 snapshots
2. Precompile TypeScript
3. Profile with --prof flag
```

## Next Steps

- **[Setup](./setup.md)** - Development environment
- **[Architecture](./architecture.md)** - Understand code
- **[Contributing](./contributing.md)** - Code standards
- **[Release Process](./release-process.md)** - Publishing guide
