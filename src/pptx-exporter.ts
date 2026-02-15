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

export interface PptxTextStyle {
  textColor: string;
  fontFace: string;
  fontSize: number;
  titleFontSize: number;
  bold: boolean;
  italic: boolean;
}

export const DEFAULT_PPTX_TEXT_STYLE: PptxTextStyle = {
  textColor: process.env.PPTX_TEXT_COLOR || '2d6a7a',
  fontFace: process.env.PPTX_FONT_FACE || 'Red Hat Display',
  fontSize: parseInt(process.env.PPTX_FONT_SIZE || '44', 10),
  titleFontSize: parseInt(process.env.PPTX_TITLE_FONT_SIZE || '54', 10),
  bold: process.env.PPTX_FONT_BOLD !== 'false',
  italic: process.env.PPTX_FONT_ITALIC !== 'false',
};

const LAYOUT = {
  slideWidth: 13.333,
  slideHeight: 7.5,
  textX: 0.5,
  textY: 2.0,
  textW: 12.333,
  textH: 3.5,
  logoX: 6.0,
  logoY: 6.2,
  logoW: 1.2,
  logoH: 1.0,
};

export interface ExportOptions {
  outputPath: string;
  logoPath?: string;
  includeSongTitles?: boolean;
  styleOverrides?: Partial<PptxTextStyle>;
}

/**
 * Export songs to a PowerPoint presentation
 */
export async function exportToPowerPoint(
  songs: ExtractedLyrics[],
  options: ExportOptions
): Promise<string> {
  const pptx = new PptxGenJS();

  const textStyle: PptxTextStyle = {
    ...DEFAULT_PPTX_TEXT_STYLE,
    ...options.styleOverrides,
  };

  // Set presentation properties
  pptx.author = 'ProPresenter Words';
  pptx.title = 'Song Lyrics';
  pptx.subject = 'Worship Song Lyrics';
  pptx.layout = 'LAYOUT_WIDE';

  // Logo embedding: pptxgenjs addImage crashes inside pkg-bundled executables
  // due to dynamic fs imports. Detect pkg via process.pkg and skip in that case.
  // Electron and web server (plain Node.js) can embed logos safely.
  const isPkgBundled = !!(process as any).pkg;
  let logoBase64: string | null = null;
  try {
    if (!isPkgBundled && options.logoPath && fs.existsSync(options.logoPath)) {
      const logoBuffer = fs.readFileSync(options.logoPath);
      logoBase64 = logoBuffer.toString('base64');
    }
  } catch (error) {
    // Logo loading failed - skip it
    console.log('  (logo skipped — file not readable)');
    logoBase64 = null;
  }

  for (const song of songs) {
    // Optionally add a title slide for each song
    if (options.includeSongTitles) {
      const titleSlide = pptx.addSlide();
      titleSlide.background = { color: 'FFFFFF' };

      titleSlide.addText(song.title, {
        x: LAYOUT.textX,
        y: 3.0,
        w: LAYOUT.textW,
        h: 1.5,
        fontSize: textStyle.titleFontSize,
        fontFace: textStyle.fontFace,
        color: textStyle.textColor,
        bold: textStyle.bold,
        italic: textStyle.italic,
        align: 'center',
        valign: 'middle',
      });

      if (logoBase64) {
        titleSlide.addImage({
          data: `image/png;base64,${logoBase64}`,
          x: LAYOUT.logoX,
          y: LAYOUT.logoY,
          w: LAYOUT.logoW,
          h: LAYOUT.logoH,
        });
      }
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
          x: LAYOUT.textX,
          y: LAYOUT.textY,
          w: LAYOUT.textW,
          h: LAYOUT.textH,
          fontSize: textStyle.fontSize,
          fontFace: textStyle.fontFace,
          color: textStyle.textColor,
          bold: textStyle.bold,
          italic: textStyle.italic,
          align: 'center',
          valign: 'middle',
        });

        if (logoBase64) {
          slide.addImage({
            data: `image/png;base64,${logoBase64}`,
            x: LAYOUT.logoX,
            y: LAYOUT.logoY,
            w: LAYOUT.logoW,
            h: LAYOUT.logoH,
          });
        }

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
