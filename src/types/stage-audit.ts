/**
 * Stage Settings Audit System
 *
 * Tracks which library items have verified stage display settings,
 * and generates audit reports when building playlists.
 *
 * Covers ALL playlist item types:
 * - Songs (worship, hymns)
 * - Sermon/Message slides
 * - Scripture/Bible readings
 * - Service content (announcements, birthday blessings, prayers, etc.)
 * - Videos (kids songs, media clips)
 */

export type StageLayoutType =
  | 'lyrics'           // Song lyrics display (worship songs)
  | 'scripture'        // Bible verse display
  | 'video'            // Video/media display (blank or minimal)
  | 'sermon'           // Sermon/message notes display
  | 'service_content'  // Service elements (announcements, prayers, etc.)
  | 'blank'            // No stage content needed
  | 'custom'           // Custom layout (specify UUID)
  | 'unknown';         // Not yet configured

/**
 * Content type categorization for playlist items
 * Used to infer the expected stage layout
 */
export type ContentType =
  | 'song'             // Worship songs, hymns
  | 'scripture'        // Bible readings
  | 'sermon'           // Sermon/message slides
  | 'video'            // Video content (kids songs, media)
  | 'announcements'    // Announcements
  | 'prayer'           // Prayer slides
  | 'service_element'  // Birthday blessings, grace, call to worship, etc.
  | 'header'           // Section headers (not displayed)
  | 'unknown';         // Unrecognized content

/**
 * Mapping from content type to expected stage layout
 */
export const CONTENT_TYPE_TO_LAYOUT: Record<ContentType, StageLayoutType> = {
  song: 'lyrics',
  scripture: 'scripture',
  sermon: 'sermon',
  video: 'video',
  announcements: 'service_content',
  prayer: 'service_content',
  service_element: 'service_content',
  header: 'blank',
  unknown: 'unknown',
};

export type VerificationStatus =
  | 'verified'    // Confirmed correct in ProPresenter
  | 'unverified'  // Not yet checked
  | 'needs_setup' // Known to need configuration
  | 'not_applicable'; // Item doesn't use stage display (e.g., video)

export interface StageSettingsRecord {
  /** ProPresenter presentation UUID */
  presentationUuid: string;

  /** Human-readable name for display */
  presentationName: string;

  /** Which library this item belongs to */
  libraryName?: string;

  /** Detected content type (song, sermon, video, etc.) */
  contentType: ContentType;

  /** Expected stage layout type */
  expectedLayout: StageLayoutType;

  /** Custom layout UUID if expectedLayout is 'custom' */
  customLayoutUuid?: string;

  /** Whether settings have been verified in ProPresenter */
  status: VerificationStatus;

  /** Who verified the settings */
  verifiedBy?: string;

  /** When settings were last verified */
  verifiedAt?: string; // ISO date string

  /** Notes about this item's stage configuration */
  notes?: string;
}

export interface StageSettingsRegistry {
  /** Version for migration purposes */
  version: number;

  /** Map of presentation UUID to settings record */
  items: Record<string, StageSettingsRecord>;

  /** Default layout rules by library name */
  libraryDefaults: Record<string, StageLayoutType>;

  /** ProPresenter stage layout UUIDs for each type */
  layoutUuids: Record<StageLayoutType, string | null>;

  /** Last updated timestamp */
  updatedAt: string;
}

export interface PlaylistAuditItem {
  /** Playlist item info */
  playlistItemUuid: string;
  playlistItemName: string;

  /** Presentation info */
  presentationUuid: string | null;
  presentationName: string;

  /** Content categorization */
  contentType: ContentType;
  isHeader: boolean;

  /** Stage settings status */
  status: VerificationStatus;
  expectedLayout: StageLayoutType;

  /** Whether this item needs attention before service */
  needsAttention: boolean;

  /** Recommended action for operator */
  recommendation: string;
}

export interface PlaylistAuditReport {
  /** Playlist being audited */
  playlistId: string;
  playlistName: string;

  /** When audit was generated */
  generatedAt: string;

  /** Summary counts */
  summary: {
    total: number;
    verified: number;
    unverified: number;
    needsSetup: number;
    notApplicable: number;
    headers: number; // Headers don't need stage settings
    byContentType: Record<ContentType, { total: number; verified: number }>;
  };

  /** Individual item audits */
  items: PlaylistAuditItem[];

  /** Items requiring attention (filtered view) */
  actionRequired: PlaylistAuditItem[];

  /** Overall readiness score (0-100) */
  readinessScore: number;
}
