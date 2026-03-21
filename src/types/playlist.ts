/**
 * ProPresenter Playlist Types
 * Types matching ProPresenter API v1 playlist structure
 */

export interface PlaylistItemId {
  name: string;
  index: number;
  uuid: string;
}

export interface PresentationInfo {
  presentation_uuid: string;
  arrangement_name: string;
  arrangement_uuid: string;
}

export interface PlaylistItem {
  id: PlaylistItemId;
  type: 'header' | 'presentation';
  is_hidden: boolean;
  is_pco: boolean;
  target_uuid?: string;
  presentation_info: PresentationInfo;
  destination: 'presentation' | 'announcement';
}

export interface Playlist {
  id: PlaylistItemId;
  items: PlaylistItem[];
}

export interface TemplateItem {
  type: 'header' | 'presentation' | 'dynamic_song' | 'dynamic_bible' | 'dynamic_kids';
  name: string;
  library?: string;
  presentationUuid?: string;  // For fixed presentations
}

export interface PlaylistTemplate {
  name: string;
  structure: TemplateItem[];
}

/**
 * Planned Service Types
 * For pre-planning services ahead of time without a PDF
 */

export type PraiseSlotType = 'praise1' | 'praise2' | 'praise3' | 'kids' | 'reading';

export interface PlannedSlotItem {
  uuid: string;           // ProPresenter presentation UUID
  name: string;           // Display name
  library?: string;       // Source library name
}

export interface PlannedService {
  id: string;             // Unique identifier (UUID)
  name: string;           // e.g., "St Andrews - 25th September"
  date: string;           // ISO date string for the planned service date
  templatePlaylistId: string;  // Template used
  slots: Record<PraiseSlotType, PlannedSlotItem[]>;  // Songs assigned to each slot
  notes?: string;         // Optional notes
  createdAt: string;      // ISO timestamp
  updatedAt: string;      // ISO timestamp
}
