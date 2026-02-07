# FAQ & Troubleshooting

[← Back to Home](./index.md) | [Getting Started](./getting-started)

---

Common questions and solutions for ProPresenter Lyrics Export.

## Quick Navigation

- [ProPresenter Configuration](#start-here-did-you-configure-propresenter)
- [Connection Issues](#connection-issues)
- [Installation & Setup](#installation--setup)
- [Export & Features](#export--features)
- [Service Generator](#service-generator)
- [Performance](#performance)

## ⚠️ Start Here: Did You Configure ProPresenter?

**Q: The tool won't connect. What should I check first?**

**A:** 99% of connection issues are because ProPresenter's Network API isn't enabled. Before troubleshooting anything else:

1. Open ProPresenter 7
2. Go to **Preferences → Network**
3. Verify **"Enable Network API"** is checked
4. Verify the **Port** matches what you entered in the tool (default: 1025)
5. **Restart ProPresenter** after making changes

If the Network API wasn't enabled, enable it and restart ProPresenter. Then try connecting again.

See the [Getting Started guide](./getting-started#critical-configure-propresenter-first) for detailed setup instructions.

---

## Connection Issues

### "Connection refused" - What does this mean?

**Problem:** The app can't reach ProPresenter.

**Checklist:**
- [ ] ProPresenter is running on your computer
- [ ] Network API is enabled in ProPresenter (Preferences → Network)
- [ ] Host is correct (usually `127.0.0.1` for local machine)
- [ ] Port is correct (usually `1025`, check in ProPresenter settings)
- [ ] No firewall blocking the connection

**Fix:**
```bash
# Test connection
propresenter-lyrics status --host 127.0.0.1 --port 1025
```

---

### Remote computer shows "Connection timed out"

**Problem:** Can't connect to ProPresenter on a different computer.

**Checklist:**
- [ ] ProPresenter is running on the remote computer
- [ ] Remote IP address is correct (`ipconfig` on Windows, `ifconfig` on Mac)
- [ ] Network allows traffic on the ProPresenter port
- [ ] Remote computer's firewall allows incoming connections
- [ ] Both computers are on the same network

**Fix:**
```bash
# Find the remote computer's IP
# On ProPresenter computer:
ipconfig        # Windows
ifconfig        # macOS

# Then connect from another computer
propresenter-lyrics status --host 192.168.1.100 --port 1025
```

---

### "Network API disabled" error

**Problem:** ProPresenter is running but Network API is off.

**Fix:**
1. Open ProPresenter
2. Go to **Preferences** → **Network**
3. Check "Enable Network API"
4. Click Save
5. Restart ProPresenter
6. Try connecting again

---

## Installation Issues

### macOS: "App is damaged and can't be opened"

**Problem:** macOS Gatekeeper blocks the app.

**Fix:**
```bash
# Run this command in Terminal
xattr -cr "/path/to/ProPresenter Lyrics.app"

# Example:
xattr -cr "/Applications/ProPresenter Lyrics.app"
```

---

### Windows: "Windows protected your PC"

**Problem:** Windows SmartScreen blocks the installer.

**Fix:**
1. When the warning appears, click "More info"
2. Click "Run anyway"
3. Grant administrator permissions if prompted

---

### CLI: "Command not found"

**Problem:** Executable isn't in your PATH.

**Fix:**
```bash
# Use full path
/Users/adam/Downloads/propresenter-lyrics-macos-x64 status

# Or add to PATH
export PATH="/Users/adam/Downloads:$PATH"
propresenter-lyrics status

# On Windows
C:\Tools\propresenter-lyrics-win-x64.exe status
```

---

## Export Issues

### "No playlists found"

**Problem:** App shows empty playlist list after connecting.

**Solutions:**
1. You might not have any playlists - create one in ProPresenter
2. Try disconnecting and reconnecting
3. Verify you have permission to view playlists
4. Check library filter - might be filtering out all playlists

---

### PowerPoint file is blank or missing lyrics

**Problem:** Exported PPTX has no content.

**Solutions:**
1. Verify the playlist has presentations in it
2. Check library filter isn't hiding all songs
3. Try exporting a different playlist
4. Use the `--debug` flag to see what's happening

```bash
propresenter-lyrics pptx abc123 output --debug
```

---

### "Unknown font" in PowerPoint

**Problem:** Font isn't recognized when opening PPTX.

**Solutions:**
1. The font isn't installed on the computer opening the file
2. Use system fonts (Arial, Helvetica, Times New Roman) for compatibility
3. Or install the font on the destination computer

**How to fix:**
- Right-click the slide → "Edit Text"
- Change font to something installed on that computer
- Or install the missing font and reload

---

### PPTX file is huge (50MB+)

**Problem:** File size is much larger than expected.

**Solutions:**
1. Check logo image isn't oversized
2. Some fonts increase file size - use simpler fonts
3. Try with fewer slides
4. Compress the PPTX file (it's a ZIP archive)

---

### Can't open PPTX file

**Problem:** "Corrupted file" or won't open.

**Solutions:**
1. Try on a different computer
2. Use LibreOffice Impress (free) to open it
3. Re-export the playlist
4. Check disk space on export computer

---

## Feature Questions

### How do I export just one song?

**Not directly supported,** but you can:

1. **Create a temporary playlist** in ProPresenter
2. **Add just that song** to it
3. **Export the playlist**
4. **Delete the temporary playlist**

Or use the CLI to find the presentation UUID and export it individually.

---

### Can I export multiple playlists at once?

**Desktop App:** No - one playlist at a time.

**CLI:** Yes - use a script:

```bash
#!/bin/bash
for uuid in playlist1 playlist2 playlist3; do
  propresenter-lyrics pptx "$uuid" "output-$uuid"
done
```

---

### Can I edit the PPTX after export?

**Yes!** PPTX files are fully editable:

1. Open in PowerPoint, Google Slides, or LibreOffice Impress
2. Edit text, fonts, colors, layouts
3. Add or remove slides
4. Save your changes

This is useful for adding:
- Sermon titles
- Call-to-action slides
- Transition slides
- Additional graphics

---

### How do I update the lyrics?

**PPTX files are static,** so:

1. Edit the original presentation in ProPresenter
2. Export again to a new PPTX file
3. Or manually edit the PPTX in PowerPoint

---

## Service Generator Questions

### Which service order formats work?

**Tested and confirmed:**
- Planning Center service orders (PDF export)
- Proclaim order of worship (PDF export)
- ChurchPlanner service plans (PDF export)
- Any PDF with song titles and scripture references

**Unsupported:**
- Word documents, spreadsheets
- Web-based service planners (must export to PDF first)

---

### Songs aren't matching - what's wrong?

**Possible issues:**
1. Song titles in PDF don't exactly match your library
2. Song has multiple versions and it's picking the wrong one
3. Song isn't in your library at all

**Solutions:**
1. **Use Search Library** - Click "Search Library" in the match review to search all your ProPresenter libraries and pick the right song
2. **Create an alias** - If a song is consistently listed under a different name (e.g., "Be Thou My Vision" vs. "You Are My Vision"), click "Save as Alias" to remember the mapping permanently
3. Check spelling in Planning Center vs. your library
4. Add missing songs to your library via CCLI Song Select, then click "Rescan Libraries"

---

### How do song aliases work?

**Song aliases** let you permanently map an order-of-service song title to a specific ProPresenter presentation. They're useful when:

- The order of service uses a traditional name but you use a modern version
- A song has a different title in Planning Center vs. your library
- You consistently need to override the same song

**Create aliases in two ways:**
1. **Desktop App** - In Step 4 (Match Songs), select the correct song, then click "Save as Alias"
2. **CLI** - Run `propresenter-lyrics alias add "Song Title"` and search interactively

Aliases are stored at `~/.propresenter-words/aliases.json` and shared between both the Desktop App and CLI. They're checked before fuzzy matching with 100% confidence.

**Manage aliases:**
```bash
propresenter-lyrics alias list       # See all aliases
propresenter-lyrics alias remove "Song Title"  # Remove one
```

---

### Bible verses won't match

**Problem:** Verses show "No match" even though you have them.

**Solutions:**
1. Check verse format (should be "John 3:16" style)
2. Bible verses might be in different library than Service Content
3. Different Bible translations are separate presentations
4. Check verse actually exists in your library

**Fallback:** Use "Open Bible Gateway" to create the presentation manually.

---

### Can I re-run Service Generator on same PDF?

**Yes!** You can:
1. Update your library (add missing songs)
2. Re-run Service Generator on the same PDF
3. It will find better matches this time

Useful for:
- Adding songs you missed the first time
- Correcting matches
- Practicing before Sunday

---

### What if a song/verse truly isn't in my library?

**Options:**
1. **Skip it** - Mark as manual, add manually to playlist later
2. **Create it** - Add the song/verse to your library, then re-run
3. **Similar match** - Use the closest match you have
4. **Leave blank** - Let the pastor ad-lib or use backup

---

## Performance Questions

### Why is it slow?

**Common reasons:**
1. Network lag - Remote connection takes 5-10 seconds per request
2. Large playlists - Hundreds of songs take longer to export
3. Slow network - Check your network speed

**Tips to speed up:**
1. Use local ProPresenter connection if possible
2. Export smaller playlists
3. Close other apps using the network
4. Use the CLI (slightly faster than desktop app)

---

### Why does it timeout occasionally?

**Reasons:**
1. Network connectivity issue
2. ProPresenter API is busy
3. Too many concurrent requests

**Solution:**
- Wait a few seconds and try again
- Retry is built in automatically

---

## Compatibility Questions

### What versions of ProPresenter are supported?

**Required:** ProPresenter 7.x

**Not supported:**
- ProPresenter 6 (older API)
- ProPresenter 5 or earlier

---

### macOS version requirements?

**Desktop App:** macOS 10.14+

**CLI:** macOS 10.12+

---

### Windows version requirements?

**Desktop App:** Windows 10 or later

**CLI:** Windows 7 or later

---

### Can I use it on Linux?

**Desktop App:** No - Electron app for macOS/Windows only

**CLI:** Technically possible - would need to compile from source

If needed, open an [issue on GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues) to discuss.

---

## Still Need Help?

- 📖 **User Guide** - [Full documentation](./user-guide.md)
- 🔧 **Service Generator** - [Step-by-step guide](./guides/service-generator.md)
- 💻 **CLI Commands** - [Command reference](./guides/cli-guide.md)
- 🎨 **PPTX Styling** - [Customization guide](./guides/pptx-export.md)
- 📝 **Getting Started** - [Installation & setup](./getting-started.md)

**Still stuck?**
- Open an [issue on GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues)
- Include what you tried and what happened
- Mention your OS, ProPresenter version, and app version
