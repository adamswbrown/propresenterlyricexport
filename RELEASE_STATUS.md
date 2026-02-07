# Release v2.3.3 Status

## Summary
Release v2.3.3 is ready to be published. All preparation steps have been completed.

## Current State

### ✅ Completed
1. **Version Updated**: package.json version is `2.3.3`
2. **Release Notes Added**: CHANGELOG.md contains comprehensive release notes for v2.3.3 dated 2026-02-07
3. **Git Tag Created**: Local tag `v2.3.3` has been created
4. **Working Tree Clean**: No uncommitted changes

### 📋 Release Notes (v2.3.3)

#### Fixed
- **Library Filter Not Respecting "All items in playlist"** - Fixed exports failing when "All items in playlist" was selected
  - When library filter was set to blank/"All items in playlist", the app incorrectly fell back to the stored "Worship" default
  - Playlists with items from non-Worship libraries (Kids, STEAM, etc.) would fail with "No lyric slides found" error
  - Filter logic now correctly distinguishes between explicit `null` (user wants all items) and `undefined` (use stored setting)
  - Both export and settings persistence now use consistent null-checking pattern

## Next Steps to Complete Release

### Option 1: Manual Tag Push (Recommended)
Since the automated agent cannot push tags, a maintainer with push access needs to:

```bash
# Push the tag to trigger GitHub Actions release workflow
git push origin v2.3.3
```

This will automatically trigger the `.github/workflows/release.yml` workflow which will:
1. Build macOS Electron app (.zip)
2. Build Windows Electron installer (.exe)
3. Create a GitHub Release with all artifacts attached

### Option 2: Recreate Tag and Push
If the local tag needs to be recreated:

```bash
# Delete local tag if needed
git tag -d v2.3.3

# Recreate tag
git tag v2.3.3

# Push the tag
git push origin v2.3.3
```

### Option 3: Merge to Main and Tag from Main Branch
If this branch needs to be merged first:

```bash
# Merge this branch to main
git checkout main
git merge copilot/update-release-notes

# Tag the release
git tag v2.3.3

# Push both
git push origin main
git push origin v2.3.3
```

## Verification After Release

Once the tag is pushed and GitHub Actions completes (10-15 minutes):

1. Go to https://github.com/adamswbrown/propresenterlyricexport/actions
2. Verify the "Release Desktop Builds" workflow completed successfully
3. Go to https://github.com/adamswbrown/propresenterlyricexport/releases
4. Verify v2.3.3 release is created with artifacts:
   - ProPresenter-Lyrics-v2.3.3-mac.zip (macOS Electron app)
   - ProPresenter-Lyrics-v2.3.3-win.exe (Windows installer)

## Files Ready for Release

- ✅ package.json (version: 2.3.3)
- ✅ CHANGELOG.md (release notes for 2.3.3)
- ✅ All source code committed
- ✅ Git tag v2.3.3 created locally

## Branch Information

- Current Branch: `copilot/update-release-notes`
- Latest Commit: `bc3fcb7` - "Prepare release v2.3.3 - tag created, ready for push"
- Tag Location: `v2.3.3` → commit `bc3fcb7`

---

**Note**: The automated agent has prepared everything for the release. A maintainer with repository push access needs to push the tag to trigger the automated build and release process.
