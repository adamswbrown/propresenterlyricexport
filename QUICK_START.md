# ProPresenter Words - Quick Start Guide

A command-line tool to extract lyrics from ProPresenter presentations and export them to PowerPoint.

## Installation

1. Clone the repository
2. Run `npm install`
3. Configure ProPresenter:
   - Enable Network API in ProPresenter Settings → Network
   - Note the host IP and port (usually `127.0.0.1:1025`)

## Basic Usage

### Check Connection
```bash
npm run dev:cli -- status
```
Shows ProPresenter version and current presentation info.

### List Playlists
```bash
npm run dev:cli -- playlists
```
View all available playlists with their UUIDs.

### Export Lyrics to Text
```bash
npm run dev:cli -- export
```
Interactive mode - select a playlist to export all lyrics as text.

### Export Lyrics to PowerPoint
```bash
npm run dev:cli -- pptx
```
Interactive mode - export selected playlist to a `.pptx` file.

**Direct mode** (specify playlist UUID):
```bash
npm run dev:cli -- pptx abc123-def456 my-service-slides
```

## Connection Settings

### Mac/Linux
```bash
# Temporary - set for this session
export PROPRESENTER_HOST=192.168.1.100
export PROPRESENTER_PORT=1025
npm run dev:cli -- status

# Permanent - add to ~/.zshrc or ~/.bashrc
echo 'export PROPRESENTER_HOST=192.168.1.100' >> ~/.zshrc
source ~/.zshrc
```

### Windows (Command Prompt)
```bash
# Temporary
set PROPRESENTER_HOST=192.168.1.100
set PROPRESENTER_PORT=1025
npm run dev:cli -- status

# Permanent - add to System Environment Variables
1. Press Win+R, type 'sysdm.cpl'
2. Click "Environment Variables"
3. Add PROPRESENTER_HOST and PROPRESENTER_PORT
```

### Windows (PowerShell)
```bash
$env:PROPRESENTER_HOST='192.168.1.100'
$env:PROPRESENTER_PORT='1025'
npm run dev:cli -- status
```

## Command Reference

| Command | Purpose |
|---------|---------|
| `status` | Check connection and current state |
| `playlists` | List all playlists |
| `export [uuid]` | Export playlist lyrics |
| `pptx [uuid] [output]` | Export to PowerPoint |
| `libraries` | List all libraries |
| `current` | Show active presentation |
| `focused` | Show focused presentation |
| `inspect <uuid>` | Get full presentation details |
| `watch` | Monitor slide changes in real-time |

## Options

```
--host, -h <address>   ProPresenter host (default: 127.0.0.1)
--port, -p <port>      ProPresenter port (default: 1025)
--json, -j             Output as JSON
--debug, -d            Show detailed error information
--help                 Display help message
```

## Troubleshooting

### "Connection Failed" Error
1. **Is ProPresenter running?**
   - Launch ProPresenter 7

2. **Is Network API enabled?**
   - ProPresenter → Settings → Network → Enable "Network API"

3. **Is the host/port correct?**
   - Check your network IP: `ipconfig /all` (Windows) or `ifconfig` (Mac/Linux)
   - Default port is usually `1025`

4. **Firewall blocking connection?**
   - Check if ProPresenter is allowed in your firewall settings

5. **Still not working?**
   - Run with `--debug` flag for more information:
   ```bash
   npm run dev:cli -- status --debug
   ```

## Examples

### Export Sunday Service to PowerPoint
```bash
npm run dev:cli -- playlists  # Find Sunday Service UUID
npm run dev:cli -- pptx abc123-def456 sunday-service
```

### Export and view as JSON
```bash
npm run dev:cli -- playlists --json
npm run dev:cli -- export --json > lyrics.json
```

### Use with custom host
```bash
npm run dev:cli -- status --host 192.168.1.50 --port 1025
```

## Output Files

PowerPoint exports are created as `<name>.pptx` in the current directory.
JSON exports can be piped to files or formatted as needed.

## System Requirements

- Node.js 18+
- ProPresenter 7 with Network API enabled
- Network connectivity to ProPresenter device

## Support

For issues or feature requests:
- GitHub: https://github.com/adamswbrown/propresenterlyricexport
