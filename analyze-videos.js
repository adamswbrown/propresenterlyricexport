const { PDFParser } = require('./dist/services/pdf-parser');
const fs = require('fs');
const path = require('path');

async function analyzePDFs() {
  const parser = new PDFParser();
  const ossDir = './OSS';
  const files = fs.readdirSync(ossDir)
    .filter(f => f.endsWith('.pdf'))
    .sort();

  console.log(`Analyzing ${files.length} PDF files for video placement...\n`);

  const videosAtEnd = [];
  const videosInMiddle = [];
  const allVideos = [];

  for (const file of files) {
    const filePath = path.join(ossDir, file);
    try {
      const result = await parser.parsePDF(filePath);
      
      if (result.sections.length === 0) continue;
      
      const videos = result.sections.filter(s => s.isVideo);
      if (videos.length === 0) continue;

      // Track all videos
      videos.forEach(v => {
        allVideos.push({
          file,
          title: v.title,
          position: v.position,
          total: result.sections.length,
          isKidsVideo: v.isKidsVideo,
          percentage: Math.round((v.position / result.sections.length) * 100)
        });
      });

      // Check if videos are at end (last 20% of sections)
      const endThreshold = result.sections.length * 0.8;
      videos.forEach(v => {
        if (v.position > endThreshold) {
          videosAtEnd.push({
            file,
            title: v.title,
            position: `${v.position}/${result.sections.length}`,
            percentage: Math.round((v.position / result.sections.length) * 100),
            isKidsVideo: v.isKidsVideo
          });
        }
      });

      // Check if videos are in middle (40-60% of sections)
      videos.forEach(v => {
        const pct = v.position / result.sections.length;
        if (pct >= 0.4 && pct <= 0.6) {
          videosInMiddle.push({
            file,
            title: v.title,
            position: `${v.position}/${result.sections.length}`,
            percentage: Math.round(pct * 100),
            isKidsVideo: v.isKidsVideo
          });
        }
      });
    } catch (error) {
      // Skip on error
    }
  }

  console.log('📹 VIDEOS AT END OF SERVICE (last 20%):');
  console.log('=' .repeat(100));
  if (videosAtEnd.length === 0) {
    console.log('(none found)');
  } else {
    videosAtEnd.forEach(v => {
      const kids = v.isKidsVideo ? '👶 KIDS' : '   ';
      console.log(`${kids}  ${v.file.padEnd(40)} ${v.title.padEnd(40)} (${v.percentage}%)`);
    });
  }

  console.log('\n📹 VIDEOS IN MIDDLE OF SERVICE (40-60%):');
  console.log('=' .repeat(100));
  if (videosInMiddle.length === 0) {
    console.log('(none found)');
  } else {
    videosInMiddle.forEach(v => {
      const kids = v.isKidsVideo ? '👶 KIDS' : '   ';
      console.log(`${kids}  ${v.file.padEnd(40)} ${v.title.padEnd(40)} (${v.percentage}%)`);
    });
  }

  console.log('\n📹 ALL VIDEO PLACEMENTS:');
  console.log('=' .repeat(100));
  const videosByFile = {};
  allVideos.forEach(v => {
    if (!videosByFile[v.file]) videosByFile[v.file] = [];
    videosByFile[v.file].push(v);
  });

  Object.entries(videosByFile).sort().forEach(([file, videos]) => {
    const special = result => result.specialServiceType || 'regular';
    console.log(`\n${file}`);
    videos.forEach(v => {
      const kids = v.isKidsVideo ? '👶' : '  ';
      console.log(`  ${kids} ${v.title} (${v.percentage}% through service)`);
    });
  });

  console.log('\n\n📊 SUMMARY:');
  console.log(`Total files with videos: ${Object.keys(videosByFile).length}`);
  console.log(`Videos at end: ${videosAtEnd.length}`);
  console.log(`Videos in middle: ${videosInMiddle.length}`);
  console.log(`Total videos: ${allVideos.length}`);
}

analyzePDFs().catch(console.error);
