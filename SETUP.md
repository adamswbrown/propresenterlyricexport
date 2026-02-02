# ProPresenter Lyrics - Setup Guide

Automated setup scripts for Windows and macOS to quickly configure easy command-line and desktop access to ProPresenter Lyrics.

## Quick Start

### macOS
```bash
# Navigate to project directory
cd ProPresenterWords

# Run setup script
./scripts/setup-mac.sh
```

### Windows (Command Prompt)
```batch
cd ProPresenterWords
scripts\setup-windows.bat
```

### Windows (PowerShell)
```powershell
cd ProPresenterWords
.\scripts\setup-windows.ps1
```

---

## macOS Setup Guide

### Prerequisites
- macOS 10.15+ (Catalina or later)
- Either:
  - The DMG file mounted with `ProPresenter Lyrics.app`, OR
  - The `executables/` folder with the ARM64 or Intel executable

### Run the Setup Script
```bash
./scripts/setup-mac.sh
```

### Setup Options

**Option 1: Command-Line Access (Recommended)**
- Creates a command available in Terminal
- Works in any directory
- Accessible from any shell (zsh, bash)
- Usage: `propresenter-lyrics status`

**Option 2: Applications Folder**
- Copies app to `/Applications`
- Launch from Finder
- Requires app bundle (`ProPresenter Lyrics.app`)

**Option 3: Both**
- Sets up both command-line and Applications folder access

### What It Does

The script will:
1. Detect which executable/app bundle is available
2. Copy it to `~/bin/propresenter/`
3. Add to your shell configuration (`~/.zshrc` or `~/.bashrc`)
4. Create an alias for easy access

### After Setup

1. **Reload your shell:**
   ```bash
   source ~/.zshrc
   # or
   source ~/.bashrc
   ```

2. **Test the connection:**
   ```bash
   propresenter-lyrics status
   ```

3. **Configure connection (optional):**
   ```bash
   export PROPRESENTER_HOST=192.168.1.100
   export PROPRESENTER_PORT=1025
   ```

4. **Export your first playlist:**
   ```bash
   propresenter-lyrics pptx
   ```

### Troubleshooting

**Command not found after setup**
- Make sure you ran `source ~/.zshrc` (or `.bashrc`)
- Verify the script completed successfully
- Check that `~/bin/propresenter/` exists

**Permission denied**
- The script should automatically set permissions
- If needed: `chmod +x ~/bin/propresenter/launcher`

**App not found in Applications**
- This requires the app bundle (`ProPresenter Lyrics.app`)
- Build it with: `npm run build:macos`

---

## Windows Setup Guide (Command Prompt)

### Prerequisites
- Windows 10 or later
- **Administrator privileges** (required!)
- The `executables/propresenter-lyrics-win-x64.exe` file

### Run the Setup Script (As Administrator)

1. **Open Command Prompt as Administrator:**
   - Press `Win+R`
   - Type: `cmd`
   - Press `Ctrl+Shift+Enter`

2. **Navigate to project directory:**
   ```batch
   cd C:\path\to\ProPresenterWords
   ```

3. **Run the setup script:**
   ```batch
   scripts\setup-windows.bat
   ```

### Setup Options

**Option 1: Add to PATH (Recommended)**
- Copies executable to `C:\Tools\ProPresenterLyrics\`
- Adds to system PATH
- Available from any Command Prompt or PowerShell
- Usage: `propresenter-lyrics status`

**Option 2: Desktop Shortcut**
- Creates launcher on desktop
- Creates `.lnk` shortcut file
- Double-click to show help

**Option 3: Program Files**
- Installs to `C:\Program Files\ProPresenter Lyrics\`
- Adds to PATH
- Professional installation method

**Option 4: All**
- Performs all of the above

### After Setup

1. **Close and reopen Command Prompt**
   - This reloads the PATH environment

2. **Test the connection:**
   ```batch
   propresenter-lyrics status
   ```

3. **Configure connection (optional):**
   ```batch
   setx PROPRESENTER_HOST 192.168.1.100
   setx PROPRESENTER_PORT 1025
   ```

4. **Export your first playlist:**
   ```batch
   propresenter-lyrics pptx
   ```

### Troubleshooting

**Administrator required**
- The script needs admin privileges to modify system PATH
- Right-click Command Prompt → "Run as administrator"

**Command not found**
- Close and reopen Command Prompt completely
- Check that setup completed successfully
- Verify the folder exists: `C:\Tools\ProPresenterLyrics\`

**Access denied**
- Run Command Prompt as Administrator
- Do not interrupt the script while running

---

## Windows Setup Guide (PowerShell)

### Prerequisites
- Windows 10 or later with PowerShell 5.0+
- **Administrator privileges** (required!)
- The `executables/propresenter-lyrics-win-x64.exe` file

### Run the Setup Script (As Administrator)

1. **Open PowerShell as Administrator:**
   - Right-click PowerShell
   - Select "Run as administrator"

2. **Enable script execution (first time only):**
   ```powershell
   Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
   ```

3. **Navigate to project directory:**
   ```powershell
   cd C:\path\to\ProPresenterWords
   ```

4. **Run the setup script:**
   ```powershell
   .\scripts\setup-windows.ps1
   ```

### Setup Options

Same as Command Prompt version:
- **1**: Add to PATH (Recommended)
- **2**: Desktop shortcut
- **3**: Program Files installation
- **4**: All of the above

### Interactive vs. Automated

**Interactive (default):**
```powershell
.\scripts\setup-windows.ps1
```

**Automated with specific type:**
```powershell
# Just add to PATH
.\scripts\setup-windows.ps1 -SetupType path

