@echo off
setlocal enabledelayedexpansion

REM ProPresenter Lyrics - Windows Setup Script
REM This script sets up easy access to ProPresenter Lyrics

cls
echo.
echo ============================================================
echo   ProPresenter Lyrics - Windows Setup
echo ============================================================
echo.

REM Check for administrator privileges
net session >nul 2>&1
if %errorLevel% neq 0 (
    echo.
    echo ERROR: This script requires Administrator privileges
    echo.
    echo Please run as Administrator:
    echo   1. Right-click Command Prompt
    echo   2. Select "Run as administrator"
    echo   3. Run: setup-windows.bat
    echo.
    pause
    exit /b 1
)

REM Get script directory
set SCRIPT_DIR=%~dp0..
set SCRIPT_DIR=%SCRIPT_DIR:\=/%

REM Check for executable
if exist "%SCRIPT_DIR%\executables\propresenter-lyrics-win-x64.exe" (
    set EXECUTABLE=%SCRIPT_DIR%\executables\propresenter-lyrics-win-x64.exe
    echo ✓ Found Windows executable
    set SETUP_TYPE=exe
) else (
    echo.
    echo ERROR: propresenter-lyrics-win-x64.exe not found
    echo.
    echo Please ensure you have:
    echo   1. Downloaded the executables folder, OR
    echo   2. Built the project with: npm run build:exe
    echo.
    pause
    exit /b 1
)

echo.
echo Setup Options:
echo -----------------------------------------------------------
echo.
echo 1. Add to PATH (recommended)
echo    - Makes command available from any terminal
echo    - Type: propresenter-lyrics [command]
echo.
echo 2. Create desktop shortcut
echo    - Quick launch from desktop
echo.
echo 3. Copy to Program Files
echo    - Professional installation
echo    - Requires Administrator
echo.
echo 4. All of the above
echo    - Complete setup
echo.
set /p CHOICE="Choose setup type (1/2/3/4) [default: 1]: "
if "!CHOICE!"=="" set CHOICE=1

goto CHOICE_!CHOICE!

REM ============================================================
REM Setup PATH
REM ============================================================
:CHOICE_1
:PATH_SETUP
echo.
echo Setting up PATH access...
echo -----------------------------------------------------------

REM Create tools directory
set TOOLS_DIR=C:\Tools\ProPresenterLyrics
if not exist "!TOOLS_DIR!" mkdir "!TOOLS_DIR!"
echo ✓ Created !TOOLS_DIR!

REM Copy executable
copy /Y "!EXECUTABLE!" "!TOOLS_DIR!\propresenter-lyrics.exe" >nul
echo ✓ Copied executable to !TOOLS_DIR!

REM Add to PATH
for /f "tokens=2*" %%a in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set CURRENT_PATH=%%b

echo !CURRENT_PATH! | findstr /i "!TOOLS_DIR!" >nul
if errorlevel 1 (
    setx PATH "!TOOLS_DIR!;!CURRENT_PATH!" /M
    echo ✓ Added to system PATH
    echo.
    echo IMPORTANT: Restart any open Command Prompt or PowerShell windows
    echo to use the new command.
) else (
    echo ✓ Already in PATH
)

if "!CHOICE!"=="1" goto SUCCESS
goto CHOICE_2

REM ============================================================
REM Create Desktop Shortcut
REM ============================================================
:CHOICE_2
:SHORTCUT_SETUP
if "!CHOICE!"=="2" goto SHORTCUT_ONLY
echo.
echo Setting up desktop shortcut...
echo -----------------------------------------------------------

set DESKTOP=%USERPROFILE%\Desktop

REM Create batch file launcher
(
    echo @echo off
    echo if "%%1"=="" (
    echo   propresenter-lyrics --help
    echo ) else (
    echo   propresenter-lyrics %%*
    echo )
) > "%DESKTOP%\ProPresenter Lyrics.bat"

echo ✓ Created launcher batch file on desktop

