# ProPresenter Lyrics Export

> Extract and export worship song lyrics from ProPresenter 7 presentations in seconds.

A modern desktop + CLI toolkit for worship leaders and production teams who need to capture lyrics from ProPresenter playlists. Choose between the Electron desktop app (recommended) or the original CLI workflow depending on how you like to work. Both paths support rich PPTX exports, text/JSON dumps, and run on macOS and Windows.

## Features

- 🎯 **Interactive Playlist Selection** - Browse and select playlists by number
- 📤 **Multiple Export Formats** - Text, JSON, or beautifully formatted PowerPoint
- ✅ **Connection Validation** - Automatic connectivity checking with clear error messages
- 🔄 **Batch Export** - Export entire playlists in one command
- 🏆 **Worship Library Integration** - Automatically filters songs from your Worship library
- 🌍 **Cross-Platform** - Native support for macOS (ARM64 & Intel) and Windows
- 📦 **Standalone Executables** - No Node.js installation required
- 🔤 **Smart Font Detection** - Curated font dropdown with installation status and download links

## Quick Start

You can now run ProPresenter Lyrics Export two ways:

1. **Desktop App (Electron) — Recommended.** Full UI for managing playlists, styling, and PPTX exports without any terminal work.
2. **Command-Line Interface — Power users.** The original workflow driven by the standalone executable + setup scripts.

### Option 1: Desktop App (Recommended)

1. **Download the installer/bundle** from [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases):
  - macOS: `ProPresenter-Lyrics-vX.Y.Z-mac.zip` (contains `ProPresenter Lyrics.app`)
  - Windows: `ProPresenter-Lyrics-vX.Y.Z-win.exe`
2. **Install / open the app:**
  - macOS: unzip, drag `ProPresenter Lyrics.app` to `Applications`, then open it (grant network permission on first launch).
  - Windows: run the installer, follow the prompts, then launch “ProPresenter Lyrics”.
3. **Connect and export:** enter your ProPresenter host/port, load playlists, tweak formatting, and export PPTX directly from the UI. Settings persist between sessions.

**Desktop App Features:**
- Curated font dropdown with 25+ presentation-ready fonts (sans-serif, serif, display)
- Font detection shows which fonts are installed on your system
- One-click download links for missing fonts (Google Fonts)
- Real-time font status indicator

This path bundles everything — no Node.js, scripts, or manual setup required.

### Option 2: CLI + Setup Script

If you prefer the terminal or need automation hooks, continue using the standalone executable.

**1. Download the executable** from [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases):

- **macOS ARM64** (M1/M2/M3): `propresenter-lyrics-macos-arm64`
- **macOS Intel**: `propresenter-lyrics-macos-x64`
- **Windows**: `propresenter-lyrics-win-x64.exe`

**2. Run the setup script** (adds it to your PATH and configures defaults):

macOS
```bash
bash scripts/setup-mac.sh
```

Windows (Administrator)
```powershell
PowerShell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1
```

**3. Test the connection**
```bash
propresenter-lyrics status
```

After that, you can follow the CLI usage docs below or read [DISTRIBUTION.md](./docs/DISTRIBUTION.md) for deeper platform notes.

## Requirements

- **ProPresenter 7** running and accessible on your network
- **Network API enabled** in ProPresenter (Preferences → Network → Enable Network API)

## Usage

### Export a Playlist to PowerPoint

This is the most common workflow. Just three steps:

**Step 1: Start the Tool**
```bash
propresenter-lyrics pptx
```

**Step 2: Select Your Playlist**

The tool connects to ProPresenter and displays all available playlists:

```
Available Playlists:
====================

  1) Sunday Service / Worship
  2) Sunday Service / Teaching
  3) Wednesday Night / Worship

Select a playlist (enter number): 1
```

**Step 3: Get Your PowerPoint**

The tool automatically:
1. Fetches all songs from the selected playlist
2. Extracts lyrics from each presentation
3. Generates a PowerPoint file with styled slides
4. Saves it with a timestamped filename

```
Exporting 8 songs to PowerPoint...

  ✓ Great Is Thy Faithfulness
  ✓ In Christ Alone
  ✓ Jesus Paid It All
  ...

✓ PowerPoint saved to: service-lyrics-1738689234523.pptx
```

The generated PowerPoint file is ready to use immediately!

### All Available Commands

