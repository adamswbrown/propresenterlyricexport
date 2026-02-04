# Getting Started

Get ProPresenter Lyrics Export up and running in just a few minutes.

---

## ⚠️ CRITICAL: Configure ProPresenter First

**Before installing or using this tool, you MUST configure ProPresenter correctly. Nothing will work without this step.**

### Enable Network API in ProPresenter

1. Open **ProPresenter 7**
2. Go to **Preferences** (or **ProPresenter** → **Preferences** on macOS)
3. Click the **Network** tab
4. Check the box: **"Enable Network API"**
5. Note the **Port** number (default: `1025`)
6. If connecting from another computer, note the **IP address** displayed
7. Click **OK** or **Save**
8. **Restart ProPresenter** for changes to take effect

**Why this matters:** ProPresenter's Network API is how this tool communicates with ProPresenter. Without it enabled, the tool cannot connect, read playlists, or export lyrics.

**Connection details you'll need:**
- **Host**: `127.0.0.1` (same computer) or the IP address shown in ProPresenter (remote computer)
- **Port**: `1025` (default) or whatever port is shown in ProPresenter's Network settings

---

## Installation

Choose your preferred method below.

---

### 🖥️ Desktop App (Recommended)

The easiest way to get started with a full graphical interface.

**Download:**
- Go to [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases)
- Download the latest version for your platform:
  - **macOS**: `ProPresenter-Lyrics-vX.Y.Z-mac.zip`
  - **Windows**: `ProPresenter-Lyrics-vX.Y.Z-win.exe`

**Install & Launch:**

<details>
<summary><strong>📱 macOS Installation</strong></summary>

```bash
# 1. Unzip the downloaded file
unzip ProPresenter-Lyrics-vX.Y.Z-mac.zip

# 2. Fix Gatekeeper (one-time)
xattr -cr "/path/to/ProPresenter Lyrics.app"

# 3. Move to Applications
mv ProPresenter\ Lyrics.app /Applications/

# 4. Launch the app
open /Applications/ProPresenter\ Lyrics.app
```
</details>

<details>
<summary><strong>🪟 Windows Installation</strong></summary>

1. Run the installer (`.exe`)
2. Follow the installation wizard
3. Launch "ProPresenter Lyrics" from your Start menu
</details>

**First Run:**
1. Open the app
2. Enter your ProPresenter **host** and **port**
3. Click **"Connect & Load Playlists"**
4. Browse your playlists and export!

---

### 💻 CLI Executables (Advanced Users)

Lightweight standalone binaries for power users and automation.

**Download:**
- Go to [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases)
- Download for your platform:
  - **macOS (Intel)**: `propresenter-lyrics-macos-x64`
  - **macOS (Apple Silicon)**: `propresenter-lyrics-macos-arm64`
  - **Windows**: `propresenter-lyrics-win-x64.exe`

**Setup:**

**macOS:**
```bash
# Make executable
chmod +x propresenter-lyrics-macos-x64

# Test connection
./propresenter-lyrics-macos-x64 status
```

**Windows:**
```bash
# Test connection
propresenter-lyrics-win-x64.exe status
```

**Environment Variables (Optional):**
```bash
# macOS/Linux
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025

# Windows (PowerShell)
$env:PROPRESENTER_HOST='192.168.1.100'
$env:PROPRESENTER_PORT='1025'
```

## Next Steps

### Start Exporting Lyrics

- **Desktop App Users**: See the [User Guide](./user-guide) for how to export lyrics to PowerPoint
- **CLI Users**: See the [CLI Guide](./guides/cli-guide) for command reference
- **Customize your exports**: Check the [PPTX Export Guide](./guides/pptx-export) for styling options

### Advanced Features (Optional)

- **Service Generator**: Check out the [Service Generator Guide](./guides/service-generator) to automate service playlists from PDFs

### Need Help?

- **Having issues?**: Check the [FAQ](./faq) for troubleshooting

## Troubleshooting Setup

**Connection refused?**
- Make sure ProPresenter is running
- Check that Network API is enabled (Preferences → Network)
- Verify the host and port are correct
- If running remotely, ensure the network allows connections to port 1025

**App won't launch?**
- **macOS**: Try the Gatekeeper fix: `xattr -cr "/path/to/ProPresenter Lyrics.app"`
- **Windows**: Ensure you have administrator rights to install

**Still stuck?**
- Check the [FAQ](./faq#troubleshooting) for more detailed solutions
- Open an [issue on GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues)
