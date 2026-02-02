# macOS Application Build Guide

This document explains how to build and distribute the native macOS application for Apple Silicon (M1/M2/M3) Macs.

## What You Get

- **ProPresenter Lyrics.app** - A native macOS application bundle
- **ProPresenterLyrics-macOS-arm64.dmg** - A disk image installer (39 MB)
- Full compatibility with macOS command-line tools

## Building the macOS App

### Build the App Bundle

```bash
# Build the TypeScript and create the .app bundle
./build-macos-app.sh
```

This creates `ProPresenter Lyrics.app` with:
- Native macOS app structure
- ARM64 (Apple Silicon) executable
- Launcher script for easy invocation
- Info.plist with app metadata

### Create Distribution DMG

```bash
# Create a disk image for distribution
./create-dmg.sh
```

This creates `ProPresenterLyrics-macOS-arm64.dmg` (39 MB) - ready to share!

## Using the macOS App

### Via Finder/Applications Folder

1. **Double-click the DMG file** to mount it
2. **Drag "ProPresenter Lyrics" to Applications folder**
3. **Open from Applications** - Launches help (since it's a CLI tool)

### From Terminal/Command Line

```bash
# Direct access via app bundle
"./ProPresenter Lyrics.app/Contents/MacOS/launcher" status

# Or add to PATH for easy access
export PATH="$PWD/ProPresenter Lyrics.app/Contents/MacOS:$PATH"
launcher pptx
```

### From Applications Folder

After installing to `/Applications`:

```bash
"/Applications/ProPresenter Lyrics.app/Contents/MacOS/launcher" status
"/Applications/ProPresenter Lyrics.app/Contents/MacOS/launcher" pptx
```

Or create an alias in your shell:

```bash
# Add to ~/.zshrc or ~/.bash_profile
alias propresenter-lyrics="/Applications/ProPresenter\ Lyrics.app/Contents/MacOS/launcher"

# Then use:
propresenter-lyrics status
propresenter-lyrics pptx
```

## App Bundle Structure

```
ProPresenter Lyrics.app/
├── Contents/
│   ├── MacOS/
│   │   ├── propresenter-lyrics    (ARM64 executable)
│   │   └── launcher               (Shell script entry point)
│   ├── Resources/                 (For icons, later)
│   └── Info.plist                 (App metadata)
```

## Distribution

### For End Users

1. **Create DMG**: `./create-dmg.sh`
2. **Share the DMG file** (39 MB)
3. Users mount it and drag to Applications

### For GitHub Releases

```bash
# Create the DMG
./create-dmg.sh

# Attach to a GitHub release
gh release upload v1.0.0 ProPresenterLyrics-macOS-arm64.dmg
```

### Size Notes

- **App Bundle**: ~121 MB (includes Node.js runtime)
- **DMG Installer**: ~39 MB (compressed)
- **On disk in Applications**: ~121 MB

The bundle includes a complete Node.js runtime, which is why it's larger than typical CLI tools.

## Troubleshooting

### "Cannot open because it is from an unidentified developer"

macOS may block the app since it's not signed. To allow it:

1. **First time only**: Open Terminal and run:
   ```bash
   xattr -d com.apple.quarantine "/Applications/ProPresenter Lyrics.app"
   ```

2. **Or**: Right-click the app → "Open" → "Open" (confirm the dialog)

### Executable permission denied

If you get "Permission denied" errors, fix permissions:

```bash
chmod +x "ProPresenter Lyrics.app/Contents/MacOS/launcher"
chmod +x "ProPresenter Lyrics.app/Contents/MacOS/propresenter-lyrics"
```

### Connection failed from the app

Make sure you have environment variables set:

```bash
# Add to ~/.zshrc or ~/.bash_profile
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025
```

Or use command-line arguments:

```bash
"/Applications/ProPresenter Lyrics.app/Contents/MacOS/launcher" status --host 192.168.1.100
```

## Customization

### Change App Icon (Optional)

To add a custom icon:

1. Create a 512x512 PNG or ICNS file
2. Place it in `ProPresenter Lyrics.app/Contents/Resources/AppIcon.icns`
3. Update `Info.plist` to add:
   ```xml
   <key>CFBundleIconFile</key>
   <string>AppIcon</string>
   ```

### Change App Name

Edit the `build-macos-app.sh` script:

```bash
APP_NAME="Your App Name"  # Change this line
```

Then rebuild:

```bash
rm -rf "ProPresenter Lyrics.app"
./build-macos-app.sh
```

### Code Signing (For Distribution)

To code-sign the app for distribution:

```bash
codesign --deep --force --verify --verbose --sign - "ProPresenter Lyrics.app"
```

Or with a developer certificate:

```bash
codesign --deep --force --verify --verbose --sign "Developer ID Application" "ProPresenter Lyrics.app"
```

## Development

The macOS app is built from the same source as all other platforms:

- **Source**: `src/` (TypeScript)
- **Build output**: `dist/cli.js` (JavaScript)
- **Executable**: `executables/propresenter-lyrics-macos-arm64`
- **App wrapper**: `ProPresenter Lyrics.app`

To rebuild after code changes:

```bash
./build-macos-app.sh
```

## Intel Mac Support

To build for Intel Macs (x86_64), update the build script to use:

```bash
cp executables/propresenter-lyrics-macos-x64 "$MACOS_DIR/propresenter-lyrics"
```

Then rebuild and create a separate DMG.

## Version History

| Version | Date | Architecture | Notes |
|---------|------|--------------|-------|
| 1.0.0 | Feb 2, 2026 | ARM64 (M1/M2/M3) | Initial release |

## Support

For issues with the macOS app:

1. Check the [DISTRIBUTION.md](./DISTRIBUTION.md) guide
2. Review the [README.md](./README.md) documentation
3. Check [QUICK_START.md](./QUICK_START.md) for platform-specific setup
4. Open an issue on GitHub
