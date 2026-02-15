# Production Testing Plan — Web Proxy

Step-by-step checklist for deploying and validating the web proxy in production.
Each section is a discrete pass/fail test. Work through them in order — later
tests depend on earlier ones passing.

---

## Prerequisites

Before you start, confirm you have:

- [ ] ProPresenter 7 running on the Mac with **Network API enabled**
- [ ] Node.js 18+ installed
- [ ] `cloudflared` installed (`cloudflared --version`)
- [ ] A Cloudflare-managed domain
- [ ] Google Cloud project with OAuth credentials (Client ID + Client Secret)
- [ ] At least one Google account email to add to the allowlist

---

## Phase 1 — Local Server (no tunnel)

Goal: verify the server starts and talks to ProPresenter on `localhost`.

### 1.1 Build

```bash
npm ci
npm run build
npm run web:build:ui
```

- [ ] `tsc` compiles without errors
- [ ] `dist-web/` directory is created with `index.html` and `assets/`

### 1.2 Start the server (bearer token only)

```bash
npm run web:start
```

- [ ] Startup banner prints without errors
- [ ] Banner shows `Google OAuth: NOT CONFIGURED` (expected — no env vars yet)
- [ ] Banner prints a bearer token UUID
- [ ] Banner shows `Sessions:` and `Logs:` paths

### 1.3 Health check

```bash
curl http://localhost:3100/health
```

- [ ] Returns `{"status":"ok","timestamp":"..."}`

### 1.4 Bearer token auth

```bash
# Replace <TOKEN> with the bearer token from the startup banner
curl -H "Authorization: Bearer <TOKEN>" http://localhost:3100/api/status
```

- [ ] Returns ProPresenter connection info (version, name, platform)
- [ ] If ProPresenter isn't running, returns an error — that's expected; the auth succeeded if you got a JSON response instead of 401

### 1.5 Bearer token auth — negative test

```bash
curl -H "Authorization: Bearer wrong-token" http://localhost:3100/api/status
```

- [ ] Returns `403 Invalid authentication token`

### 1.6 Web UI with bearer token

Open `http://localhost:3100` in a browser.

- [ ] Login page loads
- [ ] "Sign in with Google" button is absent or disabled (no OAuth configured)
- [ ] Token input field is visible
- [ ] Paste the bearer token and submit
- [ ] App loads — connection panel, playlist tree, export panel visible

### 1.7 Session persistence

Stop the server (`Ctrl+C`), then restart it (`npm run web:start`).

- [ ] Refresh the browser — you should still be logged in (file-based session store)
- [ ] If the session cookie expired (6 hours), re-login with the token

### 1.8 Request logging

```bash
cat ~/.propresenter-words/logs/web-$(date +%Y-%m-%d).log | head -20
```

- [ ] JSON-lines entries appear with `ts`, `level`, `msg`, `status`, `ms` fields
- [ ] The health check and API calls from above are logged

---

## Phase 2 — ProPresenter Connection

Goal: verify the server can proxy all ProPresenter operations.

### 2.1 Connect

In the web UI, enter ProPresenter host/port and click **Connect & Load Playlists**.

- [ ] Status pill turns green: `Connected to <host>:<port> (ProPresenter X.Y.Z)`
- [ ] Playlist tree populates with folders and playlists
- [ ] Library filter dropdown populates with detected libraries

### 2.2 Settings

Open **Formatting** (gear icon).

- [ ] Settings load (font, color, sizes pre-populated)
- [ ] Change a setting (e.g., font size), click **Save defaults**
- [ ] Status shows "Settings saved"
- [ ] Refresh browser — setting persists (file-backed)

### 2.3 Logo upload

In Formatting settings:

1. Click **Choose** next to Logo
2. Select a PNG or JPEG image

- [ ] File picker opens (HTML5 file input, not native dialog)
- [ ] After selecting, the logo path updates to a server-side path (`~/.propresenter-words/uploads/logo.png`)
- [ ] File exists on disk at that path

### 2.4 PPTX export

Select a playlist, click **Export to PowerPoint**.

- [ ] Progress log shows: scanning library, capturing lyrics per song, building PPTX
- [ ] Browser auto-downloads the `.pptx` file
- [ ] Open the PPTX — slides contain lyrics with correct font/color/size
- [ ] If a logo was uploaded: logo appears on title slides and lyric slides
- [ ] If no logo: slides render without errors (no broken image)

### 2.5 Service Generator (if enabled)

In Settings, enable Service Generator and configure libraries/template.

