# ProPresenter Lyrics Export v3.2.0

**Birthday slides, straight from ChurchSuite** — celebrate your congregation's birthdays with a beautifully formatted PowerPoint presentation, generated in seconds.

---

## What's New in v3.2.0

### 🎂 Birthday Bucket

The Desktop App now includes **Birthday Bucket** — a new integrated feature that pulls birthday data directly from ChurchSuite and exports a ready-to-use birthday PowerPoint presentation, perfectly formatted for Sunday services.

#### How It Works

1. Enable **Birthday Bucket** in Settings → Advanced Features
2. Click the 🎂 button in the app header
3. Enter your ChurchSuite credentials (account slug, API key, app name)
4. Hit **Sync Now** — contacts and children are fetched and merged automatically
5. Browse this week's or next week's birthdays
6. Click **Export PPTX** to generate your birthday slide deck

#### Slide Format

The exported PowerPoint matches the standard birthday presentation template:

| Slide | Description |
|-------|-------------|
| **Title slide** | "Happy Birthday from [Church Name]!" centred with the week range (e.g. "3–9 March") |
| **Per-person slides** | Photo placeholder box on the left with the person's name; "Happy Birthday from [church]!" in the top right — paste in their photo and it's done |
| **Song slide** | "Jesus bless you today!" ×2, "Jesus bless you dear:", all first names at 40pt bold, "Jesus bless you always!" — vertically centred, ready to follow on screen during the birthday song |

#### Customisation

- **Church name** — shown on every slide (defaults to "St Andrew's")
- **Background image** — set a custom PNG/JPG (e.g. your birthday cupcake graphic); falls back to warm amber if no image is set
- Both settings are saved and restored across launches

#### What Gets Synced

Birthday Bucket fetches from two ChurchSuite modules and merges them:
- **Contacts** (`/addressbook/contacts`) — adult congregation members
- **Children** (`/children/children`) — youth ministry records

Each birthday card shows the person's name, birthday date, age they're turning, and a source badge (Contact / Child) so you can spot the record at a glance.

---

## What Was in Previous Releases

### v3.1.0 — App Version Display

- Version number shown in the Lyrics app header and Web Proxy title bar

### v3.0.0 — Viewer & Web Proxy

**ProPresenter Viewer v1.0.0** — Let your congregation follow along on their own devices. A lightweight menu bar / tray app that streams live slide thumbnails and lyrics to any phone, tablet, or laptop on your Wi-Fi. No app install needed — viewers just open a URL in their browser.

**ProPresenter Web Proxy v1.0.0** — Access ProPresenter from anywhere, securely. Sign in with Google, manage users, and use the full Lyrics web interface from any browser via a Cloudflare Tunnel — no port forwarding required.

---

## Downloads

| App | macOS | Windows |
|-----|-------|---------|
| **ProPresenter Lyrics** v3.2.0 | `ProPresenter-Lyrics-3.2.0-mac.zip` | `ProPresenter-Lyrics-3.2.0-win.exe` |
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
| **Birthday Bucket** | A ChurchSuite account with API access |
| **Viewer** | Viewers need any modern browser on the same Wi-Fi |
| **Web Proxy** | A Cloudflare account (free) and a domain for remote access |

---

## Documentation

Full documentation: **[adamswbrown.github.io/propresenterlyricexport](https://adamswbrown.github.io/propresenterlyricexport)**

| Guide | Description |
|-------|-------------|
| [Getting Started](https://adamswbrown.github.io/propresenterlyricexport/getting-started) | Install and connect in 5 minutes |
| [User Guide](https://adamswbrown.github.io/propresenterlyricexport/user-guide) | Desktop app and CLI workflows |
| [Service Generator](https://adamswbrown.github.io/propresenterlyricexport/guides/service-generator) | Automate playlists from PDF service orders |
| [Viewer Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/viewer) | Live slides for congregation devices |
| [Web Proxy Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/proxy-app) | Secure remote access setup |
| [PPTX Export](https://adamswbrown.github.io/propresenterlyricexport/guides/pptx-export) | Customize fonts, colors, and styling |
| [FAQ](https://adamswbrown.github.io/propresenterlyricexport/faq) | Common questions and troubleshooting |

---

**Full changelog:** [CHANGELOG.md](https://github.com/adamswbrown/propresenterlyricexport/blob/main/CHANGELOG.md)
