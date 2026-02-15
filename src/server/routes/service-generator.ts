/**
 * Service Generator routes — PDF parsing, song/verse matching, playlist building
 *
 * Maps to IPC handlers:
 *   pdf:parse, songs:match, verses:fetch, verses:match,
 *   playlist:build-service, playlist:create-from-template,
 *   playlist:focus-item, library:search-presentations
 */

import { Router, Request, Response } from 'express';
import multer from 'multer';
import * as os from 'os';
import * as path from 'path';
import * as fs from 'fs';
import { ProPresenterClient } from '../../propresenter-client';
import { SongMatcher } from '../../services/song-matcher';
import { loadAliases, aliasesToCustomMappings } from '../../services/alias-store';
import { loadSettings } from '../services/settings-store';

export const serviceGeneratorRoutes = Router();

// Multer for PDF uploads — store in temp directory
const upload = multer({
  dest: os.tmpdir(),
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are accepted'));
    }
  },
});

/**
 * POST /api/service/parse-pdf
 * Upload and parse a service order PDF.
 * Accepts multipart form data with a 'file' field.
 */
serviceGeneratorRoutes.post('/service/parse-pdf', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, error: 'No PDF file uploaded' });
      return;
    }

    const { PDFParser } = await import('../../services/pdf-parser');
    const parser = new PDFParser();
    const result = await parser.parsePDF(req.file.path);

    // Clean up temp file
    try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }

    const items = result.sections.map(section => ({
      type: section.type === 'video' ? 'kids_video'
          : section.type === 'song' ? 'song'
          : section.type === 'bible' ? 'verse'
          : 'heading',
      text: section.title,
      reference: section.type === 'bible' ? section.title : undefined,
      isKidsVideo: section.isKidsVideo === true,
      praiseSlot: section.praiseSlot,
    }));

    const specialServiceType = result.specialServiceType;

    res.json({ success: true, items, specialServiceType });
  } catch (error: any) {
    // Clean up temp file on error
    if (req.file) {
      try { fs.unlinkSync(req.file.path); } catch { /* ignore */ }
    }
    res.json({ success: false, error: error.message || 'Failed to parse PDF' });
  }
});

/**
 * POST /api/service/match-songs
 * Fuzzy match songs against ProPresenter libraries.
 *
 * Body: {
 *   songItems: Array<{ text, isKidsVideo?, praiseSlot?, specialServiceType? }>,
 *   libraryIds: string[],
 *   kidsLibraryId?: string,
 *   serviceContentLibraryId?: string
 * }
 */
