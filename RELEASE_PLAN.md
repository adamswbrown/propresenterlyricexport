# GitHub Actions Release Plan

## Overview

Automated release workflow for ProPresenter Lyrics Export that builds cross-platform Electron executables and publishes them to GitHub Releases.

## Goals

1. **Automated Builds**: Build macOS and Windows Electron apps on every release
2. **GitHub Releases Integration**: Automatically create releases and upload artifacts
3. **Version Management**: Use Git tags for version control
4. **Quality Assurance**: Run tests before building releases
5. **Code Signing** (future): Sign macOS and Windows builds for distribution

---

## Release Strategy

### Triggering Releases

**Option 1: Tag-based (Recommended)**
- Push a version tag (e.g., `v1.0.0`) to trigger release build
- Automatically creates GitHub Release from tag
- Builds and uploads artifacts

**Option 2: Manual Workflow Dispatch**
- Manually trigger release workflow from GitHub Actions UI
- Useful for testing or special releases

**Option 3: Push to Main (Not Recommended)**
- Triggers on every push to main branch
- Creates draft releases that need manual approval

**Recommended Approach**: Tag-based releases (Option 1)

```bash
# Create and push a release
npm version patch  # or minor, major
git push origin main --tags
```

---

## Workflow Structure

### File: `.github/workflows/release.yml`

**Trigger Conditions:**
- Git tags matching `v*.*.*` pattern (e.g., v1.0.0, v2.1.3)
- Manual workflow dispatch

**Jobs:**
1. **Test Job**: Run tests before building
2. **Build Job**: Build for macOS and Windows in parallel
3. **Release Job**: Create GitHub Release and upload artifacts

**Build Matrix:**
```yaml
os: [macos-latest, windows-latest]
```

---

## Build Configuration

### electron-builder.json

Create configuration file for Electron Builder with platform-specific settings:

```json
{
  "appId": "com.propresenterlyrics.app",
  "productName": "ProPresenter Lyrics",
  "directories": {
    "output": "release"
  },
  "files": [
    "dist-electron/**/*",
    "node_modules/**/*",
    "package.json"
  ],
  "mac": {
    "category": "public.app-category.productivity",
    "target": [
      {
        "target": "dmg",
        "arch": ["x64", "arm64"]
      },
      {
        "target": "zip",
        "arch": ["x64", "arm64"]
      }
    ],
    "icon": "assets/icon.icns"
  },
  "dmg": {
    "title": "${productName} ${version}",
    "contents": [
      {
        "x": 130,
        "y": 220
      },
      {
        "x": 410,
        "y": 220,
        "type": "link",
        "path": "/Applications"
      }
    ]
  },
  "win": {
    "target": [
      {
        "target": "nsis",
        "arch": ["x64"]
      },
      {
        "target": "portable",
        "arch": ["x64"]
      }
    ],
    "icon": "assets/icon.ico"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  }
}
```

### Output Artifacts

**macOS:**
- `ProPresenter-Lyrics-{version}-arm64.dmg` (Apple Silicon)
- `ProPresenter-Lyrics-{version}-x64.dmg` (Intel)
- `ProPresenter-Lyrics-{version}-arm64-mac.zip`
- `ProPresenter-Lyrics-{version}-x64-mac.zip`

**Windows:**
- `ProPresenter-Lyrics-Setup-{version}.exe` (Installer)
- `ProPresenter-Lyrics-{version}-win.exe` (Portable)

---

## GitHub Actions Workflow

### Step-by-Step Flow

**1. Trigger**: Tag pushed (e.g., `v1.0.0`)

**2. Test Job** (runs first)
```yaml
- Checkout code
- Setup Node.js
- Install dependencies
- Run TypeScript compilation
- Run tests (if available)
- Block release if tests fail
```

**3. Build Job** (runs in parallel for each OS)
```yaml
macOS runner:
  - Checkout code
  - Setup Node.js
  - Install dependencies
  - Build Electron app
  - Upload macOS artifacts

Windows runner:
  - Checkout code
  - Setup Node.js
  - Install dependencies
  - Build Electron app
  - Upload Windows artifacts
```

**4. Release Job** (runs after builds succeed)
```yaml
- Download all artifacts
- Extract version from tag
- Create GitHub Release
- Upload all artifacts to release
- Generate release notes
```

---

## Versioning Strategy

### Semantic Versioning

Use semantic versioning (semver): `MAJOR.MINOR.PATCH`

- **MAJOR**: Breaking changes (v1.0.0 → v2.0.0)
- **MINOR**: New features, backward compatible (v1.0.0 → v1.1.0)
- **PATCH**: Bug fixes (v1.0.0 → v1.0.1)

### Version Management

**package.json** is the source of truth for version number.

**Workflow:**
```bash
# Update version in package.json
npm version patch   # 1.0.0 → 1.0.1
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0

# Push changes and tags
git push origin main --tags

# GitHub Actions automatically builds and releases
```

**Prerelease Versions** (optional):
```bash
npm version prerelease --preid=beta  # 1.0.0 → 1.0.1-beta.0
git push origin main --tags
```

---

## GitHub Release Notes

