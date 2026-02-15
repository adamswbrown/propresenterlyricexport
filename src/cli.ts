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
import { loadAliases, setAlias, removeAlias, getAliasFilePath } from './services/alias-store';
import {
  getAllUsers,
  getAllowedEmails,
  getAdminEmails,
  addAllowedEmail,
  removeAllowedEmail,
  isAdmin,
  setAdmin,
  ensureUsersFile,
  getUsersFilePath,
} from './server/services/user-store';
import { checkTunnelReachable, validateTunnelConfig } from './server/middleware/cloudflare';
import * as readline from 'readline';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

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
  alias               Manage song alias mappings (list/add/remove)
  alias list          Show all saved song aliases
  alias add <title>   Map a song title to a ProPresenter library song
  alias remove <title> Remove a song alias
  users               Manage web proxy user allowlist
  users list          Show all allowed users and admins
  users add <email>   Add an email to the allowlist
  users remove <email> Remove an email from the allowlist
  users admin <email> Toggle admin status for a user
  tunnel              Manage Cloudflare Tunnel integration
  tunnel status       Check tunnel configuration and reachability
  tunnel config       Generate cloudflared config file

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

/**
 * List all saved song aliases
 */
function listAliases(format: string): void {
  const aliases = loadAliases();
  const entries = Object.entries(aliases);

  if (format === 'json') {
    console.log(JSON.stringify(aliases, null, 2));
    return;
  }

  console.log('\nSong Aliases');
  console.log('============');

  if (entries.length === 0) {
    console.log('  No aliases configured.');
    console.log(`\n  Add one with: npm start -- alias add "Song Title"`);
    return;
  }

  for (const [key, value] of entries) {
    const originalTitle = (value as any)._originalTitle || key;
    console.log(`\n  "${originalTitle}"`);
    console.log(`    → ${value.name}`);
    console.log(`      UUID: ${value.uuid}`);
  }

  console.log(`\n  ${entries.length} alias(es) stored in ${getAliasFilePath()}`);
}

/**
 * Interactively add a song alias by searching the ProPresenter library
 */
async function addAlias(
  client: ProPresenterClient,
  songTitle: string,
  format: string
): Promise<void> {
  await client.connect();

  console.log(`\nAdding alias for: "${songTitle}"`);
  console.log('Fetching libraries...\n');

  const libraries = await client.getLibraries();
  const allPresentations: Array<{ uuid: string; name: string; library: string }> = [];

  for (const lib of libraries) {
    try {
      const presentations = await client.getLibraryPresentations(lib.uuid);
      for (const pres of presentations) {
        allPresentations.push({
          uuid: pres.uuid,
          name: pres.name,
          library: lib.name,
        });
      }
    } catch {
      // skip libraries we can't read
    }
  }

  if (allPresentations.length === 0) {
    console.log('No presentations found in any library.');
    return;
  }

  console.log(`Found ${allPresentations.length} presentations across ${libraries.length} libraries.\n`);

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = (prompt: string): Promise<string> =>
    new Promise(resolve => rl.question(prompt, resolve));

  // Search loop
  let selected: { uuid: string; name: string; library: string } | null = null;

  while (!selected) {
    const searchTerm = await askQuestion('Search for a song (or "q" to cancel): ');
    if (searchTerm.toLowerCase() === 'q') {
      rl.close();
      console.log('Cancelled.');
      return;
    }

    const term = searchTerm.toLowerCase();
    const matches = allPresentations.filter(p =>
      p.name.toLowerCase().includes(term)
    );

    if (matches.length === 0) {
      console.log(`  No matches for "${searchTerm}". Try again.\n`);
      continue;
    }

    // Show up to 20 matches
    const shown = matches.slice(0, 20);
    console.log(`\n  Found ${matches.length} match(es)${matches.length > 20 ? ' (showing first 20)' : ''}:\n`);

    for (let i = 0; i < shown.length; i++) {
      console.log(`  ${i + 1}) ${shown[i].name}  [${shown[i].library}]`);
    }

    console.log('');
    const choice = await askQuestion('Select a song (number), or press Enter to search again: ');

    if (choice.trim() === '') continue;

    const idx = parseInt(choice, 10) - 1;
    if (isNaN(idx) || idx < 0 || idx >= shown.length) {
      console.log('  Invalid selection.\n');
      continue;
    }

    selected = shown[idx];
  }

  rl.close();

  // Save the alias
  setAlias(songTitle, { uuid: selected.uuid, name: selected.name });

  console.log(`\n✓ Alias saved:`);
  console.log(`  "${songTitle}" → "${selected.name}" [${selected.library}]`);
}

