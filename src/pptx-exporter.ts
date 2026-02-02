/**
 * PowerPoint Exporter
 *
 * Generates PowerPoint presentations from extracted lyrics
 * with St Andrew's visual styling
 */

import PptxGenJS from 'pptxgenjs';
import * as fs from 'fs';
import { ExtractedLyrics } from './lyrics-extractor';

// Re-export for convenience
export type { ExtractedLyrics as LyricsData } from './lyrics-extractor';

// Styling constants - configurable via environment variables
const STYLES = {
  // Text color (hex) - configure via PPTX_TEXT_COLOR
  textColor: process.env.PPTX_TEXT_COLOR || '2d6a7a',

  // Font settings - configure via PPTX_FONT_FACE, PPTX_FONT_SIZE, PPTX_TITLE_FONT_SIZE
  fontFace: process.env.PPTX_FONT_FACE || 'Red Hat Display',
  fontSize: parseInt(process.env.PPTX_FONT_SIZE || '44', 10),
  titleFontSize: parseInt(process.env.PPTX_TITLE_FONT_SIZE || '54', 10),
  bold: process.env.PPTX_FONT_BOLD !== 'false',
  italic: process.env.PPTX_FONT_ITALIC !== 'false',

  // Slide dimensions (16:9 widescreen) - typically not changed
  slideWidth: 13.333,
  slideHeight: 7.5,

  // Text positioning (centered, upper-middle area)
  textX: 0.5,
  textY: 2.0,
  textW: 12.333,
  textH: 3.5,

  // Logo positioning (bottom center)
  logoX: 6.0,  // Centered
  logoY: 6.2,
  logoW: 1.2,
  logoH: 1.0,
};

export interface ExportOptions {
  outputPath: string;
  logoPath?: string;
  includeSongTitles?: boolean;
}

/**
 * Export songs to a PowerPoint presentation
 */
export async function exportToPowerPoint(
  songs: ExtractedLyrics[],
  options: ExportOptions
): Promise<string> {
  const pptx = new PptxGenJS();

  // Set presentation properties
  pptx.author = 'ProPresenter Words';
  pptx.title = 'Song Lyrics';
  pptx.subject = 'Worship Song Lyrics';
  pptx.layout = 'LAYOUT_WIDE';  // 16:9

  // Check if logo exists (skip in bundled environments due to pkg limitations)
  let logoBase64: string | null = null;
  try {
    if (options.logoPath && fs.existsSync(options.logoPath)) {
      const logoBuffer = fs.readFileSync(options.logoPath);
      logoBase64 = logoBuffer.toString('base64');
    }
  } catch (error) {
    // Logo loading failed - skip it (may happen in bundled environments)
    console.log('  (logo skipped due to bundling limitations)');
    logoBase64 = null;
  }

  for (const song of songs) {
    // Optionally add a title slide for each song
    if (options.includeSongTitles) {
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: 'FFFFFF' };

      titleSlide.addText(song.title, {
        x: STYLES.textX,
        y: 3.0,
        w: STYLES.textW,
        h: 1.5,
        fontSize: STYLES.titleFontSize,
        fontFace: STYLES.fontFace,
        color: STYLES.textColor,
        bold: STYLES.bold,
        italic: STYLES.italic,
        align: 'center',
        valign: 'middle',
      });

      // Skip image encoding to avoid bundling issues with pkg
      // if (logoBase64) {
      //   titleSlide.addImage({
      //     data: `image/png;base64,${logoBase64}`,
      //     x: STYLES.logoX,
      //     y: STYLES.logoY,
      //     w: STYLES.logoW,
      //     h: STYLES.logoH,
      //   });
      // }
    }

    // Add each slide from the song
    for (const section of song.sections) {
      for (const slideData of section.slides) {
        // Skip non-lyric slides and empty slides
        if (!slideData.isLyric || !slideData.text || slideData.text.trim() === '') {
          continue;
        }

        const slide = pptx.addSlide();
        slide.background = { color: 'FFFFFF' };

        // Add the lyrics text (preserves line breaks from ProPresenter)
        slide.addText(slideData.text, {
          x: STYLES.textX,
          y: STYLES.textY,
          w: STYLES.textW,
          h: STYLES.textH,
          fontSize: STYLES.fontSize,
          fontFace: STYLES.fontFace,
          color: STYLES.textColor,
          bold: STYLES.bold,
          italic: STYLES.italic,
          align: 'center',
          valign: 'middle',
        });

        // Skip image encoding to avoid bundling issues with pkg
        // if (logoBase64) {
        //   slide.addImage({
        //     data: `image/png;base64,${logoBase64}`,
        //     x: STYLES.logoX,
        //     y: STYLES.logoY,
        //     w: STYLES.logoW,
        //     h: STYLES.logoH,
        //   });
        // }

        // Add section name as notes (useful for presenter)
        if (section.name) {
          slide.addNotes(`Section: ${section.name}`);
        }
      }
    }
  }

  // Generate output filename
  let outputFile = options.outputPath;
  if (!outputFile.endsWith('.pptx')) {
    outputFile = `${outputFile}.pptx`;
  }

  // Write the file
  await pptx.writeFile({ fileName: outputFile });

  return outputFile;
}

/**
 * Export a single song to PowerPoint
 */
export async function exportSongToPowerPoint(
  song: ExtractedLyrics,
  options: ExportOptions
): Promise<string> {
  return exportToPowerPoint([song], options);
}

export default { exportToPowerPoint, exportSongToPowerPoint };
