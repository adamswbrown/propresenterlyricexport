# Service Generator Guide

Automate your Sunday service playlist creation from PDF service orders in minutes.

## What is Service Generator?

Service Generator takes a PDF service order (from Planning Center, Proclaim, ChurchPlanner, etc.) and **automatically populates your ProPresenter playlist** with:
- ✓ Song items matched to your library
- ✓ Bible passages linked to presentations
- ✓ Service structure and announcements
- ✓ Kids content properly categorized

**Time saved:** What normally takes 15-20 minutes of manual playlist building now takes 2-3 minutes.

## How It Works (6-Step Workflow)

### Step 1: Setup (One-Time Configuration)

Configure which libraries and playlists to use:

- **Worship Library** - Your main song/worship library (e.g., "Worship")
- **Kids Library** - Separate library for children's content (e.g., "Kids")
- **Service Content Library** - Library containing Bible verses and service elements
- **Target Playlist** - The playlist to populate with this week's service

**How to find your libraries:**
1. In the desktop app, look at available libraries (loaded during connection)
2. You'll typically have: "Worship," "Service Content," "Kids," "Announcements," etc.
3. Select the ones that match your workflow

Once configured, these settings are saved and remembered for future uses.

### Step 2: Upload PDF

1. Click **"Select PDF"** or drag-and-drop a PDF file
2. Choose your service order (from Planning Center, Proclaim, etc.)
3. The app loads and prepares the document

**Supported PDF formats:**
- Planning Center service orders
- Proclaim service orders
- ChurchPlanner exports
- Any PDF with song titles and scripture references

### Step 3: Parse

The app **automatically extracts** from your PDF:
- **Song titles** - Detected in common list formats
- **Bible verses** - Identified by book/chapter:verse patterns (e.g., "Romans 12:1-2")
- **Kids items** - Marked by keywords ("kids video," "children's story," etc.)
- **Service sections** - Announcements, prayers, special items
- **Worship slots** - Automatically categorized (Praise 1, Praise 2, Praise 3)

**What you see:** A preview list of everything extracted from the PDF, organized by section.

### Step 4: Match Songs

Each extracted song is matched against your Worship Library:

**For each song:**
- The app shows the best matches with **confidence scores**
- **Green (>90%)** - High confidence, auto-selected
- **Yellow (70-90%)** - Medium confidence, review recommended
- **Red (<70%)** - Low confidence, probably wrong

**What to do:**
1. **Accept green matches** - Leave as-is
2. **Review yellow/red matches** - Click to select the correct song
3. **Manual selection** - If no match found, search by typing
4. **Skip items** - Some items might not be songs (announcements, etc.)

**Step complete when:** All songs are matched or explicitly skipped.

### Step 5: Bible (Verses & Presentations)

Match scripture references to your Service Content library:

**For each verse reference (e.g., "John 3:16"):**
- The app searches your Service Content library
- Shows matching presentations with confidence scores
- **Green** - Strong match, auto-selected
- **Yellow** - Possible matches, pick the right one
- **Red** - No match found

**When no match is found:**
- **Copy to clipboard** - Copy the reference
- **Open Bible Gateway** - Opens the verse in a web browser
- **Focus ProPresenter** - Opens the Bible reading panel in ProPresenter (Cmd+B)
- Then manually add the verse to your Service Content library and re-run

**Step complete when:** All verses are matched or marked as manual.

### Step 6: Build

The app **automatically creates your playlist** with:
1. Opening section (pre-roll, announcements)
2. Songs in correct order with matched library items
3. Bible passages inserted at the right moments
4. Service sections and transitions
5. Kids content separated and properly organized

**Result:**
- Your target playlist is populated and ready
- All items are linked to your actual library presentations
- Structure matches your service order

**Final touches:**
- Drop in your Birthday Bucket, Sermon, and Kids Talk PowerPoints manually
- Use ProPresenter's "Import PPT as Presentation" for editable slides

---

## Workflow Details

### Song Matching

The fuzzy-match engine searches for songs in three ways:

1. **Exact title match** - Looks for exact song names
2. **Partial match** - Finds songs with similar titles
3. **Phonetic match** - Handles spelling variations

**Examples:**
- "Jesus Loves Me" → Finds your "Jesus Loves Me (2023 Version)"
- "Amazing Grace" → Matches "Amazing Grace (Hymn Arrangement)"
- "Worthy Is The Lamb" → Finds "Worthy Is The Lamb (Newsboys)"

**High confidence (>90%):**
- Very similar title
- Likely the correct song
- Auto-selected

**Manual review (70-90%):**
- Possible match
- Could be a different version
- You pick which one

