#!/usr/bin/env node
/**
 * ProPresenter Words CLI
 *
 * A command-line tool to extract lyrics from ProPresenter presentations
 */

import { ProPresenterClient, PresentationInfo, PlaylistItem } from './propresenter-client';
import { extractLyrics, formatLyricsAsText, formatLyricsAsJSON, getLyricsSummary } from './lyrics-extractor';
import { exportToPowerPoint } from './pptx-exporter';
import { collectPlaylistLyrics, PlaylistProgressEvent } from './services/playlist-exporter';
import { findLogoPath } from './services/logo';
import { flattenPlaylists, formatPlaylistName } from './utils/playlist-utils';
import * as readline from 'readline';

// Default connection settings
const DEFAULT_HOST = process.env.PROPRESENTER_HOST || '127.0.0.1';
const DEFAULT_PORT = parseInt(process.env.PROPRESENTER_PORT || '1025', 10);

// Default library filter for songs
const DEFAULT_LIBRARY = process.env.PROPRESENTER_LIBRARY || 'Worship';

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
╔════════════════════════════════════════════════════════════╗
║         ProPresenter Words CLI - Lyrics Extraction         ║
╚════════════════════════════════════════════════════════════╝

USAGE:
  npm start -- <command> [options]

COMMANDS:
  status              Show connection status and current state
  playlists           List all available playlists
  export              Export lyrics from a playlist (interactive)
  export <uuid>       Export lyrics from specific playlist UUID
  pptx                Export playlist to PowerPoint (interactive)
  pptx <uuid> [out]   Export specific playlist to PowerPoint
  libraries           List all available libraries
  current             Show currently active presentation
  focused             Show focused presentation
  inspect <uuid>      Get full details of a presentation
  watch               Watch for real-time slide changes

OPTIONS:
  --host, -h <addr>   ProPresenter host (default: 127.0.0.1)
  --port, -p <port>   ProPresenter port (default: 1025)
  --json, -j          Output results as JSON
  --debug, -d         Show detailed error information
  --help              Display this help message

CONNECTION SETTINGS:
  Set these environment variables to avoid typing host/port:
    PROPRESENTER_HOST=192.168.1.100
    PROPRESENTER_PORT=1025

LIBRARY FILTER:
  Filter exported songs to specific library (default: Worship):
    PROPRESENTER_LIBRARY=MyLibraryName

EXAMPLES:

  # Check connection status
  npm start -- status

  # List all playlists
  npm start -- playlists

  # Export with interactive selection
  npm start -- export

  # Export specific playlist to PowerPoint
  npm start -- pptx abc123-def456 my-service

  # Connect to different host
  npm start -- status --host 192.168.1.100 --port 1025

  # Get JSON output
  npm start -- playlists --json

For more help, see: https://github.com/adamswbrown/propresenterlyricexport
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

function logPlaylistProgress(
  event: PlaylistProgressEvent,
  { debug = false, verbose = true }: { debug?: boolean; verbose?: boolean } = {}
): void {
  switch (event.type) {
    case 'library:search':
      console.log(`\nFetching ${event.libraryName} library songs...`);
      break;
    case 'library:not-found':
      console.log(`  Warning: No "${event.libraryName}" library found.`);
      if (event.availableLibraries.length > 0) {
        console.log('  Available libraries:');
        for (const name of event.availableLibraries) {
          console.log(`    - ${name}`);
        }
      }
      break;
    case 'playlist:start':
      console.log(`\nScanning playlist items (${event.totalItems} total)...`);
      break;
    case 'playlist:item:skip':
      if (debug) {
        console.log(`  - Skipped ${event.item.name}`);
      }
      break;
    case 'playlist:item:start':
      if (debug) {
        console.log(`  ... ${event.item.name}`);
      }
      break;
    case 'playlist:item:success':
      if (verbose) {
        console.log(`  ✓ ${event.item.name}`);
      }
      break;
    case 'playlist:item:error':
      console.log(`  ⚠ ${event.item.name}: ${event.error}`);
      break;
    case 'complete':
      console.log(`\nCollected ${event.totalSongs} songs.`);
      break;
  }
}

