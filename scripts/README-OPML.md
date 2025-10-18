# OPML Export for Link Blog

## Overview

The OPML (Outline Processor Markup Language) export feature generates a standardized blogroll file from your link blog data. This allows you to share your curated links with RSS readers, blog roll aggregators, and other OPML-compatible tools.

## What is OPML?

OPML 2.0 is an XML format used to exchange lists of web feeds and bookmarks. It's widely supported by RSS readers and blog platforms for importing/exporting subscription lists and blogrolls.

## Generated File

- **Location**: `/public/data/blogroll.opml`
- **Format**: OPML 2.0 XML
- **Structure**: Links organized by tags as outline categories
- **Public URL**: `https://mediaeater.github.io/link-blog/data/blogroll.opml`

## Usage

### Generate OPML File

```bash
npm run opml
```

This command:
1. Reads all links from `data/links.json`
2. Organizes links by their tags
3. Generates a properly formatted OPML 2.0 file
4. Outputs statistics (total links, categories, untagged items)

### Include in Build Process

The OPML generation is automatically included in the build process via the `feeds` script:

```bash
npm run feeds    # Generates RSS, JSON Feed, and OPML
npm run build    # Includes feeds generation via prebuild hook
```

## OPML Structure

The generated OPML file includes:

### Header Information
- Title: "Mediaeater Digest - Blogroll"
- Creation and modification dates
- Owner information
- OPML 2.0 specification reference

### Body Structure
```xml
<outline text="tag-name" title="tag-name">
  <outline
    type="link"
    text="Link Title"
    title="Link Title"
    url="https://example.com"
    htmlUrl="https://example.com"
    description="Pull quote or description"
    created="RFC-822 date"
    category="comma,separated,tags"
    isPinned="true"
    visits="5"
  />
</outline>
```

### Organization
- **Tagged Links**: Organized under category outlines matching their tags
- **Multi-tagged Links**: Appear under each of their tags
- **Untagged Links**: Grouped under "Uncategorized" category
- **Alphabetical**: Categories sorted A-Z for easy navigation

## Link Metadata Included

Each link entry includes:
- `text` / `title`: Link source/title
- `url` / `htmlUrl`: Link URL
- `description`: Pull quote (if available)
- `created`: Link timestamp in RFC-822 format
- `category`: All tags as comma-separated list
- `isPinned`: Pin status (if pinned)
- `visits`: Visit count (if > 0)

## Importing OPML

The generated OPML file can be imported into:

### RSS Readers
- Feedly
- Inoreader
- NewsBlur
- The Old Reader
- NetNewsWire
- Reeder

### Blog Platforms
- WordPress (via blogroll plugins)
- Ghost
- Hugo (via OPML to YAML converters)
- Jekyll (via custom scripts)

### Other Tools
- OPML validators
- Bookmark managers
- Link aggregators

## Integration Examples

### Add to Website
```html
<a href="/data/blogroll.opml" type="text/x-opml">
  Subscribe to my blogroll
</a>
```

### RSS Reader Auto-Discovery
```html
<link
  rel="outline"
  type="text/x-opml"
  title="Blogroll"
  href="https://mediaeater.github.io/link-blog/data/blogroll.opml"
/>
```

## Script Details

### File Path
`/Users/imac/Projects/link-blog/scripts/generate-opml.js`

### Dependencies
- Node.js built-in modules only (fs, path, url)
- No external packages required

### Error Handling
- Creates output directory if it doesn't exist
- Escapes XML special characters (`, <, >, ", ')
- Handles missing fields gracefully
- Provides console feedback on completion

## Customization

To customize the OPML output, edit `scripts/generate-opml.js`:

### Change Owner Information
```javascript
opml += '    <ownerName>Your Name</ownerName>\n';
opml += '    <ownerEmail>your@email.com</ownerEmail>\n';
```

### Modify Category Sorting
```javascript
// Current: Alphabetical
const sortedTags = Array.from(linksByTag.keys()).sort();

// By frequency (most used tags first)
const sortedTags = Array.from(linksByTag.keys())
  .sort((a, b) => linksByTag.get(b).length - linksByTag.get(a).length);
```

### Filter Links
```javascript
// Only include pinned links
linksData.links.filter(link => link.isPinned).forEach(link => {
  // processing...
});
```

## Validation

Validate your OPML file at:
- http://validator.opml.org/
- https://www.feedvalidator.org/

## Troubleshooting

### Empty Categories
- Check that links have tags assigned
- Run `npm run opml` to regenerate after adding tags

### Special Characters
- The script automatically escapes XML entities
- No manual escaping needed

### File Not Found
- Ensure `data/links.json` exists and is readable
- Check file permissions on the data directory

## Version History

- **v1.0** (2025-10-18): Initial OPML 2.0 implementation
  - Tag-based organization
  - Full metadata support
  - Automatic XML escaping
  - Integration with build process
