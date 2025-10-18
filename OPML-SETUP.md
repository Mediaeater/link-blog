# OPML Export Setup Guide

## Quick Start

Your link blog now supports OPML 2.0 export for sharing your curated links with RSS readers and blogroll platforms.

### Generate OPML File

```bash
npm run opml
```

Output:
- File: `/public/data/blogroll.opml`
- Public URL: `https://mediaeater.github.io/link-blog/data/blogroll.opml`

### What Was Created

1. **`/scripts/generate-opml.js`** (4.4 KB)
   - Main OPML generation script
   - Reads from `data/links.json`
   - Organizes links by tags
   - Outputs to `public/data/blogroll.opml`

2. **`/public/data/blogroll.opml`** (221 KB)
   - OPML 2.0 formatted blogroll
   - 90 total links
   - 183 unique categories (tags)
   - 11 uncategorized links

3. **`/scripts/README-OPML.md`** (4.7 KB)
   - Complete documentation
   - Usage instructions
   - Integration examples
   - Customization guide

4. **`package.json`** (updated)
   - Added `"opml": "node scripts/generate-opml.js"` script
   - Integrated into `"feeds"` script
   - Auto-runs during build via `prebuild` hook

## OPML File Structure

Your OPML file organizes links by tags as nested outlines:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<opml version="2.0">
  <head>
    <title>Mediaeater Digest - Blogroll</title>
    <dateCreated>Sat, 18 Oct 2025 19:57:06 GMT</dateCreated>
    <!-- metadata -->
  </head>
  <body>
    <outline text="ai" title="ai">
      <outline type="link" text="Link Title" url="https://..." />
    </outline>
    <!-- more categories -->
  </body>
</opml>
```

## Integration with Build Process

The OPML export is now part of your automated build:

```bash
npm run build
```

This automatically:
1. Generates OPML (`npm run opml`)
2. Generates RSS feed (`npm run rss`)
3. Generates JSON feed (`npm run json-feed`)
4. Builds the site (`vite build`)

## How to Use Your OPML File

### Share with Others

Send them the public URL:
```
https://mediaeater.github.io/link-blog/data/blogroll.opml
```

### Import to RSS Reader

Most RSS readers support OPML import:
1. **Feedly**: Settings → Import OPML
2. **Inoreader**: Preferences → Import/Export → Import OPML
3. **NewsBlur**: Settings → Import → Upload OPML file
4. **NetNewsWire**: File → Import → Import from OPML

### Add to Your Website

```html
<!-- Link to OPML -->
<a href="/data/blogroll.opml" type="text/x-opml">
  Subscribe to my blogroll (OPML)
</a>

<!-- Auto-discovery meta tag -->
<link rel="outline" type="text/x-opml"
      title="Blogroll"
      href="https://mediaeater.github.io/link-blog/data/blogroll.opml" />
```

### WordPress Blogroll

If you use WordPress:
1. Install a blogroll plugin (e.g., "Link Library")
2. Import the OPML file
3. Display links organized by tags

## Customization

### Change Owner Information

Edit `/scripts/generate-opml.js`:

```javascript
opml += '    <ownerName>Your Name</ownerName>\n';
opml += '    <ownerEmail>your@email.com</ownerEmail>\n';
```

### Filter Which Links to Include

```javascript
// Only include pinned links
const filteredLinks = linksData.links.filter(link => link.isPinned);

// Only include links with specific tags
const filteredLinks = linksData.links.filter(link =>
  link.tags.includes('ai') || link.tags.includes('security')
);
```

### Change Category Sorting

```javascript
// Current: Alphabetical (A-Z)
const sortedTags = Array.from(linksByTag.keys()).sort();

// By popularity (most used tags first)
const sortedTags = Array.from(linksByTag.keys())
  .sort((a, b) => linksByTag.get(b).length - linksByTag.get(a).length);

// By most recent activity
// (would require tracking last-updated per tag)
```

## Verification

Your OPML file has been generated and validated:
- 481 outline elements (categories + links)
- 184 category sections
- Properly escaped XML entities
- Valid OPML 2.0 structure

You can validate it online at:
- http://validator.opml.org/

## Maintenance

### Regenerate After Updates

After adding or editing links:

```bash
npm run opml
```

Or regenerate all feeds:

```bash
npm run feeds
```

### Deploy Updates

```bash
npm run deploy
```

This rebuilds everything (including OPML) and deploys to GitHub Pages.

## Statistics (Current Export)

- **Total Links**: 90
- **Categories**: 183 unique tags
- **Untagged**: 11 links
- **File Size**: 221 KB
- **Format**: OPML 2.0 (XML)
- **Organization**: Tag-based hierarchical structure

## Common Use Cases

### 1. Share Your Curated Links
Provide the OPML URL to colleagues, friends, or blog readers who want to follow the same sources.

### 2. Backup Your Links
OPML is a standard format that can be imported into many tools for backup purposes.

### 3. Cross-Platform Sync
Export from your link blog, import to RSS readers on different devices.

### 4. Blog Integration
Display your curated links as a blogroll on your main blog or website.

### 5. Link Discovery
Others can discover interesting sources through your organized categories.

## Next Steps

1. **Test the OPML**
   - Import it into your favorite RSS reader
   - Verify categories display correctly
   - Check that links are accessible

2. **Customize Owner Info**
   - Update name and email in the generation script
   - Regenerate the file

3. **Add to Website**
   - Link to the OPML file from your main page
   - Add auto-discovery meta tag to HTML

4. **Automate Updates**
   - The file regenerates automatically on build/deploy
   - No manual intervention needed

## Support

For detailed documentation, see:
- `/scripts/README-OPML.md` - Complete technical documentation
- `/scripts/generate-opml.js` - Source code with comments

## Version

- **Created**: 2025-10-18
- **OPML Version**: 2.0
- **Script Version**: 1.0.0
