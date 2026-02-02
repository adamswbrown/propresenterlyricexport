#!/bin/bash
set -e

# Change to project root
cd "$(dirname "$0")/.."

APP_BUNDLE="ProPresenter Lyrics.app"
DMG_NAME="ProPresenterLyrics-macOS-arm64.dmg"
TEMP_DMG="/tmp/ProPresenterLyrics-temp.dmg"
MOUNT_POINT="/Volumes/ProPresenterLyrics"

echo "Creating macOS DMG installer..."

# Clean up any existing DMG
rm -f "$DMG_NAME" "$TEMP_DMG"

# Create a temporary DMG
hdiutil create -volname "ProPresenterLyrics" -srcfolder "$APP_BUNDLE" -ov -format UDZO "$DMG_NAME"

echo "✓ Created $DMG_NAME"
echo ""
echo "Distribution package ready!"
echo ""
echo "To distribute:"
echo "  - Share: $DMG_NAME (users can drag to Applications folder)"
echo "  - Or: Upload to your website/GitHub releases"
echo ""
ls -lh "$DMG_NAME"
