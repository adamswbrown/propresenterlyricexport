#!/usr/bin/env node
/**
 * ProPresenter Words CLI
 *
 * A command-line tool to extract lyrics from ProPresenter presentations
 */

import { ProPresenterClient, PresentationInfo, PlaylistItem } from './propresenter-client';
import { extractLyrics, formatLyricsAsText, formatLyricsAsJSON, getLyricsSummary } from './lyrics-extractor';
import { exportToPowerPoint } from './pptx-exporter';
import { ExtractedLyrics } from './lyrics-extractor';
import * as path from 'path';
import * as readline from 'readline';

// Default connection settings
const DEFAULT_HOST = process.env.PROPRESENTER_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(process.env.PROPRESENTER_PORT || '1025', 10);

interface CLIOptions {
  host: string;
  port: number;
  command: string;
  args: string[];
  format: 'text' | 'json';
  debug: boolean;
}

function parseArgs(argv: string[]): CLIOptions {
  const options: CLIOptions = {
    host: DEFAULT_HOST,
    port: DEFAULT_PORT,
    command: 'help',
    args: [],
    format: 'text',
    debug: false,
  };

  const args = argv.slice(2);
  let i = 0;

  while (i < args.length) {
    const arg = args[i];

    if (arg === '--host' || arg === '-h') {
      options.host = args[++i];
    } else if (arg === '--port' || arg === '-p') {
      options.port = parseInt(args[++i], 10);
    } else if (arg === '--json' || arg === '-j') {
      options.format = 'json';
    } else if (arg === '--debug' || arg === '-d') {
      options.debug = true;
    } else if (arg === '--help') {
      options.command = 'help';
    } else if (!arg.startsWith('-')) {
      if (!options.command || options.command === 'help') {
        options.command = arg;
      } else {
        options.args.push(arg);
      }
    }
    i++;
  }

  return options;
}

function printHelp(): void {
  console.log(`
ProPresenter Words CLI
======================

Extract lyrics from ProPresenter presentations.

USAGE:
  npm run dev -- <command> [options]

COMMANDS:
  status              Show connection status and current state
  playlists           List all playlists
  playlist <uuid>     Show items in a specific playlist
  libraries           List all libraries
  current             Show the currently active presentation lyrics
  focused             Show the focused presentation lyrics
  inspect <uuid>      Get full lyrics from a presentation by UUID
  export [uuid]       Export all song lyrics from a playlist
  pptx [uuid] [out]   Export playlist to PowerPoint file
  watch               Watch for slide changes in real-time

OPTIONS:
  --host, -h <host>   ProPresenter host (default: 127.0.0.1)
  --port, -p <port>   ProPresenter port (default: 1025)
  --json, -j          Output as JSON instead of text
  --debug, -d         Show raw API responses
  --help              Show this help message

ENVIRONMENT:
  PROPRESENTER_HOST   Default host
  PROPRESENTER_PORT   Default port

EXAMPLES:
  npm run dev -- status
  npm run dev -- export                              (interactive mode)
  npm run dev -- export abc123-def456                (direct export)
  npm run dev -- current --host 192.168.1.100
  npm run dev -- inspect abc123-def456 --json
  npm run dev -- watch
`);
}

async function printStatus(client: ProPresenterClient): Promise<void> {
  const version = await client.connect();
  console.log('\nProPresenter Connection Status');
  console.log('==============================');
  console.log(`Connected:  Yes`);
  console.log(`Name:       ${version.name}`);
  console.log(`Version:    ${version.version}`);
  console.log(`Platform:   ${version.platform}`);

  const slideStatus = await client.getSlideStatus();
  console.log('\nCurrent Slide:');
  if (slideStatus.current) {
    console.log(`  "${slideStatus.current.text.split('\n')[0]}..."`);
  } else {
    console.log('  (none)');
  }

  const activePresentation = await client.getActivePresentation();
  console.log('\nActive Presentation:');
  if (activePresentation) {
    console.log(`  ${activePresentation.name}`);
    console.log(`  UUID: ${activePresentation.uuid}`);
    console.log(`  Groups: ${activePresentation.groups.length}`);
  } else {
    console.log('  (none)');
  }
}

