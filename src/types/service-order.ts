/**
 * Service Order Types
 * Types for parsed service order data from PDF
 */

export type ServiceSectionType = 'header' | 'song' | 'bible' | 'placeholder' | 'kids_song' | 'video';

export type PraiseSlot = 'praise1' | 'praise2' | 'praise3' | 'kids';

export type SpecialServiceType = 'remembrance' | 'christmas' | 'easter' | 'carol' | 'communion' | 'good-friday' | 'nativity' | null;

export interface ServiceSection {
  type: ServiceSectionType;
  title: string;
  leader?: string;      // e.g., "(Mark)", "(Peter J)"
  notes?: string;       // e.g., "[Bible verses; Prayer...]"
  position: number;
  isVideo?: boolean;    // For any items marked as "(Video)"
  isKidsVideo?: boolean; // Specifically for "(Video)" items marked with "kids" keyword
  praiseSlot?: PraiseSlot;  // Which praise section: praise1, praise2, praise3, or kids
}

export interface ParsedService {
  date: string;         // "1st February 2026"
  rawDate?: string;     // Full date header from PDF
  sections: ServiceSection[];
  rawText: string;      // Full PDF text for debugging
  specialServiceType?: SpecialServiceType;  // Type of special service (remembrance, christmas, etc.)
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
