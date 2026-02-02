# ProPresenter Lyrics Export - Distribution Guide

This document explains how to use the standalone executables and distribute them.

## Quick Download (Recommended)

The easiest way to get started is to download the latest executables from **[GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases)**:

1. Go to the [Releases page](https://github.com/adamswbrown/propresenterlyricexport/releases)
2. Download the executable for your platform:
   - **Windows**: `propresenter-lyrics-win-x64.exe`
   - **macOS Intel**: `propresenter-lyrics-macos-x64`
   - **macOS Apple Silicon**: `propresenter-lyrics-macos-arm64`
   - **Linux**: `propresenter-lyrics-linux-x64`
3. Follow the setup instructions below for your platform

## Build Your Own Executables

If you prefer to build from source:

```bash
npm install
npm run build:exe
```

This creates four platform-specific executables in the `executables/` folder.

## Standalone Executables

Four platform-specific executables are self-contained binaries that don't require Node.js to be installed.

They are located in the `executables/` folder (after building):

### Available Executables

```
executables/propresenter-lyrics-win-x64.exe   (112 MB) - Windows 64-bit
executables/propresenter-lyrics-macos-x64     (126 MB) - macOS Intel
executables/propresenter-lyrics-macos-arm64   (121 MB) - macOS Apple Silicon (M1/M2/M3)
executables/propresenter-lyrics-linux-x64     (120 MB) - Linux 64-bit
```

## Usage

### Windows
```bash
# Run directly from executables folder:
executables\propresenter-lyrics-win-x64.exe status
executables\propresenter-lyrics-win-x64.exe playlists
executables\propresenter-lyrics-win-x64.exe pptx

# Or copy to your PATH for easy access:
copy executables\propresenter-lyrics-win-x64.exe C:\Tools\
```

### macOS
```bash
# Run directly (already executable):
executables/propresenter-lyrics-macos-x64 status
executables/propresenter-lyrics-macos-x64 playlists
executables/propresenter-lyrics-macos-x64 pptx

# Or for Apple Silicon Macs:
executables/propresenter-lyrics-macos-arm64 status
```

### Linux
```bash
# Run directly (already executable):
executables/propresenter-lyrics-linux-x64 status
executables/propresenter-lyrics-linux-x64 playlists
executables/propresenter-lyrics-linux-x64 pptx
```

## Installation for Easy Access

### Windows
1. Create a folder like `C:\Tools\ProPresenterLyrics\`
2. Copy `propresenter-lyrics-win-x64.exe` to this folder
3. Rename it to `propresenter-lyrics.exe` (optional, for easier typing)
4. Add this folder to your Windows PATH:
   - Win+R → `sysdm.cpl`
   - Environment Variables → Edit PATH
   - Add `C:\Tools\ProPresenterLyrics\`
5. Now you can run from any terminal: `propresenter-lyrics pptx`

### macOS
1. Create a folder: `mkdir -p ~/bin/propresenter`
2. Copy the executable: `cp propresenter-lyrics-macos-x64 ~/bin/propresenter/`
3. Rename it: `mv ~/bin/propresenter/propresenter-lyrics-macos-x64 ~/bin/propresenter/propresenter-lyrics`
4. Make it executable: `chmod +x ~/bin/propresenter/propresenter-lyrics`
5. Add to PATH in `~/.zshrc`:
   ```bash
   export PATH="$HOME/bin/propresenter:$PATH"
   ```
6. Reload: `source ~/.zshrc`
7. Now you can run: `propresenter-lyrics pptx`

### Linux
Similar to macOS:
```bash
mkdir -p ~/bin
cp propresenter-lyrics-linux-x64 ~/bin/propresenter-lyrics
chmod +x ~/bin/propresenter-lyrics
# Make sure ~/bin is in your PATH
propresenter-lyrics pptx
```

## Environment Variables

Set these to avoid typing host/port every time:

```bash
# Windows (Command Prompt)
set PROPRESENTER_HOST=192.168.1.100
set PROPRESENTER_PORT=1025

# Windows (PowerShell)
$env:PROPRESENTER_HOST='192.168.1.100'
$env:PROPRESENTER_PORT='1025'

# macOS/Linux (temporary for this session)
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025

# macOS/Linux (permanent - add to ~/.zshrc or ~/.bashrc)
echo 'export PROPRESENTER_HOST=192.168.1.100' >> ~/.zshrc
echo 'export PROPRESENTER_PORT=1025' >> ~/.zshrc
source ~/.zshrc
```

## Rebuilding Executables

If you modify the CLI source code, rebuild the executables:

```bash
npm run build:exe
```

This will:
1. Compile TypeScript → JavaScript
2. Build all four platform-specific executables
3. Place them in the project root

## Troubleshooting

### "Command not found"
- Make sure you're using the correct filename for your platform
- On Mac/Linux, verify the file is executable: `chmod +x propresenter-lyrics-*`
- On Windows, use the full path or ensure the folder is in PATH

### "Connection refused"
- Make sure ProPresenter is running
- Check that Network API is enabled in ProPresenter settings
- Verify the host and port are correct
- Use `--debug` flag for more information:
  ```bash
  propresenter-lyrics-macos-x64 status --debug
  ```

### File size seems large
- Yes, the executables are 110-125 MB each
- This is because they bundle a complete Node.js runtime
- They're self-contained and require no dependencies
- Consider this when distributing (use zip/archive for distribution)

## Distribution Tips

### For Sharing
1. Zip the executables: `zip propresenter-lyrics.zip propresenter-lyrics-*`
2. Share the zip file (about 200 MB compressed)
3. Include a copy of [QUICK_START.md](./QUICK_START.md) for setup instructions

### For Organization
1. Place all executables in a shared network folder
2. Create batch files (Windows) or shell scripts (Mac/Linux) that call the right one:

**Windows (run.bat):**
```batch
@echo off
propresenter-lyrics-win-x64.exe %*
```

**macOS/Linux (run.sh):**
```bash
#!/bin/bash
./propresenter-lyrics-macos-x64 "$@"
```

3. Users just run the batch/shell file with their commands

## File Locations

The compiled executables are saved in the `executables/` folder:
- `executables/propresenter-lyrics-win-x64.exe`
- `executables/propresenter-lyrics-macos-x64`
- `executables/propresenter-lyrics-macos-arm64`
- `executables/propresenter-lyrics-linux-x64`

These are ready to distribute and don't require any setup beyond downloading. The `executables/` folder is added to `.gitignore` since these large binaries can be rebuilt anytime with `npm run build:exe`.

## Command Reference

All commands work the same as with `npm run dev:cli --`:

```bash
# Connection test
./executables/propresenter-lyrics-macos-x64 status

# List playlists
./executables/propresenter-lyrics-macos-x64 playlists

# Interactive export
./executables/propresenter-lyrics-macos-x64 export

# Interactive PowerPoint export
./executables/propresenter-lyrics-macos-x64 pptx

# Get help
./executables/propresenter-lyrics-macos-x64 --help

# Export with specific host
./executables/propresenter-lyrics-macos-x64 pptx --host 192.168.1.100
```

See [README.md](./README.md) for full documentation.
