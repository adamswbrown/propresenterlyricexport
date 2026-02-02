import { ProPresenterClient, PlaylistItem } from '../propresenter-client';
import { extractLyrics, ExtractedLyrics } from '../lyrics-extractor';

export type PlaylistProgressEvent =
  | { type: 'library:search'; libraryName: string }
  | { type: 'library:not-found'; libraryName: string; availableLibraries: string[] }
  | { type: 'playlist:start'; playlistId: string; totalItems: number }
  | { type: 'playlist:item:skip'; item: PlaylistItem; reason: string }
  | { type: 'playlist:item:start'; item: PlaylistItem }
  | { type: 'playlist:item:success'; item: PlaylistItem }
  | { type: 'playlist:item:error'; item: PlaylistItem; error: string }
  | { type: 'complete'; totalSongs: number };

export interface PlaylistCollectionOptions {
  libraryFilter?: string | null;
  onProgress?: (event: PlaylistProgressEvent) => void;
}

export interface PlaylistCollectionResult {
  songs: Array<{ item: PlaylistItem; lyrics: ExtractedLyrics }>;
  totalItems: number;
  attemptedItems: number;
  includedItems: number;
  skippedItems: number;
  availableLibraries: string[];
  libraryFilter?: string | null;
}

interface LibraryResolution {
  availableLibraries: string[];
  songUuidSet: Set<string> | null;
}

async function resolveLibraryFilter(
  client: ProPresenterClient,
  libraryFilter?: string | null,
  onProgress?: (event: PlaylistProgressEvent) => void
): Promise<LibraryResolution> {
  const availableLibraries: string[] = [];
  if (!libraryFilter) {
    try {
      const libraries = await client.getLibraries();
      availableLibraries.push(...libraries.map(lib => lib.name));
    } catch (error) {
      // Ignore library fetch failures when no filter requested
    }
    return { availableLibraries, songUuidSet: null };
  }

  onProgress?.({ type: 'library:search', libraryName: libraryFilter });

  const libraries = await client.getLibraries();
  availableLibraries.push(...libraries.map(lib => lib.name));

  const match = libraries.find(lib => lib.name.toLowerCase() === libraryFilter.toLowerCase());

  if (!match) {
    onProgress?.({
      type: 'library:not-found',
      libraryName: libraryFilter,
      availableLibraries,
    });
    return { availableLibraries, songUuidSet: null };
  }

  const presentations = await client.getLibraryPresentations(match.uuid);
  const songUuidSet = new Set(presentations.map(p => p.uuid));
  return { availableLibraries, songUuidSet };
}

function shouldIncludeItem(item: PlaylistItem, songUuidSet: Set<string> | null): boolean {
  if (item.isHeader || !item.presentationUuid) {
    return false;
  }
  if (songUuidSet && !songUuidSet.has(item.presentationUuid)) {
    return false;
  }
  return true;
}

export async function collectPlaylistLyrics(
  client: ProPresenterClient,
  playlistId: string,
  options: PlaylistCollectionOptions = {}
): Promise<PlaylistCollectionResult> {
  const { libraryFilter = null, onProgress } = options;
  const { availableLibraries, songUuidSet } = await resolveLibraryFilter(
    client,
    libraryFilter,
    onProgress
  );

  const playlistItems = await client.getPlaylistItems(playlistId);
  onProgress?.({ type: 'playlist:start', playlistId, totalItems: playlistItems.length });

  const songs: Array<{ item: PlaylistItem; lyrics: ExtractedLyrics }> = [];
  let attemptedItems = 0;
  let skippedItems = 0;

  for (const item of playlistItems) {
    if (!shouldIncludeItem(item, songUuidSet)) {
      skippedItems++;
      onProgress?.({ type: 'playlist:item:skip', item, reason: 'filtered' });
      continue;
    }

    attemptedItems++;
    onProgress?.({ type: 'playlist:item:start', item });

    try {
      const presentation = await client.getPresentationByUuid(item.presentationUuid!);
      if (!presentation) {
        skippedItems++;
        onProgress?.({ type: 'playlist:item:error', item, error: 'Presentation unavailable' });
        continue;
      }

      const lyrics = extractLyrics(presentation);
      songs.push({ item, lyrics });
      onProgress?.({ type: 'playlist:item:success', item });
    } catch (error: any) {
      skippedItems++;
      onProgress?.({
        type: 'playlist:item:error',
        item,
        error: error?.message || 'Unknown error',
      });
    }
  }

  onProgress?.({ type: 'complete', totalSongs: songs.length });

  return {
    songs,
    totalItems: playlistItems.length,
    attemptedItems,
    includedItems: songs.length,
    skippedItems,
    availableLibraries,
    libraryFilter,
  };
}
