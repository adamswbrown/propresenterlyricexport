/**
 * Bible Fetcher Service
 * Fetches Bible verses from API.Bible (NIV version)
 */

import { BibleReference, BibleVerse, BibleAPIResponse } from '../types/bible';

const NIV_BIBLE_ID = 'de4e12af7f28f599-02';
const API_BASE = 'https://api.scripture.api.bible/v1';

// Book name to API ID mapping
const BOOK_IDS: Record<string, string> = {
  // Old Testament
  'genesis': 'GEN', 'gen': 'GEN',
  'exodus': 'EXO', 'exo': 'EXO',
  'leviticus': 'LEV', 'lev': 'LEV',
  'numbers': 'NUM', 'num': 'NUM',
  'deuteronomy': 'DEU', 'deu': 'DEU', 'deut': 'DEU',
  'joshua': 'JOS', 'josh': 'JOS',
  'judges': 'JDG', 'judg': 'JDG',
  'ruth': 'RUT',
  '1 samuel': '1SA', '1 sam': '1SA', '1samuel': '1SA', '1sam': '1SA',
  '2 samuel': '2SA', '2 sam': '2SA', '2samuel': '2SA', '2sam': '2SA',
  '1 kings': '1KI', '1 kgs': '1KI', '1kings': '1KI',
  '2 kings': '2KI', '2 kgs': '2KI', '2kings': '2KI',
  '1 chronicles': '1CH', '1 chr': '1CH', '1chron': '1CH',
  '2 chronicles': '2CH', '2 chr': '2CH', '2chron': '2CH',
  'ezra': 'EZR',
  'nehemiah': 'NEH', 'neh': 'NEH',
  'esther': 'EST',
  'job': 'JOB',
  'psalms': 'PSA', 'psalm': 'PSA', 'ps': 'PSA',
  'proverbs': 'PRO', 'prov': 'PRO',
  'ecclesiastes': 'ECC', 'eccl': 'ECC',
  'song of solomon': 'SNG', 'song': 'SNG', 'sos': 'SNG',
  'isaiah': 'ISA', 'isa': 'ISA',
  'jeremiah': 'JER', 'jer': 'JER',
  'lamentations': 'LAM', 'lam': 'LAM',
  'ezekiel': 'EZK', 'ezek': 'EZK',
  'daniel': 'DAN', 'dan': 'DAN',
  'hosea': 'HOS', 'hos': 'HOS',
  'joel': 'JOL',
  'amos': 'AMO',
  'obadiah': 'OBA', 'obad': 'OBA',
  'jonah': 'JON',
  'micah': 'MIC', 'mic': 'MIC',
  'nahum': 'NAM', 'nah': 'NAM',
  'habakkuk': 'HAB', 'hab': 'HAB',
  'zephaniah': 'ZEP', 'zeph': 'ZEP',
  'haggai': 'HAG', 'hag': 'HAG',
  'zechariah': 'ZEC', 'zech': 'ZEC',
  'malachi': 'MAL', 'mal': 'MAL',

  // New Testament
  'matthew': 'MAT', 'matt': 'MAT', 'mt': 'MAT',
  'mark': 'MRK', 'mk': 'MRK',
  'luke': 'LUK', 'lk': 'LUK',
  'john': 'JHN', 'jn': 'JHN',
  'acts': 'ACT',
  'romans': 'ROM', 'rom': 'ROM',
  '1 corinthians': '1CO', '1 cor': '1CO', '1cor': '1CO',
  '2 corinthians': '2CO', '2 cor': '2CO', '2cor': '2CO',
  'galatians': 'GAL', 'gal': 'GAL',
  'ephesians': 'EPH', 'eph': 'EPH',
  'philippians': 'PHP', 'phil': 'PHP',
  'colossians': 'COL', 'col': 'COL',
  '1 thessalonians': '1TH', '1 thess': '1TH', '1thess': '1TH',
  '2 thessalonians': '2TH', '2 thess': '2TH', '2thess': '2TH',
  '1 timothy': '1TI', '1 tim': '1TI', '1tim': '1TI',
  '2 timothy': '2TI', '2 tim': '2TI', '2tim': '2TI',
  'titus': 'TIT', 'tit': 'TIT',
  'philemon': 'PHM', 'phlm': 'PHM',
  'hebrews': 'HEB', 'heb': 'HEB',
  'james': 'JAS', 'jas': 'JAS',
  '1 peter': '1PE', '1 pet': '1PE', '1pet': '1PE', '1 pt': '1PE',
  '2 peter': '2PE', '2 pet': '2PE', '2pet': '2PE', '2 pt': '2PE',
  '1 john': '1JN', '1 jn': '1JN', '1jn': '1JN', '1john': '1JN',
  '2 john': '2JN', '2 jn': '2JN', '2jn': '2JN', '2john': '2JN',
  '3 john': '3JN', '3 jn': '3JN', '3jn': '3JN', '3john': '3JN',
  'jude': 'JUD',
  'revelation': 'REV', 'rev': 'REV'
};

