# ProPresenter Lyrics Export

> Extract and export worship song lyrics from ProPresenter 7 presentations in seconds.

A production-ready command-line tool for worship leaders and technical teams who need to export lyrics from ProPresenter playlists. Supports text, JSON, and PowerPoint formats. Works on Mac, Windows, and Linux.

## Features

- 🎯 **Interactive Playlist Selection** - Browse and select playlists by number
- 📤 **Multiple Export Formats** - Text, JSON, or beautifully formatted PowerPoint
- ✅ **Connection Validation** - Automatic connectivity checking with clear error messages
- 🔄 **Batch Export** - Export entire playlists in one command
- 🏆 **Worship Library Integration** - Automatically filters songs from your Worship library
- 🌍 **Cross-Platform** - Native support for macOS (ARM64 & Intel), Linux, and Windows
- 📦 **Standalone Executables** - No Node.js installation required (optional)

## Quick Start (No Installation)

Download a standalone executable for your platform - no Node.js needed:

- **macOS ARM64** (M1/M2/M3): `propresenter-lyrics-macos-arm64`
- **macOS Intel**: `propresenter-lyrics-macos-x64`
- **Linux**: `propresenter-lyrics-linux-x64`
- **Windows**: `propresenter-lyrics-win-x64.exe`

See [DISTRIBUTION.md](./DISTRIBUTION.md) for download and setup instructions.

## Installation from Source

Requires **Node.js 18+**

```bash
# Clone the repository
git clone https://github.com/adamswbrown/propresenterlyricexport.git
cd propresenterlyricexport

# Install dependencies
npm install

# Test your connection
npm start -- status
```

## Requirements