async function listPlaylists(client: ProPresenterClient, format: string): Promise<void> {
  await client.connect();
  const playlists = await client.getPlaylists();

  if (format === 'json') {
    console.log(JSON.stringify(playlists, null, 2));
    return;
  }

  console.log('\nPlaylists');
  console.log('=========');

  function printPlaylist(item: PlaylistItem, indent: number = 0): void {
    const prefix = '  '.repeat(indent);
    const marker = item.isHeader ? '[H]' : item.type === 'playlist' ? '[P]' : '   ';
    console.log(`${prefix}${marker} ${item.name}`);
    if (item.uuid) {
      console.log(`${prefix}    UUID: ${item.uuid}`);
    }
    if (item.children) {
      for (const child of item.children) {
        printPlaylist(child, indent + 1);
      }
    }
  }

  for (const playlist of playlists) {
    printPlaylist(playlist);
    console.log('');
  }
}

async function showPlaylistContents(client: ProPresenterClient, playlistId: string, format: string): Promise<void> {
  await client.connect();
  const items = await client.getPlaylistItems(playlistId);

  if (format === 'json') {
    console.log(JSON.stringify(items, null, 2));
    return;
  }

  console.log('\nPlaylist Contents');
  console.log('=================');

  if (items.length === 0) {
    console.log('  (empty playlist)');
    return;
  }

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    if (item.isHeader) {
      console.log(`\n  --- ${item.name} ---`);
    } else {
      console.log(`  [${i + 1}] ${item.name}`);
      if (item.presentationUuid) {
        console.log(`       Presentation: ${item.presentationUuid}`);
      }
    }
  }
}

async function listLibraries(client: ProPresenterClient, format: string): Promise<void> {
  await client.connect();
  const libraries = await client.getLibraries();

  if (format === 'json') {
    console.log(JSON.stringify(libraries, null, 2));
    return;
  }

  console.log('\nLibraries');
  console.log('=========');

  for (const lib of libraries) {
    console.log(`  ${lib.name}`);
    console.log(`    UUID: ${lib.uuid}`);

    // Get presentations in this library
    try {
      const presentations = await client.getLibraryPresentations(lib.uuid);
      console.log(`    Presentations: ${presentations.length}`);
      for (const pres of presentations.slice(0, 5)) {
        console.log(`      - ${pres.name}`);
      }
      if (presentations.length > 5) {
        console.log(`      ... and ${presentations.length - 5} more`);
      }
    } catch (e) {
      console.log(`    (Could not fetch presentations)`);
    }
    console.log('');
  }
}

async function showPresentation(
  client: ProPresenterClient,
  presentation: PresentationInfo | null,
  label: string,
  format: string,
  debug: boolean
): Promise<void> {
  if (!presentation) {
    console.log(`\nNo ${label} presentation found.`);
    return;
  }

  if (debug) {
    console.log('\n=== RAW API RESPONSE ===');
    console.log(JSON.stringify(presentation, null, 2));
    console.log('========================\n');
  }

  const lyrics = extractLyrics(presentation);

  if (format === 'json') {
    console.log(formatLyricsAsJSON(lyrics));
    return;
  }

  console.log(`\n${label} Presentation`);
  console.log('='.repeat(label.length + 13));

  const summary = getLyricsSummary(lyrics);
  console.log(`Title:    ${summary.title}`);
  console.log(`UUID:     ${summary.uuid}`);
  console.log(`Sections: ${summary.sectionNames.join(', ')}`);
  console.log(`Slides:   ${summary.slideCount} total, ${summary.lyricSlideCount} with lyrics`);
  console.log('');
  console.log(formatLyricsAsText(lyrics));
}