serviceGeneratorRoutes.post('/service/match-songs', async (req: Request, res: Response) => {
  try {
    const { songItems, libraryIds, kidsLibraryId, serviceContentLibraryId } = req.body;

    if (!songItems || !Array.isArray(songItems)) {
      res.status(400).json({ success: false, error: 'songItems array is required' });
      return;
    }

    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });

    const aliases = loadAliases();
    const customMappings = aliasesToCustomMappings(aliases);
    const matcher = new SongMatcher(0.7, customMappings);

    const libraries = await client.getLibraries();

    // Fetch worship presentations
    const worshipPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];
    for (const libraryId of (libraryIds || [])) {
      if (!libraryId || libraryId === kidsLibraryId || libraryId === serviceContentLibraryId) continue;
      try {
        const presentations = await client.getLibraryPresentations(libraryId);
        const library = libraries.find(l => l.uuid === libraryId);
        const libraryName = library?.name || 'Unknown';
        for (const pres of presentations) {
          worshipPresentations.push({ uuid: pres.uuid, name: pres.name, library: libraryName, libraryId });
        }
      } catch { /* skip unreadable libraries */ }
    }

    // Fetch service content presentations
    const serviceContentPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];
    if (serviceContentLibraryId) {
      try {
        const presentations = await client.getLibraryPresentations(serviceContentLibraryId);
        const library = libraries.find(l => l.uuid === serviceContentLibraryId);
        const libraryName = library?.name || 'Service Content';
        for (const pres of presentations) {
          serviceContentPresentations.push({ uuid: pres.uuid, name: pres.name, library: libraryName, libraryId: serviceContentLibraryId });
        }
      } catch { /* skip */ }
    }

    // Fetch kids presentations
    const kidsPresentations: Array<{ uuid: string; name: string; library: string; libraryId: string }> = [];
    if (kidsLibraryId) {
      try {
        const presentations = await client.getLibraryPresentations(kidsLibraryId);
        const library = libraries.find(l => l.uuid === kidsLibraryId);
        const libraryName = library?.name || 'Kids';
        for (const pres of presentations) {
          kidsPresentations.push({ uuid: pres.uuid, name: pres.name, library: libraryName, libraryId: kidsLibraryId });
        }
      } catch { /* skip */ }
    }

    // Match each song
    const results = [];
    for (let i = 0; i < songItems.length; i++) {
      const item = songItems[i];
      const isKids = item.isKidsVideo || item.praiseSlot === 'kids';
      const isVideo = item.praiseSlot === 'kids_video' || (item.text && item.text.includes('(Video)'));
      const isNonKidsVideo = isVideo && !isKids;

      const songText = typeof item.text === 'string' ? item.text : String(item.text || '');
      if (!songText) continue;

      let presentationsToMatch;
      if (isKids) {
        presentationsToMatch = kidsPresentations;
      } else if (isNonKidsVideo) {
        presentationsToMatch = serviceContentPresentations;
      } else {
        presentationsToMatch = worshipPresentations;
      }

      const songSection = { type: 'song' as const, title: songText, position: i };
      let matches = await matcher.matchSongs([songSection], presentationsToMatch);
      let match = matches[0];

      // Cross-library fallback for kids
      if (isKids && (!match.bestMatch || match.bestMatch.confidence < 0.7)) {
        const allPresentations = [...worshipPresentations, ...serviceContentPresentations, ...kidsPresentations];
        const fallbackMatches = await matcher.matchSongs([songSection], allPresentations);
        const fallbackMatch = fallbackMatches[0];
        if (fallbackMatch.bestMatch && fallbackMatch.bestMatch.confidence > (match.bestMatch?.confidence || 0)) {
          match = fallbackMatch;
        }
      }

      results.push({
        songName: match.pdfTitle,
        praiseSlot: item.praiseSlot,
        isKidsVideo: isKids,
        matches: match.matches.map(m => ({
          uuid: m.presentation.uuid,
          name: m.presentation.name,
          library: m.presentation.library,
          confidence: Math.round(m.confidence * 100),
        })),
        bestMatch: match.bestMatch ? {
          uuid: match.bestMatch.presentation.uuid,
          name: match.bestMatch.presentation.name,
          library: match.bestMatch.presentation.library,
          confidence: Math.round(match.bestMatch.confidence * 100),
        } : undefined,
        requiresReview: match.requiresReview,
        selectedMatch: match.bestMatch && !match.requiresReview ? {
          uuid: match.bestMatch.presentation.uuid,
          name: match.bestMatch.presentation.name,
        } : undefined,
      });
    }

    res.json({ success: true, results });
  } catch (error: any) {
    res.json({ success: false, error: error.message || 'Failed to match songs' });
  }
});

/**
 * POST /api/service/match-verses
 * Match Bible verses against service content library.
 *
 * Body: { verseReferences: string[], serviceContentLibraryId: string }
 */
