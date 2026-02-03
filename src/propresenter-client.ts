/**
 * ProPresenter Client - Thin wrapper around renewedvision-propresenter
 *
 * Provides simplified access to ProPresenter 7 Network API for:
 * - Connection management
 * - Presentation/playlist discovery
 * - Slide text extraction
 */

import {
  ProPresenter,
  RequestAndResponseJSONValue,
  StatusUpdateJSON,
} from 'renewedvision-propresenter';
import { EventEmitter } from 'events';

export interface ConnectionConfig {
  host: string;
  port: number;
}

export interface SlideInfo {
  index: number;
  text: string;
  notes: string;
  label: string;
  enabled: boolean;
}

export interface GroupInfo {
  name: string;
  color: string;
  slides: SlideInfo[];
}

export interface PresentationInfo {
  uuid: string;
  name: string;
  path?: string;
  groups: GroupInfo[];
  hasTimeline: boolean;
  destination: string;
}

export interface PlaylistItem {
  uuid: string;
  name: string;
  type: string;
  isHeader: boolean;
  presentationUuid?: string;  // UUID of the actual presentation content
  children?: PlaylistItem[];
}

export interface LibraryInfo {
  uuid: string;
  name: string;
}

export class ProPresenterClient extends EventEmitter {
  private client: ProPresenter;
  private connected: boolean = false;
  private config: ConnectionConfig;

  constructor(config: ConnectionConfig) {
    super();
    this.config = config;
    // Use longer timeout (10 seconds) for slow network requests
    this.client = new ProPresenter(config.host, config.port, 10000);
  }

  /**
   * Get the host address
   */
  get host(): string {
    return this.config.host;
  }

  /**
   * Get the port number
   */
  get port(): number {
    return this.config.port;
  }

  /**
   * Test connection by fetching version info
   */
  async connect(): Promise<{ version: string; name: string; platform: string }> {
    const result = await this.client.version();
    if (!result.ok) {
      throw new Error(`Failed to connect: ${result.status}`);
    }
    this.connected = true;

    // Handle cases where version data might be missing or in different format
    const major = result.data?.major ?? result.data?.version?.major ?? '7';
    const minor = result.data?.minor ?? result.data?.version?.minor ?? '0';
    const patch = result.data?.patch ?? result.data?.version?.patch ?? '0';

    // Only include version if we have valid data
    const versionStr = (major && minor && patch)
      ? `${major}.${minor}.${patch}`
      : '';

    return {
      version: versionStr,
      name: result.data?.name ?? 'ProPresenter',
      platform: result.data?.platform ?? 'unknown',
    };
  }

  /**
   * Get all libraries
   */
  async getLibraries(): Promise<LibraryInfo[]> {
    const result = await this.client.libraryGet();
    if (!result.ok) {
      throw new Error(`Failed to get libraries: ${result.status}`);
    }
    return (result.data || []).map((lib: any) => ({
      uuid: lib.id?.uuid || lib.uuid,
      name: lib.id?.name || lib.name,
    }));
  }

  /**
   * Get presentations from a specific library
   */
  async getLibraryPresentations(libraryId: string): Promise<{ uuid: string; name: string }[]> {
    const result = await this.client.libraryGetById(libraryId);
    if (!result.ok) {
      throw new Error(`Failed to get library presentations: ${result.status}`);
    }
    return (result.data?.items || []).map((item: any) => ({
      uuid: item.id?.uuid || item.uuid,
      name: item.id?.name || item.name,
    }));
  }

  /**
   * Get all playlists
   */
  async getPlaylists(): Promise<PlaylistItem[]> {
    const result = await this.client.playlistsGet();
    if (!result.ok) {
      throw new Error(`Failed to get playlists: ${result.status}`);
    }
    return this.parsePlaylistItems(result.data || []);
  }

  private parsePlaylistItems(items: any[]): PlaylistItem[] {
    return items.map((item: any) => ({
      uuid: item.id?.uuid || item.uuid || '',
      name: item.id?.name || item.name || 'Unnamed',
      type: item.type || item.field_type || 'unknown',
      isHeader: item.type === 'header' || item.is_header || false,
      presentationUuid: item.presentation_info?.presentation_uuid,
      children: item.items || item.children ? this.parsePlaylistItems(item.items || item.children) : undefined,
    }));
  }

