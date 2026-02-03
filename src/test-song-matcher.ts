/**
 * Test Song Matcher
 * Test fuzzy matching against live ProPresenter library
 */

import { songMatcher } from './services/song-matcher';
import { LibraryPresentation } from './types/song-match';
import { ServiceSection } from './types/service-order';

async function testMatcher() {
  // Fetch Worship library from ProPresenter
  const response = await fetch('http://localhost:61166/v1/library/72A1AFE5-D618-4C4B-A79E-EA1B832BA607');
  const library: any = await response.json();

  // Convert to LibraryPresentation format
  const presentations: LibraryPresentation[] = library.items.map((item: any) => ({
    name: item.name,
    uuid: item.uuid,
    library: 'Worship',
    libraryId: '72A1AFE5-D618-4C4B-A79E-EA1B832BA607'
  }));

  console.log(`\n📚 Loaded ${presentations.length} presentations from Worship library\n`);

  // Test songs from PDF
  const testSongs: ServiceSection[] = [
    { type: 'song', title: 'Holy, holy, holy, Lord God Almighty', position: 1, leader: 'Praise Team' },
    { type: 'song', title: 'He will keep you (Psalm 121)', position: 2, leader: 'Praise Team' },
    { type: 'song', title: 'Great are You Lord', position: 3, leader: 'Praise Team' },
    { type: 'video', title: 'Never be shaken', position: 4, isVideo: true }
  ];

  // Match songs
  const matches = await songMatcher.matchSongs(testSongs, presentations);

  // Display results
  console.log('='.repeat(80));
  console.log('SONG MATCHING RESULTS');
  console.log('='.repeat(80));
  console.log('');

  for (const match of matches) {
    const statusEmoji = match.requiresReview ? '⚠️ ' : '✅';
    const confidencePercent = match.bestMatch
      ? `${(match.bestMatch.confidence * 100).toFixed(1)}%`
      : 'N/A';

    console.log(`${statusEmoji} ${match.pdfTitle}`);

    if (match.bestMatch) {
      console.log(`   → ${match.bestMatch.presentation.name}`);
      console.log(`   Confidence: ${confidencePercent}`);
      console.log(`   UUID: ${match.bestMatch.presentation.uuid}`);
    } else if (match.matches.length > 0) {
      console.log(`   Top candidates:`);
      match.matches.slice(0, 3).forEach((candidate, i) => {
        console.log(`   ${i + 1}. ${candidate.presentation.name} (${(candidate.confidence * 100).toFixed(1)}%)`);
      });
    } else {
      console.log(`   ❌ No matches found`);
    }

    console.log('');
  }

  // Statistics
  const stats = songMatcher.calculateStatistics(matches);
  console.log('-'.repeat(80));
  console.log('STATISTICS');
  console.log('-'.repeat(80));
  console.log(`Total songs: ${stats.totalSongs}`);
  console.log(`Auto-matched: ${stats.autoMatched} (${(stats.autoMatched / stats.totalSongs * 100).toFixed(1)}%)`);
  console.log(`Requires review: ${stats.requiresReview}`);
  console.log(`Not found: ${stats.notFound}`);
  console.log(`Average confidence: ${(stats.averageConfidence * 100).toFixed(1)}%`);
  console.log('='.repeat(80));
}

testMatcher().catch(err => {
  console.error('Error testing matcher:', err);
  process.exit(1);
});