/**
 * Remove a song alias
 */
function removeAliasCommand(songTitle: string): void {
  const removed = removeAlias(songTitle);

  if (removed) {
    console.log(`\n✓ Alias removed for "${songTitle}"`);
  } else {
    console.log(`\n  No alias found for "${songTitle}"`);

    // Show existing aliases to help the user
    const aliases = loadAliases();
    const entries = Object.entries(aliases);
    if (entries.length > 0) {
      console.log('\n  Existing aliases:');
      for (const [key, value] of entries) {
        const originalTitle = (value as any)._originalTitle || key;
        console.log(`    - "${originalTitle}"`);
      }
    }
  }
}

/**
 * List all allowed users with admin status
 */
function listWebUsers(format: string): void {
  ensureUsersFile();
  const users = getAllUsers();

  if (format === 'json') {
    console.log(JSON.stringify({ users, total: users.length, admins: getAdminEmails() }, null, 2));
    return;
  }

  console.log('\nWeb Proxy Users');
  console.log('===============');
  console.log(`  Config: ${getUsersFilePath()}\n`);

  if (users.length === 0) {
    console.log('  No users in allowlist.');
    console.log('  Add one with: npm start -- users add alice@gmail.com');
    return;
  }

  for (const user of users) {
    const adminTag = user.isAdmin ? ' [ADMIN]' : '';
    const nameTag = user.name ? ` (${user.name})` : '';
    const loginTag = user.lastLogin ? ` — last login: ${new Date(user.lastLogin).toLocaleDateString()}` : '';
    console.log(`  ${user.email}${nameTag}${adminTag}${loginTag}`);
  }

  console.log(`\n  ${users.length} user(s), ${getAdminEmails().length} admin(s)`);
}

/**
 * Add an email to the web proxy allowlist
 */
function addWebUser(email: string, makeAdmin: boolean): void {
  ensureUsersFile();
  const normalized = email.toLowerCase().trim();

  if (!normalized.includes('@') || !normalized.includes('.')) {
    console.error('Error: Invalid email address');
    process.exit(1);
  }

  const existing = getAllowedEmails();
  if (existing.some(e => e.toLowerCase().trim() === normalized)) {
    console.log(`\n  "${normalized}" is already in the allowlist.`);
  } else {
    addAllowedEmail(normalized);
    console.log(`\n  Added "${normalized}" to the allowlist.`);
  }

  if (makeAdmin && !isAdmin(normalized)) {
    setAdmin(normalized, true);
    console.log(`  Granted admin privileges.`);
  }

  console.log(`  Config: ${getUsersFilePath()}`);
}

/**
 * Remove an email from the web proxy allowlist
 */
function removeWebUser(email: string): void {
  ensureUsersFile();
  const removed = removeAllowedEmail(email);

  if (removed) {
    console.log(`\n  Removed "${email}" from the allowlist.`);
  } else {
    console.log(`\n  "${email}" was not found in the allowlist.`);

    const users = getAllowedEmails();
    if (users.length > 0) {
      console.log('\n  Current users:');
      for (const u of users) {
        console.log(`    - ${u}`);
      }
    }
  }
}

