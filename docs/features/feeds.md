# Feeds & Syndication

## Overview

The link blog provides multiple syndication formats for maximum compatibility with feed readers, browsers, and aggregation tools.

## Available Formats

### 1. RSS Feed (feed.xml)

**Standard**: RSS 2.0
**URL**: `/feed.xml`
**Use Case**: Traditional feed readers

Generated automatically on build using the `feed` npm package.

**Features**:
- Full link metadata
- Tags included in description
- Publication dates
- Author information

**Access**:
- Direct: `https://mediaeater.github.io/link-blog/feed.xml`
- Auto-discovery via `<link>` tag in HTML

### 2. JSON Feed (feed.json)

**Standard**: JSON Feed 1.1
**URL**: `/data/feed.json`
**Use Case**: Modern feed readers, API consumers

**Features**:
- Native JSON format
- Tags as array
- Content HTML
- Simpler parsing than XML

**Example Entry**:
```json
{
  "version": "https://jsonfeed.org/version/1.1",
  "title": "Mediaeater Digest",
  "home_page_url": "https://mediaeater.github.io/link-blog/",
  "feed_url": "https://mediaeater.github.io/link-blog/data/feed.json",
  "items": [
    {
      "id": "1234567890",
      "url": "https://example.com/article",
      "title": "Article Title",
      "content_html": "<p>Pull quote or description</p>",
      "date_published": "2025-10-19T12:00:00Z",
      "tags": ["tag1", "tag2"]
    }
  ]
}
```

### 3. OPML Blogroll (blogroll.opml)

**Standard**: OPML 2.0
**URL**: `/data/blogroll.opml`
**Use Case**: Import into feed readers as subscription list

**Features**:
- Hierarchical organization by tags
- Each link appears under all its tags
- Easy bulk subscription

**Import Instructions**:

**Feedly/Inoreader**:
1. Download `blogroll.opml`
2. Go to Settings → Import
3. Select file

**NetNewsWire/Reeder**:
1. File → Import Subscriptions
2. Select `blogroll.opml`

### 4. Sitemap (sitemap.xml)

**Standard**: XML Sitemap Protocol 0.9
**URL**: `/sitemap.xml`
**Use Case**: Search engine crawling

**Features**:
- Homepage (priority 1.0)
- All link pages
- Intelligent priority based on visit counts
- Last modified dates

## Generation

All feeds are auto-generated during build:

```bash
npm run build    # Generates all feeds + builds
```

Individual generation:
```bash
npm run feeds        # Generate all feeds
npm run rss          # RSS only
npm run json-feed    # JSON Feed only
npm run opml         # OPML only
npm run sitemap      # Sitemap only
```

### Build Hook

Configured in `package.json`:
```json
{
  "scripts": {
    "prebuild": "npm run sitemap && npm run feeds"
  }
}
```

Feeds regenerate automatically on every deployment.

## Validation

Validate your feeds:

```bash
npm run validate:feeds    # Validate all
```

Or use online validators:
- RSS: https://validator.w3.org/feed/
- JSON Feed: https://validator.jsonfeed.org/
- Sitemap: https://www.xml-sitemaps.com/validate-xml-sitemap.html

## Feed Discovery

Feeds are discoverable via HTML `<link>` tags in `index.html`:

```html
<link rel="alternate" type="application/rss+xml"
      title="RSS Feed" href="/feed.xml">
<link rel="alternate" type="application/feed+json"
      title="JSON Feed" href="/data/feed.json">
<link rel="sitemap" type="application/xml"
      href="/sitemap.xml">
```

Browsers and feed readers auto-detect these.

## Stats

Current feed content (as of last build):
- **90 links** across all feeds
- **183 unique tags** in OPML
- **91 URLs** in sitemap (1 homepage + 90 links)

## Customization

### Modify Feed Metadata

Edit the generator scripts in `/scripts`:

**RSS** (`scripts/generate-rss.js`):
```javascript
const feed = new Feed({
  title: "Mediaeater Digest",        // Change here
  description: "Latest links...",     // And here
  // ...
});
```

**JSON Feed** (`scripts/generate-json-feed.js`):
```javascript
const feed = {
  title: "Your Title",
  home_page_url: "https://your-domain.com",
  // ...
};
```

### Change Feed URLs

Update paths in generator scripts and `index.html`.

## Troubleshooting

**Feeds not updating?**
1. Run `npm run feeds` manually
2. Check `public/` directory for generated files
3. Rebuild and redeploy

**Missing links in feeds?**
- Check `data/links.json` has all links
- Verify no JSON syntax errors
- Run feed generation to see errors

**OPML import fails?**
- Validate XML: `xmllint --noout public/data/blogroll.opml`
- Check for special characters in titles/URLs
- Try importing fewer folders/tags first

## Integration Examples

### Fetch in JavaScript

```javascript
// Fetch JSON Feed
const response = await fetch('/data/feed.json');
const feed = await response.json();

feed.items.forEach(item => {
  console.log(item.title, item.url);
});
```

### Subscribe in Python

```python
import feedparser

# Parse RSS
feed = feedparser.parse('https://mediaeater.github.io/link-blog/feed.xml')

for entry in feed.entries:
    print(entry.title, entry.link)
```

## SEO Benefits

- **Sitemaps**: Help search engines discover all links
- **RSS/JSON**: Enable content syndication
- **OPML**: Builds link authority through aggregation
- **Faster indexing**: Search engines crawl feeds regularly

## Future Enhancements

- [ ] Filtered feeds (e.g., `/feed/tag/javascript.xml`)
- [ ] Pagination for large feeds
- [ ] Media RSS for link thumbnails
- [ ] Podcast feed format (if audio notes added)