async function inspectPresentation(
  client: ProPresenterClient,
  uuid: string,
  format: string,
  debug: boolean
): Promise<void> {
  await client.connect();

  if (debug) {
    console.log(`\nFetching presentation with UUID: ${uuid}`);
  }

  const presentation = await client.getPresentationByUuid(uuid);
  await showPresentation(client, presentation, 'Inspected', format, debug);
}

/**
 * Get the set of presentation UUIDs from the Worship library
 */
async function getWorshipLibrarySongs(client: ProPresenterClient): Promise<Set<string>> {
  const libraries = await client.getLibraries();
  const worshipLibrary = libraries.find(lib => lib.name.toLowerCase() === 'worship');

  if (!worshipLibrary) {
    console.log('  Warning: No "Worship" library found. Available libraries:');
    for (const lib of libraries) {
      console.log(`    - ${lib.name}`);
    }
    return new Set();
  }

  const presentations = await client.getLibraryPresentations(worshipLibrary.uuid);
  return new Set(presentations.map(p => p.uuid));
}

/**
 * Check if a playlist item is a song from the Worship library
 */
function isWorshipSong(item: PlaylistItem, worshipSongUuids: Set<string>): boolean {
  // Skip headers
  if (item.isHeader) {
    return false;
  }

  // Skip items without presentation content
  if (!item.presentationUuid) {
    return false;
  }

  // Only include if it's in the Worship library
  return worshipSongUuids.has(item.presentationUuid);
}

async function exportPlaylistLyrics(
  client: ProPresenterClient,
  playlistId: string,
  format: string,
  debug: boolean
): Promise<void> {
  await client.connect();

  console.log(`\nFetching Worship library songs...`);
  const worshipSongUuids = await getWorshipLibrarySongs(client);
  console.log(`  Found ${worshipSongUuids.size} songs in Worship library`);

  console.log(`\nFetching playlist: ${playlistId}`);
  const items = await client.getPlaylistItems(playlistId);

  if (items.length === 0) {
    console.log('Playlist is empty.');
    return;
  }

  // Filter for songs from the Worship library
  const songItems = items.filter(item => isWorshipSong(item, worshipSongUuids));

  if (debug) {
    console.log(`\nFound ${items.length} items, ${songItems.length} are from Worship library:`);
    for (const item of items) {
      const isSong = isWorshipSong(item, worshipSongUuids);
      console.log(`  ${isSong ? '✓' : '✗'} ${item.name}${item.isHeader ? ' [HEADER]' : ''}`);
    }
  }

  if (songItems.length === 0) {
    console.log('No songs found in playlist.');
    return;
  }

  console.log(`\nExporting lyrics for ${songItems.length} songs...\n`);

  const allSongs: any[] = [];

  for (const item of songItems) {
    if (!item.presentationUuid) continue;

    try {
      const presentation = await client.getPresentationByUuid(item.presentationUuid);
      if (!presentation) {
        console.log(`  ⚠ Could not fetch: ${item.name}`);
        continue;
      }

      const lyrics = extractLyrics(presentation);
      allSongs.push(lyrics);

      if (format !== 'json') {
        console.log(`  ✓ ${item.name}`);
      }
    } catch (e: any) {
      console.log(`  ⚠ Error fetching ${item.name}: ${e.message}`);
    }
  }

  if (format === 'json') {
    console.log(JSON.stringify(allSongs, null, 2));
  } else {
    console.log('\n' + '='.repeat(60) + '\n');

    for (const song of allSongs) {
      console.log(formatLyricsAsText(song));
      console.log('\n' + '-'.repeat(40) + '\n');
    }

    console.log(`\nExported ${allSongs.length} songs from playlist.`);
  }
}

