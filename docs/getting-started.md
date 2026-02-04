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

<div class="tabs">
  <div class="tab-buttons">
    <input type="radio" name="install-tabs" id="tab-desktop" checked>
    <label for="tab-desktop">🖥️ Desktop App (Recommended)</label>
    <input type="radio" name="install-tabs" id="tab-cli">
    <label for="tab-cli">💻 CLI Executables</label>
  </div>
  
  <div class="tab-contents">
    <div id="content-desktop" class="tab-content">
      <p>The easiest way to get started with a full graphical interface.</p>
      
      <h4>Download</h4>
      <ul>
        <li>Go to <a href="https://github.com/adamswbrown/propresenterlyricexport/releases">GitHub Releases</a></li>
        <li>Download the latest version for your platform:
          <ul>
            <li><strong>macOS</strong>: <code>ProPresenter-Lyrics-vX.Y.Z-mac.zip</code></li>
            <li><strong>Windows</strong>: <code>ProPresenter-Lyrics-vX.Y.Z-win.exe</code></li>
          </ul>
        </li>
      </ul>
      
      <h4>Install & Launch</h4>
      
      <div class="tabs">
        <div class="tab-buttons">
          <input type="radio" name="desktop-platform" id="tab-macos" checked>
          <label for="tab-macos">macOS</label>
          <input type="radio" name="desktop-platform" id="tab-windows">
          <label for="tab-windows">Windows</label>
        </div>
        
        <div class="tab-contents">
          <div id="content-macos" class="tab-content">
            <pre><code># 1. Unzip the downloaded file
unzip ProPresenter-Lyrics-vX.Y.Z-mac.zip

# 2. Fix Gatekeeper (one-time)
xattr -cr "/path/to/ProPresenter Lyrics.app"

# 3. Move to Applications
mv ProPresenter\ Lyrics.app /Applications/

# 4. Launch the app
open /Applications/ProPresenter\ Lyrics.app</code></pre>
          </div>
          
          <div id="content-windows" class="tab-content">
            <ol>
              <li>Run the installer (<code>.exe</code>)</li>
              <li>Follow the installation wizard</li>
              <li>Launch "ProPresenter Lyrics" from your Start menu</li>
            </ol>
          </div>
        </div>
      </div>
      
      <h4>First Run</h4>
      <ol>
        <li>Open the app</li>
        <li>Enter your ProPresenter <strong>host</strong> and <strong>port</strong></li>
        <li>Click <strong>"Connect & Load Playlists"</strong></li>
        <li>Browse your playlists and export!</li>
      </ol>
    </div>
    
    <div id="content-cli" class="tab-content">
      <p>Lightweight standalone binaries for power users and automation.</p>
      
      <h4>Download</h4>
      <ul>
        <li>Go to <a href="https://github.com/adamswbrown/propresenterlyricexport/releases">GitHub Releases</a></li>
        <li>Download for your platform:
          <ul>
            <li><strong>macOS (Intel)</strong>: <code>propresenter-lyrics-macos-x64</code></li>
            <li><strong>macOS (Apple Silicon)</strong>: <code>propresenter-lyrics-macos-arm64</code></li>
            <li><strong>Windows</strong>: <code>propresenter-lyrics-win-x64.exe</code></li>
          </ul>
        </li>
      </ul>
      
      <h4>Setup</h4>
      
      <p><strong>macOS:</strong></p>
      <pre><code># Make executable
chmod +x propresenter-lyrics-macos-x64

# Test connection
./propresenter-lyrics-macos-x64 status</code></pre>
      
      <p><strong>Windows:</strong></p>
      <pre><code># Test connection
propresenter-lyrics-win-x64.exe status</code></pre>
      
      <h4>Environment Variables (Optional)</h4>
      <p>Set these to avoid typing host/port every time:</p>
      
      <pre><code># macOS/Linux
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025

# Windows (PowerShell)
$env:PROPRESENTER_HOST='192.168.1.100'
$env:PROPRESENTER_PORT='1025'</code></pre>
    </div>
  </div>
</div>

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
