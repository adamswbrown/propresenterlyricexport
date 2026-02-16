# Web Proxy Setup Guide

[← Back to Home](../index.md) | [User Guide](../user-guide)

---

Access ProPresenter Lyrics Export from any device — phone, tablet, or remote computer — through a secure web interface exposed via Cloudflare Tunnel.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Step 1: Google OAuth Setup](#step-1-google-oauth-setup)
4. [Step 2: Install Cloudflare Tunnel](#step-2-install-cloudflare-tunnel)
5. [Step 3: Create a Tunnel](#step-3-create-a-tunnel)
6. [Step 4: Configure Environment](#step-4-configure-environment)
7. [Step 5: Build and Start the Server](#step-5-build-and-start-the-server)
8. [Step 6: Add Users](#step-6-add-users)
9. [Running as a Service](#running-as-a-service)
10. [Quick Start (Testing Only)](#quick-start-testing-only)
11. [Troubleshooting](#troubleshooting)
12. [Security Notes](#security-notes)
13. [Environment Variable Reference](#environment-variable-reference)

---

## Overview

The web proxy lets remote users access your ProPresenter installation through a browser. The architecture is:

```
User's browser  →  Cloudflare Tunnel  →  Web proxy (your machine)  →  ProPresenter API
```

**Key features:**
- Google OAuth sign-in with email allowlist
- Bearer token fallback for API/SSE access
- Sessions persist across server restarts
- Structured request logging with automatic rotation
- No port-forwarding or firewall changes required (outbound-only tunnel)

---

## Prerequisites

- **ProPresenter 7** running with Network API enabled
- **Node.js 18+** installed
- A **domain** managed by Cloudflare (free plan works)
- A **Google account** for OAuth setup (free)

---

## Step 1: Google OAuth Setup

Google OAuth lets your users sign in with their Google account. Only emails you approve can access the app.

### 1a. Create a Google Cloud Project

1. Go to [console.cloud.google.com](https://console.cloud.google.com/)
2. Click the project selector dropdown (top navigation bar)
3. Click **New Project**
4. Enter a name (e.g., "ProPresenter Web") and click **Create**
5. Select the new project from the dropdown

### 1b. Configure the OAuth Consent Screen

1. Navigate to **Google Auth Platform** > **Overview** > **Get Started**
   - (Or the older path: **APIs & Services** > **OAuth consent screen**)
2. Set **User type**:
   - **Internal** — if all your users are on the same Google Workspace domain (simplest)
   - **External** — if your users have personal Gmail accounts
3. Fill in the required fields:

| Field | What to enter |
|-------|--------------|
| App name | ProPresenter Web (or your preferred name) |
| User support email | Your email address |
| Developer contact email | Your email address |

4. Click **Save and Continue**

### 1c. Add Scopes

1. Click **Add or Remove Scopes**
2. Add these three scopes:
   - `openid`
   - `.../auth/userinfo.email`
   - `.../auth/userinfo.profile`
3. Click **Update**, then **Save and Continue**

These are all **non-sensitive** scopes — no Google verification is required, even for production use.

### 1d. Create OAuth Credentials

1. Navigate to **Google Auth Platform** > **Clients** > **Create Client**
   - (Or: **APIs & Services** > **Credentials** > **Create Credentials** > **OAuth client ID**)
2. Set **Application type** to **Web application**
3. Enter a name (e.g., "ProPresenter Web Client")
4. Under **Authorized redirect URIs**, click **Add URI** and enter:
   ```
   https://YOUR-DOMAIN.example.com/auth/google/callback
   ```
   Replace `YOUR-DOMAIN.example.com` with your actual tunnel hostname (configured in Step 3).
5. Click **Create**

### 1e. Copy Credentials

A dialog shows your **Client ID** and **Client Secret**.

**Copy both values immediately** — the Client Secret is only visible at creation time (since June 2025). You can also click **Download JSON** to save them.

Store these values securely. You'll use them as environment variables in Step 4.

### Testing vs Production Mode

For a self-hosted app using only `openid`, `email`, and `profile` scopes:

- **Testing mode works fine** — tokens don't expire, no warnings appear, no user list needed
- **Publishing** (optional) also works without verification for these non-sensitive scopes
- Either way, your app functions identically

---

## Step 2: Install Cloudflare Tunnel

Cloudflare Tunnel (`cloudflared`) creates a secure outbound connection from your machine to Cloudflare's edge. No port-forwarding required.

### macOS

```bash
brew install cloudflared
```

### Windows

```powershell
winget install --id Cloudflare.cloudflared
```

### Linux (Debian/Ubuntu)

```bash
# Add Cloudflare GPG key and repository
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg \
  | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null

echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" \
  | sudo tee /etc/apt/sources.list.d/cloudflared.list

sudo apt-get update && sudo apt-get install cloudflared
```

### Linux (RHEL/CentOS)

```bash
curl -fsSl https://pkg.cloudflare.com/cloudflared.repo \
  | sudo tee /etc/yum.repos.d/cloudflared.repo

sudo yum update && sudo yum install cloudflared
```

### Verify

```bash
cloudflared --version
```

---

## Step 3: Create a Tunnel

### 3a. Authenticate

```bash
cloudflared tunnel login
```

This opens your browser. Select the Cloudflare zone (domain) to authorize. A certificate is saved to `~/.cloudflared/cert.pem`.

### 3b. Create a Named Tunnel

```bash
cloudflared tunnel create propresenter-web
```

Note the **tunnel UUID** printed (e.g., `6ff42ae2-765d-4adf-8112-31c55c1551ef`). A credentials file is created at `~/.cloudflared/<UUID>.json`.

### 3c. Route DNS

```bash
cloudflared tunnel route dns propresenter-web pp.example.com
```

Replace `pp.example.com` with your desired hostname. This creates a CNAME record in Cloudflare DNS.

### 3d. Create Config File

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <TUNNEL-UUID>
credentials-file: /home/<USER>/.cloudflared/<TUNNEL-UUID>.json

ingress:
  - hostname: pp.example.com
    service: http://localhost:3100
  - service: http_status:404
```

Replace `<TUNNEL-UUID>` with your actual UUID and `<USER>` with your system username.

### 3e. Validate

```bash
cloudflared tunnel ingress validate
```

---

## Step 4: Configure Environment

Create a `.env` file or export these variables before starting the server:

```bash
# Required — Google OAuth credentials (from Step 1e)
export GOOGLE_CLIENT_ID="123456789-abcdef.apps.googleusercontent.com"
export GOOGLE_CLIENT_SECRET="GOCSPX-xxxxxxxxxxxxxxxx"

# Required — your tunnel's public URL
export TUNNEL_URL="https://pp.example.com"

# Optional — ProPresenter connection (defaults shown)
export PROPRESENTER_HOST="192.168.68.58"
export PROPRESENTER_PORT="61166"

# Optional — server settings (defaults shown)
export WEB_PORT="3100"
export WEB_HOST="0.0.0.0"
export LOG_RETENTION_DAYS="14"
```

---

## Step 5: Build and Start the Server

```bash
# 1. Install dependencies
npm ci

# 2. Build the server and web UI
npm run build
npm run web:build:ui

# 3. Start the server
npm run web:start
```

The startup banner shows connection details, auth status, and paths:

```
  ProPresenter Lyrics Export — Web Proxy
  ======================================
  Server:  http://0.0.0.0:3100
  Health:  http://0.0.0.0:3100/health

  Tunnel:  https://pp.example.com
  Tunnel config: OK

  Google OAuth: ENABLED
  Callback URL: https://pp.example.com/auth/google/callback
  Allowed users: (none — add emails to allowlist)

  Bearer token: a1b2c3d4-e5f6-...
  (fallback auth for API access / SSE)

  Sessions:  /home/user/.propresenter-words/sessions
  Logs:      /home/user/.propresenter-words/logs
```

### Start the tunnel (separate terminal)

```bash
cloudflared tunnel run propresenter-web
```

Or run both together:

```bash
npm run web:start:tunnel
```

---

## Step 6: Add Users

Only emails in the allowlist can sign in. Add the first user (yourself) via CLI:

```bash
# Add yourself as an admin
npm start -- users add you@gmail.com --admin

# Add other users
npm start -- users add colleague@gmail.com

# List all users
npm start -- users list
```

Once signed in as an admin, you can also manage users from the web UI via the **Users** button.

---

## Running as a Service

For persistent operation (survives reboots), install `cloudflared` as a system service.

### Linux (systemd)

```bash
# Install cloudflared as a service
sudo cloudflared --config /home/<USER>/.cloudflared/config.yml service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

For the web proxy itself, create a systemd unit:

```ini
# /etc/systemd/system/propresenter-web.service
[Unit]
Description=ProPresenter Lyrics Export Web Proxy
After=network.target

[Service]
Type=simple
User=<USER>
WorkingDirectory=/path/to/propresenterlyricexport
ExecStart=/usr/bin/node dist/server/index.js
Restart=on-failure
RestartSec=5
Environment=GOOGLE_CLIENT_ID=your-client-id
Environment=GOOGLE_CLIENT_SECRET=your-client-secret
Environment=TUNNEL_URL=https://pp.example.com
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable propresenter-web
sudo systemctl start propresenter-web
```

### macOS (launchd)

```bash
# Install cloudflared as a service
sudo cloudflared service install
```

For the web proxy, create a launchd plist at `~/Library/LaunchAgents/com.propresenter.web.plist` or use a process manager like `pm2`.

### Windows

```cmd
cloudflared.exe service install
sc start cloudflared
```

For the web proxy, use a tool like [NSSM](https://nssm.cc/) or run as a scheduled task on login.

---

## Quick Start (Testing Only)

For quick testing without a Cloudflare account or domain:

```bash
# Terminal 1: Start the web server
npm run web:start

# Terminal 2: Quick tunnel (random URL)
cloudflared tunnel --url http://localhost:3100
```

This gives you a temporary `*.trycloudflare.com` URL. **Limitations:**

- Random URL changes every restart
- 200 concurrent request limit
- No SSE support (export progress won't stream)
- Not suitable for production

Use the bearer token (printed on server start) to authenticate — paste it on the login page.

---

## Troubleshooting

### "Google OAuth: NOT CONFIGURED"

The server didn't find `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`. Make sure they're exported in your environment before starting the server.

### "redirect_uri_mismatch" error on Google sign-in

The redirect URI in Google Cloud Console must match exactly:
```
https://pp.example.com/auth/google/callback
```
- Check for typos, trailing slashes, or http vs https
- Changes to redirect URIs can take 5 minutes to propagate

### Sessions lost on restart

This shouldn't happen with the file-based session store. Check that `~/.propresenter-words/sessions/` exists and is writable.

### "Cookie not set" / sign-in loop

When behind a tunnel, cookies require `secure: true`. Make sure:
- `TUNNEL_URL` is set (this enables secure cookies automatically)
- You're accessing via HTTPS (the tunnel URL), not `http://localhost`

### Tunnel not reachable

```bash
# Test tunnel health
curl https://pp.example.com/health?check=tunnel

# Check cloudflared is running
cloudflared tunnel info propresenter-web
```

### Logs

Request logs are written to `~/.propresenter-words/logs/` as daily JSON-lines files:

```bash
# View today's log
cat ~/.propresenter-words/logs/web-$(date +%Y-%m-%d).log | head -20

# Watch live
tail -f ~/.propresenter-words/logs/web-$(date +%Y-%m-%d).log
```

Logs are automatically pruned after 14 days (configurable via `LOG_RETENTION_DAYS`).

---

## Security Notes

### HTTPS

All traffic between users and your server is encrypted end-to-end by Cloudflare Tunnel. You don't need to configure TLS certificates — Cloudflare handles this automatically.

The connection flow:
```
Browser ←—HTTPS—→ Cloudflare Edge ←—encrypted tunnel—→ cloudflared ←—HTTP—→ localhost:3100
```

### Authentication Layers

1. **Google OAuth** — primary auth for browser users. Only allowlisted emails can sign in.
2. **Bearer token** — fallback for API access and SSE connections. Auto-generated, printed on startup.
3. **Session cookies** — `httpOnly`, `secure`, `sameSite=lax`, 6-hour expiry.

### Data Storage

All configuration is stored locally at `~/.propresenter-words/`:

| File | Contents |
|------|----------|
| `web-auth.json` | Bearer token + session secret (chmod 600) |
| `web-users.json` | Email allowlist + admin list |
| `sessions/` | Session files (auto-pruned) |
| `logs/` | Request logs (auto-pruned after 14 days) |
| `aliases.json` | Song alias mappings |

### Rate Limiting

Auth endpoints are rate-limited to 20 attempts per 15 minutes per IP (uses `CF-Connecting-IP` when behind Cloudflare).

---

## Environment Variable Reference

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `GOOGLE_CLIENT_ID` | For OAuth | — | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | For OAuth | — | Google OAuth client secret |
| `TUNNEL_URL` | For production | — | Public tunnel URL (e.g., `https://pp.example.com`) |
| `WEB_PORT` | No | `3100` | Server listen port |
| `WEB_HOST` | No | `0.0.0.0` | Server listen host |
| `PROPRESENTER_HOST` | No | `127.0.0.1` | ProPresenter host |
| `PROPRESENTER_PORT` | No | `1025` | ProPresenter API port |
| `CORS_ORIGIN` | No | `*` | Comma-separated allowed origins |
| `NODE_ENV` | No | — | Set to `production` for secure cookies without `TUNNEL_URL` |
| `LOG_RETENTION_DAYS` | No | `14` | Days to keep log files |
