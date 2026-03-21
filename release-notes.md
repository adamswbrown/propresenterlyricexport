# ProPresenter Lyrics Export v3.3.1

**Bug fix release** — Fixes a playlist deserialization error when building service playlists.

---

## What's Fixed in v3.3.1

### Playlist Build Error Resolved

Fixed a `400 Json deserialize error: missing field 'target_uuid'` error that occurred when using the Service Generator to build playlists. ProPresenter's API requires a `target_uuid` field on every playlist item during PUT requests — this field was being stripped during the item cleaning step and was missing from newly created items.

**Affected workflows:**
- Service Generator → Build Playlist (Desktop App)
- Service Generator → Build Playlist (Web Proxy)
- Create Playlist from Template (CLI / API)

---

## Downloads

| App | macOS | Windows |
|-----|-------|---------|
| **ProPresenter Lyrics** v3.3.1 | `ProPresenter-Lyrics-3.3.1-mac.zip` | `ProPresenter-Lyrics-3.3.1-win.exe` |
| **ProPresenter Viewer** v1.0.0 | `ProPresenter-Viewer-1.0.0-mac.zip` | `ProPresenter-Viewer-1.0.0-win.exe` |
| **ProPresenter Web Proxy** v1.1.0 | `ProPresenter-WebProxy-1.1.0-mac.zip` | `ProPresenter-WebProxy-1.1.0-win.exe` |

### macOS First Launch

macOS may block unsigned apps on first run. Run this once after extracting:

```bash
xattr -cr "/Applications/ProPresenter Lyrics.app"
xattr -cr "/Applications/ProPresenter Viewer.app"
xattr -cr "/Applications/ProPresenter Web Proxy.app"
```

---

## Requirements

| Component | Requirement |
|-----------|-------------|
| **ProPresenter** | Version 7 with Network API enabled ([setup instructions](https://adamswbrown.github.io/propresenterlyricexport/getting-started#critical-configure-propresenter-first)) |
| **Desktop App** | macOS 10.14+ or Windows 10+ |

---

## Documentation

Full documentation: **[adamswbrown.github.io/propresenterlyricexport](https://adamswbrown.github.io/propresenterlyricexport)**

---

**Full changelog:** [CHANGELOG.md](https://github.com/adamswbrown/propresenterlyricexport/blob/main/CHANGELOG.md)
