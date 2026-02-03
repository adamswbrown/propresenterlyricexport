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
