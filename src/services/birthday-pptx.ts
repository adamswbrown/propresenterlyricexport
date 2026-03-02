import PptxGenJS from 'pptxgenjs';
import type { BirthdayEntry } from '../types/churchsuite';
import * as path from 'path';
import * as fs from 'fs';

export interface BirthdayPptxOptions {
  churchName?: string;
  backgroundImagePath?: string;
}

const FALLBACK_BG_COLOR = 'C8920A'; // warm amber when no background image

function applyBackground(slide: PptxGenJS.Slide, options: BirthdayPptxOptions): void {
  const imgPath = options.backgroundImagePath?.trim();
  if (imgPath && fs.existsSync(imgPath)) {
    slide.background = { path: imgPath };
  } else {
    slide.background = { color: FALLBACK_BG_COLOR };
  }
}

export async function generateBirthdayPptx(
  entries: BirthdayEntry[],
  weekLabel: string,
  outputDir: string,
  options: BirthdayPptxOptions = {}
): Promise<string> {
  const churchName = options.churchName?.trim() || "St Andrew's";
  const pptx = new PptxGenJS();
  pptx.layout = 'LAYOUT_WIDE'; // 13.33 x 7.5 inches

  // === Slide 1: Title slide ===
  const titleSlide = pptx.addSlide();
  applyBackground(titleSlide, options);

  titleSlide.addText(`Happy Birthday\nfrom ${churchName}!`, {
    x: 1,
    y: 1.8,
    w: 11.33,
    h: 3.5,
    fontSize: 54,
    fontFace: 'Arial',
    color: 'FFFFFF',
    bold: true,
    align: 'center',
    valign: 'middle',
  });

  titleSlide.addText(weekLabel, {
    x: 1,
    y: 5.6,
    w: 11.33,
    h: 0.8,
    fontSize: 22,
    fontFace: 'Arial',
    color: 'FFFFFF',
    align: 'center',
    valign: 'middle',
  });

  // === Slides 2..N: One per person ===
  for (const entry of entries) {
    const slide = pptx.addSlide();
    applyBackground(slide, options);

    // "Happy Birthday from [Church]!" — upper right
    slide.addText(`Happy Birthday\nfrom ${churchName}!`, {
      x: 7.3,
      y: 0.4,
      w: 5.5,
      h: 3.8,
      fontSize: 36,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true,
      align: 'right',
      valign: 'top',
    });

    // Photo placeholder box — left side
    slide.addShape(pptx.ShapeType.rect, {
      x: 0.4,
      y: 1.2,
      w: 4.0,
      h: 5.0,
      fill: { type: 'solid', color: '000000', alpha: 65 },
      line: { color: 'FFFFFF', width: 1.5, dashType: 'dash' },
    });

    // Placeholder text inside the box
    slide.addText(`Put ${entry.firstName}'s\nPhoto here`, {
      x: 0.4,
      y: 2.8,
      w: 4.0,
      h: 1.8,
      fontSize: 18,
      fontFace: 'Arial',
      color: 'FFFFFF',
      align: 'center',
      valign: 'middle',
    });

    // Person's name below the photo box
    slide.addText(`${entry.firstName} ${entry.lastName}`, {
      x: 0.4,
      y: 6.3,
      w: 4.0,
      h: 0.9,
      fontSize: 22,
      fontFace: 'Arial',
      color: 'FFFFFF',
      bold: true,
      align: 'center',
      valign: 'middle',
    });
  }

  // === Final slide: Song / all names ===
  if (entries.length > 0) {
    const songSlide = pptx.addSlide();
    applyBackground(songSlide, options);

    const allNames = entries.map(e => e.firstName).join(', ');

    // Calculate vertical positions to center the block
    const regularFontSize = 28;
    const namesFontSize = 40;
    const lineH = 0.7;   // height per regular line
    const nameH = 1.0;   // height for names line
    const gapH = 0.4;    // gap before/after names
    const totalH = lineH * 3 + gapH + nameH + gapH + lineH;
    const startY = (7.5 - totalH) / 2;

    const cx = 0.5;
    const cw = 12.33;

    let y = startY;

    songSlide.addText('Jesus bless you today!', {
      x: cx, y, w: cw, h: lineH,
      fontSize: regularFontSize, fontFace: 'Arial', color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });
    y += lineH;

    songSlide.addText('Jesus bless you today!', {
      x: cx, y, w: cw, h: lineH,
      fontSize: regularFontSize, fontFace: 'Arial', color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });
    y += lineH;

    songSlide.addText('Jesus bless you dear:', {
      x: cx, y, w: cw, h: lineH,
      fontSize: regularFontSize, fontFace: 'Arial', color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });
    y += lineH + gapH;

    songSlide.addText(allNames, {
      x: cx, y, w: cw, h: nameH,
      fontSize: namesFontSize, fontFace: 'Arial', color: 'FFFFFF',
      bold: true,
      align: 'center', valign: 'middle',
    });
    y += nameH + gapH;

    songSlide.addText('Jesus bless you always!', {
      x: cx, y, w: cw, h: lineH,
      fontSize: regularFontSize, fontFace: 'Arial', color: 'FFFFFF',
      align: 'center', valign: 'middle',
    });
  }

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `birthdays-${dateStr}.pptx`;
  const filepath = path.join(outputDir, filename);

  await pptx.writeFile({ fileName: filepath });

  return filepath;
}
