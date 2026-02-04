# Release Process Guide

How to publish a new version of ProPresenter Lyrics Export.

## Versioning Scheme

ProPresenter Lyrics Export uses **Semantic Versioning** with a hotfix pattern:

```
MAJOR.MINOR.HOTFIX
   2  .  2  .   1
```

| Version | When | Example | Description |
|---------|------|---------|-------------|
| **MAJOR** | Breaking changes | v3.0.0 | Incompatible API changes, major rewrites |
| **MINOR** | New features | v2.3.0 | New features, significant improvements |
| **HOTFIX** | Bug fixes | v2.2.1 | Bug fixes, small improvements, patches |

## Release Types

### Feature Release (MINOR)

Use for new features or significant improvements. Example: Service Generator in v2.2.0.

**Timeline:** When you've completed a significant feature
**Distribution:** Electron app + CLI executables + GitHub Release
**Announcement:** Update README, social media, etc.

### Hotfix Release (HOTFIX)

Use for bug fixes and small improvements. Example: Nested folder expansion in v2.2.1.

**Timeline:** As soon as a bug is identified and fixed
**Distribution:** Same as feature release
**Announcement:** Brief mention in release notes

### Major Release (MAJOR)

Use for breaking changes only. Very rare.

**Timeline:** When planning incompatible changes
**Distribution:** Same as feature release, with migration guide
**Announcement:** Prominent notice in README and docs

## Pre-Release Checklist

Before starting the release, verify:

- [ ] All code changes committed: `git status` shows clean working tree
- [ ] Branch is up to date: `git pull origin main`
- [ ] Tests pass: `npm test` (if available)
- [ ] CLI works: `npm start -- status`
- [ ] Electron works: `npm run electron:dev`
- [ ] No console errors or warnings

```bash
# Verify everything
git status                    # Must be clean
npm test                      # Must pass
npm run build                 # Must compile
npm start -- status           # Must connect
npm run electron:dev          # Must start
```

## Release Steps

### Step 1: Update Version Files

1. **Update `package.json`** version field:
   ```json
   {
     "version": "2.2.1"
   }
   ```

2. **Update `CHANGELOG.md`** with new section at top:
   ```markdown
   ## [2.2.1] - 2026-02-03

   ### Fixed
   - Fixed nested folder expansion not working properly
   - Resolved issue with deep playlist hierarchies

   ### Details
   More detailed explanation of changes...
   
   ### Previous Releases
   [Previous content...]
   ```

   Include:
   - Date in YYYY-MM-DD format
   - Section for each change type (Added, Fixed, Changed, etc.)
   - User-friendly explanation of what changed and why
   - For new features: brief explanation of usage

**Commit message format:**
```
v2.2.1: Release notes

- Brief change 1
- Brief change 2
```

Example:
```bash
git add package.json CHANGELOG.md
git commit -m "v2.2.1: Nested folder expansion fix

- Fixed recursive folder expansion in playlist tree
- Now expands all nested folders instead of just 2 levels"
```

### Step 2: Create Git Tag

Tags trigger GitHub Actions to build all distributable files.

```bash
# Create tag
git tag v2.2.1

# Push main branch (with version commits)
git push origin main

# Push tag (this triggers GitHub Actions)
git push origin v2.2.1
```

**⚠️ Critical:** Tag MUST match version in `package.json` (include `v` prefix).

### Step 3: GitHub Actions Automation

After pushing the tag, GitHub Actions automatically:

1. **Builds** Electron app (macOS + Windows)
2. **Packages** all executables and installers
3. **Creates** GitHub Release with all files
4. **Publishes** artifacts for download

**Monitor the build:**
- Go to `.github/workflows/` on your repo
- Click the workflow run that matches your tag
- Wait for all jobs to complete (typically 10-15 minutes)

### Step 4: Verify Release (Manual)

After GitHub Actions completes:

1. **Check GitHub Releases page**
   - Visit `https://github.com/adamswbrown/propresenterlyricexport/releases`
   - Verify new version appears with all artifacts

2. **Download and test one file**
   ```bash
   # Test the executable works
   ./propresenter-lyrics-macos-arm64 status
   
   # Test the Electron app starts
   # Open the .zip and run the app
   ```

3. **Verify release notes**
   - Check that CHANGELOG.md content appears in release
   - Verify all file artifacts are listed

### Step 5: Post-Release (Optional)

After a **feature release** (not hotfixes):

1. **Update README.md** if needed
2. **Update project documentation** for new features
3. **Announce release** (Discord, social media, etc.)
4. **Celebrate!** 🎉

## Common Scenarios

### Scenario 1: Hotfix for Bug (v2.2.0 → v2.2.1)