```bash
# Status and connection
propresenter-lyrics status              # Test ProPresenter connection

# Playlists
propresenter-lyrics playlists           # List all playlists
propresenter-lyrics playlist <uuid>     # Show items in a playlist

# Libraries
propresenter-lyrics libraries           # List all libraries

# Export
propresenter-lyrics export              # Interactive text export
propresenter-lyrics export <uuid>       # Export specific playlist as text
propresenter-lyrics export --json       # Export as JSON

# PowerPoint
propresenter-lyrics pptx                # Interactive PowerPoint export
propresenter-lyrics pptx <uuid>         # Export specific playlist to PPTX
propresenter-lyrics pptx <uuid> "Name"  # Export with custom filename

# Real-time monitoring
propresenter-lyrics current             # Show current presentation
propresenter-lyrics focused             # Show focused presentation
propresenter-lyrics watch               # Watch for slide changes
propresenter-lyrics inspect <uuid>      # Inspect a presentation

# Help
propresenter-lyrics --help              # Show all commands and options
```

### Command Options

- `--host, -h <host>` - ProPresenter host (default: 127.0.0.1)
- `--port, -p <port>` - ProPresenter port (default: 1025)
- `--json, -j` - Output as JSON instead of text
- `--debug, -d` - Show raw API responses

### Examples

```bash
# Export with custom filename
propresenter-lyrics pptx 2 "Sunday Morning Worship"

# Connect to remote ProPresenter instance
propresenter-lyrics pptx --host 192.168.1.100 --port 1025

# Export as JSON
propresenter-lyrics export 3 --json

# Watch slides with debug output
propresenter-lyrics watch --debug
```

## Configuration

### Environment Variables

Set these environment variables to configure defaults (optional). The setup script can configure these for you.

**Connection Settings:**
```bash
# macOS
export PROPRESENTER_HOST=192.168.1.100  # Default: 127.0.0.1
export PROPRESENTER_PORT=1025            # Default: 1025

# Windows PowerShell
[Environment]::SetEnvironmentVariable('PROPRESENTER_HOST', '192.168.1.100', 'User')
[Environment]::SetEnvironmentVariable('PROPRESENTER_PORT', '1025', 'User')
```

**Library Filter:**
```bash
# macOS
export PROPRESENTER_LIBRARY=Worship      # Default: Worship

# Windows PowerShell
[Environment]::SetEnvironmentVariable('PROPRESENTER_LIBRARY', 'Worship', 'User')
```

**PowerPoint Styling:**
```bash
# macOS
export PPTX_FONT_FACE="Arial"            # Default: Red Hat Display
export PPTX_FONT_SIZE=44                 # Default: 44pt (regular slides)
export PPTX_TITLE_FONT_SIZE=54           # Default: 54pt (title slides)
export PPTX_TEXT_COLOR=2d6a7a            # Default: 2d6a7a (hex, no # prefix)
export PPTX_FONT_BOLD=true               # Default: true
export PPTX_FONT_ITALIC=true             # Default: true

# Windows PowerShell
[Environment]::SetEnvironmentVariable('PPTX_FONT_FACE', 'Arial', 'User')
[Environment]::SetEnvironmentVariable('PPTX_FONT_SIZE', '44', 'User')
[Environment]::SetEnvironmentVariable('PPTX_TITLE_FONT_SIZE', '54', 'User')
[Environment]::SetEnvironmentVariable('PPTX_TEXT_COLOR', '2d6a7a', 'User')
[Environment]::SetEnvironmentVariable('PPTX_FONT_BOLD', 'true', 'User')
[Environment]::SetEnvironmentVariable('PPTX_FONT_ITALIC', 'true', 'User')
```

**Remember to restart your terminal** after setting environment variables.

### PowerPoint Font Configuration

The PowerPoint export uses specific fonts and styling to create professional-looking slide presentations.

**Desktop App:** Use the built-in font dropdown in Settings. It shows 25+ curated fonts organized by category:
- **Sans-Serif:** Red Hat Display, Arial, Helvetica, Verdana, Open Sans, Roboto, Lato, Montserrat, Poppins, etc.
- **Serif:** Georgia, Times New Roman, Palatino, Cambria, Merriweather, Playfair Display, Lora, etc.
- **Display:** Impact, Oswald, Bebas Neue

Each font shows whether it's installed (✓) or not (○). Missing fonts can be downloaded directly from Google Fonts.

**CLI:** All styles are customizable via environment variables.

