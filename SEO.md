# SEO Implementation Guide

## Overview
This document outlines the SEO optimizations implemented for newsfeeds.net link blog.

**Last Updated:** 2025-11-14
**SEO Status:** Production-Ready

---

## Technical SEO

### Meta Tags

#### Core Meta Tags
- **Title Tag:** `mediaeater - dispute the text` (Fixed inconsistency from "newsfeeds.net")
- **Meta Description:** Descriptive 160-character summary emphasizing content focus
- **Meta Keywords:** Focused on media criticism, technology, AI, copyright, digital culture
- **Language:** English (`lang="en"` in HTML tag)
- **Charset:** UTF-8
- **Viewport:** Responsive meta viewport tag

#### Robots Meta
```html
<meta name="robots" content="index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1">
```
- Allows indexing and following links
- Maximizes snippet and image preview sizes
- No video preview restrictions

#### Theme Color
```html
<meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1a202c" media="(prefers-color-scheme: dark)">
```
- Responsive theme colors for light/dark modes
- Improves mobile browser chrome appearance

---

## Open Graph Protocol

### Complete OG Tags
- `og:site_name` - mediaeater
- `og:title` - mediaeater - dispute the text
- `og:description` - Expanded description for social sharing
- `og:image` - Full URL to logo (https://newsfeeds.net/mediaeater-logo.svg)
- `og:image:alt` - Descriptive alt text
- `og:url` - Canonical URL
- `og:type` - website
- `og:locale` - en_US

### Twitter Cards
- `twitter:card` - summary_large_image
- `twitter:title` - Consistent with OG title
- `twitter:description` - Consistent with OG description
- `twitter:image` - Full URL to logo
- `twitter:image:alt` - Descriptive alt text

**Result:** Rich social sharing previews on Facebook, Twitter, LinkedIn, Slack, Discord

---

## Structured Data (Schema.org)

### WebSite Schema
```json
{
  "@type": "WebSite",
  "name": "mediaeater",
  "alternateName": "newsfeeds.net",
  "description": "...",
  "url": "https://newsfeeds.net",
  "potentialAction": {
    "@type": "SearchAction",
    "target": "https://newsfeeds.net/?search={search_term_string}"
  },
  "publisher": { ... },
  "inLanguage": "en-US"
}
```

**Benefits:**
- Google Search Box integration
- Rich snippets in search results
- Brand recognition

### CollectionPage Schema
```json
{
  "@type": "CollectionPage",
  "name": "mediaeater link collection",
  "description": "...",
  "breadcrumb": { ... }
}
```

**Benefits:**
- Enhanced SERP appearance
- Better categorization
- Breadcrumb navigation in search

---

## Sitemap & Crawling

### sitemap.xml
**Location:** `/public/sitemap.xml`
**Generator:** `scripts/generate-sitemap.js`

#### Features
- Dynamic generation from links.json
- Priority calculation based on:
  - Visit count (0.5 to 0.9)
  - Recency boost (+0.1 for posts < 7 days old)
- Change frequency: Weekly (all entries)
- Proper XML escaping
- W3C datetime format
- Main page priority: 1.0
- Individual link entries with URL fragments

#### Stats (Current)
- Total URLs: 143
- File size: 24.15 KB
- Max capacity: 50,000 URLs

#### Regeneration
```bash
npm run sitemap
```

Run before each build (automatically via `prebuild` script).

---

## robots.txt

**Location:** `/public/robots.txt`

### Allow List
- Main content (`/`)
- RSS feeds (`/feed.xml`, `/feed.atom`)
- JSON feed (`/data/feed.json`)
- OPML blogroll (`/data/blogroll.opml`)

### Disallow List
- Admin routes (`/admin`)
- Raw data files (`/data/links.json`)
- Build artifacts (`/dist/`)
- Development files (`/node_modules/`, `/scripts/`, `/venv/`)
- Backup files (`/*.backup-*`)

### Search Engine Specific Rules
- **Googlebot:** No crawl delay, full access
- **Bingbot:** 1-second crawl delay
- **Yahoo Slurp:** 1-second crawl delay
- **Default:** 1-second crawl delay

### AI Scraper Blocking
Blocked user-agents (to protect curated content):
- CCBot (Common Crawl)
- GPTBot (OpenAI)
- ChatGPT-User
- Google-Extended
- anthropic-ai
- Claude-Web
- cohere-ai
- Omgilibot
- FacebookBot

**Rationale:** Content is human-curated and should not be used for training AI models without permission.

---

## Canonical URLs

**Primary Canonical:** `https://newsfeeds.net/`

### Implementation
```html
<link rel="canonical" href="https://newsfeeds.net/">
```

**Benefits:**
- Prevents duplicate content issues
- Consolidates ranking signals
- HTTPS enforcement (via JS redirect)

---

## Feed Discovery

### Available Feeds
1. **RSS 2.0** - `/feed.xml`
2. **Atom** - `/feed.atom`
3. **JSON Feed** - `/data/feed.json`
4. **OPML Blogroll** - `/data/blogroll.opml`

### Link Tags
```html
<link rel="alternate" type="application/rss+xml" title="mediaeater RSS Feed" href="/feed.xml">
<link rel="alternate" type="application/feed+json" title="mediaeater JSON Feed" href="/data/feed.json">
<link rel="alternate" type="application/atom+xml" title="mediaeater Atom Feed" href="/feed.atom">
```

**Benefits:**
- RSS reader auto-discovery
- Feed aggregator compatibility
- Enhanced content distribution

---

## Performance Optimizations

### Resource Hints
```html
<link rel="preconnect" href="https://newsfeeds.net">
<link rel="dns-prefetch" href="https://newsfeeds.net">
```

**Benefits:**
- Faster DNS resolution
- Reduced connection latency
- Improved Core Web Vitals

### Theme Flash Prevention
Early-loading script detects user theme preference:
```javascript
const theme = localStorage.getItem('theme') ||
              (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
```

**Benefits:**
- No layout shift
- Better CLS score
- Improved user experience

### Build Optimizations (via Vite)
- Code splitting (vendor chunks)
- Tree shaking
- Minification
- Asset optimization
- Source maps for debugging

---

## Additional Files

### humans.txt
**Location:** `/public/humans.txt`

Provides transparency about:
- Team information
- Technology stack
- Site values
- Last update date

**Benefits:**
- Developer community engagement
- Technical transparency
- Brand values communication

### security.txt
**Location:** `/public/.well-known/security.txt`

Standard security contact information:
- Contact email
- Expiration date
- Preferred languages
- Canonical URL

**Benefits:**
- Responsible disclosure channel
- RFC 9116 compliance
- Professional security posture

---

## Checklist for Future Updates

### Before Each Deployment
- [ ] Run `npm run sitemap` to regenerate sitemap
- [ ] Run `npm run feeds` to update RSS/Atom/JSON feeds
- [ ] Verify canonical URLs are correct
- [ ] Check meta descriptions are current
- [ ] Test Open Graph tags with validators

### Quarterly Reviews
- [ ] Update security.txt expiration
- [ ] Review robots.txt blocked bots (new AI scrapers)
- [ ] Audit structured data with Google Rich Results Test
- [ ] Check Core Web Vitals in Search Console
- [ ] Review search rankings for target keywords

### Monitoring
- [ ] Google Search Console enrollment
- [ ] Bing Webmaster Tools enrollment
- [ ] Monitor sitemap submission status
- [ ] Track crawl errors
- [ ] Monitor search performance metrics

---

## SEO Tools & Validators

### Validation Tools
1. **Schema Validator:** https://validator.schema.org/
2. **Rich Results Test:** https://search.google.com/test/rich-results
3. **Open Graph Debugger:** https://developers.facebook.com/tools/debug/
4. **Twitter Card Validator:** https://cards-dev.twitter.com/validator
5. **Structured Data Testing:** https://search.google.com/structured-data/testing-tool

### Testing Checklist
```bash
# Validate robots.txt
curl https://newsfeeds.net/robots.txt

# Check sitemap
curl https://newsfeeds.net/sitemap.xml

# Verify humans.txt
curl https://newsfeeds.net/humans.txt

# Test security.txt
curl https://newsfeeds.net/.well-known/security.txt

# Check feeds
curl https://newsfeeds.net/feed.xml
curl https://newsfeeds.net/data/feed.json
```

---

## Keywords Strategy

### Primary Keywords
- media criticism
- technology commentary
- link curation
- digital culture
- AI ethics

### Secondary Keywords
- copyright issues
- internet culture
- independent media
- critical thinking
- media literacy

### Long-Tail Keywords
- "curated media commentary"
- "technology link blog"
- "AI copyright discussion"
- "independent media curation"

---

## Content Strategy Recommendations

### For Better SEO
1. **Consistent posting** - Search engines favor regularly updated sites
2. **Rich pull quotes** - Add context to each link
3. **Comprehensive tagging** - Improves topical authority
4. **Internal linking** - Use tags to create topic clusters
5. **Unique commentary** - Original thoughts improve ranking

### Content Quality Signals
- Pull quotes provide original value
- Tags create semantic relationships
- Visit tracking shows engagement
- Pinned links highlight important content

---

## Technical Notes

### SPA Considerations
This is a Single Page Application, which presents unique SEO challenges:

**Solutions Implemented:**
1. **URL fragments in sitemap** - Each link gets a unique `#link-N` identifier
2. **Proper meta tags in index.html** - Static meta tags work for homepage
3. **Pre-rendering** - Consider static site generation for better crawling
4. **Structured data** - Helps search engines understand dynamic content

**Future Enhancement:**
Consider implementing:
- Server-side rendering (SSR) or static site generation (SSG)
- Dynamic meta tag updates via SEOHead component
- Prerendering service for crawlers

---

## Performance Metrics

### Target Core Web Vitals
- **LCP (Largest Contentful Paint):** < 2.5s
- **FID (First Input Delay):** < 100ms
- **CLS (Cumulative Layout Shift):** < 0.1

### Current Optimizations
- Vite for fast builds and HMR
- Code splitting (vendor chunk separation)
- Asset optimization (4KB inline limit)
- Lazy loading (potential future improvement)
- Theme flash prevention

---

## Maintenance Commands

```bash
# Regenerate all SEO-related files
npm run sitemap          # Generate sitemap.xml
npm run feeds            # Generate RSS, Atom, JSON feeds
npm run prebuild         # Run all pre-build tasks

# Full build with SEO files
npm run build            # Includes prebuild hook

# Deploy (includes build)
npm run deploy           # Build + deploy to GitHub Pages
```

---

## Resources

### Documentation
- [Google SEO Starter Guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide)
- [Schema.org Documentation](https://schema.org/)
- [Open Graph Protocol](https://ogp.me/)
- [Twitter Card Documentation](https://developer.twitter.com/en/docs/twitter-for-websites/cards/overview/abouts-cards)
- [robots.txt Specification](https://www.robotstxt.org/)

### Tools
- [Google Search Console](https://search.google.com/search-console)
- [Bing Webmaster Tools](https://www.bing.com/webmasters)
- [Lighthouse CI](https://github.com/GoogleChrome/lighthouse-ci)
- [PageSpeed Insights](https://pagespeed.web.dev/)

---

## Summary

✅ **Implemented:**
- Comprehensive meta tags
- Rich Open Graph tags
- Schema.org structured data
- Dynamic sitemap generation
- Optimized robots.txt with AI bot blocking
- Performance optimizations
- Feed discovery
- Security and transparency files

✅ **Ready for:**
- Search engine submission
- Social media sharing
- RSS aggregation
- Developer community engagement

📈 **Expected Benefits:**
- Improved search rankings
- Better social sharing previews
- Faster page loads
- Professional web presence
- Protection from unauthorized AI scraping

---

*Last updated: 2025-11-14 by Claude Code*
