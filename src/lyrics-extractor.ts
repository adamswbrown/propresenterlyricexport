/**
 * Lyrics Extractor - Process presentations and extract structured lyrics
 *
 * Transforms raw ProPresenter presentation data into normalized lyric JSON
 */

import { PresentationInfo, GroupInfo, SlideInfo } from './propresenter-client';

export interface LyricSlide {
  index: number;
  text: string;
  section: string;
  isLyric: boolean;
}

export interface LyricSection {
  name: string;
  slides: LyricSlide[];
}

export interface ExtractedLyrics {
  title: string;
  uuid: string;
  sections: LyricSection[];
  fullText: string;
  slideCount: number;
  lyricSlideCount: number;
}

/**
 * Heuristics for detecting if a slide contains lyrics vs other content
 */
function isLikelyLyricSlide(slide: SlideInfo, groupName: string): boolean {
  const text = slide.text.trim();

  // Empty slides are not lyrics
  if (!text) {
    return false;
  }

  // Very short text (1-2 chars) is likely a placeholder
  if (text.length < 3) {
    return false;
  }

  // Check group name for common lyric section names
  const lyricSectionPatterns = [
    /verse/i,
    /chorus/i,
    /bridge/i,
    /pre-?chorus/i,
    /tag/i,
    /outro/i,
    /intro/i,
    /hook/i,
    /refrain/i,
    /coda/i,
    /vamp/i,
    /ending/i,
    /instrumental/i, // May have no text but is a song section
  ];

  const isLyricSection = lyricSectionPatterns.some(pattern => pattern.test(groupName));

  // Check for scripture reference patterns (not lyrics)
  const scripturePattern = /^\d*\s*[A-Za-z]+\s+\d+:\d+/;
  if (scripturePattern.test(text)) {
    return false;
  }

  // Check for common announcement patterns
  const announcementPatterns = [
    /^welcome/i,
    /^announcements?/i,
    /^upcoming events?/i,
    /^this week/i,
    /^next week/i,
    /www\./i,
    /https?:\/\//i,
  ];
  if (announcementPatterns.some(p => p.test(text))) {
    return false;
  }

  // If in a lyric-named section, it's likely lyrics
  if (isLyricSection) {
    return true;
  }

  // Heuristic: lyrics tend to have multiple short lines
  const lines = text.split('\n').filter(l => l.trim());
  const avgLineLength = lines.reduce((sum, l) => sum + l.length, 0) / lines.length;

  // Lyrics typically have short lines (< 60 chars average)
  if (lines.length >= 2 && avgLineLength < 60) {
    return true;
  }

  // Default: assume it's lyrics if it has text
  return true;
}

/**
 * Normalize text (clean up whitespace, etc.)
 */
function normalizeText(text: string): string {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extract lyrics from a presentation
 */
export function extractLyrics(presentation: PresentationInfo): ExtractedLyrics {
  const sections: LyricSection[] = [];
  let totalSlides = 0;
  let lyricSlides = 0;
  const allLyricTexts: string[] = [];

  for (const group of presentation.groups) {
    const section: LyricSection = {
      name: group.name,
      slides: [],
    };

    for (const slide of group.slides) {
      totalSlides++;
      const isLyric = isLikelyLyricSlide(slide, group.name);

      if (isLyric) {
        lyricSlides++;
        allLyricTexts.push(normalizeText(slide.text));
      }

      section.slides.push({
        index: slide.index,
        text: normalizeText(slide.text),
        section: group.name,
        isLyric,
      });
    }

    sections.push(section);
  }

  return {
    title: presentation.name,
    uuid: presentation.uuid,
    sections,
    fullText: allLyricTexts.join('\n\n'),
    slideCount: totalSlides,
    lyricSlideCount: lyricSlides,
  };
}

/**
 * Extract lyrics from multiple presentations (e.g., a playlist)
 */
export function extractLyricsFromPlaylist(
  presentations: PresentationInfo[]
): ExtractedLyrics[] {
  return presentations.map(extractLyrics);
}

/**
 * Format lyrics as plain text for display
 */
export function formatLyricsAsText(lyrics: ExtractedLyrics): string {
  const lines: string[] = [];

  lines.push(`=== ${lyrics.title} ===`);
  lines.push(`(${lyrics.lyricSlideCount} lyric slides)`);
  lines.push('');

  for (const section of lyrics.sections) {
    const lyricSlides = section.slides.filter(s => s.isLyric);
    if (lyricSlides.length === 0) continue;

    lines.push(`[${section.name}]`);
    for (const slide of lyricSlides) {
      lines.push(slide.text);
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Format lyrics as structured JSON (for export/further processing)
 */
export function formatLyricsAsJSON(lyrics: ExtractedLyrics): string {
  return JSON.stringify(lyrics, null, 2);
}

/**
 * Get a summary of a presentation's lyrics
 */
export function getLyricsSummary(lyrics: ExtractedLyrics): {
  title: string;
  uuid: string;
  sectionNames: string[];
  slideCount: number;
  lyricSlideCount: number;
  previewText: string;
} {
  return {
    title: lyrics.title,
    uuid: lyrics.uuid,
    sectionNames: lyrics.sections.map(s => s.name),
    slideCount: lyrics.slideCount,
    lyricSlideCount: lyrics.lyricSlideCount,
    previewText: lyrics.fullText.slice(0, 100) + (lyrics.fullText.length > 100 ? '...' : ''),
  };
}

export default {
  extractLyrics,
  extractLyricsFromPlaylist,
  formatLyricsAsText,
  formatLyricsAsJSON,
  getLyricsSummary,
};
