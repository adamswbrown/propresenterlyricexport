# Development Setup

Get your development environment running.

## Prerequisites

- **Node.js 18+** (required)
- **npm 9+** (usually comes with Node.js)
- **ProPresenter 7** (for testing)
- **Git** (for version control)

## Installation from Source

### 1. Clone the Repository

```bash
git clone https://github.com/adamswbrown/propresenterlyricexport.git
cd propresenterlyricexport
```

### 2. Install Dependencies

```bash
npm install
```

This installs:
- TypeScript compiler
- Development tools
- All runtime dependencies
- Electron framework (for desktop app)

### 3. Verify Setup

```bash
# Test CLI
npm start -- status

# This should show:
# ProPresenter 7.x.x
# (or connection error if ProPresenter isn't running)
```

## Development Commands

### Running the CLI

```bash
# Development mode (from source)
npm start -- <command>

# Examples:
npm start -- status
npm start -- playlists
npm start -- pptx
npm start -- export --json
```

All CLI commands work in development mode - changes to TypeScript files don't require rebuilding.

### Running the Desktop App

```bash
# Development mode with hot reload
npm run electron:dev

# This starts:
# 1. Webpack dev server (handles changes)
# 2. Electron main process
# 3. React renderer (hot reload on file changes)
```

**Features in dev mode:**
- Changes hot-reload automatically
- Error messages show in console
- Redux dev tools available
- Debug tools open automatically

### Building

```bash
# Compile TypeScript to JavaScript
npm run build

# Creates:
# dist/          - CLI executable code
# dist-electron/ - Electron bundles

# Build standalone executables (macOS & Windows)
npm run build:exe

# Creates:
# executables/propresenter-lyrics-macos-x64
# executables/propresenter-lyrics-macos-arm64
# executables/propresenter-lyrics-win-x64.exe

# Build Electron app
npm run electron:build
npm run electron:package

# Creates:
# release/mac-arm64/   - macOS app
# release/mac-x64/     - macOS Intel app
# release/win-unpacked/ - Windows app
```

### Testing

```bash
# Run tests
npm test

# Watch mode (re-run on changes)
npm test -- --watch

# Coverage report
npm run coverage
```

## Debugging

### Debug CLI Commands

```bash
# Use --debug flag to see API responses
npm start -- status --debug
npm start -- export --debug
npm start -- pptx --debug
```

### Debug Electron App

1. **Console messages:** Visible in dev tools (Ctrl/Cmd+I)
2. **Source maps:** Included for TypeScript debugging
3. **DevTools:** Open automatically in dev mode
4. **Network tab:** Shows ProPresenter API calls

### Visual Studio Code

**Recommended extensions:**
- ESLint
- Prettier
- TypeScript

**Debug configuration** (`.vscode/launch.json`):
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "CLI",
      "program": "${workspaceFolder}/dist/cli.js",
      "args": ["status"],
      "outFiles": ["${workspaceFolder}/dist/**/*.js"]
    }
  ]
}
```

## Common Development Tasks

### Add a New CLI Command

1. **Edit** `src/cli.ts`:
   ```typescript
   if (command === 'mynewcommand') {
     const result = await myNewCommand(config);
     console.log(result);
   }
   ```

2. **Create** `src/mynewcommand.ts`:
   ```typescript
   export async function myNewCommand(config: ConnectionConfig) {
     // implementation
     return result;
   }
   ```

3. **Test** it:
   ```bash
   npm start -- mynewcommand
   ```

### Modify Core Logic

If editing `src/propresenter-client.ts`, `src/lyrics-extractor.ts`, or `src/pptx-exporter.ts`:

1. **Make changes** to TypeScript files
2. **Rebuild:** `npm run build`
3. **Test both paths:**
   ```bash
   npm start -- status           # CLI
   npm run electron:dev          # Desktop app
   ```

### Add React Component to Desktop App

1. **Create** `electron/renderer/src/MyComponent.tsx`:
   ```typescript
   export function MyComponent() {
     return <div>Component</div>;
   }
   ```

2. **Import** in `electron/renderer/src/App.tsx`:
   ```typescript
   import { MyComponent } from './MyComponent';
   ```

3. **Use** in JSX:
   ```typescript
   <MyComponent />
   ```

4. **Hot reload** happens automatically when you save

### Update Dependencies

```bash
# Check for updates
npm outdated

# Update all (carefully!)
npm update

# Update specific package
npm update pptxgenjs

# ⚠️ DO NOT update pptxgenjs beyond 3.10.0
# (causes bundling issues in CLI executables)
```

## Environment Setup

### ProPresenter for Testing

1. Run ProPresenter 7 locally
2. Go to Preferences → Network
3. Enable "Network API"
4. Note the port (usually 1025)
5. App connects to `127.0.0.1:1025` by default

### Code Editor Setup

**VS Code settings** (`.vscode/settings.json`):
```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "[typescript]": {
    "editor.defaultFormatter": "esbenp.prettier-vscode"
  }
}
```

### Git Hooks

```bash
# Install git hooks (pre-commit linting)
npm run prepare

# This sets up husky to lint before commits
```

## Troubleshooting Development

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install

# Rebuild TypeScript
npm run build
```

### Port 3000 already in use (Electron dev)

```bash
# Kill the process
lsof -i :3000  # macOS/Linux
kill -9 <PID>

# Or use different port
PORT=3001 npm run electron:dev
```

### ProPresenter connection fails in dev

1. Verify ProPresenter is running
2. Check Network API is enabled
3. Test with status command:
   ```bash
   npm start -- status --debug
   ```
4. Restart ProPresenter and try again

### Electron app won't start

```bash
# Clear cache and rebuild
rm -rf dist-electron
npm run electron:build
npm run electron:dev
```

## Next Steps

- **[Architecture](./architecture.md)** - Understand the codebase design
- **[Contributing](./contributing.md)** - Code style and PR process
- **[Building](./building.md)** - Create releases
- **[Release Process](./release-process.md)** - Version and publish