serviceGeneratorRoutes.post('/service/match-verses', async (req: Request, res: Response) => {
  try {
    const { verseReferences, serviceContentLibraryId } = req.body;

    if (!verseReferences || !Array.isArray(verseReferences)) {
      res.status(400).json({ success: false, error: 'verseReferences array is required' });
      return;
    }

    if (!serviceContentLibraryId) {
      res.json({
        success: true,
        results: verseReferences.map(ref => ({
          reference: ref,
          matches: [],
          bestMatch: undefined,
          requiresReview: true,
          selectedMatch: undefined,
        })),
      });
      return;
    }

    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });
    const presentations = await client.getLibraryPresentations(serviceContentLibraryId);

    // Pre-filter to Bible verse presentations
    const bibleTranslationPattern = /\b(niv|esv|nlt|kjv|nkjv|nasb|csb|msg)\b/i;
    const biblePresentations = presentations.filter(pres => bibleTranslationPattern.test(pres.name));
    const searchPresentations = biblePresentations.length > 0 ? biblePresentations : presentations;

    const results = verseReferences.map(reference => {
      const normalizedRef = reference.toLowerCase().trim();
      const normalizedRefStripped = normalizedRef.replace(/[:\-_()]/g, ' ').replace(/\s+/g, ' ').trim();

      const refParts = normalizedRef.match(/^(\d?\s*[a-z]+)\s+(\d+)/);
      const refBook = refParts ? refParts[1].replace(/\s+/g, ' ').trim() : '';
      const refChapter = refParts ? refParts[2] : '';

      const matches = searchPresentations
        .filter(pres => {
          const presName = pres.name.toLowerCase();
          const presNameStripped = presName.replace(/[:\-_()]/g, ' ').replace(/\s+/g, ' ').trim();
          return presName.includes(normalizedRef) ||
                 presNameStripped.includes(normalizedRefStripped) ||
                 normalizedRef.includes(presName) ||
                 normalizedRefStripped.includes(presNameStripped) ||
                 (refBook && refChapter && presName.includes(refBook) && presName.includes(refChapter));
        })
        .map(pres => {
          const presName = pres.name.toLowerCase();
          const presNameStripped = presName.replace(/[:\-_()]/g, ' ').replace(/\s+/g, ' ').trim();
          let confidence = 0;
          if (presName === normalizedRef || presNameStripped === normalizedRefStripped) {
            confidence = 100;
          } else if (presName.includes(normalizedRef) || normalizedRef.includes(presName) ||
                     presNameStripped.includes(normalizedRefStripped) || normalizedRefStripped.includes(presNameStripped)) {
            confidence = 85;
          } else {
            confidence = 60;
          }
          return { uuid: pres.uuid, name: pres.name, confidence };
        })
        .sort((a, b) => b.confidence - a.confidence)
        .slice(0, 5);

      const bestMatch = matches[0];
      const requiresReview = !bestMatch || bestMatch.confidence < 85;

      return {
        reference,
        matches,
        bestMatch,
        requiresReview,
        selectedMatch: bestMatch && !requiresReview ? { uuid: bestMatch.uuid, name: bestMatch.name } : undefined,
      };
    });

    res.json({ success: true, results });
  } catch (error: any) {
    res.json({ success: false, error: error.message || 'Failed to match Bible verses' });
  }
});

/**
 * POST /api/service/build-playlist
 * Build a service playlist by inserting matched items into template slots.
 *
 * Body: { playlistId: string, items: Array<{ type, uuid, name, praiseSlot }> }
 */
