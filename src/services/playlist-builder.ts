/**
 * Playlist Builder Service
 * Assembles ProPresenter playlists from parsed PDF and matched songs
 */

import { randomUUID } from 'crypto';
import { PlaylistItem, PlaylistItemId, TemplateItem } from '../types/playlist';
import { ParsedService } from '../types/service-order';
import { SongMatch } from '../types/song-match';

/**
 * Known presentation UUIDs from Service Content library
 * These should be configurable via settings
 */
interface ServiceContentPresentations {
  announcements: string;
  callToWorship: string;
  prayer: string;
  birthdayBlessings: string;
  kidsTalk: string;
  prayingForOthers: string;
  helpAndSupport: string;
  theGrace: string;
}

export class PlaylistBuilder {
  private serviceContent: ServiceContentPresentations;

  constructor(serviceContent: ServiceContentPresentations) {
    this.serviceContent = serviceContent;
  }

  /**
   * Build playlist from parsed PDF and matched songs
   */
  async buildPlaylist(
    parsedPDF: ParsedService,
    songMatches: SongMatch[],
    allPresentations: any[] // All presentations from all libraries for Bible matching
  ): Promise<PlaylistItem[]> {
    const items: PlaylistItem[] = [];
    let index = 0;

    // Track which songs we've used
    let songIndex = 0;
    const songs = parsedPDF.sections.filter(s => s.type === 'song' || s.type === 'video');
    const bibleReading = parsedPDF.sections.find(s => s.type === 'bible');

    // Opening - Pre Roll
    items.push(this.createHeader('Opening - Pre Roll', index++));
    items.push(this.createPresentation('Announcements (Before and After Service)', this.serviceContent.announcements, index++));

    // Call to Worship (if present in PDF)
    const callToWorship = parsedPDF.sections.find(s =>
      s.title.toLowerCase().includes('call to worship') ||
      s.title.toLowerCase().includes('opening prayer')
    );
    if (callToWorship) {
      items.push(this.createPresentation('Call to Worship', this.serviceContent.callToWorship, index++));
    }

    // Praise 1
    items.push(this.createHeader('Praise 1', index++));
    if (songs[songIndex]) {
      const match = songMatches.find(m => m.pdfTitle === songs[songIndex].title);
      if (match?.bestMatch) {
        items.push(this.createPresentation(
          match.bestMatch.presentation.name,
          match.bestMatch.presentation.uuid,
          index++
        ));
      }
      songIndex++;
    }

    // Prayer (if specified in PDF)
    const prayer = parsedPDF.sections.find(s =>
      s.title.toLowerCase().includes('prayer') &&
      !s.title.toLowerCase().includes('opening')
    );
    if (prayer) {
      items.push(this.createPresentation('Prayer Together', this.serviceContent.prayer, index++));
    }

    // Birthday Blessings
    items.push(this.createHeader('Birthday Blessings', index++));
    items.push(this.createPresentation('Birthday Blessings', this.serviceContent.birthdayBlessings, index++));

    // Kids Talk / Family Slot
    const familySlot = parsedPDF.sections.find(s =>
      s.title.toLowerCase().includes('family slot') ||
      s.title.toLowerCase().includes('kids talk') ||
      s.title.toLowerCase().includes('children')
    );
    if (familySlot) {
      items.push(this.createHeader('Kids Talk', index++));
      items.push(this.createPresentation('Kids Talk', this.serviceContent.kidsTalk, index++));

      // Kids song (if present)
      const kidsSong = songs.find(s => s.isVideo);
      if (kidsSong) {
        const match = songMatches.find(m => m.pdfTitle === kidsSong.title);
        if (match?.bestMatch) {
          items.push(this.createPresentation(
            match.bestMatch.presentation.name,
            match.bestMatch.presentation.uuid,
            index++
          ));
        }
        songIndex++;
      }
    }

    // Announcements
    items.push(this.createHeader('Announcements', index++));
    items.push(this.createPresentation('Announcements (During the Service)', this.serviceContent.announcements, index++));
    items.push(this.createPresentation('Praying for Others', this.serviceContent.prayingForOthers, index++));

    // Praise 2
    items.push(this.createHeader('Praise 2', index++));
    if (songs[songIndex]) {
      const match = songMatches.find(m => m.pdfTitle === songs[songIndex].title);
      if (match?.bestMatch) {
        items.push(this.createPresentation(
          match.bestMatch.presentation.name,
          match.bestMatch.presentation.uuid,
          index++
        ));
      }
      songIndex++;
    }

    // Reading (Bible)
    if (bibleReading) {
      items.push(this.createHeader('Reading', index++));

      // Try to find matching Bible presentation
      const biblePresName = this.formatBiblePresentationName(bibleReading.title);
      const biblePres = allPresentations.find(p =>
        p.name === biblePresName ||
        p.name.includes(bibleReading.title.replace(':', '_'))
      );

      if (biblePres) {
        items.push(this.createPresentation(biblePres.name, biblePres.uuid, index++));
      } else {
        // Add placeholder - user needs to create this presentation
        console.warn(`⚠️  Bible presentation not found: ${biblePresName}`);
        console.warn(`    Please create a presentation named "${biblePresName}" in ProPresenter`);
        // Still add a header so user knows where to insert it
      }
    }

    // Sermon Content
    items.push(this.createHeader('Sermon Content', index++));
    // Sermon slides are added by minister - just leave space

    // Praise 3 (Closing)
    items.push(this.createHeader('Praise 3', index++));
    if (songs[songIndex]) {
      const match = songMatches.find(m => m.pdfTitle === songs[songIndex].title);
      if (match?.bestMatch) {
        items.push(this.createPresentation(
          match.bestMatch.presentation.name,
          match.bestMatch.presentation.uuid,
          index++
        ));
      }
      songIndex++;
    }

    // Closing
    items.push(this.createHeader('Closing', index++));
    items.push(this.createPresentation('Help and Support', this.serviceContent.helpAndSupport, index++));
    items.push(this.createPresentation('The Grace', this.serviceContent.theGrace, index++));
    items.push(this.createPresentation('Announcements (Before and After Service)', this.serviceContent.announcements, index++));

    return items;
  }