```bash
# 1. Fix the bug in code
# Edit src/file.ts, test with npm start -- command

# 2. Update files
# - Change version in package.json to 2.2.1
# - Add entry to CHANGELOG.md

# 3. Commit and tag
git add package.json CHANGELOG.md src/file.ts
git commit -m "v2.2.1: Fix issue with X

- Fixed bug description
- Tested with scenario Y"

git tag v2.2.1
git push origin main
git push origin v2.2.1

# 4. Monitor GitHub Actions completion
# 5. Test release from GitHub
```

### Scenario 2: Feature Release (v2.2.0 → v2.3.0)

```bash
# 1. Complete feature and test thoroughly
npm test
npm start -- status
npm run electron:dev

# 2. Update version to 2.3.0
# - Update package.json
# - Add to CHANGELOG.md with detailed feature description

# 3. Commit
git add package.json CHANGELOG.md
git commit -m "v2.3.0: New feature name

Detailed description of what the feature does and why it's useful.

- Feature detail 1
- Feature detail 2

Closes #123"

# 4. Tag and push
git tag v2.3.0
git push origin main
git push origin v2.3.0

# 5. Wait for GitHub Actions
# 6. Test release downloads
# 7. Update README if needed
# 8. Announce release
```

### Scenario 3: Fixing a Bad Release

If you accidentally tagged without committing code changes:

```bash
# 1. Delete local and remote tags
git tag -d v2.2.1
git push origin :v2.2.1

# 2. Commit the missing changes
git add src/file.ts
git commit -m "Include fixes for v2.2.1"

# 3. Update version and changelog again
git add package.json CHANGELOG.md
git commit -m "v2.2.1: Release notes"

# 4. Re-create and push tag
git tag v2.2.1
git push origin main
git push origin v2.2.1
```

## Release Notes Guidelines

Good release notes explain:

1. **What changed** - Feature or fix description
2. **Why it matters** - User benefit or problem solved
3. **How to use it** (for features) - Brief example or link to docs

**Example (Feature):**
```markdown
## [2.2.0] - 2026-02-02

### Added
- **Service Generator** - New feature for creating complete worship service documents
  - Automatically parse song files from presentations
  - Match songs against ProPresenter library
  - Add Bible passages from online database
  - Generate formatted PDF or PowerPoint service documents
  - See [Service Generator Guide](docs/guides/service-generator.md) for details
```

**Example (Hotfix):**
```markdown
## [2.2.1] - 2026-02-03

### Fixed
- Fixed playlist tree not expanding nested folders properly
  - Now recursively expands all folder levels by default
  - Improves usability for deeply nested playlists
```

## Troubleshooting

### Tag Already Exists

```bash
# Delete local tag
git tag -d v2.2.1

# Delete remote tag
git push origin :v2.2.1

# Re-create with correct commit
git tag v2.2.1
git push origin v2.2.1
```

### GitHub Actions Failed

1. **Check workflow logs** in Actions tab
2. **Look for error message** in job output
3. **Common issues:**
   - Node.js version mismatch → Update `node-version` in workflow
   - Dependency issue → Update `package-lock.json`
   - Build script error → Test locally with `npm run build`

### Release Notes Not Updating

```bash
# Verify CHANGELOG.md was committed
git log --oneline | grep "v2.2.1"

# If missing, edit CHANGELOG.md and re-commit
git add CHANGELOG.md
git commit --amend -m "v2.2.1: Release notes with fixes

- Updated changelog"
```

### Executables Not Generated

1. Check GitHub Actions logs in `.github/workflows/` tab
2. Verify all scripts in `scripts/` folder exist and are executable
3. Ensure `package-lock.json` is committed
4. Try building locally:
   ```bash
   npm run build:exe
   ```

## Release Cadence

- **Hotfixes:** As needed (typically weekly)
- **Features:** When ready (typically monthly)
- **Major versions:** Planned (rare, with migration guide)

## Before Next Release

After publishing:

1. **Create new issue** for next feature
2. **Update documentation** with new capabilities
3. **Monitor feedback** for bugs or issues
4. **Plan hotfixes** if needed

## References

- **[Semantic Versioning](https://semver.org/)** - Version numbering standard
- **[Conventional Commits](https://www.conventionalcommits.org/)** - Commit message format
- **[CHANGELOG Best Practices](https://keepachangelog.com/)** - Release notes guide
- **[CLAUDE.md Release Process](../../CLAUDE.md#release-process-majorminorhotfix)** - Project-specific guidelines

## Questions?

See [CLAUDE.md](../../CLAUDE.md) for project-specific release guidelines and common mistakes to avoid.