/**
 * Toggle admin status for a user
 */
function toggleWebAdmin(email: string): void {
  ensureUsersFile();
  const normalized = email.toLowerCase().trim();
  const currentlyAdmin = isAdmin(normalized);
  const newStatus = !currentlyAdmin;

  const success = setAdmin(normalized, newStatus);
  if (!success) {
    console.error(`\n  "${normalized}" is not in the allowlist. Add them first:`);
    console.log(`  npm start -- users add ${normalized}`);
    process.exit(1);
  }

  if (newStatus) {
    console.log(`\n  "${normalized}" is now an admin.`);
  } else {
    console.log(`\n  "${normalized}" is no longer an admin.`);
  }
}

async function main(): Promise<void> {
  const options = parseArgs(process.argv);

  if (options.command === 'help') {
    printHelp();
    process.exit(0);
  }

  // Handle alias commands that may not need a connection
  if (options.command === 'alias') {
    const subcommand = options.args[0] || 'list';

    if (subcommand === 'list') {
      listAliases(options.format);
      process.exit(0);
    }

    if (subcommand === 'remove') {
      const title = options.args.slice(1).join(' ');
      if (!title) {
        console.error('Error: alias remove requires a song title');
        console.log('Usage: npm start -- alias remove "Song Title"');
        process.exit(1);
      }
      removeAliasCommand(title);
      process.exit(0);
    }

    if (subcommand === 'add') {
      const title = options.args.slice(1).join(' ');
      if (!title) {
        console.error('Error: alias add requires a song title');
        console.log('Usage: npm start -- alias add "Be Thou My Vision"');
        process.exit(1);
      }
      // alias add needs a connection to search the library
      const client = new ProPresenterClient({
        host: options.host,
        port: options.port,
      });
      console.log(`Connecting to ProPresenter at ${options.host}:${options.port}...`);
      await validateConnection(client);
      await addAlias(client, title, options.format);
      process.exit(0);
    }

    console.error(`Unknown alias subcommand: "${subcommand}"`);
    console.log('Usage: npm start -- alias [list|add|remove]');
    process.exit(1);
  }

  // Handle users commands — no ProPresenter connection needed
  if (options.command === 'users') {
    const subcommand = options.args[0] || 'list';

    if (subcommand === 'list') {
      listWebUsers(options.format);
      process.exit(0);
    }

    if (subcommand === 'add') {
      const email = options.args[1];
      if (!email) {
        console.error('Error: users add requires an email address');
        console.log('Usage: npm start -- users add alice@gmail.com');
        process.exit(1);
      }
      // Check for --admin flag
      const makeAdmin = options.args.includes('--admin');
      addWebUser(email, makeAdmin);
      process.exit(0);
    }

    if (subcommand === 'remove') {
      const email = options.args[1];
      if (!email) {
        console.error('Error: users remove requires an email address');
        console.log('Usage: npm start -- users remove alice@gmail.com');
        process.exit(1);
      }
      removeWebUser(email);
      process.exit(0);
    }

    if (subcommand === 'admin') {
      const email = options.args[1];
      if (!email) {
        console.error('Error: users admin requires an email address');
        console.log('Usage: npm start -- users admin alice@gmail.com');
        process.exit(1);
      }
      toggleWebAdmin(email);
      process.exit(0);
    }

    console.error(`Unknown users subcommand: "${subcommand}"`);
    console.log('Usage: npm start -- users [list|add|remove|admin]');
    process.exit(1);
  }

  // Handle tunnel commands — no ProPresenter connection needed
  if (options.command === 'tunnel') {
    const subcommand = options.args[0] || 'status';

    if (subcommand === 'status') {
      console.log('\nCloudflare Tunnel Status');
      console.log('========================\n');

      const tunnelUrl = process.env.TUNNEL_URL;
      if (!tunnelUrl) {
        console.log('  TUNNEL_URL: not set');
        console.log('');
        console.log('  Set TUNNEL_URL to your Cloudflare Tunnel public URL:');
        console.log('    export TUNNEL_URL=https://pp.yourdomain.com');
        process.exit(0);
      }

      console.log(`  TUNNEL_URL: ${tunnelUrl}`);

      // Validate config
      const warnings = validateTunnelConfig();
      if (warnings.length > 0) {
        console.log('');
        for (const w of warnings) {
          console.log(`  Warning: ${w}`);
        }
      }

      // Check reachability
      console.log('\n  Checking tunnel reachability...');
      const result = await checkTunnelReachable();
      if (result.reachable) {
        console.log(`  Tunnel: REACHABLE (${result.latencyMs}ms round-trip)`);
      } else {
        console.log(`  Tunnel: NOT REACHABLE`);
        if (result.error) {
          console.log(`  Error: ${result.error}`);
        }
        console.log('');
        console.log('  Make sure cloudflared is running:');
        console.log('    cloudflared tunnel run --url http://localhost:3100 <tunnel-name>');
      }

      // Check cloudflared config file
      const cfConfigPath = path.join(os.homedir(), '.cloudflared', 'config.yml');
      if (fs.existsSync(cfConfigPath)) {
        console.log(`\n  Config file: ${cfConfigPath} (exists)`);
      } else {
        console.log(`\n  Config file: ${cfConfigPath} (not found)`);
        console.log('  Generate one with: npm start -- tunnel config');
      }

      process.exit(0);
    }

    if (subcommand === 'config') {
      console.log('\nCloudflare Tunnel Config Generator');
      console.log('===================================\n');

      const cfDir = path.join(os.homedir(), '.cloudflared');
      const cfConfigPath = path.join(cfDir, 'config.yml');

      if (fs.existsSync(cfConfigPath)) {
        console.log(`  Config already exists at: ${cfConfigPath}`);
        console.log('  Delete it first if you want to regenerate.\n');
        process.exit(0);
      }

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const ask = (prompt: string): Promise<string> =>
        new Promise(resolve => rl.question(prompt, resolve));

      const tunnelUuid = await ask('  Tunnel UUID (from "cloudflared tunnel list"): ');
      const hostname = await ask('  Public hostname (e.g., pp.yourdomain.com): ');
      const port = await ask('  Local server port (default: 3100): ') || '3100';

      rl.close();

      if (!tunnelUuid.trim()) {
        console.error('\n  Error: Tunnel UUID is required.');
        console.log('  Run "cloudflared tunnel list" to find it.');
        process.exit(1);
      }

      const configContent = [
        `tunnel: ${tunnelUuid.trim()}`,
        `credentials-file: ${path.join(cfDir, `${tunnelUuid.trim()}.json`)}`,
        '',
        'ingress:',
        `  - hostname: ${hostname.trim()}`,
        `    service: http://localhost:${port.trim()}`,
        '  - service: http_status:404',
        '',
      ].join('\n');

      if (!fs.existsSync(cfDir)) {
        fs.mkdirSync(cfDir, { recursive: true });
      }
      fs.writeFileSync(cfConfigPath, configContent, 'utf-8');

      console.log(`\n  Config written to: ${cfConfigPath}`);
      console.log('');
      console.log('  Contents:');
      for (const line of configContent.split('\n')) {
        console.log(`    ${line}`);
      }
      console.log('');
      console.log('  Next steps:');
      console.log(`    1. Route DNS: cloudflared tunnel route dns ${tunnelUuid.trim()} ${hostname.trim()}`);
      console.log('    2. Start tunnel: cloudflared tunnel run');
      console.log(`    3. Start server: TUNNEL_URL=https://${hostname.trim()} npm run web:start`);

      process.exit(0);
    }

    console.error(`Unknown tunnel subcommand: "${subcommand}"`);
    console.log('Usage: npm start -- tunnel [status|config]');
    process.exit(1);
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
