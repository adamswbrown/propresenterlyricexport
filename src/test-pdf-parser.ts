/**
 * PDF Parser Test Script
 * Tests all PDFs in the OSS folder and categorizes them
 */

import * as fs from 'fs';
import * as path from 'path';
import { PDFParser } from './services/pdf-parser';

interface PDFTestResult {
  filename: string;
  date: string;
  category: string;
  songCount: number;
  bibleCount: number;
  videoCount: number;
  songs: string[];
  bibleReadings: string[];
  videos: string[];
  praiseSlots: Record<string, number>;
  parseError?: string;
  isDuplicate: boolean;
}

type ServiceCategory =
  | 'Morning Service'
  | 'Evening/PM Service'
  | 'Christmas/Carol Service'
  | 'Good Friday'
  | 'Easter'
  | 'Communion'
  | 'Funeral'
  | 'Remembrance'
  | 'Nativity/Kids Ministry'
  | 'Presbytery'
  | 'Unknown';

function categorizeService(filename: string, rawText: string): ServiceCategory {
  const lower = rawText.toLowerCase();
  const filenameLower = filename.toLowerCase();

  // Check filename patterns first
  if (filenameLower.includes('(pm)') || filenameLower.includes('pm -')) {
    return 'Evening/PM Service';
  }
  if (filenameLower.includes('carol') || filenameLower.includes('christmas')) {
    return 'Christmas/Carol Service';
  }
  if (filenameLower.includes('funeral')) {
    return 'Funeral';
  }
  if (filenameLower.includes('nativity')) {
    return 'Nativity/Kids Ministry';
  }

  // Check content patterns
  if (lower.includes('good friday') || (lower.includes('sacrament of communion') && lower.includes('reflection:'))) {
    return 'Good Friday';
  }
  if (lower.includes('easter') && (lower.includes('risen') || lower.includes('resurrection'))) {
    return 'Easter';
  }
  if (lower.includes('act of communion') || lower.includes('sacrament of communion')) {
    return 'Communion';
  }
  if (lower.includes('remembrance') || lower.includes('armistice')) {
    return 'Remembrance';
  }
  if (lower.includes('christmas') || lower.includes('carol') || lower.includes('nativity')) {
    return 'Christmas/Carol Service';
  }
  if (lower.includes('presbytery')) {
    return 'Presbytery';
  }
  if (lower.includes('funeral') || lower.includes('thanksgiving service for the life')) {
    return 'Funeral';
  }
  if (lower.includes('praise & play') || lower.includes('epilogue')) {
    return 'Nativity/Kids Ministry';
  }
  if (lower.includes('evening') || lower.includes('pm service')) {
    return 'Evening/PM Service';
  }

  // Check date for December (might be Christmas-related)
  const dateMatch = rawText.match(/\d{1,2}(?:st|nd|rd|th)?\s+(december)/i);
  if (dateMatch) {
    // December 21-25 likely Christmas
    const dayMatch = rawText.match(/(\d{1,2})(?:st|nd|rd|th)?\s+december/i);
    if (dayMatch) {
      const day = parseInt(dayMatch[1]);
      if (day >= 21 && day <= 25) {
        return 'Christmas/Carol Service';
      }
    }
  }

  // Default: Morning Service (most common)
  if (lower.includes('sunday morning') || lower.includes('11am') || lower.includes('morning service')) {
    return 'Morning Service';
  }

  return 'Morning Service'; // Default assumption
}

