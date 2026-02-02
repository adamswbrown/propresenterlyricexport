# ProPresenter Lyrics Export

A command-line tool to extract and export lyrics from ProPresenter 7 presentations. Supports text, JSON, and PowerPoint formats.

## Features

- **Extract Lyrics** - Pull lyrics from ProPresenter presentations
- **Multiple Export Formats**:
  - Plain text with formatted sections
  - JSON with structured metadata
  - PowerPoint presentations with styled slides
- **Playlist Support** - Export entire playlists at once
- **Library Filtering** - Automatically filters songs from your Worship library
- **Interactive Selection** - Pick playlists by number instead of typing UUIDs
- **Network API** - Works with ProPresenter 7 Network API

## Requirements

- **Node.js** 14+
- **ProPresenter 7** running and accessible on your network
- Network API enabled in ProPresenter settings

## Installation

1. Clone the repository:
```bash
git clone https://github.com/adamswbrown/propresenterlyricexport.git
cd propresenterlyricexport
```

2. Install dependencies:
```bash
npm install
```

3. Build the project:
```bash
npm run build
```

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

### Logo Configuration (Optional)

The PowerPoint export can include your church/organization logo on the title slide. To use this feature:

**1. Add your logo file as `logo.png`**

Place a PNG file named `logo.png` in one of these locations (checked in order):
- Project root directory: `./logo.png`
- Assets folder: `./assets/logo.png`
- Build output: `./dist/logo.png`

**2. Logo specifications**
- **Format:** PNG with transparent background (recommended)
- **Size:** Any size (will be scaled appropriately, typically ~200-300px works well)
- **Dimensions:** Square or wide format both work well

**3. What happens**
- If `logo.png` is found → It will be inserted on the title slide of your PowerPoint
- If not found → PowerPoint exports work normally without a logo (no error)

**Example:**
```bash
# Copy your logo to the project root
cp ~/church-logo.png logo.png

# Now when you export, the logo will be included
npm run dev -- pptx
```

**Tip:** You'll see confirmation in the output:
```
Generating PowerPoint...
  Using logo: /Users/adambrown/Developer/ProPresenterWords/logo.png
```

Or if no logo is found:
```
Generating PowerPoint...
  No logo found (place logo.png in project root to include it)
```

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

## Quick Start: Export a Playlist to PowerPoint

This is the most common workflow. Just three steps:

### Step 1: Start the Tool
```bash
npm run dev -- pptx
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
npm run dev -- pptx my-service-songs

# Export from a different ProPresenter instance
npm run dev -- pptx --host 192.168.1.100 --port 1025

# Or export to text/JSON instead
npm run dev -- export          # Text format
npm run dev -- export --json   # JSON format
```

## Usage

### Basic Commands

```bash
# Show all playlists
npm run dev -- playlists

# Show items in a specific playlist
npm run dev -- playlist <uuid>

# List all libraries
npm run dev -- libraries

# Export playlist (interactive mode - pick by number)
npm run dev -- export

# Export playlist (direct mode - using UUID)
npm run dev -- export <playlist-uuid>

# Export to PowerPoint (interactive)
npm run dev -- pptx

# Export to PowerPoint (direct)
npm run dev -- pptx <playlist-uuid> [output-filename]

# Show current active presentation
npm run dev -- current

# Show focused presentation
npm run dev -- focused

# Inspect a specific presentation by UUID
npm run dev -- inspect <presentation-uuid>

# Watch for slide changes in real-time
npm run dev -- watch

# Show help
npm run dev -- --help
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
npm run dev -- export

# Export specific playlist as JSON
npm run dev -- export abc123-def456 --json

# Export to PowerPoint with custom filename
npm run dev -- pptx abc123-def456 "Sunday Service Worship"

# Export from remote ProPresenter instance
npm run dev -- export --host 192.168.1.100 --port 1025

# Watch slides with debug output
npm run dev -- watch --debug
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
- Try: `npm run dev -- status` to test connection

### No playlists found
- Create playlists in ProPresenter first
- Use `npm run dev -- playlists` to list available playlists
- Verify Network API connectivity

### No songs in export
- The export filters for songs in your "Worship" library
- Make sure your songs are organized in a library named "Worship"
- Use `npm run dev -- libraries` to see available libraries
- Use `npm run dev -- playlist <uuid>` to see items in a playlist

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
npm run dev -- [command] [options]
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
