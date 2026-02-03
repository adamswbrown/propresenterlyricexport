/**
 * Song Matching Types
 * Types for fuzzy song matching results
 */

export interface LibraryPresentation {
  name: string;
  uuid: string;
  library: string;
  libraryId: string;
}

export interface MatchCandidate {
  presentation: LibraryPresentation;
  confidence: number;  // 0-1 score
  distance: number;    // Levenshtein distance
}

export interface SongMatch {
  pdfTitle: string;
  originalLine: string;
  matches: MatchCandidate[];
  bestMatch?: MatchCandidate;
  requiresReview: boolean;  // true if confidence < threshold or multiple similar matches
  manualSelection?: string;  // UUID if user manually selected
}

export interface MatchStatistics {
  totalSongs: number;
  autoMatched: number;
  requiresReview: number;
  notFound: number;
  averageConfidence: number;
}
