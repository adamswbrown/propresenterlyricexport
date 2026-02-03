/**
 * Test PDF Parser
 * Quick test script to validate PDF parsing
 */

import { pdfParser } from './services/pdf-parser';
import * as path from 'path';

async function testParser() {
  const pdfPath = path.join(__dirname, '../OSS/OS 02.02.26.pdf');

  console.log('Testing PDF Parser...\n');
  console.log('PDF:', pdfPath, '\n');

  try {
    const parsed = await pdfParser.parsePDF(pdfPath);

    console.log('='.repeat(60));
    console.log('PARSED SERVICE ORDER');
    console.log('='.repeat(60));
    console.log('Date:', parsed.date);
    console.log('Sections found:', parsed.sections.length);
    console.log('='.repeat(60));
    console.log('');

    console.log('SECTIONS:');
    console.log('-'.repeat(60));
    for (const section of parsed.sections) {
      const typeLabel = section.type.toUpperCase().padEnd(12);
      const leader = section.leader ? ` (${section.leader})` : '';
      const video = section.isVideo ? ' [VIDEO]' : '';
      console.log(`${typeLabel} ${section.title}${leader}${video}`);
    }
    console.log('-'.repeat(60));

    // Count by type
    const counts = parsed.sections.reduce((acc, s) => {
      acc[s.type] = (acc[s.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    console.log('\nSection counts:');
    for (const [type, count] of Object.entries(counts)) {
      console.log(`  ${type}: ${count}`);
    }

  } catch (error) {
    console.error('Error parsing PDF:', error);
    process.exit(1);
  }
}

testParser();