async function exportPlaylistToPptx(
  client: ProPresenterClient,
  playlistId: string,
  outputPath: string,
  debug: boolean
): Promise<void> {
  await client.connect();

  console.log(`\nFetching Worship library songs...`);
  const worshipSongUuids = await getWorshipLibrarySongs(client);
  console.log(`  Found ${worshipSongUuids.size} songs in Worship library`);

  console.log(`\nFetching playlist: ${playlistId}`);
  const items = await client.getPlaylistItems(playlistId);

  if (items.length === 0) {
    console.log('Playlist is empty.');
    return;
  }

  // Filter for songs from the Worship library
  const songItems = items.filter(item => isWorshipSong(item, worshipSongUuids));

  if (debug) {
    console.log(`\nFound ${items.length} items, ${songItems.length} are from Worship library:`);
    for (const item of items) {
      const isSong = isWorshipSong(item, worshipSongUuids);
      console.log(`  ${isSong ? '✓' : '✗'} ${item.name}${item.isHeader ? ' [HEADER]' : ''}`);
    }
  }

  if (songItems.length === 0) {
    console.log('No songs found in playlist.');
    return;
  }

  console.log(`\nExporting ${songItems.length} songs to PowerPoint...\n`);

  const allSongs: ExtractedLyrics[] = [];

  for (const item of songItems) {
    if (!item.presentationUuid) continue;

    try {
      const presentation = await client.getPresentationByUuid(item.presentationUuid);
      if (!presentation) {
        console.log(`  ⚠ Could not fetch: ${item.name}`);
        continue;
      }

      const lyrics = extractLyrics(presentation);
      allSongs.push(lyrics);
      console.log(`  ✓ ${item.name}`);
    } catch (e: any) {
      console.log(`  ⚠ Error fetching ${item.name}: ${e.message}`);
    }
  }

  if (allSongs.length === 0) {
    console.log('\nNo songs to export.');
    return;
  }

  // Look for logo in common locations
  const logoLocations = [
    path.join(process.cwd(), 'logo.png'),
    path.join(process.cwd(), 'assets', 'logo.png'),
    path.join(__dirname, '..', 'logo.png'),
  ];

  let logoPath: string | undefined;
  for (const loc of logoLocations) {
    try {
      const fs = await import('fs');
      if (fs.existsSync(loc)) {
        logoPath = loc;
        break;
      }
    } catch {}
  }

  console.log(`\nGenerating PowerPoint...`);
  if (logoPath) {
    console.log(`  Using logo: ${logoPath}`);
  } else {
    console.log(`  No logo found (place logo.png in project root to include it)`);
  }

  const finalPath = await exportToPowerPoint(allSongs, {
    outputPath,
    logoPath,
    includeSongTitles: true,
  });

  console.log(`\n✓ PowerPoint saved to: ${finalPath}`);
  console.log(`  ${allSongs.length} songs, slides formatted for print/display`);
}

async function watchSlides(client: ProPresenterClient): Promise<void> {
  await client.connect();

  console.log('\nWatching for slide changes...');
  console.log('(Press Ctrl+C to stop)\n');

  client.registerStatusUpdates({
    onSlideChange: (data) => {
      console.log('\n--- Slide Changed ---');
      if (data.current) {
        console.log('Current:');
        console.log(`  ${data.current.text || '(no text)'}`);
      }
      if (data.next) {
        console.log('Next:');
        console.log(`  ${data.next.text || '(no text)'}`);
      }
      console.log('---');
    },
    onPresentationChange: (data) => {
      console.log('\n--- Presentation Changed ---');
      console.log(`  ${data?.id?.name || data?.name || 'Unknown'}`);
      console.log('---');
    },
  });

  // Keep the process running
  await new Promise(() => {});
}

/**
 * Flatten the playlist tree into a list of selectable items
 */
