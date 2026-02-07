# 🚀 Release v2.3.3 - Final Instructions

## ✅ Status: READY FOR RELEASE

All automated preparation for release v2.3.3 has been completed by the Copilot agent.

## 📦 What's Been Prepared

### Version & Documentation
- ✅ **package.json** updated to version `2.3.3`
- ✅ **CHANGELOG.md** contains release notes for v2.3.3 (dated 2026-02-07)
- ✅ **Git tag** `v2.3.3` created at commit `19ebdcc`
- ✅ **Working tree** is clean (no uncommitted changes)
- ✅ **Release documentation** created (RELEASE_STATUS.md, this file)

### Git Repository State
```
Branch: copilot/update-release-notes
Latest Commit: 19ebdcc - "Final update to RELEASE_STATUS.md - v2.3.3 ready for release"
Tag: v2.3.3 → commit 19ebdcc
Status: Clean working tree, ready to push tag
```

## 🎯 What This Release Fixes

### Library Filter Bug (Critical Fix)
**Problem:** Exports were failing when "All items in playlist" library filter was selected.

**Root Cause:** When library filter was set to blank/"All items in playlist", the app incorrectly fell back to the stored "Worship" default, causing playlists with items from non-Worship libraries (Kids, STEAM, etc.) to fail with "No lyric slides found" error.

**Solution:** Filter logic now correctly distinguishes between:
- Explicit `null` = User wants all items from playlist
- `undefined` = Use the stored library preference

Both export and settings persistence now use consistent null-checking pattern.

## 🔧 Required Action: Push the Tag

The automated Copilot agent **cannot push git tags** due to environment limitations. A human maintainer with repository push access must execute:

```bash
# Navigate to repository
cd /path/to/propresenterlyricexport

# Fetch latest changes from the branch
git fetch origin copilot/update-release-notes
git checkout copilot/update-release-notes
git pull

# Verify the tag exists locally
git tag -l v2.3.3

# If the tag doesn't exist locally, create it
git tag v2.3.3

# Push the tag to GitHub (this triggers the release workflow)
git push origin v2.3.3
```

## 🤖 What Happens After Pushing the Tag

When you push the tag `v2.3.3`, GitHub Actions will automatically:

1. **Trigger Workflow:** `.github/workflows/release.yml`
2. **Build macOS App:** macOS Electron app packaged as .zip
3. **Build Windows App:** Windows Electron installer as .exe  
4. **Create Release:** GitHub Release created with all artifacts attached

**Build Time:** 10-15 minutes

## 📊 Verification Steps

### 1. Monitor GitHub Actions
Visit: https://github.com/adamswbrown/propresenterlyricexport/actions

Look for the "Release Desktop Builds" workflow running for tag `v2.3.3`

**Expected Jobs:**
- ✅ macOS App
- ✅ Windows EXE  
- ✅ Publish Release

### 2. Check GitHub Releases
Visit: https://github.com/adamswbrown/propresenterlyricexport/releases

Verify the v2.3.3 release appears with:
- **Tag:** v2.3.3
- **Title:** Auto-generated or manually set
- **Artifacts:**
  - `ProPresenter-Lyrics-v2.3.3-mac.zip` (~50-100 MB)
  - `ProPresenter-Lyrics-v2.3.3-win.exe` (~80-150 MB)

### 3. Test Downloads (Optional)
Download and test the built artifacts:

**macOS:**
```bash
# Download the .zip file from GitHub Releases
# Extract and test
unzip ProPresenter-Lyrics-v2.3.3-mac.zip
# Open the app or run from command line
```

**Windows:**
```powershell
# Download the .exe installer from GitHub Releases
# Run the installer
.\ProPresenter-Lyrics-v2.3.3-win.exe
```

## 🆘 Troubleshooting

### If Tag Push Fails
```bash
# If authentication fails, check your GitHub credentials
git config --list | grep user

# If tag already exists remotely, delete and recreate
git push origin :refs/tags/v2.3.3  # Delete remote tag
git tag -f v2.3.3                   # Force update local tag
git push origin v2.3.3              # Push again
```

### If GitHub Actions Fails
1. Check the workflow logs in GitHub Actions
2. Common issues:
   - Node.js version mismatch
   - Missing dependencies  
   - TypeScript compilation errors
   - Electron builder configuration issues

3. If build fails, you can manually fix and re-push:
   ```bash
   # Fix the issue in code
   git commit -am "Fix build issue"
   git push origin copilot/update-release-notes
   
   # Move tag to new commit
   git tag -f v2.3.3
   git push origin v2.3.3 --force
   ```

## 📚 Related Documentation

- **RELEASE_STATUS.md** - Detailed release status and preparation checklist
- **CHANGELOG.md** - Full v2.3.3 release notes and version history
- **docs/RELEASING.md** - Complete release process documentation
- **docs/developer/release-process.md** - Developer-focused release guide

## ✉️ Post-Release Communication

After the release is published, consider:

1. **Notify Users:** Announce the release (GitHub Discussions, Discord, etc.)
2. **Update Documentation:** Ensure all docs reference the new version
3. **Close Issues:** Link and close any issues fixed in this release
4. **Merge PR:** Merge the `copilot/update-release-notes` branch if needed

---

**Summary:** Everything is ready. Just push the tag `v2.3.3` and GitHub Actions will handle the rest! 🚀
