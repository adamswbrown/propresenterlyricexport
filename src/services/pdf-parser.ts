/**
 * PDF Parser Service
 * Extracts structured service order data from PDF documents
 */

import * as fs from 'fs';
import { ParsedService, ServiceSection, ServiceSectionType, PraiseSlot } from '../types/service-order';

// pdf-parse is a CommonJS module, use require with destructuring
const { PDFParse } = require('pdf-parse');

export class PDFParser {
  /**
   * Parse a PDF file and extract service order sections
   */
  async parsePDF(pdfPath: string): Promise<ParsedService> {
    // Read and parse PDF - convert Buffer to Uint8Array as required by pdf-parse v2
    const nodeBuffer = fs.readFileSync(pdfPath);
    const uint8Array = new Uint8Array(nodeBuffer.buffer, nodeBuffer.byteOffset, nodeBuffer.byteLength);

    // pdf-parse v2 requires options object with data property
    const parser = new PDFParse({ data: uint8Array });
    const data = await parser.getText();
    await parser.destroy(); // Free memory

    // Normalize text
    const rawText = data.text.replace(/\r\n/g, '\n');
    const lines = rawText.split('\n').map((l: string) => l.trim()).filter((l: string) => l.length > 0);

    // Extract date from first line
    const date = this.extractDate(lines[0]);

    // Parse sections
    const sections = this.extractSections(lines);

    return {
      date,
      rawDate: lines[0],
      sections,
      rawText
    };
  }

  /**
   * Extract date from header line
   * Example: "SUNDAY MORNING, 1st February 2026 - 11am"
   */
  private extractDate(headerLine: string): string {
    // Match pattern: "1st February 2026" or "February 1, 2026" etc.
    const dateMatch = headerLine.match(/(\d{1,2}(?:st|nd|rd|th)?\s+\w+\s+\d{4})/i);
    if (dateMatch) {
      return dateMatch[1];
    }

    // Fallback: just return the header
    return headerLine;
  }

  /**
   * Extract service sections from lines
   * Only extracts: songs, kids videos, and Bible verses
   * Everything else (birthday blessings, sermons, headers) is handled via PowerPoint import
   *
   * Tracks section markers to determine praise slot:
   * - After "Call to Worship" → Praise 1
   * - After "Prayers for Others" / "Praying for Others" → Praise 2
   * - After "Sermon" → Praise 2 (for communion services without "Praying for Others")
   * - After "Reflection:" → Praise 2 (for Good Friday services)
   * - After "Time of Prayerful Reflection" → Praise 3
   * - After "Act of Communion" / "Sacrament of Communion" → Praise 3 (for communion/Good Friday)
   * - After "Epilogue" → Praise 3 (for Nativity/Kids Ministry)
   * - Kids videos are marked as "kids" slot
   *
   * Supports multiple service formats:
   * - Regular Sunday AM
   * - Communion services
   * - Good Friday (uses SCRIPTURE:, REFLECTION:, SACRAMENT OF COMMUNION)
   * - Nativity/Kids Ministry (uses PRAISE & PLAY:, EPILOGUE)
   * - Remembrance (uses VIDEO: for standalone videos)
   */
  private extractSections(lines: string[]): ServiceSection[] {
    const sections: ServiceSection[] = [];
    let position = 0;
    let currentPraiseSlot: PraiseSlot = 'praise1'; // Default to praise1 after opening

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const lineLower = line.toLowerCase();

      // Skip metadata lines
      if (this.isMetadataLine(line)) {
        continue;
      }

      // ===== PRAISE SLOT MARKERS =====

      // After "Call to Worship" or "Opening Prayer" → Praise 1
      if (lineLower.includes('call to worship') || lineLower.includes('opening prayer')) {
        currentPraiseSlot = 'praise1';
        continue;
      }

      // After "Prayers for Others" / "Praying for Others" → Praise 2 (regular services)
      if (lineLower.includes('praying for others') || lineLower.includes('prayers for others')) {
        currentPraiseSlot = 'praise2';
        continue;
      }

      // After "Sermon" → Praise 2 (communion services - song before communion)
      // This also works for regular services since it comes after "Praying for Others"
      if (lineLower.startsWith('sermon:') || lineLower === 'sermon') {
        currentPraiseSlot = 'praise2';
        continue;
      }

      // After "Reflection:" → Praise 2 (Good Friday services)
      if (lineLower.startsWith('reflection:') || lineLower === 'reflection') {
        currentPraiseSlot = 'praise2';
        continue;
      }

      // After "Time of Prayerful Reflection" or "Prayerful Reflection and Response" → Praise 3 (regular services)
      if (lineLower.includes('prayerful reflection') || lineLower.includes('reflection and response')) {
        currentPraiseSlot = 'praise3';
        continue;
      }

      // After "Act of Communion" or "Sacrament of Communion" → Praise 3 (communion/Good Friday)
      if (lineLower.includes('act of communion') || lineLower.includes('sacrament of communion') || lineLower.includes('communion:')) {
        currentPraiseSlot = 'praise3';
        continue;
      }

      // After "Epilogue" → Praise 3 (Nativity, Kids Ministry special services)
      if (lineLower.startsWith('epilogue')) {
        currentPraiseSlot = 'praise3';
        continue;
      }

      // ===== EXTRACTABLE ITEMS =====

      // Check for song or kids video (PRAISE:)
      if (line.match(/^PRAISE:/i)) {
        const song = this.extractSong(line, position++);
        // Kids videos get 'kids' slot, regular songs get current praise slot
        song.praiseSlot = song.isVideo ? 'kids' : currentPraiseSlot;
        sections.push(song);
        continue;
      }

      // Check for "PRAISE & PLAY:" (Nativity all-together services)
      if (line.match(/^PRAISE\s*&\s*PLAY:/i)) {
        const song = this.extractPraiseAndPlay(line, position++);
        song.praiseSlot = song.isVideo ? 'kids' : currentPraiseSlot;
        sections.push(song);
        continue;
      }

      // Check for standalone VIDEO: (Remembrance services)
      if (line.match(/^VIDEO:/i)) {
        const video = this.extractVideo(line, position++);
        video.praiseSlot = 'kids'; // Standalone videos go to kids slot
        sections.push(video);
        continue;
      }

      // Check for Bible reading (BIBLE READING:)
      if (line.match(/^BIBLE READING:/i)) {
        sections.push(this.extractBibleReading(line, position++));
        continue;
      }

      // Check for Scripture reading (SCRIPTURE:) - Good Friday format
      if (line.match(/^SCRIPTURE:/i)) {
        sections.push(this.extractScripture(line, position++));
        continue;
      }

      // Everything else is ignored - handled via PowerPoint import by minister
    }