serviceGeneratorRoutes.post('/service/build-playlist', async (req: Request, res: Response) => {
  try {
    const { playlistId, items } = req.body;

    if (!playlistId || !items) {
      res.status(400).json({ success: false, error: 'playlistId and items are required' });
      return;
    }

    const settings = loadSettings();
    const { host, port } = settings;

    // Step 1: Fetch current playlist
    const getResponse = await fetch(`http://${host}:${port}/v1/playlist/${playlistId}`);
    if (!getResponse.ok) {
      throw new Error(`Failed to fetch playlist: ${getResponse.status}`);
    }
    const playlistData = await getResponse.json() as any;
    const currentItems = playlistData.items || [];

    // Step 2: Group by slot
    const itemsBySlot: Record<string, any[]> = {
      praise1: [], praise2: [], praise3: [], kids: [], reading: [],
    };
    for (const item of items) {
      const slot = item.praiseSlot || 'praise1';
      if (itemsBySlot[slot]) {
        itemsBySlot[slot].push(item);
      }
    }

    // Step 3: Header → slot mapping
    const headerToSlot: Record<string, string> = {
      'praise 1': 'praise1', 'praise1': 'praise1',
      'praise 2': 'praise2', 'praise2': 'praise2',
      'praise 3': 'praise3', 'praise3': 'praise3',
      'kids talk': 'kids', 'kids': 'kids', 'kids song': 'kids', 'kids video': 'kids',
      'reading': 'reading', 'bible': 'reading',
    };

    // Step 4: Build new playlist
    const newItems: any[] = [];
    let skipUntilNextHeader = false;

    for (const item of currentItems) {
      const isHeader = item.type === 'header';
      const itemName = (item.id?.name || item.name || '').toLowerCase().trim();

      if (isHeader) {
        const matchedSlot = headerToSlot[itemName];
        if (matchedSlot) {
          newItems.push(item);
          const slotItems = itemsBySlot[matchedSlot] || [];
          for (const songItem of slotItems) {
            newItems.push({
              id: { name: songItem.name, uuid: songItem.uuid, index: newItems.length },
              type: 'presentation',
              is_hidden: false,
              is_pco: false,
              presentation_info: {
                presentation_uuid: songItem.uuid,
                arrangement_name: '',
                arrangement_uuid: '',
              },
              destination: 'presentation',
            });
          }
          skipUntilNextHeader = slotItems.length > 0;
        } else {
          skipUntilNextHeader = false;
          newItems.push(item);
        }
      } else {
        if (!skipUntilNextHeader) {
          newItems.push(item);
        }
      }
    }

    // Step 5: Clean items
    const cleanedItems = newItems.map((item: any, index: number) => {
      let itemUuid = item.id?.uuid || '';
      if (item.type === 'presentation' && !itemUuid && item.presentation_info?.presentation_uuid) {
        itemUuid = item.presentation_info.presentation_uuid;
      }

      const cleaned: any = {
        id: { name: item.id?.name || item.name || 'Untitled', index, uuid: itemUuid },
        type: item.type,
        is_hidden: item.is_hidden || false,
        is_pco: item.is_pco || false,
      };

      if (item.type === 'header' && item.header_color) {
        cleaned.header_color = item.header_color;
      }
      if (item.type === 'presentation') {
        if (item.presentation_info) {
          cleaned.presentation_info = {
            presentation_uuid: item.presentation_info.presentation_uuid,
            arrangement_name: item.presentation_info.arrangement_name || '',
            arrangement_uuid: item.presentation_info.arrangement_uuid || '',
          };
        }
        if (item.duration) cleaned.duration = item.duration;
      }
      if (item.destination) cleaned.destination = item.destination;

      return cleaned;
    });

    // Step 6: PUT
    const putResponse = await fetch(`http://${host}:${port}/v1/playlist/${playlistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cleanedItems),
    });

    if (!putResponse.ok) {
      const errorText = await putResponse.text();
      throw new Error(`Failed to update playlist: ${putResponse.status} ${errorText}`);
    }

    res.json({ success: true, itemCount: cleanedItems.length });
  } catch (error: any) {
    res.json({ success: false, error: error.message || 'Failed to build playlist' });
  }
});

/**
 * POST /api/service/create-playlist
 * Create a new playlist from a template.
 *
 * Body: { templateId: string, playlistName: string }
 */
serviceGeneratorRoutes.post('/service/create-playlist', async (req: Request, res: Response) => {
  try {
    const { templateId, playlistName } = req.body;

    if (!templateId || !playlistName) {
      res.status(400).json({ success: false, error: 'templateId and playlistName are required' });
      return;
    }

    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });
    await client.connect();
    const newPlaylistId = await client.createPlaylistFromTemplate(templateId, playlistName);

    res.json({ success: true, playlistId: newPlaylistId });
  } catch (error: any) {
    res.json({ success: false, error: error.message || 'Failed to create playlist from template' });
  }
});

/**
 * POST /api/service/focus-item
 * Focus ProPresenter on a specific playlist header.
 *
 * Body: { playlistId: string, headerName: string }
 */
serviceGeneratorRoutes.post('/service/focus-item', async (req: Request, res: Response) => {
  try {
    const { playlistId, headerName } = req.body;

    if (!playlistId || !headerName) {
      res.status(400).json({ success: false, error: 'playlistId and headerName are required' });
      return;
    }

    const settings = loadSettings();
    const { host, port } = settings;

    // Fetch playlist items
    const getResponse = await fetch(`http://${host}:${port}/v1/playlist/${playlistId}`);
    if (!getResponse.ok) throw new Error(`Failed to fetch playlist: ${getResponse.status}`);
    const playlistData = await getResponse.json() as any;
    const items = playlistData.items || [];

    // Find header
    const normalizedSearch = headerName.toLowerCase().trim();
    let targetIndex = -1;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type === 'header') {
        const name = (items[i].id?.name || items[i].name || '').toLowerCase().trim();
        if (name.includes(normalizedSearch) || normalizedSearch.includes(name)) {
          targetIndex = i;
          break;
        }
      }
    }

    if (targetIndex === -1) {
      res.json({ success: false, error: `Could not find "${headerName}" section in playlist` });
      return;
    }

    // Focus and trigger
    await fetch(`http://${host}:${port}/v1/playlist/${playlistId}/focus`);
    await fetch(`http://${host}:${port}/v1/playlist/${playlistId}/${targetIndex}/trigger`);

    res.json({ success: true, index: targetIndex });
  } catch (error: any) {
    res.json({ success: false, error: error.message || 'Failed to focus playlist item' });
  }
});

