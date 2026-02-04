/**
 * Stage Audit Service
 *
 * Manages a registry of known stage display settings for library items,
 * and generates audit reports for playlists to help operators identify
 * items that need stage display configuration.
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  StageSettingsRegistry,
  StageSettingsRecord,
  StageLayoutType,
  VerificationStatus,
  PlaylistAuditReport,
  PlaylistAuditItem,
  ContentType,
  CONTENT_TYPE_TO_LAYOUT,
} from '../types/stage-audit';
import { PlaylistItem as ApiPlaylistItem } from '../propresenter-client';
import { PlaylistItem as BuilderPlaylistItem } from '../types/playlist';

const REGISTRY_VERSION = 1;

export class StageAuditService {
  private registry: StageSettingsRegistry;
  private registryPath: string;

  constructor(registryPath?: string) {
    this.registryPath = registryPath || this.getDefaultRegistryPath();
    this.registry = this.loadRegistry();
  }

  private getDefaultRegistryPath(): string {
    // Store in user data directory
    const userDataDir = process.env.APPDATA ||
      (process.platform === 'darwin'
        ? path.join(process.env.HOME || '', 'Library', 'Application Support')
        : path.join(process.env.HOME || '', '.local', 'share'));
    return path.join(userDataDir, 'propresenter-lyrics-export', 'stage-registry.json');
  }

  private loadRegistry(): StageSettingsRegistry {
    try {
      if (fs.existsSync(this.registryPath)) {
        const data = fs.readFileSync(this.registryPath, 'utf-8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Failed to load stage registry:', error);
    }

    // Return default registry
    return this.createDefaultRegistry();
  }

  private createDefaultRegistry(): StageSettingsRegistry {
    return {
      version: REGISTRY_VERSION,
      items: {},
      libraryDefaults: {
        // Song libraries
        'Worship': 'lyrics',
        'Songs': 'lyrics',
        'Hymns': 'lyrics',
        'Praise': 'lyrics',
        // Scripture
        'Scripture': 'scripture',
        'Bible': 'scripture',
        // Sermon/Message
        'Sermon': 'sermon',
        'Message': 'sermon',
        'Teaching': 'sermon',
        // Media/Video
        'Media': 'video',
        'Videos': 'video',
        'Kids': 'video',
        // Service content
        'Service Content': 'service_content',
        'Service': 'service_content',
        'Liturgy': 'service_content',
      },
      layoutUuids: {
        lyrics: null,
        scripture: null,
        video: null,
        sermon: null,
        service_content: null,
        blank: null,
        custom: null,
        unknown: null,
      },
      updatedAt: new Date().toISOString(),
    };
  }

  /**
   * Known service content presentation patterns
   * Maps presentation names to content types
   */
  private readonly serviceContentPatterns: Array<{ pattern: RegExp; contentType: ContentType }> = [
    // Announcements
    { pattern: /announce/i, contentType: 'announcements' },
    // Prayer
    { pattern: /prayer|praying/i, contentType: 'prayer' },
    // Scripture/Bible
    { pattern: /\d+[_:]\d+/i, contentType: 'scripture' }, // Bible refs like "Luke 12:35" or "Luke 12_35"
    { pattern: /genesis|exodus|leviticus|numbers|deuteronomy|joshua|judges|ruth|samuel|kings|chronicles|ezra|nehemiah|esther|job|psalm|proverbs|ecclesiastes|song of|isaiah|jeremiah|lamentations|ezekiel|daniel|hosea|joel|amos|obadiah|jonah|micah|nahum|habakkuk|zephaniah|haggai|zechariah|malachi|matthew|mark|luke|john|acts|romans|corinthians|galatians|ephesians|philippians|colossians|thessalonians|timothy|titus|philemon|hebrews|james|peter|jude|revelation/i, contentType: 'scripture' },
    // Sermon/Message
    { pattern: /sermon|message|teaching|talk(?!\s*kids)/i, contentType: 'sermon' },
    // Service elements
    { pattern: /birthday|blessing/i, contentType: 'service_element' },
    { pattern: /call to worship/i, contentType: 'service_element' },
    { pattern: /the grace/i, contentType: 'service_element' },
    { pattern: /help and support/i, contentType: 'service_element' },
    { pattern: /kids talk|family slot|children/i, contentType: 'service_element' },
    // Videos (kids songs, media)
    { pattern: /video|movie|clip/i, contentType: 'video' },
  ];

  saveRegistry(): void {
    try {
      const dir = path.dirname(this.registryPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      this.registry.updatedAt = new Date().toISOString();
      fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2));
    } catch (error) {
      console.error('Failed to save stage registry:', error);
      throw error;
    }
  }

  /**
   * Configure the ProPresenter stage layout UUIDs for each layout type.
   * Call this once after connecting to ProPresenter to map layout types to actual UUIDs.
   */
  setLayoutUuids(layoutUuids: Partial<Record<StageLayoutType, string>>): void {
    this.registry.layoutUuids = {
      ...this.registry.layoutUuids,
      ...layoutUuids,
    };
    this.saveRegistry();
  }

  /**
   * Set the default stage layout type for a library.
   */
  setLibraryDefault(libraryName: string, layoutType: StageLayoutType): void {
    this.registry.libraryDefaults[libraryName] = layoutType;
    this.saveRegistry();
  }

  /**
   * Detect the content type of a presentation based on its name and library.
   */
  detectContentType(presentationName?: string, libraryName?: string): ContentType {
    // Check presentation name against known patterns
    if (presentationName) {
      for (const { pattern, contentType } of this.serviceContentPatterns) {
        if (pattern.test(presentationName)) {
          return contentType;
        }
      }
    }

    // Fall back to library-based detection
    if (libraryName) {
      const libLower = libraryName.toLowerCase();
      if (libLower.includes('worship') || libLower.includes('song') || libLower.includes('hymn') || libLower.includes('praise')) {
        return 'song';
      }
      if (libLower.includes('scripture') || libLower.includes('bible')) {
        return 'scripture';
      }
      if (libLower.includes('sermon') || libLower.includes('message') || libLower.includes('teaching')) {
        return 'sermon';
      }
      if (libLower.includes('video') || libLower.includes('media') || libLower.includes('kids')) {
        return 'video';
      }
      if (libLower.includes('service')) {
        return 'service_element';
      }
    }

    return 'unknown';
  }

  /**
   * Get the expected layout type for a presentation based on its content type.
   */
  inferLayoutType(libraryName?: string, presentationName?: string): StageLayoutType {
    const contentType = this.detectContentType(presentationName, libraryName);
    return CONTENT_TYPE_TO_LAYOUT[contentType];
  }

  /**
   * Get expected layout from content type
   */
  getLayoutForContentType(contentType: ContentType): StageLayoutType {
    return CONTENT_TYPE_TO_LAYOUT[contentType];
  }

  /**
   * Get the settings record for a presentation.
   */
  getSettings(presentationUuid: string): StageSettingsRecord | null {
    return this.registry.items[presentationUuid] || null;
  }

  /**
   * Mark a presentation as verified with correct stage settings.
   */
  markVerified(
    presentationUuid: string,
    presentationName: string,
    layoutType: StageLayoutType,
    options?: {
      libraryName?: string;
      contentType?: ContentType;
      verifiedBy?: string;
      notes?: string;
      customLayoutUuid?: string;
    }
  ): void {
    const contentType = options?.contentType || this.detectContentType(presentationName, options?.libraryName);
    this.registry.items[presentationUuid] = {
      presentationUuid,
      presentationName,
      libraryName: options?.libraryName,
      contentType,
      expectedLayout: layoutType,
      customLayoutUuid: options?.customLayoutUuid,
      status: 'verified',
      verifiedBy: options?.verifiedBy,
      verifiedAt: new Date().toISOString(),
      notes: options?.notes,
    };
    this.saveRegistry();
  }

  /**
   * Mark a presentation as needing stage setup.
   */
  markNeedsSetup(
    presentationUuid: string,
    presentationName: string,
    expectedLayout: StageLayoutType,
    contentType?: ContentType,
    notes?: string
  ): void {
    const detectedType = contentType || this.detectContentType(presentationName);
    this.registry.items[presentationUuid] = {
      presentationUuid,
      presentationName,
      contentType: detectedType,
      expectedLayout,
      status: 'needs_setup',
      notes,
    };
    this.saveRegistry();
  }

  /**
   * Mark a presentation as not applicable for stage display.
   */
  markNotApplicable(
    presentationUuid: string,
    presentationName: string,
    contentType?: ContentType,
    reason?: string
  ): void {
    const detectedType = contentType || this.detectContentType(presentationName);
    this.registry.items[presentationUuid] = {
      presentationUuid,
      presentationName,
      contentType: detectedType,
      expectedLayout: 'blank',
      status: 'not_applicable',
      notes: reason,
    };
    this.saveRegistry();
  }

  /**
   * Remove a presentation from the registry.
   */
  removeRecord(presentationUuid: string): void {
    delete this.registry.items[presentationUuid];
    this.saveRegistry();
  }

  /**
   * Unified playlist item for audit purposes
   * Works with both API playlist items and builder playlist items
   */
  private normalizePlaylistItem(item: ApiPlaylistItem | BuilderPlaylistItem): {
    uuid: string;
    name: string;
    presentationUuid: string | null;
    isHeader: boolean;
  } {
    // Check if it's a builder playlist item (has 'id' object with uuid)
    if ('id' in item && typeof item.id === 'object' && 'uuid' in item.id) {
      const builderItem = item as BuilderPlaylistItem;
      return {
        uuid: builderItem.id.uuid,
        name: builderItem.id.name,
        presentationUuid: builderItem.presentation_info?.presentation_uuid || null,
        isHeader: builderItem.type === 'header',
      };
    }
    // API playlist item
    const apiItem = item as ApiPlaylistItem;
    return {
      uuid: apiItem.uuid,
      name: apiItem.name,
      presentationUuid: apiItem.presentationUuid || null,
      isHeader: apiItem.isHeader,
    };
  }

  /**
   * Generate an audit report for a playlist.
   * Works with both API playlist items and builder playlist items.
   */
  auditPlaylist(
    playlistId: string,
    playlistName: string,
    items: (ApiPlaylistItem | BuilderPlaylistItem)[]
  ): PlaylistAuditReport {
    const auditItems: PlaylistAuditItem[] = [];

    // Initialize content type counts
    const byContentType: Record<ContentType, { total: number; verified: number }> = {
      song: { total: 0, verified: 0 },
      scripture: { total: 0, verified: 0 },
      sermon: { total: 0, verified: 0 },
      video: { total: 0, verified: 0 },
      announcements: { total: 0, verified: 0 },
      prayer: { total: 0, verified: 0 },
      service_element: { total: 0, verified: 0 },
      header: { total: 0, verified: 0 },
      unknown: { total: 0, verified: 0 },
    };

    let headerCount = 0;

    for (const rawItem of items) {
      const item = this.normalizePlaylistItem(rawItem);

      // Track headers but skip detailed audit
      if (item.isHeader) {
        headerCount++;
        byContentType.header.total++;
        auditItems.push({
          playlistItemUuid: item.uuid,
          playlistItemName: item.name,
          presentationUuid: null,
          presentationName: item.name,
          contentType: 'header',
          isHeader: true,
          status: 'not_applicable',
          expectedLayout: 'blank',
          needsAttention: false,
          recommendation: 'Section header - no stage display needed',
        });
        continue;
      }

      const presentationUuid = item.presentationUuid;
      const existingRecord = presentationUuid
        ? this.registry.items[presentationUuid]
        : null;

      let status: VerificationStatus;
      let expectedLayout: StageLayoutType;
      let contentType: ContentType;
      let needsAttention: boolean;
      let recommendation: string;

      if (existingRecord) {
        status = existingRecord.status;
        expectedLayout = existingRecord.expectedLayout;
        contentType = existingRecord.contentType;
        needsAttention = status === 'unverified' || status === 'needs_setup';
        recommendation = this.getRecommendation(existingRecord);
      } else {
        // Unknown item - detect content type and infer layout
        contentType = this.detectContentType(item.name);
        expectedLayout = CONTENT_TYPE_TO_LAYOUT[contentType];
        status = 'unverified';
        needsAttention = true;
        recommendation = `New ${contentType}: verify stage display is set to "${expectedLayout}" layout`;
      }

      // Update content type counts
      byContentType[contentType].total++;
      if (status === 'verified') {
        byContentType[contentType].verified++;
      }

      auditItems.push({
        playlistItemUuid: item.uuid,
        playlistItemName: item.name,
        presentationUuid,
        presentationName: item.name,
        contentType,
        isHeader: false,
        status,
        expectedLayout,
        needsAttention,
        recommendation,
      });
    }

    // Calculate summary (excluding headers from main counts)
    const nonHeaderItems = auditItems.filter(i => !i.isHeader);
    const summary = {
      total: nonHeaderItems.length,
      verified: nonHeaderItems.filter(i => i.status === 'verified').length,
      unverified: nonHeaderItems.filter(i => i.status === 'unverified').length,
      needsSetup: nonHeaderItems.filter(i => i.status === 'needs_setup').length,
      notApplicable: nonHeaderItems.filter(i => i.status === 'not_applicable').length,
      headers: headerCount,
      byContentType,
    };

    const actionRequired = auditItems.filter(i => i.needsAttention);
    const readinessScore = summary.total > 0
      ? Math.round(((summary.verified + summary.notApplicable) / summary.total) * 100)
      : 100;

    return {
      playlistId,
      playlistName,
      generatedAt: new Date().toISOString(),
      summary,
      items: auditItems,
      actionRequired,
      readinessScore,
    };
  }

  private getRecommendation(record: StageSettingsRecord): string {
    const contentLabel = this.getContentTypeLabel(record.contentType);
    const layoutLabel = this.getLayoutLabel(record.expectedLayout);

    switch (record.status) {
      case 'verified':
        return `OK - ${contentLabel} verified with ${layoutLabel}`;
      case 'needs_setup':
        return `ACTION: Set ${contentLabel} to use ${layoutLabel} in ProPresenter`;
      case 'not_applicable':
        return 'No action needed - stage display not used';
      case 'unverified':
      default:
        return `CHECK: Verify ${contentLabel} uses ${layoutLabel}`;
    }
  }

  private getContentTypeLabel(contentType: ContentType): string {
    const labels: Record<ContentType, string> = {
      song: 'Song',
      scripture: 'Scripture',
      sermon: 'Sermon',
      video: 'Video',
      announcements: 'Announcements',
      prayer: 'Prayer',
      service_element: 'Service Element',
      header: 'Header',
      unknown: 'Item',
    };
    return labels[contentType] || 'Item';
  }

  private getLayoutLabel(layout: StageLayoutType): string {
    const labels: Record<StageLayoutType, string> = {
      lyrics: 'Lyrics Layout',
      scripture: 'Scripture Layout',
      sermon: 'Sermon Layout',
      video: 'Video Layout',
      service_content: 'Service Content Layout',
      blank: 'Blank/None',
      custom: 'Custom Layout',
      unknown: 'Unknown Layout',
    };
    return labels[layout] || 'Unknown Layout';
  }

  /**
   * Get all items that need attention.
   */
  getItemsNeedingAttention(): StageSettingsRecord[] {
    return Object.values(this.registry.items).filter(
      item => item.status === 'unverified' || item.status === 'needs_setup'
    );
  }

  /**
   * Get registry statistics.
   */
  getStats(): {
    totalItems: number;
    verified: number;
    unverified: number;
    needsSetup: number;
    byLayout: Record<StageLayoutType, number>;
    byContentType: Record<ContentType, number>;
  } {
    const items = Object.values(this.registry.items);
    const byLayout: Record<StageLayoutType, number> = {
      lyrics: 0,
      scripture: 0,
      video: 0,
      sermon: 0,
      service_content: 0,
      blank: 0,
      custom: 0,
      unknown: 0,
    };
    const byContentType: Record<ContentType, number> = {
      song: 0,
      scripture: 0,
      sermon: 0,
      video: 0,
      announcements: 0,
      prayer: 0,
      service_element: 0,
      header: 0,
      unknown: 0,
    };

    for (const item of items) {
      byLayout[item.expectedLayout]++;
      if (item.contentType) {
        byContentType[item.contentType]++;
      }
    }

    return {
      totalItems: items.length,
      verified: items.filter(i => i.status === 'verified').length,
      unverified: items.filter(i => i.status === 'unverified').length,
      needsSetup: items.filter(i => i.status === 'needs_setup').length,
      byLayout,
      byContentType,
    };
  }

  /**
   * Export registry for backup/sharing.
   */
  exportRegistry(): StageSettingsRegistry {
    return { ...this.registry };
  }

  /**
   * Import registry from backup.
   */
  importRegistry(data: StageSettingsRegistry, merge: boolean = true): void {
    if (merge) {
      // Merge with existing, preferring imported data
      this.registry.items = {
        ...this.registry.items,
        ...data.items,
      };
      this.registry.libraryDefaults = {
        ...this.registry.libraryDefaults,
        ...data.libraryDefaults,
      };
    } else {
      this.registry = data;
    }
    this.saveRegistry();
  }
}