export class BibleFetcher {
  private apiKey: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Fetch Bible verse(s) from API.Bible
   */
  async fetchVerse(reference: string): Promise<BibleVerse> {
    // Parse reference
    const parsed = this.parseReference(reference);

    // Build API passage ID
    const passageId = this.buildPassageId(parsed);

    // Fetch from API
    const url = `${API_BASE}/bibles/${NIV_BIBLE_ID}/passages/${passageId}?content-type=text&include-notes=false&include-titles=false&include-chapter-numbers=false&include-verse-numbers=true&include-verse-spans=false`;

    const response = await fetch(url, {
      headers: {
        'api-key': this.apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`Bible API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json() as BibleAPIResponse;

    // Clean and format text
    const text = this.stripHTMLTags(data.data.content);
    const slides = this.splitIntoSlides(text, parsed);

    return {
      reference: parsed,
      version: 'NIV',
      text,
      slides,
      copyright: data.data.copyright
    };
  }

  /**
   * Parse Bible reference string
   * Examples: "Luke 12:35-59", "John 3:16", "Psalm 23", "Romans 8"
   */
  parseReference(ref: string): BibleReference {
    // Clean input
    const cleaned = ref.trim().replace(/\s+/g, ' ');

    // Pattern: "Book Chapter:VerseStart-VerseEnd" or "Book Chapter:Verse" or "Book Chapter"
    const match = cleaned.match(/^([1-3]?\s*[a-z]+)\s+(\d+)(?::(\d+)(?:-(\d+))?)?$/i);

    if (!match) {
      throw new Error(`Invalid Bible reference format: ${ref}`);
    }

    const book = match[1].trim();
    const chapter = parseInt(match[2]);
    const verseStart = match[3] ? parseInt(match[3]) : undefined;
    const verseEnd = match[4] ? parseInt(match[4]) : undefined;

    return {
      book,
      chapter,
      verseStart: verseStart || 1,
      verseEnd,
      raw: ref
    };
  }

  /**
   * Build API passage ID from reference
   * Format: "LUK.12.35-LUK.12.59" or "JHN.3.16"
   */
  private buildPassageId(ref: BibleReference): string {
    const bookId = BOOK_IDS[ref.book.toLowerCase()];

    if (!bookId) {
      throw new Error(`Unknown book: ${ref.book}`);
    }

    if (ref.verseEnd) {
      return `${bookId}.${ref.chapter}.${ref.verseStart}-${bookId}.${ref.chapter}.${ref.verseEnd}`;
    } else if (ref.verseStart) {
      return `${bookId}.${ref.chapter}.${ref.verseStart}`;
    } else {
      return `${bookId}.${ref.chapter}`;
    }
  }

  /**
   * Strip HTML tags from API response
   */
  private stripHTMLTags(html: string): string {
    return html
      .replace(/<[^>]*>/g, '') // Remove HTML tags
      .replace(/&nbsp;/g, ' ') // Replace nbsp
      .replace(/&quot;/g, '"') // Replace quote entities
      .replace(/&amp;/g, '&')  // Replace ampersand entities
      .replace(/&lt;/g, '<')   // Replace less-than entities
      .replace(/&gt;/g, '>')   // Replace greater-than entities
      .replace(/\s+/g, ' ')    // Normalize whitespace
      .trim();
  }

  /**
   * Split verse text into presentation slides
   * Target: 3-5 verses per slide, max 500 characters
   */
  private splitIntoSlides(text: string, ref: BibleReference): string[] {
    const slides: string[] = [];
    const verses = text.split(/\[(\d+)\]/).filter(s => s.trim().length > 0);

    let currentSlide = '';
    let verseCount = 0;

    for (let i = 0; i < verses.length; i += 2) {
      const verseNum = verses[i];
      const verseText = verses[i + 1] || '';

      const verseLine = `[${verseNum}] ${verseText.trim()}`;

      // Check if adding this verse would exceed limits
      if (currentSlide.length + verseLine.length > 500 || verseCount >= 5) {
        // Start new slide
        if (currentSlide.trim()) {
          slides.push(currentSlide.trim());
        }
        currentSlide = verseLine;
        verseCount = 1;
      } else {
        // Add to current slide
        currentSlide += (currentSlide ? '\n\n' : '') + verseLine;
        verseCount++;
      }
    }

    // Add final slide
    if (currentSlide.trim()) {
      slides.push(currentSlide.trim());
    }

    return slides;
  }
}

// Export factory function
export function createBibleFetcher(apiKey: string): BibleFetcher {
  return new BibleFetcher(apiKey);
}