# Just create shortcut
.\scripts\setup-windows.ps1 -SetupType shortcut

# Install to Program Files
.\scripts\setup-windows.ps1 -SetupType programfiles

# Do everything
.\scripts\setup-windows.ps1 -SetupType all
```

### After Setup

1. **Close and reopen PowerShell**
   - This reloads the PATH environment

2. **Test the connection:**
   ```powershell
   propresenter-lyrics status
   ```

3. **Configure connection (optional):**
   ```powershell
   $env:PROPRESENTER_HOST = '192.168.1.100'
   $env:PROPRESENTER_PORT = '1025'

   # To make permanent:
   [Environment]::SetEnvironmentVariable("PROPRESENTER_HOST", "192.168.1.100", "User")
   [Environment]::SetEnvironmentVariable("PROPRESENTER_PORT", "1025", "User")
   ```

4. **Export your first playlist:**
   ```powershell
   propresenter-lyrics pptx
   ```

### Troubleshooting

**Script execution disabled**
- Run: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`
- This allows local scripts to run

**Administrator required**
- Right-click PowerShell → "Run as administrator"

---

## Uninstall / Remove Setup

### macOS
```bash
# Remove from shell configuration
vim ~/.zshrc
# Find and delete the ProPresenter Lyrics section

# Remove binaries
rm -rf ~/bin/propresenter

# Remove from Applications (if installed)
rm -rf /Applications/ProPresenter\ Lyrics.app
```

### Windows (Command Prompt)

1. **Remove from PATH:**
   - Right-click Start Menu
   - Select "System" → "Advanced system settings"
   - Click "Environment Variables"
   - Find and remove `C:\Tools\ProPresenterLyrics` or `C:\Program Files\ProPresenter Lyrics`

2. **Remove desktop shortcuts:**
   - Delete from `%USERPROFILE%\Desktop`

3. **Uninstall from Program Files:**
   ```batch
   rmdir /S /Q "C:\Program Files\ProPresenter Lyrics"
   ```

---

## Environment Variables (Optional)

Configure default host and port to avoid typing them each time.

### macOS
```bash
# Temporary (this session only)
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025

# Permanent (add to ~/.zshrc or ~/.bashrc)
echo 'export PROPRESENTER_HOST=192.168.1.100' >> ~/.zshrc
source ~/.zshrc
```

### Windows Command Prompt
```batch
# Temporary (this session only)
set PROPRESENTER_HOST=192.168.1.100
set PROPRESENTER_PORT=1025

# Permanent (system environment)
setx PROPRESENTER_HOST 192.168.1.100
setx PROPRESENTER_PORT 1025
```

### Windows PowerShell
```powershell
# Temporary (this session only)
$env:PROPRESENTER_HOST = '192.168.1.100'
$env:PROPRESENTER_PORT = '1025'

# Permanent (user environment)
[Environment]::SetEnvironmentVariable("PROPRESENTER_HOST", "192.168.1.100", "User")
[Environment]::SetEnvironmentVariable("PROPRESENTER_PORT", "1025", "User")
```

---

## What Each Script Does

### setup-mac.sh
- Detects available executables (app bundle or CLI)
- Creates `~/bin/propresenter/` directory
- Copies executable with proper permissions
- Adds to shell PATH
- Creates shell alias
- Updates shell configuration file

### setup-windows.bat
- Validates Administrator privileges
- Checks for executable
- Presents interactive menu
- Copies to `C:\Tools\ProPresenterLyrics\` or `C:\Program Files\`
- Modifies system PATH via Registry
- Creates desktop shortcuts

### setup-windows.ps1
- Validates Administrator privileges
- Supports interactive and command-line modes
- Same functionality as .bat file
- Better error handling
- Supports PowerShell-specific features

---

## After Setup

### Test the Installation
```bash
# All platforms
propresenter-lyrics status
```

Expected output:
```
✓ Connected to ProPresenter 7.x.x
```

### First Use
```bash
# Export with interactive playlist selection
propresenter-lyrics pptx

# List all playlists
propresenter-lyrics playlists

# Get help
propresenter-lyrics --help
```

### Common Commands
```bash
# Test connection
propresenter-lyrics status

# List playlists
propresenter-lyrics playlists

# Interactive export
propresenter-lyrics export

# Export to PowerPoint
propresenter-lyrics pptx

# Use specific host
propresenter-lyrics status --host 192.168.1.100 --port 1025

# JSON output
propresenter-lyrics playlists --json
```

---

## Support

- **Issues with setup**: Check the troubleshooting sections above
- **Command not working**: Verify the setup script completed successfully
- **Connection problems**: See [QUICK_START.md](./QUICK_START.md) for ProPresenter configuration
- **Full documentation**: See [README.md](./README.md)

---

**Last updated**: February 2, 2026
