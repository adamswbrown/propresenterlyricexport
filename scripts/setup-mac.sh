#!/bin/bash
set -e

# ProPresenter Lyrics - macOS Setup Script
# This script sets up easy command-line access to ProPresenter Lyrics

echo "╔════════════════════════════════════════════════════════════╗"
echo "║   ProPresenter Lyrics - macOS Setup                        ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Determine which executable to use
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Check for app bundle first (preferred method)
if [ -d "$SCRIPT_DIR/ProPresenter Lyrics.app" ]; then
    echo "✓ Found native macOS app bundle"
    EXECUTABLE_PATH="$SCRIPT_DIR/ProPresenter Lyrics.app/Contents/MacOS/launcher"
    SETUP_TYPE="app"
elif [ -f "$SCRIPT_DIR/executables/propresenter-lyrics-macos-arm64" ]; then
    echo "✓ Found ARM64 executable"
    EXECUTABLE_PATH="$SCRIPT_DIR/executables/propresenter-lyrics-macos-arm64"
    SETUP_TYPE="arm64"
elif [ -f "$SCRIPT_DIR/executables/propresenter-lyrics-macos-x64" ]; then
    echo "✓ Found Intel executable"
    EXECUTABLE_PATH="$SCRIPT_DIR/executables/propresenter-lyrics-macos-x64"
    SETUP_TYPE="intel"
else
    echo "✗ Error: No ProPresenter Lyrics executable found"
    echo ""
    echo "Please ensure you have:"
    echo "  1. The DMG file mounted, OR"
    echo "  2. Downloaded the executables folder"
    echo ""
    exit 1
fi

echo ""
echo "Setup Options:"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "1. Command-line access (recommended)"
echo "   - Creates alias for easy terminal access"
echo "   - Add command to ~/.zshrc or ~/.bashrc"
echo ""
echo "2. Applications folder"
echo "   - Copy app to /Applications (app bundle only)"
echo "   - Launch from Finder"
echo ""
echo "3. Both"
echo "   - Set up command-line AND Applications folder"
echo ""
read -p "Choose setup type (1/2/3) [default: 1]: " CHOICE
CHOICE=${CHOICE:-1}

# Function to setup command-line access
setup_cli() {
    echo ""
    echo "Setting up command-line access..."
    echo "─────────────────────────────────────────────────────────────"

    # Create bin directory
    mkdir -p "$HOME/bin/propresenter"

    # Copy executable
    if [ "$SETUP_TYPE" = "app" ]; then
        cp -r "$EXECUTABLE_PATH" "$HOME/bin/propresenter/launcher"
        chmod +x "$HOME/bin/propresenter/launcher"
        SYMLINK_TARGET="$HOME/bin/propresenter/launcher"
    else
        cp "$EXECUTABLE_PATH" "$HOME/bin/propresenter/propresenter-lyrics"
        chmod +x "$HOME/bin/propresenter/propresenter-lyrics"
        SYMLINK_TARGET="$HOME/bin/propresenter/propresenter-lyrics"
    fi

    echo "✓ Copied executable to $HOME/bin/propresenter/"

    # Detect shell
    if [ -n "$ZSH_VERSION" ]; then
        SHELL_RC="$HOME/.zshrc"
        SHELL_NAME="zsh"
    else
        SHELL_RC="$HOME/.bashrc"
        SHELL_NAME="bash"
    fi

    # Check if already added
    if grep -q "propresenter-lyrics" "$SHELL_RC" 2>/dev/null; then
        echo "✓ Command already in $SHELL_RC"
    else
        # Add to shell configuration
        echo "" >> "$SHELL_RC"
        echo "# ProPresenter Lyrics - Added by setup script" >> "$SHELL_RC"
        echo "export PATH=\"\$HOME/bin/propresenter:\$PATH\"" >> "$SHELL_RC"
        echo "alias propresenter-lyrics=\"$SYMLINK_TARGET\"" >> "$SHELL_RC"
        echo "✓ Added to $SHELL_RC"
    fi

    echo ""
    echo "To activate, run:"
    echo "  source $SHELL_RC"
    echo ""
    echo "Then use:"
    echo "  propresenter-lyrics status"
    echo "  propresenter-lyrics pptx"
}

# Function to setup Applications folder
setup_applications() {
    if [ "$SETUP_TYPE" != "app" ]; then
        echo ""
        echo "⚠ Applications folder setup requires the app bundle"
        echo "Please use: npm run build:macos"
        return
    fi

    echo ""
    echo "Setting up Applications folder..."
    echo "─────────────────────────────────────────────────────────────"

    # Copy app bundle to Applications
    if [ -d "/Applications/ProPresenter Lyrics.app" ]; then
        read -p "Replace existing app in /Applications? (y/n) [default: n]: " REPLACE
        if [ "$REPLACE" != "y" ]; then
            echo "✗ Skipped - existing app preserved"
            return
        fi
        rm -rf "/Applications/ProPresenter Lyrics.app"
    fi

    cp -r "$(dirname "$EXECUTABLE_PATH")/.." "/Applications/ProPresenter Lyrics.app"
    echo "✓ Copied to /Applications/ProPresenter Lyrics.app"

    # Create command-line alias for app version
    mkdir -p "$HOME/bin/propresenter"
    cat > "$HOME/bin/propresenter/launcher" << 'EOF'
#!/bin/bash
/Applications/ProPresenter\ Lyrics.app/Contents/MacOS/launcher "$@"
EOF
    chmod +x "$HOME/bin/propresenter/launcher"

    echo ""
    echo "To launch from Finder:"
    echo "  1. Open /Applications"
    echo "  2. Double-click 'ProPresenter Lyrics'"
    echo ""
    echo "Or from Terminal:"
    echo "  open /Applications/ProPresenter\ Lyrics.app"
}

# Execute chosen option
case $CHOICE in
    1)
        setup_cli
        ;;
    2)
        setup_applications
        ;;
    3)
        setup_cli
        setup_applications
        ;;
    *)
        echo "✗ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                    Setup Complete! ✓                       ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
echo "Next steps:"
echo "─────────────────────────────────────────────────────────────"
echo ""
echo "1. Reload your shell:"
if [ -n "$ZSH_VERSION" ]; then
    echo "   source ~/.zshrc"
else
    echo "   source ~/.bashrc"
fi
echo ""
echo "2. Test the connection:"
echo "   propresenter-lyrics status"
echo ""
echo "3. Configure connection (optional):"
echo "   export PROPRESENTER_HOST=192.168.1.100"
echo "   export PROPRESENTER_PORT=1025"
echo ""
echo "4. Export your first playlist:"
echo "   propresenter-lyrics pptx"
echo ""
echo "For help:"
echo "   propresenter-lyrics --help"
echo ""