function flattenPlaylists(items: PlaylistItem[], prefix: string = ''): Array<{ name: string; uuid: string }> {
  const result: Array<{ name: string; uuid: string }> = [];

  for (const item of items) {
    // Only add non-header items with UUIDs
    if (!item.isHeader && item.uuid) {
      const displayName = prefix ? `${prefix} / ${item.name}` : item.name;
      result.push({ name: displayName, uuid: item.uuid });
    }

    // Recurse into children
    if (item.children && item.children.length > 0) {
      const childPrefix = prefix ? `${prefix} / ${item.name}` : item.name;
      result.push(...flattenPlaylists(item.children, childPrefix));
    }
  }

  return result;
}

/**
 * Prompt user to select a playlist from a list
 */
async function selectPlaylist(client: ProPresenterClient): Promise<string> {
  await client.connect();
  const playlists = await client.getPlaylists();
  const flatList = flattenPlaylists(playlists);

  if (flatList.length === 0) {
    console.log('No playlists found.');
    process.exit(1);
  }

  console.log('\nAvailable Playlists:');
  console.log('====================\n');

  for (let i = 0; i < flatList.length; i++) {
    console.log(`  ${i + 1}) ${flatList[i].name}`);
  }

  console.log('');

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question('Select a playlist (enter number): ', (answer) => {
      rl.close();

      const index = parseInt(answer, 10) - 1;

      if (isNaN(index) || index < 0 || index >= flatList.length) {
        console.error(`Invalid selection. Please enter a number between 1 and ${flatList.length}.`);
        process.exit(1);
      }

      console.log(`\nSelected: ${flatList[index].name}\n`);
      resolve(flatList[index].uuid);
    });
  });
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  if (options.command === 'help') {
    printHelp();
    process.exit(0);
  }

  const client = new ProPresenterClient({
    host: options.host,
    port: options.port,
  });

  console.log(`Connecting to ProPresenter at ${options.host}:${options.port}...`);

  try {
    switch (options.command) {
      case 'status':
        await printStatus(client);
        break;

      case 'playlists':
        await listPlaylists(client, options.format);
        break;

      case 'playlist':
        if (options.args.length === 0) {
          console.error('Error: playlist command requires a UUID');
          console.log('Usage: npm run dev -- playlist <uuid>');
          process.exit(1);
        }
        await showPlaylistContents(client, options.args[0], options.format);
        break;

      case 'libraries':
        await listLibraries(client, options.format);
        break;

      case 'current':
        await client.connect();
        const active = await client.getActivePresentation();
        await showPresentation(client, active, 'Active', options.format, options.debug);
        break;

      case 'focused':
        await client.connect();
        const focused = await client.getFocusedPresentation();
        await showPresentation(client, focused, 'Focused', options.format, options.debug);
        break;

      case 'inspect':
        if (options.args.length === 0) {
          console.error('Error: inspect command requires a UUID');
          console.log('Usage: npm run dev -- inspect <uuid>');
          process.exit(1);
        }
        await inspectPresentation(client, options.args[0], options.format, options.debug);
        break;

      case 'export': {
        const playlistUuid =
          options.args.length > 0 ? options.args[0] : await selectPlaylist(client);
        await exportPlaylistLyrics(client, playlistUuid, options.format, options.debug);
        break;
      }

      case 'pptx': {
        const playlistUuid =
          options.args.length > 0 ? options.args[0] : await selectPlaylist(client);
        const pptxOutput = options.args[1] || `service-lyrics-${Date.now()}`;
        await exportPlaylistToPptx(client, playlistUuid, pptxOutput, options.debug);
        break;
      }

      case 'watch':
        await watchSlides(client);
        break;

      default:
        console.error(`Unknown command: ${options.command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error: any) {
    console.error(`\nError: ${error.message}`);
    if (options.debug && error.stack) {
      console.error(error.stack);
    }
    if (error.message.includes('ECONNREFUSED') || error.message.includes('ETIMEDOUT')) {
      console.log('\nMake sure:');
      console.log('  1. ProPresenter 7 is running');
      console.log('  2. Network API is enabled in ProPresenter settings');
      console.log('  3. The host and port are correct');
    }
    process.exit(1);
  }

  process.exit(0);
}

main();