  /**
   * Create a header item
   */
  private createHeader(name: string, index: number): PlaylistItem {
    return {
      id: {
        name,
        index,
        uuid: randomUUID()
      },
      type: 'header',
      is_hidden: false,
      is_pco: false,
      presentation_info: {
        presentation_uuid: '',
        arrangement_name: '',
        arrangement_uuid: ''
      },
      destination: 'presentation'
    };
  }

  /**
   * Create a presentation item
   */
  private createPresentation(name: string, uuid: string, index: number): PlaylistItem {
    return {
      id: {
        name,
        index,
        uuid: randomUUID() // This is the playlist item UUID, not the presentation UUID
      },
      type: 'presentation',
      is_hidden: false,
      is_pco: false,
      presentation_info: {
        presentation_uuid: uuid, // This is the actual presentation UUID
        arrangement_name: '',
        arrangement_uuid: ''
      },
      destination: 'presentation'
    };
  }

  /**
   * Format Bible reference for presentation name
   * "Luke 12:35-59" -> "Luke 12_35-59 (NIV)"
   */
  private formatBiblePresentationName(reference: string): string {
    return reference.replace(':', '_') + ' (NIV)';
  }

  /**
   * Update ProPresenter playlist via API
   */
  async updatePlaylist(
    playlistId: string,
    items: PlaylistItem[],
    host: string,
    port: number
  ): Promise<void> {
    const url = `http://${host}:${port}/v1/playlist/${playlistId}`;

    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(items)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to update playlist: ${response.status} ${errorText}`);
    }
  }
}

// Export factory function
export function createPlaylistBuilder(serviceContent: ServiceContentPresentations): PlaylistBuilder {
  return new PlaylistBuilder(serviceContent);
}
