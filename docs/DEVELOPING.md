# Development Guide

This document is for developers who want to contribute to ProPresenter Lyrics Export or run it from source.

## Prerequisites

- **Node.js 18+** required
- **ProPresenter 7** running with Network API enabled

## Installation from Source

```bash
# Clone the repository
git clone https://github.com/adamswbrown/propresenterlyricexport.git
cd propresenterlyricexport

# Install dependencies
npm install

# Test your setup
npm start -- status
```

## Development Commands

### Running from Source

```bash
# Run the CLI (same as 'npm run dev')
npm start -- [command] [options]

# Examples:
npm start -- playlists
npm start -- pptx
npm start -- export --json
npm start -- status --host 192.168.1.100
```

### Building

```bash
# Compile TypeScript to JavaScript
npm run build

# Build standalone executables for all platforms
npm run build:exe

# Build macOS app bundle
npm run build:macos

# Create macOS DMG installer
npm run build:macos:dmg

# Build everything (executables + DMG + Electron app)
npm run release:bundle
```

### Development Workflow

1. Make changes to TypeScript files in `src/`
2. Test with `npm start -- <command>`
3. Build with `npm run build`
4. Test the compiled version in `dist/`

## Project Structure

```
src/
├── cli.ts                    # Main CLI entry point and commands
├── propresenter-client.ts    # ProPresenter Network API wrapper
├── lyrics-extractor.ts       # Lyrics detection and formatting
├── pptx-exporter.ts          # PowerPoint generation
└── index.ts                  # Library exports

dist/                         # Compiled JavaScript (generated)
executables/                  # Standalone binaries (generated)
scripts/                      # Build and setup scripts
package.json                  # Dependencies and scripts
tsconfig.json                 # TypeScript configuration
```

## Command Examples with npm

All the examples in the main README use `propresenter-lyrics` (the standalone executable). When developing from source, replace that with `npm start --`:

| User Command | Developer Command |
|--------------|-------------------|
| `propresenter-lyrics status` | `npm start -- status` |
| `propresenter-lyrics pptx` | `npm start -- pptx` |
| `propresenter-lyrics export --json` | `npm start -- export --json` |
| `propresenter-lyrics playlists` | `npm start -- playlists` |

### Full Command Reference

```bash
# Show all playlists
npm start -- playlists

# Show items in a specific playlist
npm start -- playlist <uuid>

# List all libraries
npm start -- libraries

# Export playlist (interactive mode)
npm start -- export

# Export playlist (direct mode)
npm start -- export <playlist-uuid>

# Export to PowerPoint (interactive)
npm start -- pptx

# Export to PowerPoint (direct)
npm start -- pptx <playlist-uuid> [output-filename]

# Show current active presentation
npm start -- current

# Show focused presentation
npm start -- focused

# Inspect a specific presentation by UUID
npm start -- inspect <presentation-uuid>

# Watch for slide changes in real-time
npm start -- watch

# Show help
npm start -- --help
```

### Command Options

All commands support these flags:

- `--host, -h <host>` - ProPresenter host (default: 127.0.0.1)
- `--port, -p <port>` - ProPresenter port (default: 1025)
- `--json, -j` - Output as JSON instead of text
- `--debug, -d` - Show raw API responses
- `--help` - Show help message

## Testing Changes

```bash
# Test the status command
npm start -- status

# Test export with a specific playlist
npm start -- export

# Test with different host/port
npm start -- playlists --host 192.168.1.100 --port 1025

# Test JSON output
npm start -- export --json

# Test with debug output
npm start -- watch --debug
```

## Building Executables

The standalone executables are built using [pkg](https://github.com/vercel/pkg):

```bash
# Build all platform executables
npm run build:exe

# This creates:
# - executables/propresenter-lyrics-win-x64.exe
# - executables/propresenter-lyrics-macos-x64
# - executables/propresenter-lyrics-macos-arm64
```

## TypeScript Configuration

The project uses strict TypeScript settings in `tsconfig.json`:

- **Target**: ES2020
- **Module**: CommonJS
- **Strict mode**: Enabled
- **Output**: `dist/` directory

## Dependencies

### Production Dependencies
- **renewedvision-propresenter** (^7.7.2) - ProPresenter 7 Network API wrapper
- **pptxgenjs** (^3.10.0) - PowerPoint presentation generation

### Development Dependencies
- **TypeScript** (^5.9.3) - Language and type checking
- **ts-node** (^10.9.2) - Run TypeScript directly
- **@types/node** (^25.2.0) - Node.js type definitions
- **pkg** (^5.8.1) - Create standalone executables

## Contributing

### Before Submitting a PR

1. **Test your changes** thoroughly
2. **Run the build** to ensure no TypeScript errors
3. **Test the executable** if you changed core functionality
4. **Update documentation** if you added/changed features
5. **Follow the existing code style**

### Code Style

- Use TypeScript strict mode
- Prefer async/await over callbacks
- Use descriptive variable and function names
- Add comments for complex logic
- Keep functions focused and single-purpose

### Commit Messages

Follow the existing commit style:

```
Add feature for custom playlist filtering

- Implement new filtering logic in lyrics-extractor.ts
- Add CLI flag for custom filters
- Update documentation

Co-Authored-By: Claude Sonnet 4.5 <noreply@anthropic.com>
```

## Debugging

### Enable Debug Output

```bash
npm start -- watch --debug
```

This shows raw API responses from ProPresenter.

### Common Issues

**"Cannot find module" errors:**
```bash
npm install
npm run build
```

**TypeScript errors:**
```bash
npm run build
# Fix any reported errors
```

**Connection issues:**
```bash
# Test connection first
npm start -- status

# Verify ProPresenter settings
# Preferences → Network → Enable Network API
```

## Release Process

1. Update version in `package.json`
2. Build all distributables: `npm run release:bundle`
3. Test executables on each platform
4. Create GitHub Release
5. Upload executables to release
6. Update release notes

## Support

For development questions or issues:

1. Check existing [GitHub Issues](https://github.com/adamswbrown/propresenterlyricexport/issues)
2. Review this document and README.md
3. Open a new issue with:
   - Your development environment
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages or logs

## License

MIT - See [LICENSE](./LICENSE) file for details