- [ ] Upload a PDF service order
- [ ] Song matching returns results with confidence scores
- [ ] Verse matching finds Bible presentations in service content library
- [ ] Build playlist inserts matched items into the template
- [ ] YouTube search buttons work for unmatched kids songs

### 2.6 Aliases

- [ ] Save a song alias from the match review step
- [ ] Verify the alias persists (`~/.propresenter-words/aliases.json`)
- [ ] Re-run matching — aliased song resolves automatically

---

## Phase 3 — Google OAuth

Goal: verify Google sign-in works before exposing via tunnel.

### 3.1 Start with OAuth credentials

Stop the server, then restart with env vars:

```bash
GOOGLE_CLIENT_ID="<your-client-id>" \
GOOGLE_CLIENT_SECRET="<your-client-secret>" \
npm run web:start
```

- [ ] Banner shows `Google OAuth: ENABLED`
- [ ] Callback URL shows `http://localhost:3100/auth/google/callback`

### 3.2 Add yourself to the allowlist

```bash
npm start -- users add you@gmail.com --admin
```

- [ ] Confirmation message printed
- [ ] `npm start -- users list` shows your email with `[admin]` badge

### 3.3 Google sign-in (localhost)

Open `http://localhost:3100` in a **private/incognito** window.

- [ ] Login page shows "Sign in with Google" button
- [ ] Click it — redirects to Google consent screen
- [ ] After consent, redirects back to the app
- [ ] Top-right shows your Google profile (avatar, name)
- [ ] **Users** button is visible (you're an admin)

**Note:** If redirect URI mismatch occurs, you need `http://localhost:3100/auth/google/callback` in your Google Cloud Console credentials. This is just for local testing — you'll change it to the tunnel URL for production.

### 3.4 User management (web UI)

Click **Users**.

- [ ] Your email appears with admin badge
- [ ] Add a second email via the form
- [ ] The new email appears in the list
- [ ] Remove the test email
- [ ] Promote/demote admin toggle works

### 3.5 Sign out

Click **Sign out**.

- [ ] Redirected to login page
- [ ] Refreshing the page does NOT auto-login (session destroyed)

### 3.6 Unauthorized user

Open an incognito window, try signing in with a Google account NOT in the allowlist.

- [ ] Redirected to `/?error=access_denied`
- [ ] Login page shows an error message
- [ ] No session created

---

## Phase 4 — Cloudflare Tunnel

Goal: verify end-to-end access over the public internet.

### 4.1 Create and configure the tunnel

```bash
cloudflared tunnel login
cloudflared tunnel create propresenter-web
cloudflared tunnel route dns propresenter-web pp.yourdomain.com
```

Create `~/.cloudflared/config.yml`:

```yaml
tunnel: <UUID>
credentials-file: /path/to/<UUID>.json
ingress:
  - hostname: pp.yourdomain.com
    service: http://localhost:3100
  - service: http_status:404
```

- [ ] `cloudflared tunnel ingress validate` passes

### 4.2 Update Google OAuth redirect URI

In Google Cloud Console, update the authorized redirect URI to:

```
https://pp.yourdomain.com/auth/google/callback
```

(Remove the localhost one if you no longer need it.)

- [ ] Changes saved in Google Cloud Console

### 4.3 Start server with tunnel URL

```bash
GOOGLE_CLIENT_ID="<id>" \
GOOGLE_CLIENT_SECRET="<secret>" \
TUNNEL_URL="https://pp.yourdomain.com" \
npm run web:start
```

- [ ] Banner shows `Tunnel: https://pp.yourdomain.com`
- [ ] Banner shows `Tunnel config: OK`
- [ ] Callback URL shows `https://pp.yourdomain.com/auth/google/callback`

### 4.4 Start the tunnel

In a separate terminal:

```bash
cloudflared tunnel run propresenter-web
```

- [ ] `cloudflared` connects and logs show `Registered tunnel connection`

### 4.5 Public health check

```bash
curl https://pp.yourdomain.com/health
```

- [ ] Returns `{"status":"ok","timestamp":"..."}`

### 4.6 Deep tunnel health check

```bash
curl "https://pp.yourdomain.com/health?check=tunnel"
```

- [ ] Returns `tunnel.reachable: true` and `tunnel.latencyMs`

### 4.7 Google sign-in via tunnel

Open `https://pp.yourdomain.com` on your **phone** or a different device.

- [ ] Login page loads over HTTPS (lock icon in browser)
- [ ] "Sign in with Google" works — consent screen, redirect, session created
- [ ] App loads fully — playlists, export, service generator all functional
- [ ] Cookie is set with `secure: true` and `httpOnly: true`

### 4.8 PPTX export via tunnel

From the phone/remote browser, run a PPTX export.

- [ ] SSE progress events stream in real-time (not buffered)
- [ ] PPTX file downloads to the device
- [ ] If there's a long pause (>30s) during export, SSE keepalive keeps the connection alive

### 4.9 Cloudflare headers

Check the server logs:

```bash
tail -5 ~/.propresenter-words/logs/web-$(date +%Y-%m-%d).log
```

- [ ] Requests from the tunnel show real client IPs (not `127.0.0.1`)

---

## Phase 5 — Security Validation

Goal: verify auth boundaries and rate limiting.

### 5.1 Unauthenticated API access

```bash
curl https://pp.yourdomain.com/api/status
```

- [ ] Returns `401 Authentication required`

### 5.2 Invalid bearer token via tunnel

```bash
curl -H "Authorization: Bearer fake-token" https://pp.yourdomain.com/api/status
```

- [ ] Returns `403 Invalid authentication token`

### 5.3 Rate limiting

Send 25 rapid requests to the auth endpoint:

```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w "%{http_code}\n" https://pp.yourdomain.com/auth/google
done
```

- [ ] First ~20 return `302` (redirect to Google)
- [ ] Remaining return `429` (rate limited)

### 5.4 Security headers

```bash
curl -I https://pp.yourdomain.com/
```

- [ ] `Content-Security-Policy` header present
- [ ] `X-Content-Type-Options: nosniff` present
- [ ] `X-Frame-Options` present (via Helmet)
- [ ] No `X-Powered-By` header (Helmet removes it)

### 5.5 Session file permissions

```bash
ls -la ~/.propresenter-words/web-auth.json
```

- [ ] Permissions are `600` (owner read/write only)

---

## Phase 6 — Persistence & Recovery

Goal: verify the system recovers gracefully from restarts.

### 6.1 Server restart — sessions survive

1. Sign in via Google on the tunnel URL
2. Stop the server (`Ctrl+C`)
3. Restart the server
4. Refresh the browser

- [ ] Still signed in — session was loaded from file store

### 6.2 Tunnel restart

1. Stop `cloudflared` (`Ctrl+C`)
2. Restart `cloudflared tunnel run propresenter-web`

- [ ] Tunnel reconnects within seconds
- [ ] Browser refreshes work immediately

### 6.3 ProPresenter restart

1. Quit ProPresenter
2. In the web UI, try to connect

- [ ] Connection fails gracefully — error message displayed, no crash
- [ ] Relaunch ProPresenter, reconnect — works normally

### 6.4 Log rotation

```bash
ls -la ~/.propresenter-words/logs/
```

- [ ] Log files are named `web-YYYY-MM-DD.log`
- [ ] Only today's file is growing
- [ ] After 14 days, old files would be pruned (verify by checking `pruneOldLogs` runs on startup)

### 6.5 Session cleanup

```bash
ls ~/.propresenter-words/sessions/ | wc -l
```

- [ ] Expired session files are removed (reap interval: 30 minutes)
- [ ] Active sessions have corresponding `.json` files

---

## Phase 7 — Electron Build Verification

Goal: confirm the desktop app still works after the `pptx-exporter` logo changes.

### 7.1 Electron dev mode

```bash
npm run electron:dev
```

- [ ] App launches
- [ ] Connect to ProPresenter
- [ ] Export a PPTX — logo embeds if a logo file exists, no crash if not
- [ ] Service Generator works

### 7.2 Electron production build

```bash
npm run electron:build
npm run electron:package
```

- [ ] Build succeeds
- [ ] Packaged app launches and works

---

## Phase 8 — Running as a Service (optional)

Goal: make everything survive reboots.

### 8.1 Install cloudflared service

```bash
sudo cloudflared --config ~/.cloudflared/config.yml service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

- [ ] `systemctl status cloudflared` shows active/running

### 8.2 Install web proxy service

Create systemd unit (see `docs/guides/web-proxy-setup.md`) and start it.

- [ ] `systemctl status propresenter-web` shows active/running
- [ ] Logs go to `~/.propresenter-words/logs/`
- [ ] Reboot the machine — both services start automatically

---

## Sign-Off

| Phase | Status | Date | Notes |
|-------|--------|------|-------|
| 1. Local Server | | | |
| 2. ProPresenter | | | |
| 3. Google OAuth | | | |
| 4. Cloudflare Tunnel | | | |
| 5. Security | | | |
| 6. Persistence | | | |
| 7. Electron Build | | | |
| 8. Service Setup | | | |

**Tested by:** ___________________
**Date:** ___________________
**ProPresenter version:** ___________________
**Server machine:** ___________________
