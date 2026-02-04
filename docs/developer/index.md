# Developer Guide

[← Back to Home](../index.md)

---

Information for developers and contributors.

## For Developers Contributing Code

- **[Setup & Development](./setup.md)** - Install from source and configure development environment
- **[Architecture & Design](./architecture.md)** - Understand the project structure and design patterns
- **[Building & Distribution](./building.md)** - Create executables and publish releases
- **[Contributing](./contributing.md)** - Code style, commit conventions, and PR process
- **[Release Process](./release-process.md)** - Versioning and release procedures

## Quick Start for Contributors

```bash
# 1. Clone and install
git clone https://github.com/adamswbrown/propresenterlyricexport.git
cd propresenterlyricexport
npm install

# 2. Run development version
npm start -- status

# 3. Run tests
npm test

# 4. Build for distribution
npm run build
npm run build:exe
npm run electron:dev
```

## Technology Stack

- **Language:** TypeScript
- **Runtime:** Node.js 18+
- **Desktop:** Electron 31.2.0 + React 18.3.1
- **APIs:** renewedvision-propresenter SDK
- **Export:** pptxgenjs 3.10.0 (locked)
- **Build:** TypeScript, esbuild, electron-vite
- **Distribution:** pkg (CLI), electron-builder (app)

## Key Concepts

### Shared Core Architecture

The project uses a **shared core + dual distribution** pattern:

```
src/                          (Shared core - both paths use this)
├── propresenter-client.ts    (API wrapper)
├── lyrics-extractor.ts       (Lyric parsing)
└── pptx-exporter.ts          (PowerPoint generation)

electron/                     (Desktop app only)
└── main/index.ts             (Electron main process)

src/cli.ts                    (CLI only)
└── Command-line interface
```

Changes to `src/` affect both CLI and desktop app. UI changes stay isolated.

### Critical Issues

⚠️ **pptxgenjs Locked at 3.10.0** - Never upgrade without resolving bundling issues. Versions 3.11.0+ fail in CLI executables due to dynamic `fs` imports.

## Directory Structure

```
src/
├── cli.ts                         # CLI entry point
├── propresenter-client.ts         # ProPresenter API wrapper
├── lyrics-extractor.ts            # Lyric parsing logic
├── pptx-exporter.ts               # PowerPoint generation
├── services/                      # Reusable business logic
│   ├── playlist-exporter.ts
│   ├── song-matcher.ts
│   ├── bible-fetcher.ts
│   └── ...
├── types/                         # TypeScript interfaces
│   ├── playlist.ts
│   ├── service-order.ts
│   └── ...
└── utils/                         # Pure utility functions

electron/
├── main/index.ts                  # Main process, IPC handlers
├── preload/index.ts               # Preload script
└── renderer/src/
    ├── App.tsx                    # React app root
    ├── ServiceGeneratorView.tsx   # Service Generator component
    └── ...

dist/                              # Compiled CLI (generated)
dist-electron/                     # Compiled Electron (generated)
executables/                       # CLI executables (generated)
release/                           # Packaged Electron app (generated)
```

## Files to Study

**Core Logic:**
- [src/propresenter-client.ts](../../src/propresenter-client.ts) - API wrapper, connection handling
- [src/lyrics-extractor.ts](../../src/lyrics-extractor.ts) - Lyric detection heuristics
- [src/pptx-exporter.ts](../../src/pptx-exporter.ts) - PowerPoint slide generation

**Services:**
- [src/services/song-matcher.ts](../../src/services/song-matcher.ts) - Fuzzy song matching
- [src/services/playlist-exporter.ts](../../src/services/playlist-exporter.ts) - Orchestration
- [src/services/bible-fetcher.ts](../../src/services/bible-fetcher.ts) - Bible verse lookup

**Desktop App:**
- [electron/renderer/src/App.tsx](../../electron/renderer/src/App.tsx) - Main UI, playlist tree
- [electron/renderer/src/ServiceGeneratorView.tsx](../../electron/renderer/src/ServiceGeneratorView.tsx) - Service Generator workflow

**Electron Integration:**
- [electron/main/index.ts](../../electron/main/index.ts) - IPC communication, file dialogs

## Common Development Tasks

### Running the Application

**Development mode:**
```bash
npm start -- status        # CLI
npm run electron:dev       # Desktop app
```

**Production build:**
```bash
npm run build              # Compile TypeScript
npm run build:exe          # Create executables
npm run electron:package   # Package app
```

### Making Changes

**If editing `src/` (core logic):**
1. Test both CLI path and Electron path
2. Run: `npm run build && npm start -- status`
3. Also test: `npm run electron:dev`

**If editing Electron UI:**
1. Changes hot-reload automatically
2. Run: `npm run electron:dev`
3. Test in desktop app

**If editing CLI:**
1. Test directly: `npm start -- [command]`
2. After changes: `npm run build`

### Running Tests

```bash
npm test                   # Run test suite
npm test -- --watch       # Watch mode
npm run coverage          # Coverage report
```

### Committing Code

```bash
# Make your changes
git add src/...

# Commit with descriptive message
git commit -m "feat: Add feature description

- Detailed change 1
- Detailed change 2"

# Follow conventions in CONTRIBUTING.md
```

---

## Next Steps

Choose what you want to explore:

- **[Setup](./setup.md)** - Get development environment running
- **[Architecture](./architecture.md)** - Understand the codebase
- **[Building](./building.md)** - Create releases and executables
- **[Contributing](./contributing.md)** - Make your first contribution
- **[Release Process](./release-process.md)** - Publish new versions

## Getting Help

- **Code questions** - Open an [issue](https://github.com/adamswbrown/propresenterlyricexport/issues) or start a discussion
- **Architecture review** - Check the [CLAUDE.md](../../CLAUDE.md) project guide
- **Setup problems** - See [setup.md](./setup.md) troubleshooting section
- **Contribution guidelines** - Read [contributing.md](./contributing.md)
