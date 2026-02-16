# ProPresenter Viewer Guide

[<- Back to Home](../index.md) | [Getting Started](../getting-started)

---

Let your congregation follow along on their own devices with real-time slide thumbnails and lyrics text, streamed directly from ProPresenter.

## Table of Contents

1. [What is ProPresenter Viewer?](#what-is-propresenter-viewer)
2. [How It Works](#how-it-works)
3. [Installation](#installation)
4. [Setup (First Run)](#setup-first-run)
5. [Sharing the Viewer URL](#sharing-the-viewer-url)
6. [Using the Viewer on Devices](#using-the-viewer-on-devices)
7. [End-to-End Walkthrough](#end-to-end-walkthrough)
8. [Tray Menu & Settings](#tray-menu--settings)
9. [Troubleshooting](#troubleshooting)

---

## What is ProPresenter Viewer?

ProPresenter Viewer is a standalone companion app that runs alongside ProPresenter on your production machine. It provides a **web-based live view** of the current slide so that anyone on the same Wi-Fi network can follow the service on their phone, tablet, or laptop browser.

**Use cases:**

- Congregation members who are hard of hearing and want lyrics closer to hand
- Volunteers in another room (nursery, foyer, sound booth) who need to see the current slide
- Overflow seating areas without a direct view of the projection screen
- Pastors or worship leaders who want a stage monitor on a tablet

**Key features:**

- Live slide thumbnail that updates in real time as the operator advances slides
- Lyrics text displayed below the image for easy reading
- LIVE indicator when content is actively being presented
- Automatic reconnection if the network drops briefly
- Runs silently in your menu bar (macOS) or system tray (Windows) — no dock icon, no extra windows
- Works on any device with a web browser — no app install needed for viewers

---

## How It Works

```
ProPresenter 7          Viewer App (menu bar)         Congregation devices
 ┌─────────────┐        ┌─────────────────────┐       ┌──────────────────┐
 │  Network API │───────>│  Polls PP every 1.5s │       │  Phone / iPad /  │
 │  (port 1025) │        │  Serves web viewer   │──────>│  Laptop browser  │
 └─────────────┘        │  on port 3100        │  SSE  │  at viewer URL   │
                        └─────────────────────┘       └──────────────────┘
```

1. The **Viewer App** sits in your menu bar and polls ProPresenter's Network API every 1.5 seconds for the current slide status.
2. When a slide changes, the app broadcasts the update to all connected browsers using **Server-Sent Events (SSE)** — a lightweight, one-way push mechanism.
3. Each browser fetches the slide thumbnail image directly through the Viewer App (which proxies it from ProPresenter's API), so congregation devices never need direct access to ProPresenter.
4. If ProPresenter is quit or the connection drops, the viewer page shows a reconnecting overlay and clears stale content automatically.

---

## Installation

### Download

Go to [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases) and download the **Viewer** for your platform:

- **macOS**: `ProPresenter-Viewer-1.0.0-mac.zip`
- **Windows**: `ProPresenter-Viewer-1.0.0-win.exe`

> The Viewer app is a separate download from the main ProPresenter Lyrics app. You only need the Viewer if you want to provide a live slide view for congregation devices.

### macOS

```bash
# 1. Unzip the download
unzip ProPresenter-Viewer-1.0.0-mac.zip

# 2. Fix Gatekeeper (one-time, since the app is not notarized)
xattr -cr "ProPresenter Viewer.app"

# 3. Move to Applications (optional but recommended)
mv "ProPresenter Viewer.app" /Applications/

# 4. Launch
open "/Applications/ProPresenter Viewer.app"
```

After launching, a small cross icon appears in your **menu bar** (top-right of your screen). There is no dock icon — the app is designed to stay out of the way.

### Windows

1. Run the installer (`ProPresenter-Viewer-1.0.0-win.exe`)
2. Follow the one-click installer
3. Launch "ProPresenter Viewer" from the Start menu
4. The app appears in your **system tray** (bottom-right, near the clock)

---

## Setup (First Run)

When the Viewer App launches for the first time, a small settings window appears automatically.

### 1. Configure ProPresenter Connection

| Field | Description | Default |
|---|---|---|
| **ProPresenter Host** | IP address or hostname of the machine running ProPresenter | `127.0.0.1` (same machine) |
| **ProPresenter Port** | The Network API port configured in ProPresenter | `61659` |
| **Server Port** | The port the Viewer web server listens on | `3100` |

> **Finding your ProPresenter port:** Open ProPresenter -> Preferences -> Network. The port is shown next to "Enable Network API". Common values are `1025` (older default) or `61659`.

### 2. Test the Connection

Click **Test Connection** to verify that ProPresenter is reachable. You should see a green indicator with the ProPresenter version (e.g., "Connected (v7.x)").

If the test fails:
- Make sure ProPresenter is running
- Verify the Network API is enabled in ProPresenter Preferences -> Network
- Check the host and port are correct

### 3. Save Settings

Click **Save**. The Viewer server restarts automatically with the new settings. The viewer URL is shown in the settings window — this is the address you share with your congregation.

---

## Sharing the Viewer URL

Once the server is running, the settings window displays the **Viewer URL**, for example:

```
http://192.168.1.50:3100/viewer
```

This URL is accessible to any device on the same Wi-Fi network. You can:

- **Copy** the URL using the Copy button in the settings window
- **Open** it in your own browser to preview using the Open button
- Right-click the tray icon and select **Copy Viewer URL**

### Tips for sharing

- **Display the URL on a slide** at the start of the service so people can type it in
- **Create a QR code** that points to the URL (many free QR generators online) and display it on screen or print it in the bulletin
- **Use a short/memorable URL** if your network supports local DNS — e.g., set up `viewer.local` to point to the machine's IP
- The URL stays the same as long as the machine's IP doesn't change. For a static setup, assign a fixed IP to the ProPresenter machine in your router settings.

---

## Using the Viewer on Devices

### What viewers see

When a congregation member opens the URL on their phone or tablet:

1. **Status bar** — Shows "Service Viewer" with a connection indicator, refresh button, and fullscreen button
2. **Slide thumbnail** — A large, real-time image of the current ProPresenter slide, scaled to fill the screen
3. **Lyrics text** — The current slide's text displayed below the image for easy reading
4. **LIVE badge** — Appears when content is actively being presented

### Viewer states

| State | What's shown |
|---|---|
| **Live content** | Slide thumbnail + lyrics text + LIVE badge |
| **Media / video slide** | Slide thumbnail + "Video / Media" badge (no lyrics) |
| **Between items** | "Service in progress — Next lyrics will appear automatically" |
| **Waiting to start** | "Waiting for service to begin..." |
| **ProPresenter disconnected** | Reconnecting overlay with spinner |
| **Server unreachable** | Reconnecting overlay (auto-retries every 3 seconds) |

### Refresh button

The circular arrow button in the status bar forces the viewer to:
- Re-fetch the current slide state from the server
- Reload the slide thumbnail (cache-busted)
- Reconnect the real-time event stream

Use it if the viewer looks stale or a thumbnail didn't load. The button spins briefly to confirm the refresh.

> Most of the time you won't need this — the viewer automatically detects and recovers from stale connections (see [Staying Connected](#staying-connected) below). The button is there as a manual fallback.

### Fullscreen mode

Viewers can tap the fullscreen button (top-right) or **double-tap the slide image** to enter fullscreen mode. This hides the status bar and gives the slide maximum screen space. Tap the button again or double-tap to exit.

### Responsive design

The viewer adapts to any screen size:

- **iPad / tablet (landscape)** — Large slide with lyrics below
- **Phone (portrait)** — Slide scales to fit width, lyrics below
- **Phone (landscape)** — Side-by-side layout: slide on the left, lyrics on the right
- **Desktop browser** — Full-width layout up to 1200px

### Staying connected

The viewer uses several mechanisms to ensure devices stay in sync throughout a service:

1. **Server-Sent Events (SSE)** — The primary real-time channel. The server pushes slide changes to all connected devices instantly.
2. **Server heartbeat** — The server sends a keepalive signal every 15 seconds to all connected browsers, keeping the connection alive through network proxies and mobile power management.
3. **Heartbeat timeout** — If the browser doesn't receive any activity for 25 seconds, it assumes the connection has gone stale and automatically reconnects and re-fetches the current slide.
4. **Page visibility detection** — When a user returns to the viewer tab after locking their phone or switching apps, the viewer checks how long it's been inactive. If it's been too long, it immediately refreshes rather than waiting for the next heartbeat timeout.
5. **Manual refresh** — The refresh button in the status bar forces an immediate re-fetch and reconnect as a last resort.

These layers work together so that even on iPads that aggressively suspend background tabs, the viewer recovers within seconds of the user returning to it.

---

## End-to-End Walkthrough

Here's a complete walkthrough from installation to congregation members viewing slides:

### Before the service

1. **Install** the Viewer App on the ProPresenter machine (see [Installation](#installation))
2. **Launch** the Viewer App — the tray icon appears and the settings window opens
3. **Configure** the ProPresenter host and port, then click **Test Connection** to verify
4. **Save** the settings — the server starts and the viewer URL is displayed
5. **Test** by opening the viewer URL in a browser on another device (phone, tablet) — you should see "Waiting for service to begin..."
6. **Advance a slide** in ProPresenter — the viewer should update within ~2 seconds with the slide thumbnail and lyrics

### During the service

- The Viewer App runs silently in the menu bar. No interaction needed.
- As the ProPresenter operator advances slides, all connected devices update automatically.
- If ProPresenter is restarted mid-service, the viewer will show a brief "Reconnecting" overlay and resume automatically once ProPresenter is back up.

### After the service

- The Viewer App keeps running in the background. You can leave it running or quit it from the tray menu.
- To quit: right-click the tray icon and select **Quit** (or click the tray icon to open settings, then close the app from there).

---

## Tray Menu & Settings

### Tray icon

Click the menu bar icon (macOS) or system tray icon (Windows) to toggle the settings window. Right-click for the context menu:

| Menu item | Description |
|---|---|
| **ProPresenter: Connected/Disconnected** | Current connection status (read-only) |
| **Viewer: http://...** | Click to open the viewer in your browser |
| **Copy Viewer URL** | Copies the URL to your clipboard |
| **Settings...** | Opens the settings window |
| **Quit** | Stops the server and exits the app |

### Settings window

The compact settings window shows:

- **Connection status** — Green dot when connected, with ProPresenter version
- **Host and Port fields** — ProPresenter connection details
- **Test Connection button** — Validates the connection before saving
- **Server Port** — The port the viewer web server runs on
- **Server status** — Shows whether the server is running and the viewer URL
- **Copy / Open buttons** — Quick access to the viewer URL
- **Log entries** — Recent activity log showing slide changes, connection events, and errors

---

## Troubleshooting

### Viewer page shows "Waiting for service to begin..." but ProPresenter has content

- Check the **connection status** in the tray menu or settings window. If it says "Disconnected", the Viewer App can't reach ProPresenter.
- Verify the host and port in settings match what's shown in ProPresenter's Preferences -> Network.
- Make sure ProPresenter's **Network API is enabled**.

### Devices can't reach the viewer URL

- Make sure the device is on the **same Wi-Fi network** as the ProPresenter machine.
- Check that the server port (default 3100) isn't blocked by a firewall.
- On macOS, you may get a firewall prompt the first time — click **Allow**.
- Try accessing the URL from the ProPresenter machine itself (`http://localhost:3100/viewer`) to confirm the server is running.

### Slide thumbnails don't load or are blank

- Tap the **refresh button** (circular arrow in the status bar) to force a re-fetch of the current slide and thumbnail.
- Thumbnails are proxied from ProPresenter's API through the Viewer App. If ProPresenter's API is slow or the presentation doesn't have thumbnails, the image may not appear.
- The viewer retries failed thumbnail loads automatically (up to 2 retries).
- If only some slides have thumbnails, this is normal — media-only slides or blank slides may not have a thumbnail available.

### "Port 3100 is already in use" error

Another application (or a previous instance of the Viewer App) is using port 3100. Either:
- Quit the other application using that port
- Change the **Server Port** in settings to a different number (e.g., 3101)

### Settings window doesn't appear

- Click the menu bar / tray icon to toggle the window
- On macOS, the window anchors near the menu bar icon — check the top of your screen
- If the icon doesn't appear at all, the app may not have launched. Try launching it again from Applications.

### Viewer looks stale or stuck

- Tap the **refresh button** in the status bar — this forces a fresh state fetch and reconnects the event stream.
- The viewer should also recover automatically within 25 seconds via heartbeat detection, or instantly when you return to the tab after locking your phone.
- If the viewer still shows stale content after refreshing, check the connection status in the Viewer App's settings window on the ProPresenter machine.

---

## System Requirements

**ProPresenter machine (runs the Viewer App):**
- ProPresenter 7 with Network API enabled
- macOS 10.14+ or Windows 10+
- Port 3100 (or your chosen port) available

**Congregation devices (view in browser):**
- Any device with a modern web browser (Safari, Chrome, Firefox, Edge)
- Connected to the same Wi-Fi network as the ProPresenter machine
- No app install required — just open the URL

---

## Common Questions

### Will the Viewer App slow down ProPresenter during a service?

No. The impact is negligible. Here's what happens during a typical 90-minute service:

- **Polling**: The Viewer App makes 3 small HTTP requests to ProPresenter's local API every 1.5 seconds (~10,800 requests over 90 minutes). These are all to `127.0.0.1` with microsecond latency, and each response is a few hundred bytes of JSON that ProPresenter already has in memory.
- **Thumbnails**: When a slide changes, each connected device fetches one JPEG thumbnail. ProPresenter already generates and caches these for its own slide navigator — the Viewer App simply proxies them. Even with 50 devices and a slide change every 30 seconds, this is well within ProPresenter's capacity.
- **Memory**: The Viewer App uses ~100-150MB of RAM (Electron baseline). The Express server and real-time connections add negligible overhead.
- **CPU**: Near-zero between slide changes. A brief spike when thumbnails are fetched, but this is I/O-bound (reading cached images), not compute-bound.

ProPresenter's own GPU rendering and video playback consume far more resources than the Viewer App's API polling. You should not notice any performance impact.

### How many devices can connect at once?

There's no hard limit. The Viewer App uses Server-Sent Events (SSE), which are lightweight one-way connections. Each connected device holds one open HTTP connection and receives tiny JSON messages only when a slide changes (plus a 15-byte heartbeat every 15 seconds).

In practice, a typical church Wi-Fi network would become the bottleneck before the Viewer App does. For congregations of 50-200 devices, performance should be excellent.

### Does it work if ProPresenter is on a different machine?

Yes. Set the **ProPresenter Host** in settings to the IP address of the machine running ProPresenter (e.g., `192.168.1.10`). The Viewer App can run on any machine on the same network — it doesn't have to be the same computer as ProPresenter.

### Can I use it over the internet (not just local Wi-Fi)?

The Viewer App is designed for local network use. For remote/internet access, you'd need to expose the viewer port through a tunnel or reverse proxy. The separate Web Proxy feature (coming soon) provides authenticated remote access via Cloudflare Tunnel.

### What happens if my phone locks during the service?

When you unlock your phone and return to the viewer, it detects that the connection has been inactive and automatically refreshes to show the current slide. This typically happens within 1-2 seconds of returning to the tab. You can also tap the refresh button if you want to force an immediate update.

### Does it use a lot of mobile data?

No. The viewer is designed to be bandwidth-efficient:
- Text updates (lyrics) are a few hundred bytes per slide change
- Thumbnails are typically 20-80KB JPEG images
- The heartbeat is 15 bytes every 15 seconds
- Over a 90-minute service with slides changing every 30 seconds, expect roughly 5-15MB of total data per device — comparable to browsing a few web pages

---

## Need Help?

- Check the [FAQ](../faq) for general troubleshooting
- Open an [issue on GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues)
