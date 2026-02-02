import fs from 'fs';
import path from 'path';

const DEFAULT_CANDIDATES = [
  path.join(process.cwd(), 'logo.png'),
  path.join(process.cwd(), 'assets', 'logo.png'),
  path.join(process.cwd(), 'dist', 'logo.png'),
  path.resolve(__dirname, '..', 'logo.png'),
  path.resolve(__dirname, '..', '..', 'logo.png'),
];

export function findLogoPath(additionalCandidates: string[] = []): string | undefined {
  const candidates = [...new Set([...additionalCandidates, ...DEFAULT_CANDIDATES])];

  for (const candidate of candidates) {
    if (!candidate) {
      continue;
    }
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch (error) {
      // Ignore filesystem errors and continue searching
    }
  }

  return undefined;
}