**Default Font Details:**
- **Font Family:** Red Hat Display (open-source, modern, highly readable on projectors)
- **Regular Slides:** 44pt, Bold, Italic
- **Title Slides:** 54pt, Bold, Italic
- **Color:** Dark teal (#2d6a7a) - high contrast against white background
- **Layout:** 16:9 widescreen (1920×1080)

**Customizing Fonts (CLI):**

```bash
# Use different font
export PPTX_FONT_FACE="Calibri"
export PPTX_FONT_SIZE=40

# Use different colors (hex format without #)
export PPTX_TEXT_COLOR=FF0000  # Red text

# Adjust title slide size
export PPTX_TITLE_FONT_SIZE=60

# Disable bold/italic
export PPTX_FONT_BOLD=false
export PPTX_FONT_ITALIC=false
```

If you don't have Red Hat Display installed, PowerPoint will automatically substitute it with a similar sans-serif font. [Download Red Hat Display](https://fonts.google.com/specimen/Red+Hat+Display) for consistent rendering across devices.

### ProPresenter Setup

1. Open ProPresenter 7
2. Go to **Preferences** → **Network**
3. Enable **Network API**
4. Note the host and port (typically 127.0.0.1:1025 or your machine's IP)

The tool validates your ProPresenter connection at startup. If you see connection errors, check these settings first.

## Export Formats

### PowerPoint Export

Formatted slides with:
- Styled text (customizable font, size, color)
- Song titles as section headers
- Section names (Verse 1, Chorus, etc.) in presenter notes
- Professional 16:9 layout ready for projection

### Text Export

Plain text output with lyrics organized by section:
```
Song Title
==========

Verse 1
-------
[Lyrics here]

Chorus
------
[Lyrics here]
```

### JSON Export

Structured data with metadata:
```json
{
  "title": "Song Title",
  "uuid": "...",
  "sections": [
    {
      "name": "Verse 1",
      "slides": [...]
    }
  ]
}
```

## Troubleshooting

### "Connection refused" error
- Make sure ProPresenter 7 is running
- Verify Network API is enabled in ProPresenter settings (Preferences → Network)
- Check that host and port are correct
- Try: `propresenter-lyrics status` to test connection

### No playlists found
- Create playlists in ProPresenter first
- Use `propresenter-lyrics playlists` to list available playlists
- Verify Network API connectivity with `propresenter-lyrics status`

### No songs in export
- The export filters for songs in your library (default: "Worship")
- Make sure your songs are organized in the correct library
- Use `propresenter-lyrics libraries` to see available libraries
- Use `propresenter-lyrics playlist <uuid>` to see items in a playlist
- To use a different library, set: `export PROPRESENTER_LIBRARY=YourLibraryName`

### PowerPoint file not created
- Check write permissions in the current directory
- Ensure `logo.png` exists if you want it included in the presentation
- Check that the output filename is valid

### Command not found
- Make sure you ran the setup script
- Restart your terminal after running setup
- On Windows, make sure you ran PowerShell as Administrator
- Try running the executable directly from its location

## Platform-Specific Setup

For detailed setup instructions, see [DISTRIBUTION.md](./docs/DISTRIBUTION.md) which includes:
- macOS ARM64, Intel setup
- Windows installation and PATH configuration
- Troubleshooting for each platform
- Manual installation steps if setup script fails

## Development

Want to contribute or run from source? See [DEVELOPING.md](./docs/DEVELOPING.md) for:
- Installation from source (Node.js required)
- Development commands (`npm start --` equivalents)
- Building executables
- Project structure
- Contributing guidelines

## Dependencies

- **[renewedvision-propresenter](https://github.com/renewedvision/propresenter-js-sdk)** - ProPresenter 7 Network API wrapper
- **pptxgenjs** - PowerPoint presentation generation
- **TypeScript** - Language and development

## Acknowledgments

This project builds on the excellent [renewedvision-propresenter](https://github.com/renewedvision/propresenter-js-sdk) package, which provides the foundation for interacting with ProPresenter 7's Network API. Without this library, the core functionality of this CLI tool would not be possible.

## License

MIT

## Contributing

Contributions are welcome! Please see [DEVELOPING.md](./docs/DEVELOPING.md) for development setup and guidelines.

## Support

For issues, questions, or suggestions:
- Check [Troubleshooting](#troubleshooting) above
- Review [DISTRIBUTION.md](./docs/DISTRIBUTION.md) for platform-specific help
- Open an issue on [GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues)
