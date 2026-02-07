# CLI Guide

[← Back to Home](../index.md) | [User Guide](../user-guide)

---

Complete command reference for the ProPresenter Lyrics Export command-line interface.

## Installation

See [Getting Started](../getting-started.md) for installation instructions.

## Basic Command Structure

```bash
propresenter-lyrics <command> [options]
```

### Global Options

Available with any command:

```
--host, -h <address>  ProPresenter host (default: 127.0.0.1)
--port, -p <port>     ProPresenter port (default: 1025)
--json, -j             Output as JSON
--debug, -d            Show raw API responses
--help                 Show command help
```

---

## Commands

### status

Check connection and get ProPresenter info.

```bash
propresenter-lyrics status
```

**Output:**
```
ProPresenter 7.x.x
Current presentation: Song Title
Active presentation UUID: abc123...
```

**Options:**
```bash
propresenter-lyrics status --host 192.168.1.100 --debug
```

---

### playlists

List all available playlists.

```bash
propresenter-lyrics playlists
```

**Output shows:**
- Playlist names
- UUIDs (for use with other commands)
- Folder structure (indented)

**Options:**
```bash
propresenter-lyrics playlists --json  # Output as JSON
```

---

### playlist

Show items in a specific playlist.

```bash
propresenter-lyrics playlist <uuid>
```

**Arguments:**
- `<uuid>` - Playlist UUID (from `playlists` command)

**Example:**
```bash
propresenter-lyrics playlist abc123-def456-ghi789
```

---

### libraries

List all available libraries.

```bash
propresenter-lyrics libraries
```

**Output shows:**
- Library names
- Item counts
- UUIDs

---

### current

Show the currently active presentation.

```bash
propresenter-lyrics current
```

**Output:**
```
Current Presentation:
  Title: Song Title
  UUID: abc123...
  Album: Album Name
  Lyrics: [First 200 characters of lyrics]
```

---

### focused

Show the presentation with focus in ProPresenter.

```bash
propresenter-lyrics focused
```

Similar to `current` but gets the focused slide instead of active slide.

---

### export

Export playlist items to text or JSON.

#### Interactive Mode

```bash
propresenter-lyrics export
```

Prompts you to:
1. Select a playlist
2. Choose an output format (text/JSON)
3. Shows export progress

**Output:**
```
=== Playlist: Sunday Service ===

Song 1: Amazing Grace
[lyrics...]

Song 2: Jesus Loves Me
[lyrics...]
```

#### Direct Mode

```bash
propresenter-lyrics export <playlist-uuid>
propresenter-lyrics export <playlist-uuid> --json
```

**Arguments:**
- `<playlist-uuid>` - UUID of playlist to export

**Options:**
```bash
propresenter-lyrics export abc123 --json           # Output as JSON
propresenter-lyrics export abc123 -h 192.168.1.1  # Specify host
```

---

### pptx

Export playlist to PowerPoint presentation.

#### Interactive Mode

```bash
propresenter-lyrics pptx
```

Prompts you to:
1. Select a playlist
2. Enter output filename
3. Configure PPTX options (colors, fonts, etc.)
4. Shows export progress

**Output:**
- Creates `.pptx` file in current directory
- Each song becomes a slide with formatted lyrics

#### Direct Mode

```bash
propresenter-lyrics pptx <playlist-uuid> <filename>
```

**Arguments:**
- `<playlist-uuid>` - UUID of playlist
- `<filename>` - Output filename (no `.pptx` extension needed)

**Example:**
```bash
propresenter-lyrics pptx abc123 my-service
# Creates: my-service.pptx
```

**Options:**
```bash
propresenter-lyrics pptx abc123 output --json        # Include JSON in PPTX metadata
propresenter-lyrics pptx abc123 output -h 192.168.1 # Custom host
```

#### PPTX Styling

Control styling via environment variables:

```bash
export PP_TEXT_COLOR=ffffff          # Hex color (white)
export PP_FONT_FACE="Arial"          # Font name
export PP_FONT_SIZE=44               # Lyric size (points)
export PP_TITLE_SIZE=54              # Title size (points)
export PP_BOLD=true                  # Bold text
export PP_ITALIC=true                # Italic text
export PP_LOGO_PATH=/path/to/logo.png

propresenter-lyrics pptx abc123 output
```

---

### watch

Monitor presentations in real-time.

```bash
propresenter-lyrics watch
```

Shows changes as they happen:
```
[00:00:01] Focused: Song Title
[00:00:05] Lyrics updated...
[00:00:10] Switched to next item
```

**Options:**
```bash
propresenter-lyrics watch --debug     # Show raw API data
propresenter-lyrics watch -h 192.168  # Custom host
```

---

### alias

Manage song alias mappings. Aliases let you permanently map an order-of-service song title to a specific ProPresenter presentation.

#### alias list

Show all saved aliases.

```bash
propresenter-lyrics alias list
propresenter-lyrics alias list --json    # JSON output
```

**Output:**
```
Song Aliases
============

  "Be Thou My Vision"
    → You Are My Vision
      UUID: abc123-def456

  1 alias(es) stored in ~/.propresenter-words/aliases.json
```

#### alias add

Interactively search your ProPresenter library and create an alias.

```bash
propresenter-lyrics alias add "Be Thou My Vision"
```

**Requires ProPresenter connection.** The command will:
1. Connect to ProPresenter and fetch all libraries
2. Prompt you to search for the target song
3. Let you select from matching results
4. Save the alias

