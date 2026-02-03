/**
 * Service Order Types
 * Types for parsed service order data from PDF
 */

export type ServiceSectionType = 'header' | 'song' | 'bible' | 'placeholder' | 'kids_song' | 'video';

export interface ServiceSection {
  type: ServiceSectionType;
  title: string;
  leader?: string;      // e.g., "(Mark)", "(Peter J)"
  notes?: string;       // e.g., "[Bible verses; Prayer...]"
  position: number;
  isVideo?: boolean;    // For songs marked as "(Video)"
}

export interface ParsedService {
  date: string;         // "1st February 2026"
  rawDate?: string;     // Full date header from PDF
  sections: ServiceSection[];
  rawText: string;      // Full PDF text for debugging
}

export interface ServiceConfig {
  /** ProPresenter connection */
  host: string;
  port: number;

  /** Library UUIDs */
  worshipLibraryId: string;
  kidsLibraryId: string;
  serviceContentLibraryId: string;

  /** Template playlist ID */
  templatePlaylistId: string;

  /** Bible API */
  bibleApiKey: string;

  /** Matching settings */
  confidenceThreshold: number;  // Default: 0.85

  /** Custom mappings (user-trained) */
  customSongMappings?: Record<string, string>;
}
