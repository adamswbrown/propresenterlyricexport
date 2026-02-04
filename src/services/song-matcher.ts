/**
 * Song Matching Service
 * Fuzzy matching of PDF song titles to ProPresenter library presentations
 */

import Fuse from 'fuse.js';
import { SongMatch, MatchCandidate, LibraryPresentation, MatchStatistics } from '../types/song-match';
import { ServiceSection } from '../types/service-order';

export class SongMatcher {
  private confidenceThreshold: number;
  private customMappings: Record<string, string>;

  constructor(confidenceThreshold: number = 0.85, customMappings?: Record<string, string>) {
    this.confidenceThreshold = confidenceThreshold;
    this.customMappings = customMappings || {};
  }

  /**
   * Match songs from PDF against ProPresenter library
   */
  async matchSongs(
    songSections: ServiceSection[],
    libraryPresentations: LibraryPresentation[]
  ): Promise<SongMatch[]> {
    const matches: SongMatch[] = [];

    for (const section of songSections) {
      // Check custom mappings first
      if (this.customMappings[section.title]) {
        const customUUID = this.customMappings[section.title];
        const presentation = libraryPresentations.find(p => p.uuid === customUUID);

        if (presentation) {
          matches.push({
            pdfTitle: section.title,
            originalLine: section.title,
            matches: [{
              presentation,
              confidence: 1.0,
              distance: 0
            }],
            bestMatch: {
              presentation,
              confidence: 1.0,
              distance: 0
            },
            requiresReview: false
          });
          continue;
        }
      }

      // Fuzzy match against library
      const matchCandidates = this.fuzzyMatch(section.title, libraryPresentations);

      // Determine best match
      const bestMatch = matchCandidates[0];
      const requiresReview = this.shouldRequireReview(matchCandidates);

      matches.push({
        pdfTitle: section.title,
        originalLine: section.title,
        matches: matchCandidates,
        bestMatch,
        requiresReview
      });
    }

    return matches;
  }