    return sections;
  }

  /**
   * Check if line is metadata (timestamps, room info, etc.)
   */
  private isMetadataLine(line: string): boolean {
    // Skip lines like "10:30am:", "[Live Streamed...]", etc.
    return (
      line.match(/^\d{1,2}:\d{2}(am|pm)/i) !== null ||
      line.match(/^\[.*\]$/) !== null ||
      line.includes('Live Streamed') ||
      line.includes('Room 1') ||
      line.includes('leave for') ||
      line === ''
    );
  }

  /**
   * Extract song from PRAISE: line
   */
  private extractSong(line: string, position: number): ServiceSection {
    // Remove "PRAISE:" prefix
    const content = line.replace(/^PRAISE:\s*/i, '').trim();

    // Check if video
    const isVideo = content.includes('(Video)');
    const title = content.replace(/\s*\(Video\)\s*/i, '').trim();

    // Extract leader if present (e.g., "(Praise Team)")
    const leaderMatch = content.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;

    // Clean title (remove leader designation)
    const cleanTitle = leader ? title.replace(/\s*\([^)]+\)$/, '').trim() : title;

    const type: ServiceSectionType = isVideo ? 'video' : 'song';

    return {
      type,
      title: cleanTitle,
      leader,
      position,
      isVideo
    };
  }

  /**
   * Extract Bible reading
   */
  private extractBibleReading(line: string, position: number): ServiceSection {
    // Remove "BIBLE READING:" prefix
    const content = line.replace(/^BIBLE READING:\s*/i, '').trim();

    // Extract reference (e.g., "Luke 12:35-59") and leader (e.g., "(TBC)")
    const leaderMatch = content.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;
    const reference = leader ? content.replace(/\s*\([^)]+\)$/, '').trim() : content;

    return {
      type: 'bible',
      title: reference,
      leader,
      position
    };
  }

  /**
   * Extract Scripture reading (Good Friday format)
   * Similar to Bible reading but uses "SCRIPTURE:" prefix
   */
  private extractScripture(line: string, position: number): ServiceSection {
    // Remove "SCRIPTURE:" prefix
    const content = line.replace(/^SCRIPTURE:\s*/i, '').trim();

    // Extract reference and leader
    const leaderMatch = content.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;
    const reference = leader ? content.replace(/\s*\([^)]+\)$/, '').trim() : content;

    return {
      type: 'bible',
      title: reference,
      leader,
      position
    };
  }

  /**
   * Extract "PRAISE & PLAY:" songs (Nativity all-together services)
   * Same format as regular PRAISE: lines
   */
  private extractPraiseAndPlay(line: string, position: number): ServiceSection {
    // Remove "PRAISE & PLAY:" prefix (with flexible whitespace)
    const content = line.replace(/^PRAISE\s*&\s*PLAY:\s*/i, '').trim();

    // Check if video
    const isVideo = content.includes('(Video)');
    const title = content.replace(/\s*\(Video\)\s*/i, '').trim();

    // Extract leader if present
    const leaderMatch = content.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;

    // Clean title (remove leader designation)
    const cleanTitle = leader ? title.replace(/\s*\([^)]+\)$/, '').trim() : title;

    const type: ServiceSectionType = isVideo ? 'video' : 'song';

    return {
      type,
      title: cleanTitle,
      leader,
      position,
      isVideo
    };
  }

  /**
   * Extract standalone VIDEO: lines (Remembrance services)
   */
  private extractVideo(line: string, position: number): ServiceSection {
    // Remove "VIDEO:" prefix
    const content = line.replace(/^VIDEO:\s*/i, '').trim();

    // Extract leader if present
    const leaderMatch = content.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;
    const title = leader ? content.replace(/\s*\([^)]+\)$/, '').trim() : content;

    return {
      type: 'video',
      title,
      leader,
      position,
      isVideo: true
    };
  }

}

// Export singleton instance
export const pdfParser = new PDFParser();