async function exportPlaylistLyrics(
  client: ProPresenterClient,
  playlistId: string,
  format: string,
  debug: boolean
): Promise<void> {
  await client.connect();

  console.log(`\nFetching playlist: ${playlistId}`);

  const result = await collectPlaylistLyrics(client, playlistId, {
    libraryFilter: DEFAULT_LIBRARY,
    onProgress: (event) => logPlaylistProgress(event, { debug, verbose: format !== 'json' }),
  });

  if (result.songs.length === 0) {
    console.log('No songs found in playlist.');
    return;
  }

  const lyricsList = result.songs.map(entry => entry.lyrics);

  if (format === 'json') {
    console.log(JSON.stringify(lyricsList, null, 2));
    return;
  }

  console.log('\n' + '='.repeat(60) + '\n');

  for (const song of lyricsList) {
    console.log(formatLyricsAsText(song));
    console.log('\n' + '-'.repeat(40) + '\n');
  }

  console.log(`\nExported ${lyricsList.length} songs from playlist.`);
}

async function exportPlaylistToPptx(
  client: ProPresenterClient,
  playlistId: string,
  outputPath: string,
  debug: boolean
): Promise<void> {
  await client.connect();

  console.log(`\nFetching playlist: ${playlistId}`);

  const result = await collectPlaylistLyrics(client, playlistId, {
    libraryFilter: DEFAULT_LIBRARY,
    onProgress: (event) => logPlaylistProgress(event, { debug, verbose: true }),
  });

  if (result.songs.length === 0) {
    console.log('No songs to export.');
    return;
  }

  const songs = result.songs.map(entry => entry.lyrics);
  const logoPath = findLogoPath();

  console.log(`\nGenerating PowerPoint...`);
  if (logoPath) {
    console.log(`  Using logo: ${logoPath}`);
  } else {
    console.log(`  No logo found (place logo.png in project root to include it)`);
  }

  const finalPath = await exportToPowerPoint(songs, {
    outputPath,
    logoPath,
    includeSongTitles: true,
  });

  console.log(`\n✓ PowerPoint saved to: ${finalPath}`);
  console.log(`  ${songs.length} songs, slides formatted for print/display`);
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
    console.log(`  ${i + 1}) ${formatPlaylistName(flatList[i])}`);
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

      const selected = flatList[index];
      console.log(`\nSelected: ${formatPlaylistName(selected)}\n`);
      resolve(selected.uuid);
    });
  });
}

/**
 * Validate connection to ProPresenter before running any command
 * Fails fast with clear error messages if connection cannot be established
 */
async function validateConnection(client: ProPresenterClient): Promise<void> {
  try {
    const version = await client.connect();
    console.log(`✓ Connected to ProPresenter ${version.version}`);
  } catch (error: any) {
    console.error('\n❌ Connection Failed\n');
    console.error(`Unable to connect to ProPresenter at ${client.host}:${client.port}`);
    console.error(`Error: ${error.message}\n`);

    console.log('Troubleshooting:');
    console.log('  1. Make sure ProPresenter 7 is running');
    console.log('  2. Enable Network API in ProPresenter settings:');
    console.log('     - Go to Settings → Network');
    console.log('     - Enable "Network API"');
    console.log('  3. Verify host and port are correct:');
    console.log(`     - Currently using: ${client.host}:${client.port}`);
    console.log('  4. Check firewall settings allow connections');
    console.log('  5. Use --host and --port flags to specify custom address\n');
    console.log('Example:');
    console.log('  npm start -- status --host 192.168.1.100 --port 1025\n');

    process.exit(1);
  }
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

  // Validate connection before running any command
  await validateConnection(client);

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
          console.log('Usage: npm start -- playlist <uuid>');
          process.exit(1);
        }
        await showPlaylistContents(client, options.args[0], options.format);
        break;

      case 'libraries':
        await listLibraries(client, options.format);
        break;

      case 'current':
        const active = await client.getActivePresentation();
        await showPresentation(client, active, 'Active', options.format, options.debug);
        break;

      case 'focused':
        const focused = await client.getFocusedPresentation();
        await showPresentation(client, focused, 'Focused', options.format, options.debug);
        break;

      case 'inspect':
        if (options.args.length === 0) {
          console.error('Error: inspect command requires a UUID');
          console.log('Usage: npm start -- inspect <uuid>');
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
        console.error(`❌ Unknown command: "${options.command}"\n`);
        printHelp();
        process.exit(1);
    }

    console.log('\n✓ Complete');
  } catch (error: any) {
    console.error(`\n❌ Error: ${error.message}`);

    if (options.debug && error.stack) {
      console.error('\nStack trace:');
      console.error(error.stack);
    }

    if (error.message.includes('ENOTFOUND')) {
      console.error('Host not found. Check the hostname/IP address.');
    } else if (error.message.includes('EACCES')) {
      console.error('Permission denied. Check ProPresenter access settings.');
    }

    process.exit(1);
  }

  process.exit(0);
}

main();
