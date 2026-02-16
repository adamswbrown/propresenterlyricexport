# Web Proxy App Guide

[← Back to Home](../index.md) | [Web Proxy Setup (Manual)](./web-proxy-setup)

---

Access ProPresenter Lyrics Export from anywhere in the world through a secure web interface. The **Web Proxy App** is a macOS menu bar application that manages everything for you — no terminal required.

## Table of Contents

1. [What is the Web Proxy App?](#what-is-the-web-proxy-app)
2. [How It Works](#how-it-works)
3. [Prerequisites](#prerequisites)
4. [Installation](#installation)
5. [First Run Setup](#first-run-setup)
6. [Using the App](#using-the-app)
7. [Setting Up Google OAuth](#setting-up-google-oauth)
8. [Setting Up Cloudflare Tunnel](#setting-up-cloudflare-tunnel)
9. [Adding Users](#adding-users)
10. [Bearer Token (API Access)](#bearer-token-api-access)
11. [Troubleshooting](#troubleshooting)
12. [Common Issues](#common-issues)
13. [Files & Data Locations](#files--data-locations)
14. [Security Overview](#security-overview)
15. [Manual Setup (Alternative)](#manual-setup-alternative)

---

## What is the Web Proxy App?

The Web Proxy App is a **macOS menu bar application** that turns your ProPresenter machine into a secure web server. Remote users can then access ProPresenter Lyrics Export through any web browser — from their phone, tablet, or another computer — even outside your local network.

**Use cases:**

- Worship leaders preparing setlists from home
- Volunteers building service playlists remotely
- Tech teams exporting lyrics from a different room
- Multi-campus churches sharing a single ProPresenter installation

**What it manages for you:**

- **Web server** — runs the ProPresenter web proxy on your machine
- **Cloudflare Tunnel** — securely exposes the web server to the internet (no port-forwarding needed)
- **Status monitoring** — shows ProPresenter connection, server, and tunnel status at a glance

**Compared to the manual setup:** The [Web Proxy Setup Guide](./web-proxy-setup) covers how to run the web server and tunnel from the terminal with environment variables. The Proxy App wraps all of that into a GUI — same functionality, zero terminal usage.

---

## How It Works

```
Remote browser                              Your Mac (running ProPresenter)
    │                                              │
    │  HTTPS request                               │
    ▼                                              │
Cloudflare Edge ──encrypted tunnel──▶ cloudflared ──▶ Web Proxy Server ──▶ ProPresenter API
                                        (port 3100)      (port 1025)
```

1. The **Web Proxy App** sits in your menu bar and manages two processes:
   - `pp-web-server` — the Express web server that serves the React UI and proxies ProPresenter's API
   - `cloudflared` — the Cloudflare Tunnel client that creates a secure outbound connection

2. Remote users visit your tunnel URL (e.g., `https://pp.yourchurch.com`) and sign in with Google

3. The web server authenticates them, then proxies requests to ProPresenter running on the same machine

4. All traffic is encrypted end-to-end by Cloudflare — no certificates to manage, no ports to open

---

## Prerequisites

Before installing the Proxy App, make sure you have:

| Requirement | Details |
|-------------|---------|
| **ProPresenter 7** | Running on the same Mac, with Network API enabled ([how to enable](../getting-started#critical-configure-propresenter-first)) |
| **cloudflared** | Cloudflare's tunnel client. Install with: `brew install cloudflared` |
| **A Cloudflare domain** | A domain managed by Cloudflare (free plan works). Needed for the tunnel. |
| **Google Cloud project** | For Google OAuth sign-in (free). See [Setting Up Google OAuth](#setting-up-google-oauth). |

**Don't have a domain or Google Cloud project yet?** You can still test locally — the app works on your local network without a tunnel. Set up the tunnel and OAuth later when you're ready for remote access.

---

## Installation

### Download

Download the latest **ProPresenter Web Proxy** from [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases):

- **macOS**: `ProPresenter-WebProxy-vX.Y.Z-mac.zip`

### Install on macOS

```bash
# 1. Unzip the downloaded file
unzip ProPresenter-WebProxy-vX.Y.Z-mac.zip

# 2. Fix Gatekeeper (one-time, required for unsigned apps)
xattr -cr "ProPresenter Web Proxy.app"

# 3. Move to Applications
mv "ProPresenter Web Proxy.app" /Applications/

# 4. Launch
open "/Applications/ProPresenter Web Proxy.app"
```

The app appears as a **broadcast icon in your menu bar** (top-right of the screen). There's no dock icon — this is intentional, as the app is designed to run quietly in the background.

### Start on Login (Recommended)

To have the proxy app start automatically when you log in:

1. Open **System Settings** → **General** → **Login Items**
2. Click **+** and select **ProPresenter Web Proxy** from Applications
3. The app will launch automatically on every login

---

## First Run Setup

When you first launch the app, click the **broadcast icon** in the menu bar and select **Settings...** to open the configuration window.

### 1. ProPresenter Connection

| Setting | Value | Notes |
|---------|-------|-------|
| **Host** | `127.0.0.1` | Use this if ProPresenter is on the same machine |
| **Port** | `1025` | Default ProPresenter Network API port |

> **Important:** Use `127.0.0.1`, not `localhost`. The web server uses IPv4 internally, and `localhost` may resolve to IPv6 (`::1`) which ProPresenter doesn't listen on.

### 2. Web Server

| Setting | Default | Notes |
|---------|---------|-------|
| **Port** | `3100` | The port the web server listens on locally |

### 3. Cloudflare Tunnel (Optional)

| Setting | Example | Notes |
|---------|---------|-------|
| **Tunnel URL** | `https://pp.yourchurch.com` | Your tunnel's public hostname. Leave blank if not using a tunnel. |

### 4. Google OAuth (Optional)

| Setting | Value |
|---------|-------|
| **Google Client ID** | From Google Cloud Console (see [Setting Up Google OAuth](#setting-up-google-oauth)) |
| **Google Client Secret** | From Google Cloud Console |

### 5. Auto-Start

Check **Auto-start server on launch** to have the web server begin immediately when the app opens. Recommended for production use.

### 6. Save & Start

Click **Save**, then use the **Start Server** button (or the tray menu) to launch the web server. If you've configured a tunnel URL, also click **Start Tunnel**.

---

## Using the App

### Tray Menu

Click the broadcast icon in the menu bar to see:

```
ProPresenter: Connected (ProPresenter 21.2)
──────────────────────────────────────
Web Server: Running (:3100)
Tunnel: Connected
──────────────────────────────────────
Open Web UI          (opens browser)
Copy Web URL         (copies to clipboard)
──────────────────────────────────────
Start / Stop Server
Start / Stop Tunnel
──────────────────────────────────────
Settings...
Quit
```

### Status Indicators

The tray menu shows real-time status for three components:

| Component | Green | Yellow | Red |
|-----------|-------|--------|-----|
| **ProPresenter** | Connected (shows version) | — | Not running / not detected |
| **Web Server** | Running (shows port) | Starting... | Stopped |
| **Tunnel** | Connected | Starting... | Disconnected / Not configured |

These same indicators appear as colored dots in the Settings window for quick reference.

### Opening the Web UI

Click **Open Web UI** in the tray menu to open the web interface in your default browser. The URL depends on your setup:

- **With tunnel**: Opens your tunnel URL (e.g., `https://pp.yourchurch.com`)
- **Without tunnel**: Opens `http://localhost:3100`

### Viewing Logs

The Settings window includes a **Logs** section at the bottom. This shows the last 50 log entries from the web server, color-coded by level:

- **White** — Info messages (requests, connections)
- **Yellow** — Warnings
- **Red** — Errors

Logs auto-scroll as new entries arrive. This is useful for debugging connection issues or monitoring who's accessing the web interface.

---

## Setting Up Google OAuth

Google OAuth lets your remote users sign in with their Google account. Only email addresses you approve can access the app.

### Step 1: Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click the project selector (top navigation) → **New Project**
3. Name it (e.g., "ProPresenter Web") → **Create**
4. Select the new project from the dropdown

### Step 2: Configure OAuth Consent Screen

1. Navigate to **Google Auth Platform** → **Overview** → **Get Started**
2. Set **User type**:
   - **Internal** — if all users are on the same Google Workspace domain (simplest)
   - **External** — if users have personal Gmail accounts
3. Fill in:
   - **App name**: ProPresenter Web
   - **User support email**: Your email
   - **Developer contact email**: Your email
4. **Save and Continue**

### Step 3: Add Scopes

1. Click **Add or Remove Scopes**
2. Add: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`
3. **Update** → **Save and Continue**

These are non-sensitive scopes — no Google verification required.

### Step 4: Create OAuth Credentials

1. Navigate to **Google Auth Platform** → **Clients** → **Create Client**
2. **Application type**: Web application
3. **Name**: ProPresenter Web Client
4. **Authorized redirect URIs**: Add:
   ```
   https://pp.yourchurch.com/auth/google/callback
   ```
   Replace with your actual tunnel hostname.
5. Click **Create**

### Step 5: Copy Credentials

Copy the **Client ID** and **Client Secret** immediately — the secret is only shown once.

Enter both values in the Proxy App settings window under **Google OAuth**.

### Testing vs Production Mode

For a self-hosted app using only `openid`, `email`, and `profile` scopes:
- **Testing mode** works fine — no token expiry, no warnings
- **Publishing** is optional and doesn't require verification for these scopes

---

## Setting Up Cloudflare Tunnel

A Cloudflare Tunnel creates a secure outbound connection from your Mac to Cloudflare's edge network. No port-forwarding, no firewall changes, no TLS certificates to manage.

### Step 1: Install cloudflared

```bash
brew install cloudflared
```

Verify:
```bash
cloudflared --version
```

### Step 2: Authenticate

```bash
cloudflared tunnel login
```

This opens your browser. Select the Cloudflare zone (domain) to authorize.

### Step 3: Create a Named Tunnel

```bash
cloudflared tunnel create propresenter-web
```

Note the **tunnel UUID** printed (e.g., `6ff42ae2-765d-4adf-8112-31c55c1551ef`).

### Step 4: Route DNS

```bash
cloudflared tunnel route dns propresenter-web pp.yourchurch.com
```

Replace `pp.yourchurch.com` with your desired hostname. This creates a CNAME record in Cloudflare DNS.

### Step 5: Create Config File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /Users/<YOUR-USERNAME>/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: pp.yourchurch.com
    service: http://localhost:3100
  - service: http_status:404
```

Replace `<TUNNEL-UUID>` and `<YOUR-USERNAME>` with your actual values.

### Step 6: Validate

```bash
cloudflared tunnel ingress validate
```

### Step 7: Configure in Proxy App

Enter your tunnel URL (e.g., `https://pp.yourchurch.com`) in the Proxy App settings. Make sure there is **no trailing slash**.

Now you can start the tunnel from the tray menu — no need to run `cloudflared` manually.

---

## Adding Users

Only email addresses in the allowlist can sign in via Google OAuth.

### From the Terminal

```bash
# Add yourself as admin (first user)
npm start -- users add you@gmail.com --admin

# Add other users
npm start -- users add colleague@gmail.com

# List all users
npm start -- users list

# Remove a user
npm start -- users remove old-user@gmail.com
```

### From the Web UI

Once signed in as an admin, click the **Users** button in the web interface to manage the allowlist.

### User Roles

| Role | Can do |
|------|--------|
| **User** | Access all features: export lyrics, build playlists, use Service Generator |
| **Admin** | Everything a user can do, plus manage the user allowlist |

The first user added with `--admin` becomes the initial administrator.

---

## Bearer Token (API Access)

The web server generates a **bearer token** for API access without Google sign-in. This is useful for:

- **SSE connections** (EventSource can't send session cookies)
- **Programmatic access** from scripts or integrations
- **Quick testing** when you don't want to set up Google OAuth

### Finding Your Token

1. Click the broadcast icon → **Settings...**
2. The token is displayed in the **API Token** section
3. Click **Copy** to copy it to your clipboard

### Using the Token

Paste the token on the login page when prompted, or include it in API requests:

```bash
# As a header
curl -H "Authorization: Bearer YOUR_TOKEN" https://pp.yourchurch.com/api/status

# As a query parameter (for SSE)
curl "https://pp.yourchurch.com/api/export/JOB_ID/progress?token=YOUR_TOKEN"
```

### Token Storage

The token is auto-generated on first server start and stored in `~/.propresenter-words/web-auth.json` (file permissions: 600). It persists across restarts.

---

## Troubleshooting

### Server Won't Start

**Symptoms:** Server status shows "Stopped" after clicking Start.

**Check:**
1. Is the configured port (default 3100) already in use?
   ```bash
   lsof -i :3100
   ```
   Kill any existing processes: `kill <PID>`

2. Check logs in the Settings window for specific error messages.

3. Make sure ProPresenter is running and Network API is enabled.

### Tunnel Won't Start

**Symptoms:** Tunnel status shows "Disconnected" after clicking Start.

**Check:**
1. Is `cloudflared` installed?
   ```bash
   cloudflared --version
   ```
   If not found: `brew install cloudflared`

2. Does `~/.cloudflared/config.yml` exist and is it valid?
   ```bash
   cloudflared tunnel ingress validate
   ```

3. Is the tunnel UUID correct? The config file's `tunnel:` field must match an existing tunnel:
   ```bash
   cloudflared tunnel list
   ```

### "cloudflared: command not found" in Proxy App

**Why:** macOS GUI apps don't inherit your shell's PATH. The Proxy App checks common Homebrew locations automatically (`/opt/homebrew/bin/cloudflared`, `/usr/local/bin/cloudflared`), but if cloudflared is installed elsewhere it won't be found.

**Fix:** Verify cloudflared is in a standard location:
```bash
which cloudflared
```

If it's in an unusual location, create a symlink:
```bash
sudo ln -s /path/to/cloudflared /usr/local/bin/cloudflared
```

### ProPresenter Not Detected

**Symptoms:** Tray menu shows "ProPresenter: Not running".

**Check:**
1. Is ProPresenter 7 running?
2. Is Network API enabled? (Preferences → Network → Enable Network API)
3. Is the host set to `127.0.0.1` (not `localhost`) in Proxy App settings?
4. Is the port correct? Default is `1025` — check ProPresenter's Network preferences.
5. Test manually:
   ```bash
   curl http://127.0.0.1:1025/version
   ```
   You should get a JSON response with `host_description`.

### Web UI Shows "Failed to Connect"

**Symptoms:** After logging in, the web interface shows "Failed to connect" when trying to load playlists.

**Check:**
1. Is the web server running? (Check tray menu status)
2. Is ProPresenter running? (Check tray menu status)
3. Try stopping and restarting the server from the tray menu
4. Check the host in settings is `127.0.0.1` — not `localhost`

### Google Sign-In Errors

#### "invalid_client"

The Client ID or Client Secret is wrong. In the Proxy App settings:
- Check for leading/trailing spaces in the Client ID and Secret
- Verify the credentials match what's in Google Cloud Console
- The app trims whitespace automatically on save, so re-save settings and restart the server

#### "redirect_uri_mismatch"

The callback URL doesn't match what's registered in Google Cloud Console.

1. In Google Cloud Console → Credentials → your OAuth client → **Authorized redirect URIs**, verify:
   ```
   https://pp.yourchurch.com/auth/google/callback
   ```
2. In the Proxy App settings, make sure the **Tunnel URL** has:
   - No trailing slash (use `https://pp.yourchurch.com`, not `https://pp.yourchurch.com/`)
   - `https://` prefix
   - The exact hostname matching your OAuth redirect URI
3. Changes to redirect URIs in Google Console can take up to 5 minutes to propagate

#### "Access denied" after sign-in

Your email isn't in the allowlist. An admin needs to add your email address — see [Adding Users](#adding-users).

### Sessions Lost on Restart

This shouldn't happen — sessions are stored in files at `~/.propresenter-words/sessions/`. Check that the directory exists and is writable:

```bash
ls -la ~/.propresenter-words/sessions/
```

---

## Common Issues

| Issue | Cause | Fix |
|-------|-------|-----|
| No tray icon visible | App may not have launched successfully | Check `/Applications/ProPresenter Web Proxy.app` exists; try `xattr -cr` again |
| Server starts but tunnel fails | cloudflared not installed or config invalid | Run `brew install cloudflared` and `cloudflared tunnel ingress validate` |
| Can connect locally but not remotely | Tunnel not running or DNS not propagated | Start tunnel from tray menu; check `cloudflared tunnel info propresenter-web` |
| IPv6 connection errors | `localhost` resolving to `::1` | Change host to `127.0.0.1` in settings |
| Slow first load | Server warming up, fetching playlists | Normal on first request — subsequent loads are faster |
| "ENOENT" errors in logs | Missing file or executable | Usually cloudflared not found — see [cloudflared troubleshooting](#cloudflared-command-not-found-in-proxy-app) |

---

## Files & Data Locations

All configuration and data is stored in `~/.propresenter-words/`:

| File / Directory | Contents |
|-----------------|----------|
| `propresenter-proxy.json` | Proxy App settings (host, port, OAuth credentials) |
| `web-auth.json` | Bearer token and session secret (chmod 600) |
| `web-users.json` | Email allowlist and admin list |
| `web-settings.json` | Web server application settings |
| `aliases.json` | Song alias/override mappings |
| `sessions/` | Active session files (auto-pruned) |
| `logs/` | Request logs, one file per day (auto-pruned after 14 days) |
| `uploads/` | Uploaded files (logos) |

The Proxy App's own settings (separate from the web server) are stored in:
```
~/Library/Application Support/propresenterwords/propresenter-proxy.json
```

### Log Files

Request logs are written as daily JSON-lines files:

```bash
# View today's log
cat ~/.propresenter-words/logs/web-$(date +%Y-%m-%d).log

# Watch live
tail -f ~/.propresenter-words/logs/web-$(date +%Y-%m-%d).log
```

Logs are automatically pruned after 14 days (configurable via `LOG_RETENTION_DAYS` environment variable).

---

## Security Overview

### Encryption

All remote traffic is encrypted end-to-end by Cloudflare Tunnel:

```
Browser ←—HTTPS—→ Cloudflare Edge ←—encrypted tunnel—→ cloudflared ←—HTTP—→ localhost:3100
```

You don't need to configure TLS certificates — Cloudflare handles this automatically.

### Authentication Layers

| Layer | Purpose | Details |
|-------|---------|---------|
| **Google OAuth** | Primary auth for browser users | Only allowlisted emails can sign in |
| **Bearer token** | Fallback for API/SSE access | Auto-generated UUID, stored locally |
| **Session cookies** | Browser session management | httpOnly, secure, sameSite=lax, 6-hour expiry |

### Additional Protections

- **Rate limiting** — Auth endpoints limited to 20 attempts per 15 minutes per IP
- **Helmet middleware** — Security headers (CSP, HSTS, X-Frame-Options)
- **File permissions** — Sensitive files (web-auth.json) set to chmod 600
- **Real IP detection** — Uses Cloudflare's `CF-Connecting-IP` header for accurate rate limiting
- **Constant-time comparison** — Bearer token checked with `crypto.timingSafeEqual()`
- **Session auto-pruning** — Old sessions cleaned up every 30 minutes

---

## Manual Setup (Alternative)

If you prefer running the web server and tunnel from the terminal (without the Proxy App), see the [Web Proxy Setup Guide](./web-proxy-setup) for:

- Environment variable configuration
- Running as a systemd/launchd service
- Building the standalone executable
- Linux/Windows deployment

The manual approach is better suited for headless servers or production deployments where a GUI isn't practical.

---

## Quick Reference

### Start Everything

1. Launch **ProPresenter Web Proxy** from Applications
2. Click the broadcast icon → **Start Server**
3. Click the broadcast icon → **Start Tunnel**
4. Click **Open Web UI** to verify

### Stop Everything

1. Click the broadcast icon → **Stop Tunnel**
2. Click the broadcast icon → **Stop Server**
3. (Or simply: broadcast icon → **Quit**)

### Check Health

```bash
# Local health check
curl http://localhost:3100/health

# Remote health check (through tunnel)
curl https://pp.yourchurch.com/health
```

---

[← Back to Home](../index.md) | [Web Proxy Setup (Manual)](./web-proxy-setup) | [Getting Started](../getting-started)
