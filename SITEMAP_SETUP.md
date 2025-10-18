# Sitemap XML & SEO Setup Guide

## Overview

This guide documents the implementation of SEO-optimized sitemap generation for the Link Blog. The system includes XML sitemap generation, robots.txt configuration, and structured data markup.

## Implementation Details

### 1. Sitemap Generator Script

**File**: `/scripts/generate-sitemap.js`

The sitemap generator creates a standards-compliant XML sitemap following the [XML Sitemap Protocol](https://www.sitemaps.org/protocol.html).

#### Features

- Generates sitemap from `data/links.json`
- Follows W3C datetime format (ISO 8601)
- Intelligent priority calculation based on visit counts
- Proper XML escaping and sanitization
- Automatic directory creation
- Detailed console output with statistics

#### Priority Calculation

Priority scores are determined by visit frequency:

```
Visits 0:      0.5 (default)
Visits 1-4:    0.6
Visits 5-9:    0.7
Visits 10-24:  0.8
Visits 25+:    0.9
Home page:     1.0
```

#### Change Frequency

All entries use `weekly` change frequency as default, indicating moderate content update patterns.

#### Execution

```bash
# Manual execution
npm run sitemap

# Automatic execution before build
npm run build  # Runs sitemap generation automatically

# Automatic execution before deployment
npm run deploy  # Includes build step
```

### 2. XML Sitemap File

**Output Location**: `/public/sitemap.xml`

The generated sitemap includes:

- Main homepage with daily change frequency and highest priority (1.0)
- All links from data store with calculated priorities
- W3C-compliant datetime stamps
- Proper XML namespace declaration
- Maximum 50,000 URLs per file (per protocol)

#### Sample Entry

```xml
<url>
  <loc>https://mediaeater.com</loc>
  <lastmod>2025-10-18T14:54:00Z</lastmod>
  <changefreq>daily</changefreq>
  <priority>1.0</priority>
</url>
```

### 3. Robots.txt Configuration

**File**: `/public/robots.txt`

Optimized robots.txt that:

- Allows full crawling for search engines
- Disallows admin panel access
- Disallows data files and scripts
- References the sitemap
- Sets crawl delays for performance
- Provides specific rules for Googlebot and Bingbot

#### Key Rules

```
Allow: /                    # Allow indexing of all public pages
Disallow: /admin           # Protect admin area
Disallow: /*.json$         # Protect data files
Disallow: /dist/           # Protect build artifacts
Disallow: /node_modules/   # Protect dependencies
Disallow: /scripts/        # Protect scripts
Sitemap: https://mediaeater.com/sitemap.xml
```

### 4. Enhanced HTML Meta Tags

**File**: `/index.html`

SEO improvements include:

#### Meta Tags Added

- `robots`: Comprehensive crawling directives
- `theme-color`: Brand color for browser UI
- `canonical`: Prevents duplicate content issues

#### Link Tags Added

- `rel="canonical"`: Self-referential canonical link
- `rel="sitemap"`: Direct sitemap link
- `rel="alternate"`: RSS feed reference

#### Open Graph Tags

- Complete OG protocol implementation
- Twitter Card support for social sharing
- Proper image and URL metadata

#### JSON-LD Structured Data

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "mediaeater",
  "description": "mediaeater - dispute the text",
  "url": "https://mediaeater.com",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://mediaeater.com/?search={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

### 5. Vite Configuration Updates

**File**: `/vite.config.js`

Enhanced configuration includes:

- `publicDir: 'public'`: Ensures public files are served
- `fs.strict: false`: Allows serving static files
- `copyPublicDir: true`: Copies public files to build output

### 6. Package.json Script Updates

**File**: `/package.json`

New scripts added:

```json
"sitemap": "node scripts/generate-sitemap.js",
"prebuild": "npm run sitemap",
```

#### Execution Flow

```
npm run build
  ↓
npm run sitemap (automatic via prebuild hook)
  ↓
vite build
  ↓
public/sitemap.xml copied to dist/
```

### 7. SEO Head Component

**File**: `/src/components/SEOHead.jsx`

React component that dynamically adds SEO elements:

- Canonical link injection
- Sitemap reference
- Robots meta directive
- Runs once on component mount

#### Usage in App

```jsx
import { SEOHead } from './components/SEOHead';

export default function App() {
  return (
    <>
      <SEOHead />
      {/* Rest of app */}
    </>
  );
}
```

## Environment Variables

### SITE_URL

Set the base URL for sitemap generation:

```bash
export SITE_URL=https://mediaeater.com
npm run sitemap
```

Default: `https://mediaeater.com`

## Search Engine Integration

### Google Search Console

1. Add property: `https://mediaeater.com`
2. Navigate to Sitemaps section
3. Submit sitemap: `https://mediaeater.com/sitemap.xml`
4. Monitor indexation status

### Bing Webmaster Tools

1. Add site: `https://mediaeater.com`
2. Go to Sitemaps section
3. Submit sitemap URL
4. Monitor crawl performance

### Google Analytics

1. Link Search Console data
2. Monitor clicks and impressions
3. Track search query performance

## Testing & Validation

### Validate Sitemap XML

Use online validators:

- [Google Sitemap Generator](https://www.xml-sitemaps.com/validate-xml-sitemap.html)
- [Screaming Frog XML Sitemap Validator](https://www.screamingfrog.co.uk/sitemaps/)

### Check robots.txt

```bash
# Verify robots.txt is accessible
curl -I https://mediaeater.com/robots.txt

# Download and inspect
curl https://mediaeater.com/robots.txt
```

### Check Meta Tags

Use browser DevTools or:

```bash
# View HTML source
curl https://mediaeater.com | grep -A 20 "<head>"
```

### Verify Structured Data

- [Google Rich Results Test](https://search.google.com/test/rich-results)
- [Schema.org Validator](https://validator.schema.org/)

## Performance Monitoring

### Sitemap Statistics

After generation, console displays:

```
✓ Sitemap generated successfully
  Location: /Users/imac/Projects/link-blog/public/sitemap.xml
  Base URL: https://mediaeater.com
  Total URLs: 150
  File size: 45.23 KB
  Timestamp: 2025-10-18T14:54:00Z
```

### Monitoring Best Practices

1. **Monitor file size**: Keep under 10 MB per file
2. **Check update frequency**: Regenerate on every build
3. **Validate URLs**: Ensure all links are accessible
4. **Track indexation**: Monitor in Search Console

## Troubleshooting

### Sitemap Not Generated

1. Verify `data/links.json` exists
2. Check file permissions in `public/` directory
3. Ensure Node.js has write access
4. Check for JSON parsing errors

```bash
# Verify data file
node -e "console.log(JSON.parse(require('fs').readFileSync('data/links.json', 'utf8')))"
```

### Sitemap Not Served

1. Verify `public/sitemap.xml` exists
2. Check that build copies public files
3. Verify web server serves static files
4. Check CORS headers if accessing from external domain

### Invalid XML

1. Check for special characters in URLs
2. Verify timestamps are valid ISO 8601
3. Ensure all tags are properly closed
4. Use XML validator to check syntax

## Maintenance Tasks

### Weekly

- Monitor Search Console for crawl errors
- Check for broken links in generated data
- Verify sitemap file size growth

### Monthly

- Review search query performance
- Analyze indexation trends
- Update priority scores if needed

### Quarterly

- Audit SEO meta tags
- Review structured data schema
- Validate robots.txt rules

## SEO Best Practices Implemented

### On-Page SEO

- Unique meta descriptions
- Proper heading hierarchy
- Semantic HTML structure
- Mobile-friendly responsive design

### Technical SEO

- Valid XML sitemap
- Robots.txt configuration
- Canonical URL implementation
- Structured data markup (JSON-LD)

### Site Architecture

- Clear information hierarchy
- Logical URL structure
- Internal linking strategy
- Mobile optimization

### Performance

- Fast page load times
- Optimized images
- Minified CSS/JS
- Browser caching

## Additional Resources

### Documentation

- [XML Sitemap Protocol](https://www.sitemaps.org/)
- [Google Search Developers Guide](https://developers.google.com/search/docs)
- [Schema.org Documentation](https://schema.org/)
- [Web Vitals Guide](https://web.dev/vitals/)

### Tools

- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Screaming Frog SEO Spider](https://www.screamingfrog.co.uk/seo-spider/)
- [Lighthouse](https://developers.google.com/web/tools/lighthouse)

## File Summary

```
Link Blog SEO Implementation
├── scripts/generate-sitemap.js      - Main sitemap generator
├── public/sitemap.xml               - Generated XML sitemap
├── public/robots.txt                - Search engine crawler instructions
├── src/components/SEOHead.jsx       - React SEO component
├── index.html                       - Enhanced meta tags
├── vite.config.js                   - Updated build config
└── package.json                     - New npm scripts
```

## Deployment Checklist

- [x] Sitemap generator script created
- [x] robots.txt configured
- [x] HTML meta tags enhanced
- [x] JSON-LD structured data added
- [x] Vite config updated for static files
- [x] npm scripts configured
- [x] SEO Head component created
- [ ] Submit sitemap to Google Search Console
- [ ] Submit sitemap to Bing Webmaster Tools
- [ ] Monitor Search Console for indexation
- [ ] Validate with schema validator
- [ ] Test robots.txt rules

## Future Enhancements

1. **Dynamic Sitemap Index**: For 50,000+ URLs
2. **Video Sitemap**: If adding video content
3. **Image Sitemap**: For visual content optimization
4. **Mobile Sitemap**: Dedicated mobile URLs
5. **News Sitemap**: If publishing news-like content
6. **Automatic Submission**: Direct API submission to Google
7. **Analytics Integration**: Track SEO performance
8. **A/B Testing Framework**: Test title/description variations

---

**Last Updated**: 2025-10-18
**Version**: 1.0.0
**Maintainer**: Claude Code
