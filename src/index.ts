/**
 * ProPresenter Words
 *
 * Extract lyrics from ProPresenter presentations via the Network API
 */

export { ProPresenterClient } from './propresenter-client';
export type {
  ConnectionConfig,
  SlideInfo,
  GroupInfo,
  PresentationInfo,
  PlaylistItem,
  LibraryInfo,
} from './propresenter-client';

export {
  extractLyrics,
  extractLyricsFromPlaylist,
  formatLyricsAsText,
  formatLyricsAsJSON,
  getLyricsSummary,
} from './lyrics-extractor';
export type {
  LyricSlide,
  LyricSection,
  ExtractedLyrics,
} from './lyrics-extractor';
