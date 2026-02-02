# ProPresenter Lyrics - Windows PowerShell Setup Script
# This script sets up easy access to ProPresenter Lyrics

param(
    [Parameter(HelpMessage="Setup type: path, shortcut, programfiles, or all")]
    [string]$SetupType = ""
)

# ============================================================
# Check for Administrator privileges
# ============================================================

$isAdmin = [Security.Principal.WindowsIdentity]::GetCurrent() |
    ForEach-Object { [Security.Principal.WindowsPrincipal]$_ } |
    ForEach-Object { $_.IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator) }

if (-not $isAdmin) {
    Write-Host ""
    Write-Host "ERROR: This script requires Administrator privileges"
    Write-Host ""
    Write-Host "Please run PowerShell as Administrator:"
    Write-Host "  1. Right-click PowerShell"
    Write-Host "  2. Select 'Run as administrator'"
    Write-Host "  3. Run: .\scripts\setup-windows.ps1"
    Write-Host ""
    exit 1
}

# ============================================================
# Header
# ============================================================

Clear-Host
Write-Host ""
Write-Host "============================================================"
Write-Host "   ProPresenter Lyrics - Windows PowerShell Setup"
Write-Host "============================================================"
Write-Host ""

# Get script directory
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$projectRoot = Split-Path -Parent $scriptDir

# Check for executable
$executable = Join-Path $projectRoot "executables\propresenter-lyrics-win-x64.exe"

if (-not (Test-Path $executable)) {
    Write-Host "ERROR: propresenter-lyrics-win-x64.exe not found"
    Write-Host ""
    Write-Host "Please ensure you have:"
    Write-Host "  1. Downloaded the executables folder, OR"
    Write-Host "  2. Built the project with: npm run build:exe"
    Write-Host ""
    exit 1
}

Write-Host "✓ Found Windows executable"
Write-Host ""

# ============================================================
# Menu
# ============================================================

if ([string]::IsNullOrEmpty($SetupType)) {
    Write-Host "Setup Options:"
    Write-Host "-----------------------------------------------------------"
    Write-Host ""
    Write-Host "1. Add to PATH (recommended)"
    Write-Host "   - Makes command available from any terminal"
    Write-Host "   - Type: propresenter-lyrics [command]"
    Write-Host ""
    Write-Host "2. Create desktop shortcut"
    Write-Host "   - Quick launch from desktop"
    Write-Host ""
    Write-Host "3. Copy to Program Files"
    Write-Host "   - Professional installation"
    Write-Host ""
    Write-Host "4. All of the above"
    Write-Host "   - Complete setup"
    Write-Host ""
    Write-Host "5. Configure environment variables"
    Write-Host "   - Set ProPresenter host/port"
    Write-Host "   - Set library filter"
    Write-Host "   - Configure PowerPoint styling"
    Write-Host ""

    $choice = Read-Host "Choose setup type (1/2/3/4/5) [default: 1]"
    if ([string]::IsNullOrEmpty($choice)) { $choice = "1" }
} else {
    switch ($SetupType.ToLower()) {
        "path" { $choice = "1" }
        "shortcut" { $choice = "2" }
        "programfiles" { $choice = "3" }
        "all" { $choice = "4" }
        default {
            Write-Host "Unknown setup type: $SetupType"
            exit 1
        }
    }
}

# ============================================================
# Helper Functions
# ============================================================

