# Setup Scripts - Summary

Three automated setup scripts have been created to help users quickly configure ProPresenter Lyrics for easy access on their systems.

## Files Created

```
scripts/
├── setup-mac.sh           (6.9 KB) - macOS setup script
├── setup-windows.bat      (7.0 KB) - Windows Command Prompt setup
└── setup-windows.ps1      (7.9 KB) - Windows PowerShell setup

SETUP.md                          - Complete setup guide (this document)
```

## Quick Reference

### macOS
```bash
./scripts/setup-mac.sh
```

**Options:**
1. Command-line access (add to PATH)
2. Applications folder installation
3. Both

### Windows (Command Prompt)
```batch
REM Run as Administrator
scripts\setup-windows.bat
```

**Options:**
1. Add to PATH
2. Desktop shortcut
3. Program Files installation
4. All of the above

### Windows (PowerShell)
```powershell
# Run as Administrator
.\scripts\setup-windows.ps1

# Or automated mode
.\scripts\setup-windows.ps1 -SetupType all
```

## What Each Script Does

### setup-mac.sh

**Automatically detects and handles:**
- macOS native app bundle (`ProPresenter Lyrics.app`)
- ARM64 executable (Apple Silicon)
- Intel executable (older Macs)

**Setup options:**
1. **Command-line** - Creates alias in shell configuration
   - Adds to `~/bin/propresenter/`
   - Updates `~/.zshrc` or `~/.bashrc`
   - Usage: `propresenter-lyrics status`

2. **Applications folder** - Native macOS integration
   - Copies app to `/Applications`
   - Launchable from Finder
   - Requires app bundle

3. **Both** - Complete setup

**Benefits:**
- Auto-detects available executables
- Handles both zsh and bash shells
- Preserves existing configurations
- Clear status messages

### setup-windows.bat (Command Prompt)

**Features:**
- Validates Administrator privileges (required)
- Detects Windows executable automatically
- Interactive menu system
- Registry modification for system PATH

**Setup options:**
1. **Add to PATH** (Recommended)
   - Installs to `C:\Tools\ProPresenterLyrics\`
   - Makes command globally available
   - Usage: `propresenter-lyrics status`

2. **Desktop Shortcut**
   - Creates `.bat` launcher file
   - Creates `.lnk` shortcut
   - No PATH modification needed

3. **Program Files**
   - Professional installation location
   - Adds to system PATH
   - Standard Windows approach

4. **All** - Complete setup

**Benefits:**
- Requires Administrator privileges
- Modifies Windows Registry for permanent PATH
- Creates proper desktop shortcuts
- Clear success messages

### setup-windows.ps1 (PowerShell)

**Features:**
- Advanced PowerShell scripting
- Supports both interactive and automated modes
- Better error handling
- Supports all setup options

**Automation:**
```powershell
# Just PATH
.\setup-windows.ps1 -SetupType path

# Just shortcut
.\setup-windows.ps1 -SetupType shortcut

# Program Files
.\setup-windows.ps1 -SetupType programfiles

# Everything
.\setup-windows.ps1 -SetupType all
```

**Benefits:**
- More flexible than batch script
- Better PowerShell integration
- Automated mode for scripting
- Modern error handling

## Installation Flow

### macOS Installation Flow
```
User runs setup-mac.sh
    ↓
Script detects available executable
    ↓
User selects option (1/2/3)
    ↓
Script copies files to ~/bin/propresenter/
    ↓
Script updates ~/.zshrc or ~/.bashrc
    ↓
Success message with next steps
    ↓
User runs: source ~/.zshrc
    ↓
Command available: propresenter-lyrics status
```

### Windows Installation Flow
```
User right-clicks Command Prompt → "Run as Administrator"
    ↓
User runs: scripts\setup-windows.bat
    ↓
Script validates Administrator privileges
    ↓
Script detects Windows executable
    ↓
User selects option (1/2/3/4)
    ↓
Script copies files to C:\Tools\ or C:\Program Files\
    ↓
Script modifies system PATH via Registry
    ↓
Success message with next steps
    ↓
User closes and reopens Command Prompt
    ↓
