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

**Download the latest executable** from [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases) for your platform - no Node.js needed:

- **macOS ARM64** (M1/M2/M3): `propresenter-lyrics-macos-arm64`
- **macOS Intel**: `propresenter-lyrics-macos-x64`
- **Linux**: `propresenter-lyrics-linux-x64`
- **Windows**: `propresenter-lyrics-win-x64.exe`

**Setup instructions for your platform:** See [DISTRIBUTION.md](./DISTRIBUTION.md)

**Or run setup script:**
- **macOS/Linux**: `bash scripts/setup-mac.sh`
- **Windows**: `PowerShell -ExecutionPolicy Bypass -File scripts/setup-windows.ps1` (as Administrator)

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

**Connection Settings:**
```bash
export PROPRESENTER_HOST=192.168.1.100  # Default: 127.0.0.1
export PROPRESENTER_PORT=1025            # Default: 1025
```

**Library Filter:**
```bash
export PROPRESENTER_LIBRARY=Worship      # Default: Worship
# Use this to filter songs from a different library name
```

**PowerPoint Styling:**
```bash
export PPTX_FONT_FACE="Arial"            # Default: Red Hat Display
export PPTX_FONT_SIZE=44                 # Default: 44pt (regular slides)
export PPTX_TITLE_FONT_SIZE=54           # Default: 54pt (title slides)
export PPTX_TEXT_COLOR=2d6a7a            # Default: 2d6a7a (hex, no # prefix)
export PPTX_FONT_BOLD=true               # Default: true
export PPTX_FONT_ITALIC=true             # Default: true
```

### ProPresenter Setup

1. Open ProPresenter 7
2. Go to **Preferences** → **Network**
3. Enable **Network API**
4. Note the host and port (typically 127.0.0.1:1025 or your machine's IP)

### Connection Validation

The tool validates your ProPresenter connection at startup. If you see connection errors:

```bash
npm start -- status
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

The PowerPoint export uses specific fonts and styling to create professional-looking slide presentations. All styles are **fully customizable** via environment variables.

**Default Font Details:**
- **Font Family:** Red Hat Display
- **Regular Slides:** 44pt, Bold, Italic
- **Title Slides:** 54pt, Bold, Italic
- **Color:** Dark teal (#2d6a7a)
- **Layout:** 16:9 widescreen (1920×1080)

**Customizing Fonts and Colors:**

Change any style by setting environment variables before running the export:

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

npm start -- pptx
```

**Default Red Hat Display Font:**
- Red Hat Display is an open-source font (recommended for modern, clean look)
- If you don't have it installed, PowerPoint will automatically substitute it with a similar sans-serif font
- [Download Red Hat Display](https://fonts.google.com/specimen/Red+Hat+Display) if you want consistent rendering across devices

**Font Installation (Optional)**
- **Windows:** Download the .ttf files and right-click → Install
- **macOS:** Download and double-click to install in Font Book
- **Linux:** Place .ttf files in `~/.fonts/` directory

**Why the defaults?**
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
npm start -- pptx my-service-songs

# Export from a different ProPresenter instance
npm start -- pptx --host 192.168.1.100 --port 1025

# Or export to text/JSON instead
npm start -- export          # Text format
npm start -- export --json   # JSON format
```

## Example Outputs

### Check Connection Status

```bash
$ npm start -- status
```

Output:
```
Connecting to ProPresenter at 192.168.68.58:61166...
✓ Connected to ProPresenter 7.11.0

ProPresenter Connection Status
==============================
Connected:  Yes
Name:       Adams-MacBook-Pro
Version:    7.11.0
Platform:   mac

Current Slide:
  (none)

Active Presentation:
  Unnamed

✓ Complete
```

### Interactive Playlist Export to PowerPoint

```bash
$ npm start -- pptx
```

Output:
```
Connecting to ProPresenter at 192.168.68.58:61166...
✓ Connected to ProPresenter 7.11.0

Available Playlists:
====================

  1) TO CREATE A NEW SERVICE USE - CREATE FROM TEMPLATE
  2) St Andrew's AM - Aug 3rd
  3) Praise Team Practice
  4) Blossom Event
  5) Alpha 2026

Select a playlist (enter number): 2

Selected: St Andrew's AM - Aug 3rd

Fetching Worship library songs...
  Found 50 songs in Worship library

Fetching playlist: 7D078D3C-CC1B-417D-A9E6-6991FA73028D

Exporting 3 songs to PowerPoint...

  ✓ Cornerstone
  ✓ I Will Offer Up My Life
  ✓ Sovereign Over Us

Generating PowerPoint...
  No logo found (place logo.png in project root to include it)

✓ PowerPoint saved to: service-lyrics-1707408942153.pptx
  3 songs, slides formatted for print/display

✓ Complete
```

### Export to Text Format

```bash
$ npm start -- export 3
```

Output:
```
Connecting to ProPresenter at 192.168.68.58:61166...
✓ Connected to ProPresenter 7.11.0

