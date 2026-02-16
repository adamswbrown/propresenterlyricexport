# ProPresenter Lyrics Export v3.0.0

**Three apps, one ecosystem** — everything you need to run ProPresenter lyrics for your church, from the production booth to every seat in the house and beyond.

---

## What's New in v3.0.0

This is a major release introducing two brand-new companion apps alongside the desktop app you already know.

---

### 🖥️ Desktop App — ProPresenter Lyrics v3.0.0

The desktop app continues to work exactly as before — export lyrics from ProPresenter playlists to PowerPoint, generate service playlists from PDFs, and manage your worship library from a polished Electron interface.

> No breaking changes. The major version bump reflects the addition of the Viewer and Web Proxy companion apps below.

**Existing features (unchanged):**
- Export lyrics to PowerPoint (PPTX), Text, or JSON
- Service Generator — automate Sunday service playlists from PDF service orders
- Song alias/override mapping for mismatched song names
- 25+ curated presentation fonts with one-click download
- Cross-library search and inline library matching
- ProPresenter auto-launch on connect

📖 **[User Guide](https://adamswbrown.github.io/propresenterlyricexport/user-guide)** · **[Service Generator Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/service-generator)**

---

### 📺 NEW: ProPresenter Viewer v1.0.0

**Let your congregation follow along on their own devices.**

A lightweight menu bar app (macOS) or system tray app (Windows) that streams live slide thumbnails and lyrics to any phone, tablet, or laptop on your Wi-Fi network. No app install needed for viewers — they just open a URL in their browser.

#### Key Features

| Feature | Details |
|---------|---------|
| **Real-time slides** | Slide thumbnails + lyrics text pushed to all devices via Server-Sent Events (SSE) |
| **Responsive design** | Optimized layouts for iPad, phones (portrait & landscape), and desktop browsers |
| **LIVE indicator** | Red badge with pulse animation when content is actively presented |
| **Fullscreen mode** | One-tap or double-tap the slide image for distraction-free viewing |
| **Smart reconnection** | SSE heartbeat every 15s, automatic reconnect on timeout (25s), page visibility detection auto-refreshes when returning from a locked screen |
| **Manual refresh** | Circular arrow button forces re-fetch of current slide + reconnects the event stream |
| **Disconnect detection** | Clears stale content immediately when ProPresenter is quit — no misleading "Connected" state |
| **Zero config for viewers** | Share a URL or QR code — anyone on the same Wi-Fi opens it in Safari/Chrome |

#### How It Works

```
ProPresenter 7        Viewer App (menu bar)        Congregation devices
┌─────────────┐      ┌─────────────────────┐      ┌──────────────────┐
│  Network API │─────>│  Polls PP every 1.5s │      │  Phone / iPad /  │
│  (port 1025) │      │  Serves web viewer   │─────>│  Laptop browser  │
└─────────────┘      │  on port 3100        │ SSE  │  at viewer URL   │
                     └─────────────────────┘      └──────────────────┘
```

#### Settings Window

- ProPresenter host/port configuration with **Test Connection** button
- Server port selection with auto-detected local IP
- Viewer URL with **Copy** and **Open** buttons
- Connection status with ProPresenter version display
- Activity log showing slide changes and connection events

#### Performance

The Viewer App has negligible impact on ProPresenter during services:
- **Polling**: ~10,800 small HTTP requests over 90 minutes — all to localhost with microsecond latency
- **Thumbnails**: One cached JPEG per slide change, proxied through the Viewer App
- **Memory**: ~100-150MB (Electron baseline)
- **CPU**: Near-zero between slide changes

📖 **[Full Viewer Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/viewer)** — Setup walkthrough, sharing tips, device states, troubleshooting, and FAQ

---

### 🌐 NEW: ProPresenter Web Proxy v1.0.0

**Access ProPresenter from anywhere — securely.**

A menu bar app that wraps the full ProPresenter Lyrics web server and Cloudflare Tunnel into a one-click experience. Sign in with Google, manage users, and use the full ProPresenter Lyrics interface from any browser — at home, at the office, or on the road.

#### Key Features

| Feature | Details |
|---------|---------|
| **Google OAuth** | Sign in with Google — only emails on your allowlist can access |
| **Cloudflare Tunnel** | Secure outbound-only tunnel — no port forwarding, no firewall changes, no exposed ports |
| **Full web UI** | React interface mirroring the desktop app: playlist browsing, PPTX export with progress streaming, Service Generator, font management |
| **User management** | Add/remove allowed emails, grant admin roles — from the web UI or CLI |
| **Bearer token auth** | Auto-generated token for API access, automation, and SSE fallback |
| **PPTX export streaming** | Real-time export progress via Server-Sent Events |
| **File-based sessions** | Sessions persist across server restarts (6-hour TTL, auto-pruned) |
| **Structured logging** | Daily JSON log files with automatic 14-day rotation |
| **Process management** | Manages web server + tunnel as child processes with auto-restart on crash (exponential backoff, max 5 retries) |
| **Tray controls** | Start/Stop server and tunnel independently from the menu bar context menu |

#### Architecture

```
User's browser  →  Cloudflare Tunnel  →  Web Proxy (your machine)  →  ProPresenter API
     HTTPS              encrypted               HTTP                    localhost
```

#### Settings Window

- ProPresenter connection (host/port) with **Test Connection**
- Google OAuth credentials (Client ID + Secret)
- Cloudflare Tunnel URL configuration
- Web server port selection
- Start/Stop controls for server and tunnel
- Bearer token display with one-click copy
- Health status: ProPresenter connection, web server, and tunnel
- Live activity log showing server events, tunnel status, and errors

#### Security

- **Three auth layers**: Google OAuth sessions → Bearer token fallback → Rate-limited login endpoint
- **End-to-end encryption**: Browser ↔ Cloudflare Edge ↔ encrypted tunnel ↔ localhost
- **httpOnly secure cookies** with `sameSite=lax` and 6-hour expiry
- **Content Security Policy** headers via Helmet
- All config stored locally at `~/.propresenter-words/` with restrictive permissions

📖 **[Web Proxy Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/proxy-app)** · **[Manual Setup Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/web-proxy-setup)** (Google OAuth, Cloudflare Tunnel, user management)

---

## Downloads

| App | macOS | Windows |
|-----|-------|---------|
| **ProPresenter Lyrics** v3.0.0 | `ProPresenter-Lyrics-3.0.0-mac.zip` | `ProPresenter-Lyrics-3.0.0-win.exe` |
| **ProPresenter Viewer** v1.0.0 | `ProPresenter-Viewer-1.0.0-mac.zip` | `ProPresenter-Viewer-1.0.0-win.exe` |
| **ProPresenter Web Proxy** v1.0.0 | `ProPresenter-WebProxy-1.0.0-mac.zip` | `ProPresenter-WebProxy-1.0.0-win.exe` |

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
| **Viewer** | Same as above + viewers need any modern browser on the same Wi-Fi |
| **Web Proxy** | Same as above + a Cloudflare account (free) and a domain for remote access |

---

## Documentation

Full documentation: **[adamswbrown.github.io/propresenterlyricexport](https://adamswbrown.github.io/propresenterlyricexport)**

| Guide | Description |
|-------|-------------|
| [Getting Started](https://adamswbrown.github.io/propresenterlyricexport/getting-started) | Install and connect in 5 minutes |
| [User Guide](https://adamswbrown.github.io/propresenterlyricexport/user-guide) | Desktop app and CLI workflows |
| [Viewer Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/viewer) | Live slides for congregation devices |
| [Web Proxy Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/proxy-app) | Secure remote access setup |
| [Web Proxy Setup (Manual)](https://adamswbrown.github.io/propresenterlyricexport/guides/web-proxy-setup) | Google OAuth + Cloudflare Tunnel CLI setup |
| [Service Generator](https://adamswbrown.github.io/propresenterlyricexport/guides/service-generator) | Automate playlists from PDF service orders |
| [PPTX Export](https://adamswbrown.github.io/propresenterlyricexport/guides/pptx-export) | Customize fonts, colors, and styling |
| [FAQ](https://adamswbrown.github.io/propresenterlyricexport/faq) | Common questions and troubleshooting |

---

**Full changelog:** [CHANGELOG.md](https://github.com/adamswbrown/propresenterlyricexport/blob/main/CHANGELOG.md)