Command available: propresenter-lyrics status
```

## Key Features

### Safety & Validation
- ✓ Check for Administrator/sudo privileges (where needed)
- ✓ Verify executable exists before proceeding
- ✓ Detect existing configurations to avoid duplication
- ✓ Preserve existing shell/system configuration
- ✓ Clear error messages for failures

### User Experience
- ✓ Interactive menu system with sensible defaults
- ✓ Clear status messages during setup
- ✓ Success confirmation with next steps
- ✓ Troubleshooting guidance included

### Flexibility
- ✓ Multiple setup options (PATH, shortcuts, apps, etc.)
- ✓ Works with multiple shells (zsh, bash)
- ✓ Works with multiple terminals (Command Prompt, PowerShell)
- ✓ Automated mode for scripting

## Environment Detection

### macOS Script
- Detects shell type (zsh vs bash)
- Finds correct shell configuration file
- Detects executable type (app bundle, ARM64, Intel)
- Validates executable paths

### Windows Batch
- Detects Administrator privileges
- Reads current system PATH from Registry
- Detects existing configurations
- Validates executable exists

### Windows PowerShell
- Detects Administrator privileges
- Supports execution policies
- Uses modern PowerShell cmdlets
- Better error handling

## Post-Setup Usage

After running any setup script:

```bash
# Test connection
propresenter-lyrics status

# Set connection details (optional)
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025

# Export playlists
propresenter-lyrics pptx

# Get help
propresenter-lyrics --help
```

## Documentation

Complete setup guide available in: **[SETUP.md](./SETUP.md)**

Covers:
- Prerequisites for each platform
- Step-by-step instructions
- Troubleshooting tips
- Uninstall procedures
- Environment variable configuration

## Testing

### macOS
Tested with:
- ARM64 executables
- Shell configuration detection
- Both zsh and bash
- Non-existent executables (error handling)

### Windows
Tested with:
- Administrator privilege detection
- Registry PATH modification
- Desktop shortcut creation
- Both batch and PowerShell execution

## Technical Details

### macOS (setup-mac.sh)
- Bash script (~6.9 KB)
- Uses standard shell commands
- Creates `~/bin/propresenter/` directory
- Modifies `~/.zshrc` or `~/.bashrc`
- No external dependencies

### Windows Batch (setup-windows.bat)
- Batch file (~7.0 KB)
- Uses Registry commands for PATH
- Creates system shortcuts with VBScript
- Requires Administrator
- No external dependencies

### Windows PowerShell (setup-windows.ps1)
- PowerShell script (~7.9 KB)
- Uses PowerShell cmdlets
- Supports execution policies
- Can be called with parameters
- No external dependencies

## Compatibility

| Platform | Script | Status |
|----------|--------|--------|
| macOS 10.15+ | setup-mac.sh | ✓ Full support |
| macOS 11+ | setup-mac.sh | ✓ Full support |
| Windows 10 | setup-windows.bat | ✓ Full support |
| Windows 10 | setup-windows.ps1 | ✓ Full support |
| Windows 11 | setup-windows.bat | ✓ Full support |
| Windows 11 | setup-windows.ps1 | ✓ Full support |
| Linux | (not included) | Use manual setup |

## Troubleshooting

### Common Issues

**"Command not found" after setup**
- macOS: Did you run `source ~/.zshrc`?
- Windows: Did you close and reopen the terminal?

**"Administrator required"**
- Windows: Right-click and select "Run as Administrator"

**"Executable not found"**
- Ensure you downloaded the executables folder or built the project

**Permission denied**
- The scripts automatically set permissions
- If issues persist: `chmod +x ~/bin/propresenter/launcher`

See [SETUP.md](./SETUP.md) for complete troubleshooting guide.

## Future Enhancements

Potential additions:
- Linux setup script (similar to macOS)
- Automatic ProPresenter discovery on network
- Version update checking
- Uninstall helper scripts
- Configuration wizard for PROPRESENTER_HOST/PORT

## Support

For setup issues:
1. Check [SETUP.md](./SETUP.md) troubleshooting section
2. Verify all prerequisites are met
3. Review script output for error messages
4. Check [README.md](./README.md) for ProPresenter configuration

---

**Last updated**: February 2, 2026
**Status**: Production Ready ✓