  /**
   * Perform fuzzy matching using Fuse.js
   */
  private fuzzyMatch(songTitle: string, presentations: LibraryPresentation[]): MatchCandidate[] {
    const normalizedTitle = this.normalizeSongTitle(songTitle);

    // Configure Fuse.js with more lenient settings
    const fuse = new Fuse(presentations, {
      keys: ['name'],
      threshold: 0.6,  // More lenient: 0 = exact, 1 = match anything
      includeScore: true,
      ignoreLocation: true,
      distance: 150,
      minMatchCharLength: 2,
      useExtendedSearch: true
    });

    // Search
    const results = fuse.search(normalizedTitle);

    // Convert results to MatchCandidate format
    const candidates: MatchCandidate[] = results.map(result => {
      const score = result.score || 1.0;
      const confidence = 1 - score; // Fuse.js score is inverse (0 = best)

      return {
        presentation: result.item,
        confidence,
        distance: Math.round(score * 100)
      };
    });

    // Also try exact matching (case-insensitive)
    const exactMatch = presentations.find(p =>
      this.normalizeSongTitle(p.name) === normalizedTitle
    );

    if (exactMatch && !candidates.some(c => c.presentation.uuid === exactMatch.uuid)) {
      candidates.unshift({
        presentation: exactMatch,
        confidence: 1.0,
        distance: 0
      });
    }

    // Try "starts-with" matching - if library title appears at the START of input title
    // e.g., "Faithful One" (library) matches "Faithful One, so unchanging" (input)
    for (const presentation of presentations) {
      const normalizedLibraryTitle = this.normalizeSongTitle(presentation.name);

      // Skip if already in candidates with high confidence
      if (candidates.some(c => c.presentation.uuid === presentation.uuid && c.confidence >= 0.9)) {
        continue;
      }

      // Check if input starts with library title OR library starts with input (with word boundary)
      // Case 1: "Faithful One" (library) matches "Faithful One, so unchanging" (input)
      // Case 2: "King of Kings" (input) matches "King of Kings (Hillsong)" (library)
      const inputStartsWithLibrary = normalizedTitle.startsWith(normalizedLibraryTitle + ' ') ||
                                      normalizedTitle === normalizedLibraryTitle;
      const libraryStartsWithInput = normalizedLibraryTitle.startsWith(normalizedTitle + ' ') ||
                                      normalizedLibraryTitle === normalizedTitle;

      if (inputStartsWithLibrary || libraryStartsWithInput) {
        // Calculate confidence based on how much overlap there is
        const shorter = Math.min(normalizedLibraryTitle.length, normalizedTitle.length);
        const longer = Math.max(normalizedLibraryTitle.length, normalizedTitle.length);
        const coverage = shorter / longer;
        const confidence = Math.max(0.92, coverage); // At least 92% confidence for starts-with

        const existingIndex = candidates.findIndex(c => c.presentation.uuid === presentation.uuid);
        if (existingIndex >= 0) {
          // Update existing if our confidence is higher
          if (confidence > candidates[existingIndex].confidence) {
            candidates[existingIndex].confidence = confidence;
            candidates[existingIndex].distance = Math.round((1 - confidence) * 100);
          }
        } else {
          candidates.push({
            presentation,
            confidence,
            distance: Math.round((1 - confidence) * 100)
          });
        }
      }
    }

    // Re-sort by confidence after starts-with matching
    candidates.sort((a, b) => b.confidence - a.confidence);

    // Also try partial/prefix matching (first 3-5 significant words)
    const titleWords = normalizedTitle.split(' ').filter(w => w.length > 2).slice(0, 5);
    if (titleWords.length >= 3 && candidates.length === 0) {
      // Try finding songs that start with the same words
      for (const presentation of presentations) {
        const presWords = this.normalizeSongTitle(presentation.name)
          .split(' ')
          .filter(w => w.length > 2)
          .slice(0, 5);

        // Check if first 3 words match
        if (titleWords.slice(0, 3).every((w, i) => presWords[i] === w)) {
          const wordsMatched = titleWords.filter((w, i) => presWords[i] === w).length;
          const confidence = wordsMatched / Math.max(titleWords.length, presWords.length);

          candidates.push({
            presentation,
            confidence,
            distance: Math.round((1 - confidence) * 100)
          });
        }
      }

      // Sort by confidence
      candidates.sort((a, b) => b.confidence - a.confidence);
    }

    return candidates.slice(0, 5); // Return top 5 matches
  }

  /**
   * Normalize song title for comparison
   */
  private normalizeSongTitle(title: string): string {
    return title
      .toLowerCase()
      .replace(/[^\w\s]/g, '')  // Remove punctuation
      .replace(/\s+/g, ' ')      // Normalize whitespace
      .trim();
  }

  /**
   * Determine if match requires manual review
   */
  private shouldRequireReview(candidates: MatchCandidate[]): boolean {
    if (candidates.length === 0) {
      return true; // No matches found
    }

    const best = candidates[0];

    // Low confidence
    if (best.confidence < this.confidenceThreshold) {
      return true;
    }

    // Multiple very similar matches
    if (candidates.length > 1) {
      const second = candidates[1];
      const confidenceDiff = best.confidence - second.confidence;

      // If top two matches are very close (< 0.1 difference), require review
      if (confidenceDiff < 0.1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate matching statistics
   */
  calculateStatistics(matches: SongMatch[]): MatchStatistics {
    const totalSongs = matches.length;
    const autoMatched = matches.filter(m => !m.requiresReview && m.bestMatch).length;
    const requiresReview = matches.filter(m => m.requiresReview).length;
    const notFound = matches.filter(m => m.matches.length === 0).length;

    const totalConfidence = matches
      .filter(m => m.bestMatch)
      .reduce((sum, m) => sum + (m.bestMatch?.confidence || 0), 0);

    const averageConfidence = totalSongs > 0 ? totalConfidence / totalSongs : 0;

    return {
      totalSongs,
      autoMatched,
      requiresReview,
      notFound,
      averageConfidence
    };
  }
}

// Export singleton instance
export const songMatcher = new SongMatcher();
