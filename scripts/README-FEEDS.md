# Feed Generation Scripts

This directory contains scripts for generating syndication feeds for the link blog.

## Available Feeds

### RSS Feed (`generate-rss.js`)
- **Format**: RSS 2.0
- **Output**: `/public/feed.xml`
- **Standard**: Traditional RSS format widely supported by feed readers
- **Command**: `npm run rss`

### JSON Feed (`generate-json-feed.js`)
- **Format**: JSON Feed 1.1
- **Output**: `/public/data/feed.json`
- **Standard**: Modern JSON-based feed format (https://jsonfeed.org/)
- **Command**: `npm run json-feed`

## Usage

### Generate Individual Feeds

```bash
# Generate RSS feed only
npm run rss

# Generate JSON feed only
npm run json-feed

# Generate all feeds
npm run feeds
```

### Automatic Generation

Feeds are automatically generated during the build process:

```bash
npm run build  # Generates sitemap and all feeds before building
```

## JSON Feed Structure

The JSON Feed follows the [JSON Feed Version 1.1 specification](https://www.jsonfeed.org/version/1.1/) and includes:

### Standard Fields
- `version`: JSON Feed version identifier
- `title`: Feed title
- `home_page_url`: Link to the website
- `feed_url`: Link to the feed itself
- `description`: Feed description
- `icon`: Feed icon
- `favicon`: Feed favicon
- `language`: Feed language (en)
- `authors`: Array of author objects

### Items
Each feed item includes:
- `id`: Unique identifier (link ID)
- `url`: Link URL
- `title`: Link title/source
- `date_published`: ISO 8601 timestamp
- `tags`: Array of tag strings
- `content_text`: Plain text content (pull quote)
- `summary`: Truncated summary (150 chars)
- `content_html`: HTML formatted content
- `image`: Link image (if available)
- `banner_image`: Link favicon (if available)

### Custom Extensions
Link blog specific metadata under `_link_blog`:
- `visits`: Number of visits
- `is_pinned`: Whether the link is pinned
- `last_visited`: Last visit timestamp (if applicable)

## Feed Discovery

Both feeds are discoverable via HTML `<link>` tags in `/index.html`:

```html
<link rel="alternate" type="application/rss+xml" title="RSS Feed" href="/feed.xml">
<link rel="alternate" type="application/feed+json" title="JSON Feed" href="/data/feed.json">
```

## Feed URLs

When deployed to GitHub Pages:
- **RSS**: https://mediaeater.github.io/link-blog/feed.xml
- **JSON Feed**: https://mediaeater.github.io/link-blog/data/feed.json

## Validation

### JSON Feed Validation
You can validate the generated JSON Feed at:
- https://validator.jsonfeed.org/

### RSS Validation
You can validate the RSS feed at:
- https://validator.w3.org/feed/

## Data Source

Both feed generators read from:
- `/public/data/links.json` - Primary data source

This ensures consistency with the main application data.

## Adding to Feed Readers

### JSON Feed Compatible Readers
- NewsBlur
- Feedbin
- Inoreader
- Feedly
- NetNewsWire (macOS/iOS)
- Reeder (macOS/iOS)
- Many other modern feed readers

### Testing JSON Feed
```bash
# Generate and view the feed
npm run json-feed
cat public/data/feed.json | jq '.'

# Or view in browser
open public/data/feed.json
```

## Implementation Notes

1. **Sorting**: Items are sorted by `date_published` (newest first)
2. **HTML Escaping**: All HTML content is properly escaped in `content_html`
3. **Pull Quotes**: Formatted as blockquotes in the HTML content
4. **Tags**: Included in both the `tags` array and displayed in HTML content
5. **Pinned Status**: Indicated in the custom `_link_blog` extension and in HTML
6. **Images**: Both `image` and `favicon` fields from links.json are included when available

## Future Enhancements

Potential improvements for the feed generation:
- Add more rich media metadata (audio, video)
- Include external URLs for related content
- Add support for content warnings
- Implement feed pagination for large datasets
- Add Atom feed format
- Generate category-specific feeds (filtered by tags)
