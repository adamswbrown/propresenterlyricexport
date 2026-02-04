# Documentation Consolidation Plan

## Current State: Repetition Issues

**Files with overlapping content:**
- `README.md` - Has installation, quick start, features overview (395 lines)
- `QUICK_START.md` - Has CLI setup and basic commands (158 lines)
- `docs/DEVELOPING.md` - Has installation from source and commands (286 lines)
- `docs/SETUP.md` - Has setup instructions
- `docs/DISTRIBUTION.md` - Has platform-specific setup
- `PRO PRESENTER SETUP.md` - ProPresenter configuration steps
- `CLAUDE.md` - Architecture and project info

**Duplication identified:**
- Installation instructions appear in: README, QUICK_START, DEVELOPING, SETUP, DISTRIBUTION
- ProPresenter setup appears in: multiple files
- Command reference appears in: QUICK_START, DEVELOPING, DISTRIBUTION
- Environment variables documented in: QUICK_START, DISTRIBUTION, DEVELOPING

---

## Consolidated GitHub Pages Structure

```
docs/
├── _config.yml                 # Jekyll configuration (NEW)
├── index.md                    # Homepage (NEW)
├── getting-started.md          # Consolidated setup (NEW)
├── user-guide.md              # Desktop app workflow (TO CREATE)
├── guides/
│   ├── cli-guide.md           # CLI commands reference (TO CREATE)
│   ├── service-generator.md   # Service Generator guide (TO CREATE)
│   └── pptx-export.md         # PPTX formatting (TO CREATE)
├── developer/
│   ├── index.md               # Developer overview (FROM CLAUDE.md)
│   ├── setup.md               # Development setup (FROM DEVELOPING.md)
│   ├── architecture.md        # Architecture overview
│   ├── building.md            # Build & distribution
│   └── contributing.md        # Contributing guidelines
├── faq.md                      # FAQ & troubleshooting (NEW)
├── DEVELOPING.md              # Keep for reference (DEPRECATED)
├── DISTRIBUTION.md            # Keep for reference (DEPRECATED)
└── RELEASING.md               # Keep for reference (DEPRECATED)
```

---

## Files to Consolidate/Update

### Primary Content Sources (for users)
1. **getting-started.md** ✅ CREATED
   - Consolidates: QUICK_START.md, SETUP.md, PRO PRESENTER SETUP.md, parts of README.md
   - Single source for all installation paths

2. **user-guide.md** (TO CREATE)
   - Consolidates: README features, parts of DEVELOPING.md
   - Desktop app workflow, PPTX customization, connection settings

3. **guides/cli-guide.md** (TO CREATE)
   - Consolidates: QUICK_START.md commands, DEVELOPING.md commands, DISTRIBUTION.md
   - Complete CLI command reference with examples

4. **guides/service-generator.md** (TO CREATE)
   - From: CHANGELOG.md detailed description + new guides
   - Step-by-step Service Generator workflow

5. **faq.md** (TO CREATE)
   - Consolidates: Troubleshooting from SETUP.md, common issues
   - Connection problems, platform-specific issues, etc.

### Developer Content
6. **developer/index.md** (FROM CLAUDE.md)
   - Architecture overview
   - Technology stack
   - Links to detailed guides

7. **developer/setup.md** (FROM DEVELOPING.md)
   - Development environment setup
   - Running from source
   - Testing workflows

8. **developer/building.md** (FROM DISTRIBUTION.md + DEVELOPING.md)
   - Build commands
   - Creating executables
   - Distribution process

9. **developer/contributing.md** (NEW)
   - Contributing guidelines
   - Code style
   - Commit conventions

10. **developer/release-process.md** (FROM CLAUDE.md)
    - Release checklist
    - Versioning scheme (Major.Minor.Hotfix)
    - Common mistakes and fixes

### Archive (Keep for Reference, Don't Link)
- DEVELOPING.md → Deprecated (content moved to docs/)
- DISTRIBUTION.md → Deprecated (content moved to docs/)
- QUICK_START.md → Deprecated (content moved to docs/)
- SETUP.md → Deprecated (content moved to docs/)
- PRO PRESENTER SETUP.md → Deprecated (content moved to docs/)

### Top-Level (Keep for GitHub Landing)
- **README.md** - Simplify to point to GitHub Pages
- **CHANGELOG.md** - Keep as-is (referenced from releases)
- **CLAUDE.md** - Update to point to GitHub Pages docs

---

## Next Steps

1. ✅ Create `docs/_config.yml` (Jekyll config)
2. ✅ Create `docs/index.md` (homepage)
3. ✅ Create `docs/getting-started.md` (consolidated setup)
4. **Create remaining user guides** (user-guide.md, cli-guide.md, service-generator.md)
5. **Create developer section** (docs/developer/)
6. **Create FAQ** (faq.md)
7. **Update root README.md** to point to GitHub Pages
8. **Update CLAUDE.md** to reference docs site
9. **Enable GitHub Pages** in repository settings (Settings → Pages → Source: /docs on main branch)
10. **Add help menu links** in the Electron app

---

## Benefits of This Structure

- ✅ Single source of truth for each topic
- ✅ No redundant information across files
- ✅ Easy to maintain and update
- ✅ Professional presentation with Jekyll
- ✅ Searchable documentation
- ✅ Mobile-friendly
- ✅ Version-agnostic (not tied to release cycle)
- ✅ Can easily add videos, screenshots, examples