**Example session:**
```
Adding alias for: "Be Thou My Vision"
Fetching libraries...

Found 245 presentations across 3 libraries.

Search for a song (or "q" to cancel): vision
  Found 3 match(es):

  1) You Are My Vision  [Worship]
  2) Vision of You  [Worship]
  3) Open The Eyes Of My Heart  [Worship]

Select a song (number), or press Enter to search again: 1

✓ Alias saved:
  "Be Thou My Vision" → "You Are My Vision" [Worship]
```

#### alias remove

Remove a saved alias.

```bash
propresenter-lyrics alias remove "Be Thou My Vision"
```

---

### inspect

Inspect a specific presentation's details.

```bash
propresenter-lyrics inspect <uuid>
```

**Arguments:**
- `<uuid>` - Presentation UUID

**Example:**
```bash
propresenter-lyrics inspect abc123-def456
```

Shows:
- Title
- Lyrics (full text)
- Metadata
- Library info

---

### help

Show help for any command.

```bash
propresenter-lyrics help              # General help
propresenter-lyrics help export       # Help for 'export' command
propresenter-lyrics export --help     # Same as above
```

---

## Examples

### Basic Workflow

```bash
# 1. Check connection
propresenter-lyrics status

# 2. List available playlists
propresenter-lyrics playlists

# 3. Export a playlist to text
propresenter-lyrics export my-playlist-uuid

# 4. Export to PowerPoint
propresenter-lyrics pptx my-playlist-uuid service-slides
```

### Remote ProPresenter

```bash
# Set environment variables (one-time)
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=61166

# Now all commands use these settings
propresenter-lyrics status
propresenter-lyrics playlists
propresenter-lyrics pptx abc123 output
```

### JSON Output

```bash
# Export as JSON
propresenter-lyrics export abc123 --json > playlist.json

# Parse with jq
propresenter-lyrics export abc123 --json | jq '.songs[0]'
```

### Batch Processing

```bash
#!/bin/bash
# Export multiple playlists

playlists=(
  "abc123-uuid"
  "def456-uuid"
  "ghi789-uuid"
)

for uuid in "${playlists[@]}"; do
  propresenter-lyrics pptx "$uuid" "output-$uuid"
done
```

### Watch for Changes

```bash
# Monitor what's happening in real-time
propresenter-lyrics watch --debug

# Output shows every API call and response
```

### Create Presentation List

```bash
# Export all playlists as JSON and create summary
propresenter-lyrics playlists --json | jq '.[] | {name, uuid}' > playlists.json
```

---

## Exit Codes

The CLI returns these exit codes:

| Code | Meaning |
|------|---------|
| 0 | Success |
| 1 | General error (connection, file, etc.) |
| 2 | Command not found |
| 3 | Invalid arguments |
| 4 | ProPresenter connection failed |

**Example:**
```bash
propresenter-lyrics export abc123
if [ $? -eq 0 ]; then
  echo "Export successful"
else
  echo "Export failed"
fi
```

---

## Environment Variables

Control behavior with environment variables:

```bash
# Connection
PROPRESENTER_HOST=127.0.0.1       # Default: 127.0.0.1
PROPRESENTER_PORT=1025            # Default: 1025
PROPRESENTER_LIBRARY="Worship"    # Filter library

# PPTX Styling
PP_TEXT_COLOR=ffffff              # Hex color
PP_FONT_FACE="Arial"              # Font name
PP_FONT_SIZE=44                   # Points
PP_TITLE_SIZE=54                  # Points
PP_BOLD=true                       # Boolean
PP_ITALIC=true                    # Boolean
PP_LOGO_PATH=/path/to/logo.png   # Image path
```

---

## Tips & Tricks

### Save Output to File

```bash
# Export to text file
propresenter-lyrics export abc123 > playlist.txt

# Export to JSON file
propresenter-lyrics export abc123 --json > playlist.json
```

### Monitor with Tail

```bash
# Watch the last 10 lines as they change
propresenter-lyrics watch | tail -10
```

### Parse with jq

```bash
# List all song titles
propresenter-lyrics export abc123 --json | jq '.songs[].title'

# Get first song's lyrics
propresenter-lyrics export abc123 --json | jq '.songs[0].lyrics'
```

### Set Permanent Defaults

**macOS/Linux** - Add to `~/.bashrc` or `~/.zshrc`:
```bash
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025
```

**Windows PowerShell** - Add to `$PROFILE`:
```powershell
$env:PROPRESENTER_HOST = '192.168.1.100'
$env:PROPRESENTER_PORT = '1025'
```

---

## Troubleshooting

### "Command not found"

```bash
# Ensure executable is in PATH or use full path
./propresenter-lyrics status
# or
/full/path/to/propresenter-lyrics status
```

### "Connection refused"

```bash
# Check ProPresenter is running
propresenter-lyrics status

# Try with explicit host/port
propresenter-lyrics status --host 127.0.0.1 --port 1025

# Use debug for more info
propresenter-lyrics status --debug
```

### Slow responses

```bash
# Network lag - try again
# For remote connections, may take 5-10 seconds

# Use watch with debug to see what's happening
propresenter-lyrics watch --debug
```

---

## See Also

- [Getting Started](../getting-started.md) - Installation guide
- [User Guide](../user-guide.md) - Desktop app guide
- [FAQ](../faq.md) - Common questions
