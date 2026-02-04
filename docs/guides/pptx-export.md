# PPTX Export Guide

Master the art of creating beautiful, presentation-ready PowerPoint files.

## PPTX Export Basics

### What Gets Exported

Each export creates a PowerPoint with:

1. **Title slides** (optional) - One per song
   - Song title in large text
   - Album/Artist information
   - Optional logo image

2. **Lyric slides** - One per verse/section
   - Formatted lyrics
   - Clean, readable design
   - Consistent styling throughout

3. **Metadata** - Embedded in the file
   - Song information
   - Export date/time
   - Playlist name

### Slide Layout

**Default layout:**
```
[Black background]

                    AMAZING GRACE
                    [Artist name if available]

[Large, centered lyrics in white text]

    Amazing grace, how sweet the sound,
    That saved a wretch like me!
    I once was lost, but now am found,
    Was blind, but now I see.
```

---

## Customization Options

### Colors

#### Text Color
- **Default:** White (#FFFFFF)
- **Use:** Light colors on dark background
- **Examples:**
  - White (`#FFFFFF`) - Highest contrast
  - Light gray (`#CCCCCC`) - Softer appearance
  - Light blue (`#87CEEB`) - Branded color

#### Background
- **Default:** Black (#000000)
- **Recommendation:** Keep dark for readability
- **Options:** Dark colors work best (dark blue, dark gray, etc.)

**Desktop App:**
Click the color picker next to "Text color" in Settings

**CLI:**
```bash
export PP_TEXT_COLOR=FFFFFF  # Hex without # symbol
propresenter-lyrics pptx abc123 output
```

### Fonts

#### Available Fonts (25+ curated options)

**Sans-serif** (recommended for screens):
- Red Hat Display
- Arial
- Helvetica
- Verdana
- Open Sans
- Roboto
- Lato
- Montserrat
- Poppins
- Inter

**Serif** (classic look):
- Georgia
- Times New Roman
- Palatino
- Cambria
- Merriweather
- Playfair Display
- Lora

**Display** (bold statements):
- Impact
- Oswald
- Bebas Neue

#### Font Selection

**Desktop App:**
1. Click ⚙ Settings
2. Look at "Font family" dropdown
3. Green ✓ = installed
4. Gray ○ = available to download
5. Click to select

**CLI:**
```bash
export PP_FONT_FACE="Arial"
propresenter-lyrics pptx abc123 output
```

#### Installing Missing Fonts

**Desktop App:**
1. Click gray ○ next to font name
2. Opens Google Fonts in browser
3. Click "Download"
4. Install on your system
5. Click "Refresh" in Settings

**macOS:**
```bash
# Download font and copy to fonts folder
cp ~/Downloads/font.ttf ~/Library/Fonts/
```

**Windows:**
```bash
# Download font and right-click → Install
# Or copy to C:\Windows\Fonts\
```

### Text Size

#### Lyric Size (Body Text)

- **Default:** 44pt
- **Recommended:** 40-48pt
- **Readable from:** 30+ feet
- **Smaller:** Make text harder to read from distance
- **Larger:** Fewer lines per slide

**Desktop App:**
- "Font size" slider in Settings

**CLI:**
```bash
export PP_FONT_SIZE=44
```

#### Title Size (Song Names)

- **Default:** 54pt
- **Recommended:** 48-60pt
- **Purpose:** Make song titles stand out
- **Should be:** Larger than body text

**Desktop App:**
- "Title size" slider in Settings

**CLI:**
```bash
export PP_TITLE_SIZE=54
```

### Text Formatting

#### Bold Text

Makes all text bold for emphasis.

- **Default:** Enabled (true)
- **Effect:** Increases readability, stronger appearance
- **Disable for:** Lightweight, delicate look

**Desktop App:**
- "Bold" checkbox in Settings

**CLI:**
```bash
export PP_BOLD=true
```

#### Italic Text

Makes all text italic for elegance.

- **Default:** Enabled (true)
- **Effect:** Adds visual interest, flowing appearance
- **Disable for:** Cleaner, more formal look

**Desktop App:**
- "Italic" checkbox in Settings

**CLI:**
```bash
export PP_ITALIC=true
```

### Logo Image

Add your church/organization logo to slides.

#### Adding a Logo

**Desktop App:**
1. Click ⚙ Settings
2. Click the "Logo path" field
3. Browse to your image file
4. Logo appears on title slides

**Supported formats:**
- PNG (recommended)
- JPEG
- GIF

**Best practices:**
- Use transparent PNG (shows on any background)
- Keep dimensions square or landscape
- Resolution: 300x300px minimum, 1000x1000px maximum
- File size: Less than 5MB
- Aspect ratio: 1:1 (square) or 16:9 (landscape)

#### Logo Positioning

- **Position:** Bottom right corner of slides
- **Size:** Automatically scaled to fit
- **Opacity:** Subtle (doesn't overpower content)

#### Example Logo Sizes

```
| Small logo    | Medium logo  | Large logo    |
| 200x200px     | 400x400px    | 600x600px     |
| [light]       | [medium]     | [prominent]   |
```

---

## PPTX Styling Presets

Create consistent looks with these style combinations:

### Modern Minimal

```
Font:        Open Sans
Text Color:  White (#FFFFFF)
Font Size:   44pt
Title Size:  54pt
Bold:        Disabled
Italic:      Disabled
Background:  Black
Logo:        None
```

**Best for:** Contemporary churches, modern worship

### Elegant Classic

```
Font:        Georgia
Text Color:  Light gray (#DDDDDD)
Font Size:   48pt
Title Size:  60pt
Bold:        Enabled
Italic:      Enabled
Background:  Dark blue (#1a1a2e)
Logo:        Organization logo
```

**Best for:** Traditional services, formal events

### Bold Display

```
Font:        Impact
Text Color:  Bright white (#FFFFFF)
Font Size:   52pt
Title Size:  66pt
Bold:        Enabled
Italic:      Disabled
Background:  Black (#000000)
Logo:        None
```

**Best for:** Youth services, high-energy events

### Branded Custom

```
Font:        Your brand font (e.g., Montserrat)
Text Color:  Your brand color
Font Size:   Sized for your venue
Title Size:  30% larger than lyrics
Bold/Italic: Matches brand guidelines
Background:  Dark version of brand color
Logo:        Your organization logo
```

**Best for:** Consistent branding across services

---

## Best Practices

### Readability

1. **High contrast** - Use light text on dark background
2. **Large fonts** - 40pt minimum for audience visibility
3. **Simple fonts** - Avoid decorative/script fonts
4. **Adequate spacing** - Leave white space between lines

### Design

1. **Consistent styling** - Don't change fonts mid-presentation
2. **Logo placement** - Keep subtle, don't distract from lyrics
3. **Color psychology** - Dark backgrounds reduce eye strain
4. **Font pairing** - Use one sans-serif (modern) or serif (classic)

### Performance

1. **File size** - Should be 1-10MB
2. **Slide count** - Typically 50-200 slides per service
3. **Opening time** - Should load in <5 seconds

### Testing

1. **Preview on projector** - Check readability from distance
2. **Test all fonts** - Ensure they look good in your venue
3. **View on screens** - Different displays render slightly differently
4. **Print preview** - If printing lyrics

---

## Troubleshooting

### Font Not Appearing

**Problem:** Font looks different than expected

**Solutions:**
1. Check font is installed on the computer opening the file
2. Use system fonts (Arial, Helvetica) for compatibility
3. Some fonts aren't licensed for PPTX embedding

### Colors Look Wrong

**Problem:** Colors appear different on projector

**Solutions:**
1. Projectors display differently than screens
2. Test on your actual projector before Sunday
3. Use high-contrast combinations (white on black)
4. Adjust brightness/contrast on projector

### Logo Doesn't Appear

**Problem:** Logo image missing from exported file

**Solutions:**
1. Verify file path is correct
2. Check image format (PNG/JPEG)
3. Ensure image file isn't corrupted
4. Try a different image file

### File Size Too Large

**Problem:** .pptx file is 50MB+ (should be <20MB)

**Solutions:**
1. Check logo image isn't huge (compress if needed)
2. Some fonts increase file size (use system fonts)
3. Reduce number of slides if possible
4. Remove unused slides

### Can't Open File

**Problem:** PowerPoint says file is corrupted

**Solutions:**
1. Re-export the playlist
2. Try opening with LibreOffice Impress (free)
3. Check available disk space
4. Try on different computer

---

## Advanced Tips

### Custom Color Schemes

Create colors that match your brand:

```bash
# Your brand color scheme
export PP_TEXT_COLOR=E8D7F1        # Lavender text
export PP_BACKGROUND_COLOR=2D2D44  # Deep purple background
# Note: Background color via environment variable (not in UI yet)
```

### Font Licensing

Most curated fonts are:
- **Free for personal use** (Google Fonts)
- **Freely embeddable** in PowerPoint
- **Licensed for presentation** use
- **No additional license needed**

For commercial use, check individual font licenses.

### Batch Export with Custom Styles

```bash
#!/bin/bash
export PP_FONT_FACE="Montserrat"
export PP_TEXT_COLOR="FFFFFF"
export PP_FONT_SIZE=44

for uuid in playlist1 playlist2 playlist3; do
  propresenter-lyrics pptx "$uuid" "sunday-$uuid"
done
```

---

## See Also

- [User Guide](../user-guide.md) - Full app documentation
- [CLI Guide](./cli-guide.md) - Command reference
- [Getting Started](../getting-started.md) - Installation