  /**
   * Get the active (currently playing) playlist
   */
  async getActivePlaylist(): Promise<PlaylistItem | null> {
    const result = await this.client.playlistActiveGet();
    if (!result.ok || !result.data) {
      return null;
    }
    const items = this.parsePlaylistItems([result.data]);
    return items[0] || null;
  }

  /**
   * Get the focused playlist (selected in UI)
   */
  async getFocusedPlaylist(): Promise<PlaylistItem | null> {
    const result = await this.client.playlistFocusedGet();
    if (!result.ok || !result.data) {
      return null;
    }
    const items = this.parsePlaylistItems([result.data]);
    return items[0] || null;
  }

  /**
   * Get items inside a specific playlist
   */
  async getPlaylistItems(playlistId: string): Promise<PlaylistItem[]> {
    const result = await this.client.playlistPlaylistIdGet(playlistId);
    if (!result.ok || !result.data) {
      return [];
    }
    return this.parsePlaylistItems(result.data.items || []);
  }

  /**
   * Get the currently active presentation
   */
  async getActivePresentation(): Promise<PresentationInfo | null> {
    const result = await this.client.presentationActiveGet();
    if (!result.ok || !result.data) {
      return null;
    }
    return this.parsePresentationData(result.data);
  }

  /**
   * Get the focused presentation (selected in UI)
   */
  async getFocusedPresentation(): Promise<PresentationInfo | null> {
    const result = await this.client.presentationFocusedGet();
    if (!result.ok || !result.data) {
      return null;
    }
    return this.parsePresentationData(result.data);
  }

  /**
   * Get presentation by UUID
   */
  async getPresentationByUuid(uuid: string): Promise<PresentationInfo | null> {
    const result = await this.client.presentationUUIDGet(uuid);
    if (!result.ok || !result.data) {
      return null;
    }
    return this.parsePresentationData(result.data);
  }

  private parsePresentationData(data: any): PresentationInfo {
    const presentation = data.presentation || data;

    return {
      uuid: presentation.id?.uuid || presentation.uuid || '',
      name: presentation.id?.name || presentation.name || 'Unnamed',
      path: presentation.presentation_path || presentation.path,
      hasTimeline: presentation.has_timeline || false,
      destination: presentation.destination || 'presentation',
      groups: this.parseGroups(presentation.cue_groups || presentation.groups || []),
    };
  }

  private parseGroups(groups: any[]): GroupInfo[] {
    return groups.map((group: any) => ({
      name: group.group?.name || group.name || 'Unnamed Group',
      color: group.group?.color || group.color || '',
      slides: this.parseSlides(group.cues || group.slides || []),
    }));
  }

  private parseSlides(slides: any[]): SlideInfo[] {
    return slides.map((slide: any, index: number) => {
      // Text can be in various places depending on API response structure
      let text = '';
      if (typeof slide === 'string') {
        text = slide;
      } else if (slide.text) {
        text = typeof slide.text === 'string' ? slide.text : slide.text.text || '';
      } else if (slide.slide?.text) {
        text = typeof slide.slide.text === 'string' ? slide.slide.text : slide.slide.text.text || '';
      } else if (slide.cue?.text) {
        text = typeof slide.cue.text === 'string' ? slide.cue.text : slide.cue.text.text || '';
      }

      return {
        index: slide.index ?? index,
        text: text || '',
        notes: slide.notes || slide.slide?.notes || '',
        label: slide.label || slide.slide?.label || '',
        enabled: slide.enabled ?? slide.slide?.enabled ?? true,
      };
    });
  }

  /**
   * Get current slide status (text of current and next slide)
   */
  async getSlideStatus(): Promise<{ current: SlideInfo | null; next: SlideInfo | null }> {
    const result = await this.client.statusSlide();
    if (!result.ok || !result.data) {
      return { current: null, next: null };
    }

    const current = result.data.current
      ? {
          index: 0,
          text: result.data.current.text || '',
          notes: result.data.current.notes || '',
          label: '',
          enabled: true,
        }
      : null;

    const next = result.data.next
      ? {
          index: 1,
          text: result.data.next.text || '',
          notes: result.data.next.notes || '',
          label: '',
          enabled: true,
        }
      : null;

    return { current, next };
  }

  /**
   * Get current slide index in active presentation
   */
  async getCurrentSlideIndex(): Promise<number | null> {
    const result = await this.client.presentationSlideIndexGet();
    if (!result.ok || !result.data) {
      return null;
    }
    return result.data.presentation_index?.index ?? null;
  }

