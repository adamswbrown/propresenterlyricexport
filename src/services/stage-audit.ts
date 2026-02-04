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
} from '../types/stage-audit';
import { PlaylistItem } from '../propresenter-client';

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
        'Worship': 'lyrics',
        'Songs': 'lyrics',
        'Hymns': 'lyrics',
        'Scripture': 'scripture',
        'Bible': 'scripture',
        'Sermon': 'message',
        'Media': 'video',
        'Videos': 'video',
        'Announcements': 'blank',
      },
      layoutUuids: {
        lyrics: null,
        scripture: null,
        video: null,
        message: null,
        blank: null,
        custom: null,
        unknown: null,
      },
      updatedAt: new Date().toISOString(),
    };
  }

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
   * Get the expected layout type for a presentation based on its library.
   */
  inferLayoutType(libraryName?: string, presentationName?: string): StageLayoutType {
    // Check library defaults first
    if (libraryName) {
      for (const [libPattern, layoutType] of Object.entries(this.registry.libraryDefaults)) {
        if (libraryName.toLowerCase().includes(libPattern.toLowerCase())) {
          return layoutType;
        }
      }
    }

    // Infer from presentation name
    if (presentationName) {
      const name = presentationName.toLowerCase();
      if (name.includes('verse') || name.includes('scripture') || name.match(/\d+:\d+/)) {
        return 'scripture';
      }
      if (name.includes('video') || name.includes('media')) {
        return 'video';
      }
      if (name.includes('announce')) {
        return 'blank';
      }
    }

    return 'unknown';
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
      verifiedBy?: string;
      notes?: string;
      customLayoutUuid?: string;
    }
  ): void {
    this.registry.items[presentationUuid] = {
      presentationUuid,
      presentationName,
      libraryName: options?.libraryName,
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
    notes?: string
  ): void {
    this.registry.items[presentationUuid] = {
      presentationUuid,
      presentationName,
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
    reason?: string
  ): void {
    this.registry.items[presentationUuid] = {
      presentationUuid,
      presentationName,
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
   * Generate an audit report for a playlist.
   */
  auditPlaylist(
    playlistId: string,
    playlistName: string,
    items: PlaylistItem[]
  ): PlaylistAuditReport {
    const auditItems: PlaylistAuditItem[] = [];

    for (const item of items) {
      if (item.isHeader) continue; // Skip headers

      const presentationUuid = item.presentationUuid || null;
      const existingRecord = presentationUuid
        ? this.registry.items[presentationUuid]
        : null;

      let status: VerificationStatus;
      let expectedLayout: StageLayoutType;
      let needsAttention: boolean;
      let recommendation: string;

      if (existingRecord) {
        status = existingRecord.status;
        expectedLayout = existingRecord.expectedLayout;
        needsAttention = status === 'unverified' || status === 'needs_setup';
        recommendation = this.getRecommendation(existingRecord);
      } else {
        // Unknown item - infer based on name/type
        expectedLayout = this.inferLayoutType(undefined, item.name);
        status = 'unverified';
        needsAttention = true;
        recommendation = `New item: verify stage display is set to "${expectedLayout}" layout`;
      }

      auditItems.push({
        playlistItemUuid: item.uuid,
        playlistItemName: item.name,
        presentationUuid,
        presentationName: item.name,
        status,
        expectedLayout,
        needsAttention,
        recommendation,
      });
    }

    // Calculate summary
    const summary = {
      total: auditItems.length,
      verified: auditItems.filter(i => i.status === 'verified').length,
      unverified: auditItems.filter(i => i.status === 'unverified').length,
      needsSetup: auditItems.filter(i => i.status === 'needs_setup').length,
      notApplicable: auditItems.filter(i => i.status === 'not_applicable').length,
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
    switch (record.status) {
      case 'verified':
        return `OK - verified as "${record.expectedLayout}" layout`;
      case 'needs_setup':
        return `ACTION: Set stage display to "${record.expectedLayout}" layout in ProPresenter`;
      case 'not_applicable':
        return 'No action needed - stage display not used';
      case 'unverified':
      default:
        return `CHECK: Verify stage display is set to "${record.expectedLayout}" layout`;
    }
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
  } {
    const items = Object.values(this.registry.items);
    const byLayout: Record<StageLayoutType, number> = {
      lyrics: 0,
      scripture: 0,
      video: 0,
      message: 0,
      blank: 0,
      custom: 0,
      unknown: 0,
    };

    for (const item of items) {
      byLayout[item.expectedLayout]++;
    }

    return {
      totalItems: items.length,
      verified: items.filter(i => i.status === 'verified').length,
      unverified: items.filter(i => i.status === 'unverified').length,
      needsSetup: items.filter(i => i.status === 'needs_setup').length,
      byLayout,
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