### Auto-generated Release Notes

GitHub can automatically generate release notes from:
- Merged pull requests
- Commit messages
- Contributors

### Custom Release Notes Template

Create `.github/release.yml`:
```yaml
changelog:
  exclude:
    labels:
      - ignore-for-release
  categories:
    - title: 🚀 New Features
      labels:
        - feature
        - enhancement
    - title: 🐛 Bug Fixes
      labels:
        - bug
        - fix
    - title: 📚 Documentation
      labels:
        - documentation
    - title: 🔧 Other Changes
      labels:
        - "*"
```

---

## Secrets and Environment Variables

### Required GitHub Secrets

**For basic builds:**
- None required (builds work without secrets)

**For code signing (future):**
- `APPLE_CERTIFICATE` - macOS code signing certificate (base64)
- `APPLE_CERTIFICATE_PASSWORD` - Certificate password
- `APPLE_ID` - Apple Developer account email
- `APPLE_APP_SPECIFIC_PASSWORD` - App-specific password
- `WINDOWS_CERTIFICATE` - Windows code signing certificate (base64)
- `WINDOWS_CERTIFICATE_PASSWORD` - Certificate password

### Environment Variables in Workflow

```yaml
env:
  GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}  # Auto-provided by GitHub
  NODE_VERSION: '18'
```

---

## Implementation Checklist

### Phase 1: Basic Release (No Code Signing)

- [ ] Create `.github/workflows/release.yml`
- [ ] Create `electron-builder.config.js` (or update existing)
- [ ] Update `.gitignore` to exclude `release/` directory
- [ ] Create app icons:
  - [ ] `assets/icon.icns` (macOS)
  - [ ] `assets/icon.ico` (Windows)
  - [ ] `assets/icon.png` (512x512)
- [ ] Test workflow with tag push
- [ ] Verify artifacts upload to GitHub Releases
- [ ] Update README with download links

### Phase 2: Code Signing (Future)

- [ ] Obtain Apple Developer account ($99/year)
- [ ] Create macOS certificates
- [ ] Add Apple secrets to GitHub
- [ ] Configure notarization in electron-builder
- [ ] Obtain Windows code signing certificate
- [ ] Add Windows secrets to GitHub
- [ ] Test signed builds

### Phase 3: Auto-update (Future)

- [ ] Implement electron-updater
- [ ] Configure update server
- [ ] Add update checks to app
- [ ] Test auto-update flow

---

## Testing the Workflow

### Test on Fork First

1. **Fork the repository** (optional safety step)
2. **Create a test tag:**
   ```bash
   git tag v0.0.1-test
   git push origin v0.0.1-test
   ```
3. **Monitor GitHub Actions**:
   - Go to Actions tab
   - Watch workflow run
   - Check for errors
4. **Verify Release**:
   - Go to Releases tab
   - Check that release was created
   - Download and test artifacts
5. **Delete test release and tag** when done

### Local Testing

Test build locally before pushing:
```bash
# Build for current platform
npm run electron:build

# Check output in release/ directory
ls -la release/
```

---

## Maintenance

### Updating Dependencies

Keep electron-builder and related packages updated:
```bash
npm update electron-builder electron
```

### Monitoring Builds

- GitHub Actions sends email notifications on failure
- Review failed builds in Actions tab
- Check build logs for errors

### Release Cadence

**Suggested Schedule:**
- **Patch releases**: As needed for critical bugs
- **Minor releases**: Monthly or when significant features are ready
- **Major releases**: Annually or for breaking changes

---

## Migration from Current Setup

### Current State
- Manual builds using `npm run build:exe`
- Manual upload to GitHub Releases
- CLI executables only (no GUI)

### After Electron Merge
1. Merge `feature/electron-gui` branch to `main`
2. Implement GitHub Actions workflow (Phase 1)
3. Create first automated release (v1.0.0)
4. Update documentation with new download links

### Keeping CLI Executables (Optional)

You can still build standalone CLI executables alongside Electron:

**Option A**: Separate workflow for CLI
```yaml
# .github/workflows/cli-release.yml
# Builds pkg executables for CLI-only users
```

**Option B**: Include CLI in Electron release
- Bundle CLI executable inside Electron app
- Make available via menu or command palette

---

## Cost Considerations

**GitHub Actions:**
- Public repositories: Unlimited minutes (free)
- Private repositories: 2,000 minutes/month (free tier)
- Build times: ~10-15 minutes per release
- Cost: $0 for public repos

**Apple Developer:**
- $99/year for code signing (optional, future)

**Windows Certificate:**
- ~$100-500/year (optional, future)

---

## Resources

- [Electron Builder Docs](https://www.electron.build/)
- [GitHub Actions Docs](https://docs.github.com/en/actions)
- [electron-builder Multi-Platform Build](https://www.electron.build/multi-platform-build)
- [Code Signing Guide](https://www.electron.build/code-signing)

---

## Next Steps

1. **Review this plan** and approve approach
2. **Wait for Electron branch merge**
3. **Implement Phase 1** (Basic Release workflow)
4. **Test with v1.0.0 release**
5. **Plan Phase 2** (Code signing) based on distribution needs