async function testAllPDFs() {
  const ossFolder = path.join(__dirname, '..', 'OSS');
  const parser = new PDFParser();
  const results: PDFTestResult[] = [];
  const seenHashes = new Map<string, string>(); // hash -> filename

  // Get all PDFs
  const files = fs.readdirSync(ossFolder)
    .filter(f => f.toLowerCase().endsWith('.pdf'))
    .sort();

  console.log(`\n${'='.repeat(80)}`);
  console.log(`PDF PARSER TEST - ${files.length} PDFs found`);
  console.log(`${'='.repeat(80)}\n`);

  for (const file of files) {
    const pdfPath = path.join(ossFolder, file);

    try {
      // Check for duplicates by file size + first few chars of name
      const stats = fs.statSync(pdfPath);
      const baseNameMatch = file.match(/OS\s+(\d{2}\.\d{2}\.\d{2,4})/);
      const baseName = baseNameMatch ? baseNameMatch[1] : file;
      const hash = `${baseName}-${stats.size}`;

      const isDuplicate = seenHashes.has(hash);
      if (!isDuplicate) {
        seenHashes.set(hash, file);
      }

      const parsed = await parser.parsePDF(pdfPath);
      const category = categorizeService(file, parsed.rawText);

      const songs = parsed.sections.filter(s => s.type === 'song');
      const bibles = parsed.sections.filter(s => s.type === 'bible');
      const videos = parsed.sections.filter(s => s.type === 'video');

      // Count praise slots
      const praiseSlots: Record<string, number> = {};
      for (const section of parsed.sections) {
        if (section.praiseSlot) {
          praiseSlots[section.praiseSlot] = (praiseSlots[section.praiseSlot] || 0) + 1;
        }
      }

      results.push({
        filename: file,
        date: parsed.date,
        category,
        songCount: songs.length,
        bibleCount: bibles.length,
        videoCount: videos.length,
        songs: songs.map(s => s.title),
        bibleReadings: bibles.map(s => s.title),
        videos: videos.map(s => s.title),
        praiseSlots,
        isDuplicate
      });

    } catch (error: any) {
      results.push({
        filename: file,
        date: 'ERROR',
        category: 'Unknown',
        songCount: 0,
        bibleCount: 0,
        videoCount: 0,
        songs: [],
        bibleReadings: [],
        videos: [],
        praiseSlots: {},
        parseError: error.message,
        isDuplicate: false
      });
    }
  }

  // Print results by category
  const categories = new Map<string, PDFTestResult[]>();
  for (const result of results) {
    if (!categories.has(result.category)) {
      categories.set(result.category, []);
    }
    categories.get(result.category)!.push(result);
  }

  // Sort categories by count
  const sortedCategories = [...categories.entries()].sort((a, b) => b[1].length - a[1].length);

  for (const [category, categoryResults] of sortedCategories) {
    console.log(`\n${'='.repeat(80)}`);
    console.log(`${category.toUpperCase()} (${categoryResults.length} PDFs)`);
    console.log(`${'='.repeat(80)}`);

    for (const result of categoryResults) {
      const dupMarker = result.isDuplicate ? ' [DUPLICATE]' : '';
      console.log(`\n${result.filename}${dupMarker}`);
      console.log(`  Date: ${result.date}`);

      if (result.parseError) {
        console.log(`  ERROR: ${result.parseError}`);
        continue;
      }

      console.log(`  Songs: ${result.songCount} | Bible: ${result.bibleCount} | Videos: ${result.videoCount}`);

      if (result.songs.length > 0) {
        console.log(`  Songs:`);
        for (const song of result.songs) {
          console.log(`    - ${song}`);
        }
      }

      if (result.bibleReadings.length > 0) {
        console.log(`  Bible Readings:`);
        for (const reading of result.bibleReadings) {
          console.log(`    - ${reading}`);
        }
      }

      if (result.videos.length > 0) {
        console.log(`  Videos:`);
        for (const video of result.videos) {
          console.log(`    - ${video}`);
        }
      }

      if (Object.keys(result.praiseSlots).length > 0) {
        console.log(`  Praise Slots: ${JSON.stringify(result.praiseSlots)}`);
      }
    }
  }

  // Summary statistics
  console.log(`\n${'='.repeat(80)}`);
  console.log('SUMMARY');
  console.log(`${'='.repeat(80)}`);

  const uniqueResults = results.filter(r => !r.isDuplicate);
  const errorResults = results.filter(r => r.parseError);
  const duplicateCount = results.filter(r => r.isDuplicate).length;

  console.log(`\nTotal PDFs: ${results.length}`);
  console.log(`Unique PDFs: ${uniqueResults.length}`);
  console.log(`Duplicates: ${duplicateCount}`);
  console.log(`Parse Errors: ${errorResults.length}`);

  console.log(`\nBy Category:`);
  for (const [category, categoryResults] of sortedCategories) {
    const unique = categoryResults.filter(r => !r.isDuplicate).length;
    console.log(`  ${category}: ${categoryResults.length} (${unique} unique)`);
  }

  // Check for potential parsing issues
  console.log(`\n${'='.repeat(80)}`);
  console.log('POTENTIAL ISSUES');
  console.log(`${'='.repeat(80)}`);

  const noSongs = uniqueResults.filter(r => r.songCount === 0 && !r.parseError);
  if (noSongs.length > 0) {
    console.log(`\nPDFs with NO songs extracted (${noSongs.length}):`);
    for (const result of noSongs) {
      console.log(`  - ${result.filename} (${result.category})`);
    }
  }

  const lowSongs = uniqueResults.filter(r => r.songCount > 0 && r.songCount < 3 && !r.parseError);
  if (lowSongs.length > 0) {
    console.log(`\nPDFs with fewer than 3 songs (${lowSongs.length}):`);
    for (const result of lowSongs) {
      console.log(`  - ${result.filename}: ${result.songCount} songs (${result.category})`);
    }
  }

  // All unique song titles
  const allSongs = new Set<string>();
  for (const result of uniqueResults) {
    for (const song of result.songs) {
      allSongs.add(song);
    }
  }
  console.log(`\nUnique song titles across all PDFs: ${allSongs.size}`);

  console.log(`\n${'='.repeat(80)}`);
  console.log('TEST COMPLETE');
  console.log(`${'='.repeat(80)}\n`);
}

testAllPDFs().catch(console.error);
