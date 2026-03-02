import PptxGenJS from 'pptxgenjs'
import type { BirthdayEntry } from '../types'
import * as path from 'path'

export async function generatePptx(
  entries: BirthdayEntry[],
  weekLabel: string,
  outputDir: string
): Promise<string> {
  const pptx = new PptxGenJS()
  pptx.layout = 'LAYOUT_WIDE' // 13.33 x 7.5 inches

  // Title slide
  const titleSlide = pptx.addSlide()
  titleSlide.background = { color: '0a0a14' }

  titleSlide.addText('Birthday Bucket', {
    x: 0,
    y: 1.5,
    w: '100%',
    h: 1.2,
    fontSize: 44,
    fontFace: 'Arial',
    color: 'f2f7ff',
    bold: true,
    align: 'center'
  })

  titleSlide.addText(weekLabel, {
    x: 0,
    y: 2.7,
    w: '100%',
    h: 0.8,
    fontSize: 24,
    fontFace: 'Arial',
    color: '2fd4c2',
    align: 'center'
  })

  titleSlide.addText(`${entries.length} birthday${entries.length !== 1 ? 's' : ''}`, {
    x: 0,
    y: 3.5,
    w: '100%',
    h: 0.6,
    fontSize: 18,
    fontFace: 'Arial',
    color: '6a6a80',
    align: 'center'
  })

  // One slide per person
  for (const entry of entries) {
    const slide = pptx.addSlide()
    slide.background = { color: '0a0a14' }

    // Photo placeholder rectangle (left side)
    slide.addShape(pptx.ShapeType.rect, {
      x: 2.5,
      y: 1.5,
      w: 3,
      h: 4,
      fill: { color: '12121e' },
      line: { color: '222236', width: 2, dashType: 'dash' },
      rectRadius: 0.15
    })

    // "Add Photo" placeholder text
    slide.addText('Add Photo', {
      x: 2.5,
      y: 3.0,
      w: 3,
      h: 1,
      fontSize: 16,
      fontFace: 'Arial',
      color: '6a6a80',
      align: 'center',
      valign: 'middle'
    })

    // Person name (right side)
    slide.addText(`${entry.firstName} ${entry.lastName}`, {
      x: 6.5,
      y: 2.0,
      w: 5,
      h: 1,
      fontSize: 36,
      fontFace: 'Arial',
      color: 'f2f7ff',
      bold: true,
      align: 'left',
      valign: 'middle'
    })

    // Day name
    slide.addText(entry.dayName, {
      x: 6.5,
      y: 3.0,
      w: 5,
      h: 0.7,
      fontSize: 22,
      fontFace: 'Arial',
      color: '2fd4c2',
      align: 'left',
      valign: 'middle'
    })

    // Date
    slide.addText(entry.dateFormatted, {
      x: 6.5,
      y: 3.7,
      w: 5,
      h: 0.7,
      fontSize: 22,
      fontFace: 'Arial',
      color: '6a6a80',
      align: 'left',
      valign: 'middle'
    })

    // Source badge (contact/child)
    if (entry.source === 'child') {
      slide.addText('child', {
        x: 6.5,
        y: 4.4,
        w: 1.2,
        h: 0.4,
        fontSize: 12,
        fontFace: 'Arial',
        color: 'f5c156',
        align: 'center',
        valign: 'middle'
      })
    }
  }

  const dateStr = new Date().toISOString().split('T')[0]
  const filename = `birthdays-${dateStr}.pptx`
  const filepath = path.join(outputDir, filename)

  await pptx.writeFile({ fileName: filepath })

  return filepath
}
