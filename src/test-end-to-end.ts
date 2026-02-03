/**
 * End-to-End Test
 * Complete workflow: PDF → Song Matching → Playlist Building
 */

import { pdfParser } from './services/pdf-parser';
import { songMatcher } from './services/song-matcher';
import { createPlaylistBuilder } from './services/playlist-builder';
import { LibraryPresentation } from './types/song-match';
import * as path from 'path';

async function testEndToEnd() {
  console.log('🚀 ProPresenter Service Order Automation - End-to-End Test\n');
  console.log('='.repeat(80));

  // Configuration
  const config = {
    host: 'localhost',
    port: 61166,
    worshipLibraryId: '72A1AFE5-D618-4C4B-A79E-EA1B832BA607',
    serviceContentLibraryId: '103239EC-C268-43E1-A603-0D0AE9F85720',
    templatePlaylistId: 'A97A19C0-4B6F-4D73-A8E1-1B663A81E123' // "TO CREATE A NEW SERVICE..."
  };

  try {
    // ==================== PHASE 1: Parse PDF ====================
    console.log('\n📄 PHASE 1: Parsing PDF...');
    const pdfPath = path.join(__dirname, '../OSS/OS 02.02.26.pdf');
    const parsed = await pdfParser.parsePDF(pdfPath);

    console.log(`✓ Parsed service for: ${parsed.date}`);
    console.log(`✓ Found ${parsed.sections.length} sections`);

    const songs = parsed.sections.filter(s => s.type === 'song' || s.type === 'video');
    const bible = parsed.sections.find(s => s.type === 'bible');

    console.log(`  - ${songs.length} songs`);
    console.log(`  - ${bible ? '1 Bible reading' : 'No Bible reading'}`);

    // ==================== PHASE 2: Match Songs ====================
    console.log('\n🎵 PHASE 2: Matching songs to ProPresenter library...');

    // Fetch Worship library
    const worshipRes = await fetch(`http://${config.host}:${config.port}/v1/library/${config.worshipLibraryId}`);
    const worshipLib: any = await worshipRes.json();

    const presentations: LibraryPresentation[] = worshipLib.items.map((item: any) => ({
      name: item.name,
      uuid: item.uuid,
      library: 'Worship',
      libraryId: config.worshipLibraryId
    }));

    const matches = await songMatcher.matchSongs(songs, presentations);

    console.log('✓ Song matching complete:');
    for (const match of matches) {
      if (match.bestMatch) {
        const status = match.requiresReview ? '⚠️ ' : '✅';
        const conf = (match.bestMatch.confidence * 100).toFixed(0);
        console.log(`  ${status} "${match.pdfTitle}" → "${match.bestMatch.presentation.name}" (${conf}%)`);
      } else {
        console.log(`  ❌ "${match.pdfTitle}" → No match found`);
      }
    }

    const stats = songMatcher.calculateStatistics(matches);
    console.log(`\n  Summary: ${stats.autoMatched}/${stats.totalSongs} auto-matched (${(stats.averageConfidence * 100).toFixed(0)}% avg confidence)`);

    // ==================== PHASE 3: Bible Reading ====================
    console.log('\n📖 PHASE 3: Bible reading...');

    if (bible) {
      console.log(`✓ Found: ${bible.title} (${bible.leader || 'TBC'})`);
      const expectedPresName = bible.title.replace(':', '_') + ' (NIV)';
      console.log(`  Looking for presentation: "${expectedPresName}"`);

      // Search all presentations for Bible reading
      const allPres = worshipLib.items.find((p: any) => p.name.includes(expectedPresName));
      if (allPres) {
        console.log(`  ✓ Found matching presentation!`);
      } else {
        console.log(`  ⚠️  Presentation not found - will need to be created manually`);
      }
    }

    // ==================== PHASE 4: Build Playlist ====================
    console.log('\n📋 PHASE 4: Building playlist...');

    // Get Service Content presentations (these UUIDs would come from settings)
    const serviceContentRes = await fetch(`http://${config.host}:${config.port}/v1/library/${config.serviceContentLibraryId}`);
    const serviceContentLib: any = await serviceContentRes.json();

    // Map known presentations
    const findPresentation = (name: string) => {
      const pres = serviceContentLib.items.find((p: any) =>
        p.name.toLowerCase().includes(name.toLowerCase())
      );
      return pres?.uuid || '00000000-0000-0000-0000-000000000000';
    };

    const serviceContent = {
      announcements: findPresentation('announcements'),
      callToWorship: findPresentation('call to worship'),
      prayer: findPresentation('prayer'),
      birthdayBlessings: findPresentation('birthday'),
      kidsTalk: findPresentation('kids'),
      prayingForOthers: findPresentation('praying'),
      helpAndSupport: findPresentation('help'),
      theGrace: findPresentation('grace')
    };

    const builder = createPlaylistBuilder(serviceContent);
    const playlistItems = await builder.buildPlaylist(parsed, matches, worshipLib.items);

    console.log(`✓ Built playlist with ${playlistItems.length} items:`);
    console.log('');

    // Display playlist structure
    let lastType = '';
    for (const item of playlistItems) {
      if (item.type === 'header') {
        console.log(`\n  📑 ${item.id.name}`);
        lastType = 'header';
      } else {
        const indent = lastType === 'header' ? '    ' : '      ';
        console.log(`${indent}• ${item.id.name}`);
        lastType = 'presentation';
      }
    }

    // ==================== PHASE 5: Update ProPresenter (DRY RUN) ====================
    console.log('\n\n🔄 PHASE 5: Ready to update ProPresenter...');
    console.log(`   Target playlist: ${config.templatePlaylistId}`);
    console.log(`   Would update with ${playlistItems.length} items`);
    console.log('\n⚠️  DRY RUN - Not actually updating playlist');
    console.log('   To update for real, call: builder.updatePlaylist(...)');

    // Uncomment to actually update:
    // await builder.updatePlaylist(config.templatePlaylistId, playlistItems, config.host, config.port);
    // console.log('✓ Playlist updated successfully!');

    console.log('\n' + '='.repeat(80));
    console.log('✅ End-to-end test complete!');
    console.log('='.repeat(80));

  } catch (error) {
    console.error('\n❌ Error:', error);
    process.exit(1);
  }
}

testEndToEnd();
