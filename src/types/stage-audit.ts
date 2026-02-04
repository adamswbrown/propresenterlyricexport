/**
 * Stage Settings Audit System
 *
 * Tracks which library items have verified stage display settings,
 * and generates audit reports when building playlists.
 */

export type StageLayoutType =
  | 'lyrics'      // Song lyrics display
  | 'scripture'   // Bible verse display
  | 'video'       // Video/media display
  | 'message'     // Sermon notes display
  | 'blank'       // No stage content
  | 'custom'      // Custom layout (specify UUID)
  | 'unknown';    // Not yet configured

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
  };

  /** Individual item audits */
  items: PlaylistAuditItem[];

  /** Items requiring attention (filtered view) */
  actionRequired: PlaylistAuditItem[];

  /** Overall readiness score (0-100) */
  readinessScore: number;
}
