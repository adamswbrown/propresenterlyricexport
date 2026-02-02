#!/bin/bash
set -e

# Build the CLI
npm run build

# Create app bundle structure
APP_NAME="ProPresenter Lyrics"
APP_BUNDLE="$APP_NAME.app"
CONTENTS="$APP_BUNDLE/Contents"
MACOS_DIR="$CONTENTS/MacOS"
RESOURCES_DIR="$CONTENTS/Resources"

echo "Creating macOS app bundle for ARM64..."

# Remove existing bundle if it exists
rm -rf "$APP_BUNDLE"

# Create directory structure
mkdir -p "$MACOS_DIR"
mkdir -p "$RESOURCES_DIR"

# Copy the ARM executable
cp "executables/propresenter-lyrics-macos-arm64" "$MACOS_DIR/propresenter-lyrics"
chmod +x "$MACOS_DIR/propresenter-lyrics"

# Create launcher script (the entry point for the app)
cat > "$MACOS_DIR/launcher" << 'LAUNCHER'
#!/bin/bash
# Get the directory where this script is located
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Find and launch the CLI executable
if [ -x "$SCRIPT_DIR/propresenter-lyrics" ]; then
  # If no arguments provided, show help
  if [ $# -eq 0 ]; then
    "$SCRIPT_DIR/propresenter-lyrics" --help
  else
    "$SCRIPT_DIR/propresenter-lyrics" "$@"
  fi
else
  echo "Error: propresenter-lyrics executable not found"
  exit 1
fi
LAUNCHER

chmod +x "$MACOS_DIR/launcher"

# Create Info.plist
cat > "$CONTENTS/Info.plist" << 'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>ProPresenter Lyrics</string>
    <key>CFBundleDisplayName</key>
    <string>ProPresenter Lyrics</string>
    <key>CFBundleIdentifier</key>
    <string>com.adamswbrown.propresenterlyrics</string>
    <key>CFBundleVersion</key>
    <string>1.0.0</string>
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    <key>CFBundleExecutable</key>
    <string>launcher</string>
    <key>CFBundleDevelopmentRegion</key>
    <string>en</string>
    <key>NSHumanReadableCopyright</key>
    <string>Extract and export lyrics from ProPresenter presentations</string>
</dict>
</plist>
PLIST

echo "✓ Created $APP_BUNDLE"
echo ""
echo "To use the app:"
echo "  1. Open Terminal"
echo "  2. Run: open '$APP_BUNDLE'"
echo "  3. Or drag $APP_BUNDLE to Applications folder"
echo ""
echo "To use from command line:"
echo "  ./$APP_BUNDLE/Contents/MacOS/launcher status"
echo "  ./$APP_BUNDLE/Contents/MacOS/launcher pptx"