- **ProPresenter 7** running and accessible on your network
- Network API enabled in ProPresenter settings (see [Configuration](#configuration))

## Configuration

### Environment Variables

Set these environment variables to configure defaults (optional):

```bash
export PROPRESENTER_HOST=192.168.1.100  # Default: 127.0.0.1
export PROPRESENTER_PORT=1025            # Default: 1025
```

### ProPresenter Setup

1. Open ProPresenter 7
2. Go to **Preferences** → **Network**
3. Enable **Network API**
4. Note the host and port (typically 127.0.0.1:1025 or your machine's IP)

### Connection Validation

The tool validates your ProPresenter connection at startup. If you see connection errors:

```bash
npm run dev:cli -- status
```

This command will:
1. Test the connection to ProPresenter
2. Show the version if connected
3. Display clear troubleshooting steps if not connected

**For detailed setup instructions by platform**, see [QUICK_START.md](./QUICK_START.md) which includes:
- Mac/Linux environment variable setup
- Windows Command Prompt and PowerShell configuration
- Network connectivity troubleshooting
- Real-world usage examples

### About Logo Support

PowerPoint exports are optimized for reliable operation across all platforms (Windows, macOS, Linux). Currently, logos are not included in the PPTX output to ensure maximum compatibility and performance, especially in bundled executables.

**You can still:**
- Export professional-looking PowerPoints with properly formatted lyrics
- Add logos manually in PowerPoint after export (Edit → Logo)
- Use text watermarks via PowerPoint's built-in features

### Font Configuration

The PowerPoint export uses specific fonts and styling to create professional-looking slide presentations:

**Font Details:**
- **Font Family:** Red Hat Display
- **Regular Slides:** 44pt, Bold, Italic
- **Title Slides:** 54pt, Bold, Italic
- **Color:** Dark teal (#2d6a7a)
- **Layout:** 16:9 widescreen (1920×1080)

**What you need to know:**

1. **Red Hat Display Font**
   - Red Hat Display is an open-source font (recommended for modern, clean look)
   - If you don't have it installed, PowerPoint will automatically substitute it with a similar sans-serif font
   - [Download Red Hat Display](https://fonts.google.com/specimen/Red+Hat+Display) if you want consistent rendering across devices

2. **Font Installation (Optional)**
   - **Windows:** Download the .ttf files and right-click → Install
   - **macOS:** Download and double-click to install in Font Book
   - **Linux:** Place .ttf files in `~/.fonts/` directory

3. **If font isn't installed**
   - PowerPoint will use a fallback font (usually Arial or Calibri)
   - The layout and styling remain the same
   - Text will be readable, just styled differently

**Why these choices?**
- **Red Hat Display:** Modern, professional, highly readable on projectors
- **44pt/54pt:** Large enough for projection in church/venue settings
- **Bold + Italic:** Emphasizes the lyrics while maintaining elegance
- **Dark teal (#2d6a7a):** High contrast against white background, easier to read on screens

## Usage: Export a Playlist to PowerPoint

This is the most common workflow. Just three steps:

### Step 1: Start the Tool

Using the CLI:
```bash
npm start -- pptx
```

Or using the executable:
```bash
propresenter-lyrics pptx
```

### Step 2: Select Your Playlist
The tool connects to ProPresenter and displays all available playlists:

```
Connecting to ProPresenter at 127.0.0.1:1025...

Fetching Worship library songs...
  Found 45 songs in Worship library

Available Playlists:
====================

  1) Sunday Service / Worship
  2) Sunday Service / Teaching
  3) Sunday Service / Prayer
  4) Wednesday Night / Worship
  5) Youth Group / Worship

Select a playlist (enter number): 1

Selected: Sunday Service / Worship
```

### Step 3: Watch the Export
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
  ✓ What A Beautiful Name
  ✓ Living Hope
  ✓ Goodness of God
  ✓ Cornerstone
  ✓ Graves into Gardens

Generating PowerPoint...
  Using logo: /Users/adambrown/Developer/ProPresenterWords/logo.png

✓ PowerPoint saved to: service-lyrics-1738689234523.pptx
  8 songs, slides formatted for print/display
```

The generated PowerPoint file is ready to use immediately!

### Options for This Workflow

```bash
# Export with custom output filename
npm run dev:cli -- pptx my-service-songs

# Export from a different ProPresenter instance
npm run dev:cli -- pptx --host 192.168.1.100 --port 1025

# Or export to text/JSON instead
npm run dev:cli -- export          # Text format
npm run dev:cli -- export --json   # JSON format
```

## Usage

### Basic Commands

```bash
# Show all playlists
npm run dev:cli -- playlists

# Show items in a specific playlist
npm run dev:cli -- playlist <uuid>

# List all libraries
npm run dev:cli -- libraries

# Export playlist (interactive mode - pick by number)
npm run dev:cli -- export

# Export playlist (direct mode - using UUID)
npm run dev:cli -- export <playlist-uuid>

# Export to PowerPoint (interactive)
npm run dev:cli -- pptx

# Export to PowerPoint (direct)
npm run dev:cli -- pptx <playlist-uuid> [output-filename]

# Show current active presentation
npm run dev:cli -- current

# Show focused presentation
npm run dev:cli -- focused

# Inspect a specific presentation by UUID
npm run dev:cli -- inspect <presentation-uuid>

# Watch for slide changes in real-time
npm run dev:cli -- watch

# Show help
npm run dev:cli -- --help
```

### Options

- `--host, -h <host>` - ProPresenter host (default: 127.0.0.1)
- `--port, -p <port>` - ProPresenter port (default: 1025)
- `--json, -j` - Output as JSON instead of text
- `--debug, -d` - Show raw API responses
- `--help` - Show help message

### Examples

```bash
# Export with interactive playlist selection
npm run dev:cli -- export

# Export specific playlist as JSON
npm run dev:cli -- export abc123-def456 --json

# Export to PowerPoint with custom filename
npm run dev:cli -- pptx abc123-def456 "Sunday Service Worship"

# Export from remote ProPresenter instance
npm run dev:cli -- export --host 192.168.1.100 --port 1025

# Watch slides with debug output
npm run dev:cli -- watch --debug
```

## How It Works

### Interactive Playlist Selection

When you run `export` or `pptx` without providing a UUID:

1. The tool connects to ProPresenter
2. Fetches all playlists and displays them numbered
3. You type the number of the playlist you want
4. The export proceeds automatically

```
Available Playlists:
====================

  1) Sunday Service / Worship
  2) Sunday Service / Teaching
  3) Wednesday Night / Worship

Select a playlist (enter number): 1

Selected: Sunday Service / Worship
```

### Export Formats

#### Text Export
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

#### JSON Export
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

#### PowerPoint Export
Formatted slides with:
- Styled text (Red Hat Display, 44pt)
- Teal color scheme (color: #2d6a7a)
- Logo insertion (if available)
- Song titles as section headers
- Section names in presenter notes

## Project Structure

```
src/
├── cli.ts                    # Main CLI entry point and commands
├── propresenter-client.ts    # ProPresenter Network API wrapper
├── lyrics-extractor.ts       # Lyrics detection and formatting
├── pptx-exporter.ts          # PowerPoint generation
└── index.ts                  # Library exports

dist/                         # Compiled JavaScript (generated)
package.json                  # Dependencies and scripts
tsconfig.json                 # TypeScript configuration
```

## Troubleshooting

### "Connection refused" error
- Make sure ProPresenter 7 is running
- Verify Network API is enabled in ProPresenter settings
- Check that host and port are correct
- Try: `npm run dev:cli -- status` to test connection

### No playlists found
- Create playlists in ProPresenter first
- Use `npm run dev:cli -- playlists` to list available playlists
- Verify Network API connectivity

### No songs in export
- The export filters for songs in your "Worship" library
- Make sure your songs are organized in a library named "Worship"
- Use `npm run dev:cli -- libraries` to see available libraries
- Use `npm run dev:cli -- playlist <uuid>` to see items in a playlist

### PowerPoint file not created
- Check write permissions in the current directory
- Ensure `logo.png` exists if you want it included in the presentation
- Check `output-filename` is a valid filename

## Development

### Build
```bash
npm run build
```

### Build and Run
```bash
npm run dev:cli -- [command] [options]
```

### TypeScript Compilation
```bash
npm run build
```

## Dependencies

- **renewedvision-propresenter** - ProPresenter 7 Network API wrapper
- **pptxgenjs** - PowerPoint presentation generation
- **TypeScript** - Language and development

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
