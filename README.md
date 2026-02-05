# ProPresenter Lyrics Export

> Extract and export worship song lyrics from ProPresenter 7 presentations in seconds.

A modern desktop + CLI toolkit for worship leaders and production teams who need to capture lyrics from ProPresenter playlists. Choose between the Electron desktop app (recommended) or the original CLI workflow. Both paths support rich PPTX exports and run natively on macOS and Windows.

**[📖 View Full Documentation](https://adamswbrown.github.io/propresenterlyricexport/)** — Complete guides, API reference, troubleshooting, and more.

## Features

- 🎯 **Interactive Playlist Selection** - Browse and select playlists
- 📤 **Multiple Export Formats** - Text, JSON, or beautifully formatted PowerPoint
- ✅ **Connection Validation** - Automatic connectivity checking
- 🔄 **Batch Export** - Export entire playlists in one command
- 🏆 **Service Generator** - Create complete worship service documents with Bible passages
- 🎨 **Customizable Styling** - Fonts, colors, and layouts for PowerPoint export
- 🌍 **Cross-Platform** - Native support for macOS (ARM64 & Intel) and Windows
- 📦 **Standalone Executables** - No Node.js installation required
- 🔤 **Smart Font Detection** - 25+ curated fonts with installation status

## Quick Start

### Option 1: Desktop App (Recommended)

The easiest way to get started.

1. **Download** from [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases)
   - macOS: `ProPresenter-Lyrics.app.zip`
   - Windows: `ProPresenter-Lyrics.exe`

2. **Install & open** - Settings persist automatically

3. **Export** - Connect, select playlist, customize fonts, export PowerPoint

👉 **[Full Desktop App Guide](https://adamswbrown.github.io/propresenterlyricexport/getting-started)**

### Option 2: CLI (Power Users)

The original workflow with terminal commands.

1. **Download executable** from [GitHub Releases](https://github.com/adamswbrown/propresenterlyricexport/releases)

2. **Run setup script** to add to PATH:
   ```bash
   bash scripts/setup-mac.sh              # macOS
   PowerShell -ExecutionPolicy Bypass -File scripts\setup-windows.ps1  # Windows
   ```

3. **Export playlists:**
   ```bash
   propresenter-lyrics pptx               # Interactive mode
   propresenter-lyrics pptx <id> output   # Direct mode
   ```

👉 **[Full CLI Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/cli-guide)**

## Requirements

- **ProPresenter 7** running on your network
- **Network API enabled** in ProPresenter (Preferences → Network → Enable Network API)

## Documentation

Complete documentation is available at **[adamswbrown.github.io/propresenterlyricexport/](https://adamswbrown.github.io/propresenterlyricexport/)** including:

- **[Getting Started](https://adamswbrown.github.io/propresenterlyricexport/getting-started)** - Installation and setup (replaces QUICK_START.md, SETUP.md)
- **[User Guide](https://adamswbrown.github.io/propresenterlyricexport/user-guide)** - Desktop and CLI usage, connection settings, troubleshooting
- **[Service Generator Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/service-generator)** - Create professional worship service documents
- **[CLI Command Reference](https://adamswbrown.github.io/propresenterlyricexport/guides/cli-guide)** - All commands with examples
- **[PPTX Export Guide](https://adamswbrown.github.io/propresenterlyricexport/guides/pptx-export)** - Customization and styling
- **[FAQ & Troubleshooting](https://adamswbrown.github.io/propresenterlyricexport/faq)** - Common questions and solutions
- **[Developer Guide](https://adamswbrown.github.io/propresenterlyricexport/developer)** - Contributing, architecture, building

## Release History

See [CHANGELOG.md](./CHANGELOG.md) for detailed version history.

## License

MIT

## Contributing

Contributions are welcome! See the [Contributing Guide](https://adamswbrown.github.io/propresenterlyricexport/developer/contributing) for details.

## Support

- 📖 **[Documentation](https://adamswbrown.github.io/propresenterlyricexport/)** - Guides and references
- 🐛 **[GitHub Issues](https://github.com/adamswbrown/propresenterlyricexport/issues)** - Report bugs or request features
- ❓ **[FAQ](https://adamswbrown.github.io/propresenterlyricexport/faq)** - Common questions and answers

## Acknowledgments

This project builds on the excellent [renewedvision-propresenter](https://github.com/renewedvision/propresenter-js-sdk) package, which provides the foundation for interacting with ProPresenter 7's Network API.