  /**
   * Create a new playlist from a template
   * Copies all items from the template playlist to a new playlist at the root level
   */
  async createPlaylistFromTemplate(templatePlaylistId: string, newPlaylistName: string): Promise<string> {
    // Step 1: Fetch items from template playlist
    const templateResult = await this.client.playlistPlaylistIdGet(templatePlaylistId);
    if (!templateResult.ok || !templateResult.data) {
      throw new Error('Failed to fetch template playlist items');
    }

    const templateItems = templateResult.data.items || [];

    // Step 2: Clean up items - keep name but remove UUIDs so ProPresenter generates new ones
    const cleanedItems = templateItems.map((item: any, index: number) => {
      const cleaned: any = {
        id: {
          name: item.id?.name || item.name || 'Untitled',
          index: index,
          uuid: '', // Empty UUID means ProPresenter will generate a new one
        },
        type: item.type,
        is_hidden: item.is_hidden || false,
        is_pco: item.is_pco || false,
      };

      // For headers, include color
      if (item.type === 'header') {
        if (item.header_color) {
          cleaned.header_color = item.header_color;
        }
      }

      // For presentations, include presentation info and duration
      if (item.type === 'presentation') {
        if (item.presentation_info) {
          cleaned.presentation_info = {
            presentation_uuid: item.presentation_info.presentation_uuid,
            arrangement_name: item.presentation_info.arrangement_name || '',
            arrangement_uuid: item.presentation_info.arrangement_uuid || '',
          };
        }
        if (item.duration) {
          cleaned.duration = item.duration;
        }
      }

      // Include destination
      if (item.destination) {
        cleaned.destination = item.destination;
      }

      return cleaned;
    });

    // Step 3: Get all root playlists to determine the next index
    const playlistsResult = await this.client.playlistsGet();
    if (!playlistsResult.ok || !playlistsResult.data) {
      throw new Error('Failed to fetch playlists');
    }

    const nextIndex = (playlistsResult.data as any[]).length;

    // Step 4: Create empty playlist first
    // Note: POST /v1/playlists only creates the playlist shell, not items
    const createPlaylistData = {
      name: newPlaylistName,
    };

    const createResponse = await fetch(`http://${this.config.host}:${this.config.port}/v1/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(createPlaylistData),
    });

    if (!createResponse.ok) {
      const errorText = await createResponse.text();
      throw new Error(`Failed to create playlist: ${createResponse.status} ${errorText}`);
    }

    const createResponseData = await createResponse.json() as any;
    const newPlaylistId = createResponseData.id?.uuid || createResponseData.uuid || '';
    if (!newPlaylistId) {
      throw new Error('No UUID returned from new playlist creation');
    }

    // Step 5: Update the playlist with items using PUT
    const updateResponse = await fetch(`http://${this.config.host}:${this.config.port}/v1/playlist/${newPlaylistId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(cleanedItems),
    });

    if (!updateResponse.ok) {
      const errorText = await updateResponse.text();
      throw new Error(`Failed to populate playlist items: ${updateResponse.status} ${errorText}`);
    }

    return newPlaylistId;
  }

  /**
   * Register for real-time status updates
   */
  registerStatusUpdates(callbacks: {
    onSlideChange?: (data: any) => void;
    onPresentationChange?: (data: any) => void;
    onPlaylistChange?: (data: any) => void;
  }): void {
    const statusCallbacks: { [key: string]: (update: StatusUpdateJSON) => void } = {};

    if (callbacks.onSlideChange) {
      statusCallbacks['status/slide'] = (update) => callbacks.onSlideChange!(update.data);
    }
    if (callbacks.onPresentationChange) {
      statusCallbacks['presentation/active'] = (update) =>
        callbacks.onPresentationChange!(update.data);
    }
    if (callbacks.onPlaylistChange) {
      statusCallbacks['playlist/active'] = (update) => callbacks.onPlaylistChange!(update.data);
    }

    if (Object.keys(statusCallbacks).length > 0) {
      this.client.registerCallbacksForStatusUpdates(statusCallbacks, 2000);
    }
  }

  /**
   * Log raw API response for debugging by calling any method
   */
  async debugEndpoint(method: string, ...args: any[]): Promise<RequestAndResponseJSONValue> {
    const fn = (this.client as any)[method];
    if (typeof fn !== 'function') {
      throw new Error(`Unknown method: ${method}`);
    }
    return fn.apply(this.client, args);
  }

  isConnected(): boolean {
    return this.connected;
  }
}

export default ProPresenterClient;
