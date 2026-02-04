# Contributing Guide

[← Back to Developer Guide](./index.md)

---

How to contribute code to ProPresenter Lyrics Export.

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Assume good intent
- Respect maintainer decisions

## Getting Started

1. **Fork** the repository
2. **Clone** your fork: `git clone https://github.com/YOUR_GITHUB_NAME/propresenterlyricexport.git`
3. **Create branch**: `git checkout -b feature/my-feature`
4. **Make changes** and test thoroughly
5. **Submit PR** with description

## Development Process

### Before Starting

```bash
# Install dependencies
npm install

# Run tests
npm test

# Verify setup
npm start -- status
```

### Making Changes

1. **Create feature branch** (not on main)
   ```bash
   git checkout -b feature/descriptive-name
   ```

2. **Make atomic commits** - One logical change per commit
   ```bash
   git add src/file.ts
   git commit -m "feat: Brief description

   - Detailed explanation
   - What and why, not how
   - Reference issues if applicable"
   ```

3. **Test both paths** (if changing core logic)
   ```bash
   npm run build              # Compile
   npm start -- status        # Test CLI
   npm run electron:dev       # Test desktop
   ```

4. **Run linter and tests**
   ```bash
   npm run lint
   npm test
   ```

## Code Style

### TypeScript Standards

- **Strict mode enabled** - No `any` types
- **Explicit types** - Annotate function parameters and returns
- **No semicolons** - Follow existing style
- **Functional approach** - Prefer const/pure functions

**Example:**
```typescript
// ✅ Good
export async function exportPlaylist(
  playlistId: string,
  options: ExportOptions
): Promise<ExportResult> {
  const items = await fetchItems(playlistId);
  return processItems(items, options);
}

// ❌ Bad
async function exportPlaylist(playlistId, options) {
  // No type annotations
  var items = await fetchItems(playlistId); // var keyword
  return processItems(items, options);
}
```

### File Organization

- **One export per file** (usually)
- **Descriptive filenames** - `song-matcher.ts` not `util.ts`
- **Clear folder structure** - Related code together
- **Import order:**
  1. External dependencies
  2. Internal modules
  3. Relative paths
  4. Type imports

**Example:**
```typescript
import fs from 'fs';
import { PlaylistExporter } from '../services/playlist-exporter';
import { formatDate } from './utils';
import type { Playlist } from '../types/playlist';
```

### Naming Conventions

- **Functions:** `camelCase` - `exportPlaylist()`
- **Classes:** `PascalCase` - `PlaylistExporter`
- **Constants:** `UPPER_SNAKE_CASE` - `DEFAULT_PORT`
- **Private methods:** `_leading_underscore` - `_formatText()`
- **Booleans:** `is`, `has`, `can` prefix - `isActive`, `hasError`

### Comments

Use comments sparingly - code should be self-documenting.

**Good comments:**
```typescript
// ProPresenter API timeout (10 seconds)
// This is intentionally long to allow slow network connections
const API_TIMEOUT_MS = 10000;

// BUG: PPT export breaks with fonts > 200pt
// TODO: Fix when upgrading pptxgenjs beyond 3.10.0
```

**Bad comments:**
```typescript
// Loop through items
items.forEach(item => {
  // Process the item
  process(item);
});
```

## Git Workflow

### Commit Messages

Follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation
- `style` - Formatting (no logic change)
- `refactor` - Code restructuring
- `test` - Adding/updating tests
- `chore` - Dependencies, build tools

**Example:**
```
feat(service-generator): add fuzzy song matching

Implement Levenshtein distance algorithm to match song titles
against the library with confidence scoring.

- Add SongMatcher class
- Support partial matches with configurable threshold
- Return multiple candidates for manual selection

Closes #123
```

### Branch Naming

```
feature/descriptive-name         # New features
bugfix/issue-description         # Bug fixes
docs/what-you-documented         # Documentation
refactor/what-changed            # Refactoring
```

### Pull Requests

**Title format:**
```
[TYPE] Brief description (same as commit message)
```

**Description template:**
```markdown
## What Changed
Brief summary of changes

## Why
Why is this change needed?

## Testing
How to verify this works:
- Step 1
- Step 2

## Checklist
- [ ] Tests passing
- [ ] Code reviewed by me
- [ ] Documentation updated
- [ ] Both CLI and Electron tested (if core change)
```

## Testing

### Writing Tests

```typescript
// src/__tests__/song-matcher.test.ts
import { matchSongs } from '../services/song-matcher';

describe('song-matcher', () => {
  it('should match exact song titles', () => {
    const results = matchSongs('Amazing Grace', songLibrary);
    expect(results[0].confidence).toBeGreaterThan(0.9);
  });

  it('should handle spelling variations', () => {
    const results = matchSongs('Amzing Grace', songLibrary);
    expect(results.length).toBeGreaterThan(0);
  });
});
```

### Test Coverage

- Aim for >80% coverage
- Test error cases
- Test edge cases
- Integration tests for workflows

```bash
npm test -- --coverage
```

## Review Process

### Before Submitting PR

- [ ] Code compiles without errors
- [ ] Tests pass: `npm test`
- [ ] Linter passes: `npm run lint`
- [ ] Both CLI and Electron work (if applicable)
- [ ] Commit messages are clear
- [ ] Branch is up to date with main

### During Review

- Respond to feedback thoughtfully
- Ask questions if unclear
- Push additional commits (don't force-push)
- Be patient - maintainers are volunteers

### After Approval

- Squash commits if requested
- Merge when ready
- Delete branch

## Major Changes

For large changes, **open an issue first**:

1. **Describe the change** - What and why
2. **Discuss design** - Get feedback before coding
3. **Get approval** - Confirm it fits the project vision
4. **Implement** - Code the approved solution

This avoids wasted effort on rejected PRs.

## Debugging Tips

### Use Debug Output

```bash
# See raw API responses
npm start -- status --debug

# CLI export with debug
npm start -- export abc123 --debug
```

### Add Temporary Logging

```typescript
console.log('DEBUG:', { playlistId, itemCount, duration });
```

Remove before committing.

### Test Specific Scenarios

```bash
# Test with custom host/port
npm start -- status --host 192.168.1.100 --port 1025

# Test with specific playlist
npm start -- export abc123-uuid
```

## Common Issues

### TypeScript Errors After Pull

```bash
npm run build  # Recompile
npm install    # Update dependencies if needed
```

### Git Conflicts

```bash
# Resolve locally
git rebase origin/main
# Fix conflicts, then push
git push --force-with-lease
```

### Outdated Node Modules

```bash
rm -rf node_modules package-lock.json
npm install
```

## Questions or Help?

- **Issues:** Open on GitHub for bugs and features
- **Discussions:** Start a discussion for questions
- **Discord:** Join our community (if applicable)
- **Email:** Contact maintainers directly

## Recognition

- **Contributors** listed in README.md
- **Major contributions** mentioned in release notes
- **Consistent contributors** become maintainers

---

## Next Steps

- **[Setup](./setup.md)** - Get environment running
- **[Architecture](./architecture.md)** - Understand code structure
- **[Building](./building.md)** - Create releases
- **[Release Process](./release-process.md)** - Publishing guide