**No match (<70%):**
- Probably not in your library
- You can search manually or skip

### Bible Matching

Scripture references are matched against presentations in your Service Content library:

**Typical references:**
- `John 3:16` - Single verse
- `Romans 12:1-2` - Verse range
- `1 Corinthians 13` - Whole chapter
- `Psalm 23:1-6` - Multiple verses

**Matching logic:**
1. Exact book/chapter/verse match
2. Same book and chapter (any verse)
3. Same book (any chapter)

**Common issues:**
- **Different translation?** - "KJV" vs "NIV" in title won't match; these are different presentations
- **Not found?** - Create the presentation in Service Content library first, then re-run
- **Multiple versions?** - You pick which translation/version to use

### Worship Slot Detection

The app automatically identifies worship segments:

- **Praise 1** - First worship song block
- **Praise 2** - Second worship song block
- **Praise 3** - Third worship song block
- **Kids** - Children's content

**How it works:**
- Looks for keywords ("Praise," "Worship," "Kids," "Children," etc.)
- Section breaks in the PDF indicate new slots
- Comments in Planning Center are parsed

**Manual override:**
- Right-click any song in Step 4 to reassign its worship slot
- Useful if automatic detection isn't quite right

---

## Tips & Tricks

### Before Running Service Generator

1. **Ensure your libraries are set up:**
   - Create a "Worship" library with your songs
   - Create a "Service Content" library with verses and announcements
   - Create a "Kids" library if you have kids content
   - Create your target playlist (can be empty)

2. **Add missing presentations first:**
   - If you know a song isn't in your library, add it before running
   - Same for Bible verses - create them in Service Content first
   - This makes matches more successful

3. **Use consistent naming:**
   - Song titles in Planning Center should match your library
   - Bible passages should be in format "Book Chapter:Verse"

### During the Workflow

1. **Don't rush yellow/red matches**
   - Review them carefully
   - Better to skip and add manually than use wrong song

2. **Use the search feature**
   - Click the match row to open a search dialog
   - Type to find the right song/verse
   - Helpful for typos or variations

3. **Mark as manual carefully**
   - "Manual" means you'll add it to ProPresenter later
   - Make a note of which items are manual
   - Don't forget to add them!

### After Building

1. **Review the playlist**
   - Check the order makes sense
   - Verify songs are the right versions
   - Look for any oddities

2. **Add remaining items**
   - Birthday Bucket presentation
   - Sermon presentation
   - Kids Talk presentation
   - Any other special segments

3. **Customize if needed**
   - Adjust song order (drag in ProPresenter)
   - Add or remove items
   - Add transition slides

4. **Test before Sunday**
   - Open the playlist in ProPresenter
   - Preview each song to ensure correct content
   - Check any custom formatting

---

## Troubleshooting

### No songs found in library

**Problem:** "No matches" shown for all songs

**Solutions:**
1. Verify the Worship Library is correct (check its name)
2. Ensure songs are actually in the library
3. Check song titles match what's in Planning Center
4. Try manual search for one song to debug

### Bible verses not matching

**Problem:** Verse references show "No match"

**Solutions:**
1. Verify Service Content library has the verses
2. Check verse format in the PDF (should be "John 3:16" style)
3. Try different Bible translation if available
4. Use "Open Bible Gateway" fallback to manually create presentation

### Wrong songs getting selected

**Problem:** High confidence match is wrong

**Solutions:**
1. Songs probably have similar titles in your library
2. Check if you have duplicates with different versions
3. Manually override each one in Step 4
4. Consider renaming songs to be more distinct

### PDF won't upload

**Problem:** "Invalid PDF" or upload fails

**Solutions:**
1. Ensure it's a valid PDF file (not corrupted)
2. Try opening it in another PDF reader
3. Try a different service order (different format)
4. Check file size (should be <50MB)

---

## Service Order Sources

Service Generator works with PDFs from these services:

- **Planning Center** - Export service order as PDF
- **Proclaim** - Export order of worship
- **ChurchPlanner** - Export service plan
- **Generic PDFs** - Any PDF with song titles and scripture references

**How to export from Planning Center:**
1. Open your service
2. Click "…" menu
3. Select "Print / Download"
4. Choose PDF format
5. Download the file

**How to export from Proclaim:**
1. Open your service
2. Click "File" → "Export"
3. Choose PDF format
4. Save the file

---

## Getting Help

Still have questions?

- 📖 Check [User Guide](../user-guide.md) for general app usage
- 🔧 See [Troubleshooting](../faq.md) for common issues
- 💬 Open an [issue on GitHub](https://github.com/adamswbrown/propresenterlyricexport/issues)