REM Create shortcut using VBScript
set VBSCRIPT=%TEMP%\create-shortcut.vbs
(
    echo Set oWS = WScript.CreateObject("WScript.Shell"^)
    echo sLinkFile = "%DESKTOP%\ProPresenter Lyrics.lnk"
    echo Set oLink = oWS.CreateShortcut(sLinkFile^)
    echo oLink.TargetPath = "%DESKTOP%\ProPresenter Lyrics.bat"
    echo oLink.WorkingDirectory = "%USERPROFILE%"
    echo oLink.Description = "ProPresenter Lyrics - Extract and export lyrics"
    echo oLink.Save
) > "%VBSCRIPT%"

cscript "%VBSCRIPT%" //nologo
del "%VBSCRIPT%"

echo ✓ Created shortcut on desktop

if "!CHOICE!"=="2" goto SUCCESS
if "!CHOICE!"=="3" goto CHOICE_3_ONLY
goto CHOICE_3

REM ============================================================
REM Install to Program Files
REM ============================================================
:CHOICE_3_ONLY
:CHOICE_3
echo.
echo Installing to Program Files...
echo -----------------------------------------------------------

set INSTALL_DIR=C:\Program Files\ProPresenter Lyrics
if not exist "!INSTALL_DIR!" mkdir "!INSTALL_DIR!"
echo ✓ Created !INSTALL_DIR!

copy /Y "!EXECUTABLE!" "!INSTALL_DIR!\propresenter-lyrics.exe" >nul
echo ✓ Installed executable

REM Add to PATH if not already there
for /f "tokens=2*" %%a in ('reg query "HKLM\System\CurrentControlSet\Control\Session Manager\Environment" /v PATH') do set CURRENT_PATH=%%b

echo !CURRENT_PATH! | findstr /i "!INSTALL_DIR!" >nul
if errorlevel 1 (
    setx PATH "!INSTALL_DIR!;!CURRENT_PATH!" /M
    echo ✓ Added to system PATH
) else (
    echo ✓ Already in PATH
)

if "!CHOICE!"=="3" goto SUCCESS
goto SUCCESS

REM ============================================================
REM Shortcut only
REM ============================================================
:SHORTCUT_ONLY
echo.
echo Setting up desktop shortcut...
echo -----------------------------------------------------------

set DESKTOP=%USERPROFILE%\Desktop

REM Create batch file launcher
(
    echo @echo off
    echo "!EXECUTABLE!" %%*
) > "%DESKTOP%\ProPresenter Lyrics.bat"

echo ✓ Created launcher on desktop

set VBSCRIPT=%TEMP%\create-shortcut.vbs
(
    echo Set oWS = WScript.CreateObject("WScript.Shell"^)
    echo sLinkFile = "%DESKTOP%\ProPresenter Lyrics.lnk"
    echo Set oLink = oWS.CreateShortcut(sLinkFile^)
    echo oLink.TargetPath = "%DESKTOP%\ProPresenter Lyrics.bat"
    echo oLink.WorkingDirectory = "%USERPROFILE%"
    echo oLink.Description = "ProPresenter Lyrics - Extract and export lyrics"
    echo oLink.Save
) > "%VBSCRIPT%"

cscript "%VBSCRIPT%" //nologo
del "%VBSCRIPT%"

echo ✓ Created shortcut on desktop

goto SUCCESS

REM ============================================================
REM Success Message
REM ============================================================
:SUCCESS
cls
echo.
echo ============================================================
echo              Setup Complete! ✓
echo ============================================================
echo.
echo Next steps:
echo -----------------------------------------------------------
echo.
echo 1. Test the connection:
echo    propresenter-lyrics status
echo.
echo 2. Configure connection (optional):
echo    setx PROPRESENTER_HOST 192.168.1.100
echo    setx PROPRESENTER_PORT 1025
echo.
echo 3. Export your first playlist:
echo    propresenter-lyrics pptx
echo.
echo For help:
echo    propresenter-lyrics --help
echo.
echo Documentation:
echo    - README.md - Full feature documentation
echo    - QUICK_START.md - Platform-specific setup
echo    - DISTRIBUTION.md - Installation guides
echo.
pause
exit /b 0

REM Invalid choice
:CHOICE_4
echo.
echo Running all setup options...
echo.
goto PATH_SETUP