/**
 * GET /api/libraries/:id/search?q=<query>
 * Search presentations in specific libraries.
 */
serviceGeneratorRoutes.get('/libraries/:ids/search', async (req: Request, res: Response) => {
  try {
    const libraryIds = String(req.params.ids).split(',');
    const query = (String(req.query.q || '')).trim();

    if (!query) {
      res.json({ success: true, results: [] });
      return;
    }

    const settings = loadSettings();
    const client = new ProPresenterClient({ host: settings.host, port: settings.port });
    const libraries = await client.getLibraries();
    const results: Array<{ uuid: string; name: string; library: string }> = [];
    const term = query.toLowerCase();

    for (const libraryId of libraryIds) {
      if (!libraryId) continue;
      try {
        const presentations = await client.getLibraryPresentations(libraryId);
        const library = libraries.find(l => l.uuid === libraryId);
        const libraryName = library?.name || 'Unknown';
        for (const pres of presentations) {
          if (pres.name.toLowerCase().includes(term)) {
            results.push({ uuid: pres.uuid, name: pres.name, library: libraryName });
          }
        }
      } catch { /* skip */ }
    }

    results.sort((a, b) => {
      const aStarts = a.name.toLowerCase().startsWith(term) ? 0 : 1;
      const bStarts = b.name.toLowerCase().startsWith(term) ? 0 : 1;
      if (aStarts !== bStarts) return aStarts - bStarts;
      return a.name.localeCompare(b.name);
    });

    res.json({ success: true, results: results.slice(0, 25) });
  } catch (error: any) {
    res.json({ success: false, error: error.message, results: [] });
  }
});

/**
 * POST /api/service/fetch-verses
 * Stub for Bible verse text fetch.
 *
 * Body: { references: string[] }
 */
serviceGeneratorRoutes.post('/service/fetch-verses', (req: Request, res: Response) => {
  const { references } = req.body;
  const verses = (references || []).map((ref: string) => ({
    reference: ref,
    text: '',
    error: undefined,
  }));
  res.json({ success: true, verses });
});
