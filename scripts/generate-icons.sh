#!/bin/bash

# Generate app icons from icon.png for macOS and Windows
# Usage: bash scripts/generate-icons.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "================================================"
echo "ProPresenter Lyrics - Icon Generator"
echo "================================================"
echo ""

# Check if icon.png exists
if [ ! -f "icon.png" ]; then
    echo -e "${RED}✗ Error: icon.png not found in project root${NC}"
    echo ""
    echo "Please add icon.png (1024x1024 recommended) to the project root"
    exit 1
fi

# Get icon dimensions
ICON_SIZE=$(sips -g pixelWidth icon.png | tail -n1 | awk '{print $2}')
echo "Found icon.png (${ICON_SIZE}x${ICON_SIZE})"
echo ""

# Recommend 1024x1024 but allow smaller
if [ "$ICON_SIZE" -lt 512 ]; then
    echo -e "${YELLOW}⚠ Warning: Icon is smaller than 512x512. Recommend at least 512x512.${NC}"
    echo ""
fi

# Create assets directory if it doesn't exist
mkdir -p assets

# ============================================================
# Generate macOS .icns
# ============================================================

echo "Generating macOS icon (.icns)..."
echo "─────────────────────────────────────────────────────"

# Create iconset directory
ICONSET_DIR="assets/icon.iconset"
rm -rf "$ICONSET_DIR"
mkdir -p "$ICONSET_DIR"

# Generate all required sizes for macOS
declare -a SIZES=(16 32 64 128 256 512 1024)

for SIZE in "${SIZES[@]}"; do
    # Standard resolution
    sips -z $SIZE $SIZE icon.png --out "$ICONSET_DIR/icon_${SIZE}x${SIZE}.png" > /dev/null 2>&1

    # Retina resolution (2x) - skip 1024 as it doesn't have @2x
    if [ $SIZE -ne 1024 ]; then
        DOUBLE=$((SIZE * 2))
        sips -z $DOUBLE $DOUBLE icon.png --out "$ICONSET_DIR/icon_${SIZE}x${SIZE}@2x.png" > /dev/null 2>&1
    fi
done

# Convert iconset to icns
iconutil -c icns "$ICONSET_DIR" -o assets/icon.icns

# Clean up iconset directory
rm -rf "$ICONSET_DIR"

echo -e "${GREEN}✓ Created assets/icon.icns${NC}"
echo ""

# ============================================================
# Generate Windows .ico
# ============================================================

echo "Generating Windows icon (.ico)..."
echo "─────────────────────────────────────────────────────"

# Check if ImageMagick is installed
if command -v magick &> /dev/null || command -v convert &> /dev/null; then
    # Create temporary directory for Windows icon sizes
    TEMP_DIR="assets/temp_ico"
    rm -rf "$TEMP_DIR"
    mkdir -p "$TEMP_DIR"

    # Generate Windows icon sizes (16, 32, 48, 64, 128, 256)
    declare -a WIN_SIZES=(16 32 48 64 128 256)

    for SIZE in "${WIN_SIZES[@]}"; do
        sips -z $SIZE $SIZE icon.png --out "$TEMP_DIR/icon_${SIZE}.png" > /dev/null 2>&1
    done

    # Use ImageMagick to create .ico
    if command -v magick &> /dev/null; then
        # ImageMagick v7+
        magick "$TEMP_DIR"/icon_*.png assets/icon.ico
    else
        # ImageMagick v6
        convert "$TEMP_DIR"/icon_*.png assets/icon.ico
    fi

    # Clean up temp directory
    rm -rf "$TEMP_DIR"

    echo -e "${GREEN}✓ Created assets/icon.ico${NC}"
else
    echo -e "${YELLOW}⚠ ImageMagick not found - creating PNG sizes for manual conversion${NC}"
    echo ""

    # Create Windows icon sizes as PNGs
    mkdir -p assets/windows-ico-source

    declare -a WIN_SIZES=(16 32 48 64 128 256)

    for SIZE in "${WIN_SIZES[@]}"; do
        sips -z $SIZE $SIZE icon.png --out "assets/windows-ico-source/icon_${SIZE}.png" > /dev/null 2>&1
    done

    echo "Created PNG files in assets/windows-ico-source/"
    echo ""
    echo "To create icon.ico, use one of these methods:"
    echo "  1. Install ImageMagick: brew install imagemagick"
    echo "     Then re-run this script"
    echo ""
    echo "  2. Use online converter:"
    echo "     - Upload PNGs from assets/windows-ico-source/"
    echo "     - Convert to .ico at: https://convertio.co/png-ico/"
    echo "     - Save as assets/icon.ico"
    echo ""
    echo "  3. Use Windows tool:"
    echo "     - Transfer PNGs to Windows"
    echo "     - Use IcoFX or similar tool"
fi

echo ""

# ============================================================
# Copy to assets
# ============================================================

# Also copy the original PNG to assets
cp icon.png assets/icon.png
echo -e "${GREEN}✓ Copied icon.png to assets/${NC}"
echo ""

# ============================================================
# Summary
# ============================================================

echo "================================================"
echo "Icon Generation Complete!"
echo "================================================"
echo ""
echo "Generated files:"
ls -lh assets/icon.* 2>/dev/null | awk '{print "  " $9 " (" $5 ")"}'
echo ""
echo "Next steps:"
echo "  1. Verify icons look correct"
echo "  2. electron-builder will automatically use these icons"
echo "  3. Run: npm run electron:build"
echo ""
