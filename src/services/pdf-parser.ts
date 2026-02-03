/**
 * PDF Parser Service
 * Extracts structured service order data from PDF documents
 */

import * as fs from 'fs';
const { PDFParse } = require('pdf-parse');
import { ParsedService, ServiceSection, ServiceSectionType } from '../types/service-order';

export class PDFParser {
  /**
   * Parse a PDF file and extract service order sections
   */
  async parsePDF(pdfPath: string): Promise<ParsedService> {
    // Read and parse PDF
    const dataBuffer = fs.readFileSync(pdfPath);
    const parser = new PDFParse({ data: dataBuffer });
    const data = await parser.getText();

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
   */
  private extractSections(lines: string[]): ServiceSection[] {
    const sections: ServiceSection[] = [];
    let position = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Skip metadata lines
      if (this.isMetadataLine(line)) {
        continue;
      }

      // Check for song (PRAISE:)
      if (line.match(/^PRAISE:/i)) {
        sections.push(this.extractSong(line, position++));
        continue;
      }

      // Check for Bible reading
      if (line.match(/^BIBLE READING:/i)) {
        sections.push(this.extractBibleReading(line, position++));
        continue;
      }

      // Check for section headers (ALL CAPS with colon)
      if (line.match(/^[A-Z\s&]+:/) && !line.match(/^(PRAISE|BIBLE READING):/i)) {
        sections.push(this.extractHeader(line, position++));
        continue;
      }

      // Check for placeholder content (lines with leader names in parentheses)
      if (line.match(/\([A-Za-z\s]+\)$/)) {
        sections.push(this.extractPlaceholder(line, position++));
        continue;
      }
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
   * Extract section header
   */
  private extractHeader(line: string, position: number): ServiceSection {
    // Extract header name (remove colon)
    const title = line.replace(/:$/, '').trim();

    // Extract leader if on same line
    const leaderMatch = line.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;
    const cleanTitle = leader ? title.replace(/\s*\([^)]+\)$/, '').trim() : title;

    return {
      type: 'header',
      title: cleanTitle,
      leader,
      position
    };
  }

  /**
   * Extract placeholder content (lines with leader names)
   */
  private extractPlaceholder(line: string, position: number): ServiceSection {
    // Extract leader from parentheses
    const leaderMatch = line.match(/\(([^)]+)\)$/);
    const leader = leaderMatch ? leaderMatch[1] : undefined;

    // Extract title (everything before leader)
    const title = leader ? line.replace(/\s*\([^)]+\)$/, '').trim() : line;

    // Check if it's a kids-related item
    const isKids = title.toLowerCase().includes('family slot') ||
                   title.toLowerCase().includes('children');

    return {
      type: isKids ? 'kids_song' : 'placeholder',
      title,
      leader,
      position
    };
  }
}

// Export singleton instance
export const pdfParser = new PDFParser();