function Setup-PATH {
    Write-Host ""
    Write-Host "Setting up PATH access..."
    Write-Host "-----------------------------------------------------------"

    $toolsDir = "C:\Tools\ProPresenterLyrics"

    # Create directory
    if (-not (Test-Path $toolsDir)) {
        New-Item -ItemType Directory -Path $toolsDir -Force | Out-Null
        Write-Host "✓ Created $toolsDir"
    }

    # Copy executable
    Copy-Item -Path $executable -Destination "$toolsDir\propresenter-lyrics.exe" -Force
    Write-Host "✓ Copied executable to $toolsDir"

    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")

    if ($currentPath -like "*$toolsDir*") {
        Write-Host "✓ Already in PATH"
    } else {
        $newPath = "$toolsDir;$currentPath"
        [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
        Write-Host "✓ Added to system PATH"
        Write-Host ""
        Write-Host "IMPORTANT: Restart any open Command Prompt or PowerShell windows"
        Write-Host "to use the new command."
    }
}

function Setup-Shortcut {
    Write-Host ""
    Write-Host "Setting up desktop shortcut..."
    Write-Host "-----------------------------------------------------------"

    $desktop = [Environment]::GetFolderPath([Environment+SpecialFolder]::Desktop)

    # Create batch file launcher
    $batchFile = Join-Path $desktop "ProPresenter Lyrics.bat"
    $batchContent = @"
@echo off
if ""%1""=="""" (
  "$executable" --help
) else (
  "$executable" %*
)
"@
    Set-Content -Path $batchFile -Value $batchContent -Force
    Write-Host "✓ Created launcher batch file"

    # Create shortcut using WScript
    $wshShell = New-Object -ComObject WScript.Shell
    $shortcut = $wshShell.CreateShortcut("$(Join-Path $desktop 'ProPresenter Lyrics.lnk')")
    $shortcut.TargetPath = $batchFile
    $shortcut.WorkingDirectory = $env:USERPROFILE
    $shortcut.Description = "ProPresenter Lyrics - Extract and export lyrics"
    $shortcut.Save()

    Write-Host "✓ Created shortcut on desktop"
}

function Setup-ProgramFiles {
    Write-Host ""
    Write-Host "Installing to Program Files..."
    Write-Host "-----------------------------------------------------------"

    $installDir = "C:\Program Files\ProPresenter Lyrics"

    # Create directory
    if (-not (Test-Path $installDir)) {
        New-Item -ItemType Directory -Path $installDir -Force | Out-Null
        Write-Host "✓ Created $installDir"
    }

    # Copy executable
    Copy-Item -Path $executable -Destination "$installDir\propresenter-lyrics.exe" -Force
    Write-Host "✓ Installed executable"

    # Add to PATH
    $currentPath = [Environment]::GetEnvironmentVariable("PATH", "Machine")

    if ($currentPath -like "*$installDir*") {
        Write-Host "✓ Already in PATH"
    } else {
        $newPath = "$installDir;$currentPath"
        [Environment]::SetEnvironmentVariable("PATH", $newPath, "Machine")
        Write-Host "✓ Added to system PATH"
    }
}

function Setup-Config {
    Write-Host ""
    Write-Host "Configuring Environment Variables..."
    Write-Host "-----------------------------------------------------------"
    Write-Host ""

    # ProPresenter Connection
    Write-Host "ProPresenter Connection Settings:"
    Write-Host "  (Find these in ProPresenter → Preferences → Network)"
    $ppHost = Read-Host "  Host (IP or hostname) [127.0.0.1]"
    if ([string]::IsNullOrEmpty($ppHost)) { $ppHost = "127.0.0.1" }

    $ppPort = Read-Host "  Port (usually 1025) [1025]"
    if ([string]::IsNullOrEmpty($ppPort)) { $ppPort = "1025" }

    # Library Filter
    Write-Host ""
    Write-Host "Library Filter:"
    Write-Host "  (Must match exact library name in ProPresenter)"
    $ppLibrary = Read-Host "  Library name [Worship]"
    if ([string]::IsNullOrEmpty($ppLibrary)) { $ppLibrary = "Worship" }

    # PowerPoint Styling
    Write-Host ""
    Write-Host "PowerPoint Styling:"
    $pptxFont = Read-Host "  Font face (e.g. Arial, Calibri, Red Hat Display) [Red Hat Display]"
    if ([string]::IsNullOrEmpty($pptxFont)) { $pptxFont = "Red Hat Display" }

    $pptxSize = Read-Host "  Font size in points (e.g. 40, 44, 48) [44]"
    if ([string]::IsNullOrEmpty($pptxSize)) { $pptxSize = "44" }

    $pptxTitleSize = Read-Host "  Title font size in points [54]"
    if ([string]::IsNullOrEmpty($pptxTitleSize)) { $pptxTitleSize = "54" }

    $pptxColor = Read-Host "  Text color in hex (e.g. 2d6a7a, FF0000) [2d6a7a]"
    if ([string]::IsNullOrEmpty($pptxColor)) { $pptxColor = "2d6a7a" }

    $pptxBold = Read-Host "  Bold text? (true/false) [true]"
    if ([string]::IsNullOrEmpty($pptxBold)) { $pptxBold = "true" }

    $pptxItalic = Read-Host "  Italic text? (true/false) [true]"
    if ([string]::IsNullOrEmpty($pptxItalic)) { $pptxItalic = "true" }

    Write-Host ""
    Write-Host "Setting environment variables..."

    # Set environment variables at user level
    [Environment]::SetEnvironmentVariable("PROPRESENTER_HOST", $ppHost, "User")
    [Environment]::SetEnvironmentVariable("PROPRESENTER_PORT", $ppPort, "User")
    [Environment]::SetEnvironmentVariable("PROPRESENTER_LIBRARY", $ppLibrary, "User")
    [Environment]::SetEnvironmentVariable("PPTX_FONT_FACE", $pptxFont, "User")
    [Environment]::SetEnvironmentVariable("PPTX_FONT_SIZE", $pptxSize, "User")
    [Environment]::SetEnvironmentVariable("PPTX_TITLE_FONT_SIZE", $pptxTitleSize, "User")
    [Environment]::SetEnvironmentVariable("PPTX_TEXT_COLOR", $pptxColor, "User")
    [Environment]::SetEnvironmentVariable("PPTX_FONT_BOLD", $pptxBold, "User")
    [Environment]::SetEnvironmentVariable("PPTX_FONT_ITALIC", $pptxItalic, "User")

    Write-Host "✓ Configuration saved"
    Write-Host ""
    Write-Host "IMPORTANT: Restart any open Command Prompt or PowerShell windows"
    Write-Host "to use the new environment variables."
}

# ============================================================
# Execute Setup
# ============================================================

switch ($choice) {
    "1" {
        Setup-PATH
    }
    "2" {
        Setup-Shortcut
    }
    "3" {
        Setup-ProgramFiles
    }
    "4" {
        Setup-PATH
        Setup-Shortcut
        Setup-ProgramFiles
    }
    "5" {
        Setup-Config
    }
    default {
        Write-Host "Invalid choice"
        exit 1
    }
}

# ============================================================
# Success Message
# ============================================================

Clear-Host
Write-Host ""
Write-Host "============================================================"
Write-Host "              Setup Complete! ✓"
Write-Host "============================================================"
Write-Host ""
Write-Host "Next steps:"
Write-Host "-----------------------------------------------------------"
Write-Host ""
Write-Host "1. Test the connection:"
Write-Host "   propresenter-lyrics status"
Write-Host ""
Write-Host "2. Configure connection (optional):"
Write-Host "   [Environment]::SetEnvironmentVariable('PROPRESENTER_HOST', '192.168.1.100', 'User')"
Write-Host "   [Environment]::SetEnvironmentVariable('PROPRESENTER_PORT', '1025', 'User')"
Write-Host ""
Write-Host "3. Configure library filter (optional):"
Write-Host "   [Environment]::SetEnvironmentVariable('PROPRESENTER_LIBRARY', 'Worship', 'User')"
Write-Host ""
Write-Host "4. Customize PowerPoint styling (optional):"
Write-Host "   [Environment]::SetEnvironmentVariable('PPTX_FONT_FACE', 'Calibri', 'User')"
Write-Host "   [Environment]::SetEnvironmentVariable('PPTX_FONT_SIZE', '40', 'User')"
Write-Host "   [Environment]::SetEnvironmentVariable('PPTX_TITLE_FONT_SIZE', '54', 'User')"
Write-Host "   [Environment]::SetEnvironmentVariable('PPTX_TEXT_COLOR', 'FF0000', 'User')"
Write-Host ""
Write-Host "5. Export your first playlist:"
Write-Host "   propresenter-lyrics pptx"
Write-Host ""
Write-Host "For help:"
Write-Host "   propresenter-lyrics --help"
Write-Host ""
Write-Host "Documentation:"
Write-Host "   - README.md - Full feature documentation"
Write-Host "   - QUICK_START.md - Platform-specific setup"
Write-Host "   - DISTRIBUTION.md - Installation guides"
Write-Host ""
Write-Host "Press any key to close..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