Fetching Worship library songs...
  Found 50 songs in Worship library

Fetching playlist: 3

Exporting lyrics for 1 songs...

  ✓ Living Hope

============================================================

=== Living Hope ===
(15 lyric slides)

[Verse 1]
How great the chasm that lay between us
How high the mountain I could not climb

In desperation I turned to heaven
And spoke Your name into the night

[Chorus]
Hallelujah praise the One who set me free
Hallelujah death has lost its grip on me

You have broken every chain
There's salvation in Your name
Jesus Christ my living hope

============================================================

Exported 1 songs from playlist.

✓ Complete
```

### Export to JSON Format

```bash
$ npm start -- export 3 --json
```

Output:
```json
[
  {
    "title": "Living Hope",
    "uuid": "abc123-def456-789xyz",
    "sections": [
      {
        "name": "Verse 1",
        "slides": [
          {
            "text": "How great the chasm that lay between us\nHow high the mountain I could not climb",
            "isLyric": true
          }
        ]
      },
      {
        "name": "Chorus",
        "slides": [
          {
            "text": "Hallelujah praise the One who set me free\nHallelujah death has lost its grip on me",
            "isLyric": true
          }
        ]
      }
    ]
  }
]
```

### List Available Playlists

```bash
$ npm start -- playlists
```

Output:
```
Connecting to ProPresenter at 192.168.68.58:61166...
✓ Connected to ProPresenter 7.11.0

Available Playlists:
====================

  1) TO CREATE A NEW SERVICE USE - CREATE FROM TEMPLATE
     UUID: A97A19C0-4B6F-4D73-A8E1-1B663A81E123

  2) St Andrew's AM - Aug 3rd
     UUID: 7D078D3C-CC1B-417D-A9E6-6991FA73028D

  3) Praise Team Practice
     UUID: A42A0801-470A-4D20-8E54-6D6F5796173E

✓ Complete
```

### Direct Export with Playlist Number

```bash
$ npm start -- pptx 3 "My Service Lyrics"
```

Output:
```
Connecting to ProPresenter at 192.168.68.58:61166...
✓ Connected to ProPresenter 7.11.0

Fetching Worship library songs...
  Found 50 songs in Worship library

Fetching playlist: 3

Exporting 5 songs to PowerPoint...

  ✓ Hosanna (Praise Is Rising)
  ✓ Goodness Of God
  ✓ Praise My Soul The King Of Heaven
  ✓ Hymn Of Heaven
  ✓ The Heart Of Worship

Generating PowerPoint...
  No logo found (place logo.png in project root to include it)

✓ PowerPoint saved to: My Service Lyrics.pptx
  5 songs, slides formatted for print/display

✓ Complete
```

## Usage

### Basic Commands

```bash
# Show all playlists
npm start -- playlists

# Show items in a specific playlist
npm start -- playlist <uuid>

# List all libraries
npm start -- libraries

# Export playlist (interactive mode - pick by number)
npm start -- export

# Export playlist (direct mode - using UUID)
npm start -- export <playlist-uuid>

# Export to PowerPoint (interactive)
npm start -- pptx

# Export to PowerPoint (direct)
npm start -- pptx <playlist-uuid> [output-filename]

# Show current active presentation
npm start -- current

# Show focused presentation
npm start -- focused

# Inspect a specific presentation by UUID
npm start -- inspect <presentation-uuid>

# Watch for slide changes in real-time
npm start -- watch

# Show help
npm start -- --help
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
npm start -- export

# Export specific playlist as JSON
npm start -- export abc123-def456 --json

# Export to PowerPoint with custom filename
npm start -- pptx abc123-def456 "Sunday Service Worship"

# Export from remote ProPresenter instance
npm start -- export --host 192.168.1.100 --port 1025

# Watch slides with debug output
npm start -- watch --debug
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
- Try: `npm start -- status` to test connection

### No playlists found
- Create playlists in ProPresenter first
- Use `npm start -- playlists` to list available playlists
- Verify Network API connectivity

### No songs in export
- The export filters for songs in your library (default: "Worship")
- Make sure your songs are organized in the correct library
- Use `npm start -- libraries` to see available libraries
- Use `npm start -- playlist <uuid>` to see items in a playlist
- To use a different library, set: `export PROPRESENTER_LIBRARY=YourLibraryName`

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
npm start -- [command] [options]
```

### TypeScript Compilation
```bash
npm run build
```

## Dependencies

- **renewedvision-propresenter** - ProPresenter 7 Network API wrapper
- **pptxgenjs** - PowerPoint presentation generation
- **TypeScript** - Language and development

## Acknowledgments

This project builds on the excellent [renewedvision-propresenter](https://github.com/renewedvision/propresenter-js-sdk) package, which provides the foundation for interacting with ProPresenter 7's Network API. Without this library, the core functionality of this CLI tool would not be possible.

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues, questions, or suggestions, please open an issue on GitHub.
