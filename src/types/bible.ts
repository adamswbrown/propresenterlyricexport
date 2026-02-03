/**
 * Bible API Types
 * Types for Bible verse fetching and presentation
 */

export interface BibleReference {
  book: string;         // "Luke"
  chapter: number;      // 12
  verseStart: number;   // 35
  verseEnd?: number;    // 59
  raw: string;          // "Luke 12:35-59"
}

export interface BibleVerse {
  reference: BibleReference;
  version: string;      // "NIV"
  text: string;         // Full text content
  slides: string[];     // Split into presentation slides
  copyright?: string;   // Attribution text
}

export interface BibleAPIResponse {
  data: {
    id: string;
    orgId: string;
    content: string;
    reference: string;
    verseCount: number;
    copyright?: string;
  };
}
