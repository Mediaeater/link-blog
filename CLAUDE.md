# CLAUDE.md - Claude Code Project State Documentation

## Project Overview
**Name**: Link Blog
**Version**: 1.2.0
**Type**: React + Vite Bookmark Management System
**Status**: Production-ready with active development
**Last Updated**: 2026-03-21

## Current Implementation State

### ✅ Completed Features

#### Core Application
- [x] **Main LinkBlog Component** (`src/components/LinkBlogClean.jsx`)
  - Full CRUD operations for links
  - Admin mode with password protection
  - Real-time search and filtering
  - Tag-based filtering with multi-select
  - Sorting options (date, alphabetical)
  - Keyboard navigation (J/K for up/down, Cmd+K for search)
  - Dark/Light theme toggle
  - Pinned links feature
  - Visit counter for links
  - Expanded/collapsed link details view

#### Data Management
- [x] **Dual Storage System**
  - localStorage for immediate access
  - JSON file persistence (`data/links.json`, `public/data/links.json`)
  - Automatic synchronization between storage methods
  - Cache-busted loading with timestamps

- [x] **Link Object Structure**
  ```javascript
  {
    id: timestamp-based,
    url: string,
    source: string (title),
    pullQuote: string (optional),
    tags: string[],
    isPinned: boolean,
    timestamp: ISO string,
    visits: number
  }
  ```

#### Import System
- [x] **BookmarkImporter Component** (`src/components/BookmarkImporter.jsx`)
  - HTML bookmark file parsing
  - Folder-to-tag conversion
  - Privacy-conscious whitelist approach
  - Private URL detection (localhost, internal networks)
  - Duplicate detection and merging
  - Folder selection preview
  - Batch import with preservation of existing data

#### Backend Services
- [x] **Express API Server** (`server.cjs`)
  - POST `/api/save-links` - Persists links to JSON files
  - CORS enabled for localhost:5174
  - Concurrent file writing to both data locations
  - Error handling and logging

#### UI Components
- [x] **Reusable Components** (`src/components/ui/`)
  - Card component with consistent styling
  - Button component with variants
  - Input component with enhanced focus management
  - All follow shadcn/ui patterns

#### Utilities
- [x] **Tag Suggestion System** (`src/utils/tagSuggestions.js`)
  - Domain-based suggestions
  - Title keyword extraction
  - Technology stack detection
  - Common category matching
  - URL pattern analysis

- [x] **Storage Utilities** (`src/utils/storage.js`)
  - Load/save operations
  - Version checking
  - Migration support

#### Scripts & Tools
- [x] **Development Scripts**
  - `dev-with-save.cjs` - Concurrent Vite + API server
  - `sync-from-browser.js` - Manual localStorage sync
  - `import-bookmarks.js` - Bookmark parsing utilities
  - `update-links.js` - Data update utilities
  - `generate-rss.js` - RSS feed generation
  - `generate-prerender.js` - Build-time `<noscript>` HTML injection for crawlers
  - `generate-itemlist.js` - Schema.org ItemList JSON-LD injection
  - `generate-digest-feed.js` - Digest RSS feed generation
  - `fetch-from-newsfeeds.cjs` - Pull links from newsfeeds.net
  - `merge-newsfeeds.cjs` - Merge remote and local links

#### Build & Deployment
- [x] **Vite Configuration**
  - Hot module replacement
  - Optimized production builds
  - Asset handling
  - Environment variable support

- [x] **GitHub Pages Deployment**
  - Automated build process
  - gh-pages integration
  - Static site generation

### 📁 File Structure

```
link-blog/
├── src/
│   ├── components/
│   │   ├── LinkBlogClean.jsx     ✅ Main application
│   │   ├── BookmarkImporter.jsx  ✅ Import functionality
│   │   ├── DigestPanel.jsx       ✅ Digest sidebar
│   │   ├── DigestView.jsx        ✅ Full digest view
│   │   ├── ErrorBoundary.jsx     ✅ Error boundary
│   │   ├── SEOHead.jsx           ✅ SEO meta tags
│   │   └── ui/                   ✅ Reusable components (button, card, input)
│   ├── utils/
│   │   ├── storage.js            ✅ Storage operations
│   │   └── tagSuggestions.js     ✅ Tag generation
│   ├── lib/
│   │   └── utils.js              ✅ Utility functions
│   ├── App.jsx                   ✅ App wrapper
│   ├── main.jsx                  ✅ Entry point
│   └── index.css                 ✅ Global styles
├── scripts/                      ✅ ~40 automation scripts
│   ├── settle.js                 ✅ Settlement (pull + sync + rebuild)
│   ├── dev-with-save.cjs         ✅ Dev server wrapper
│   ├── generate-rss.js           ✅ RSS feed generation
│   ├── generate-json-feed.js     ✅ JSON Feed generation
│   ├── generate-opml.js          ✅ OPML blogroll generation
│   ├── generate-digest-feed.js   ✅ Digest RSS feed
│   ├── generate-digest.cjs       ✅ Weekly digest generation
│   ├── generate-prerender.js     ✅ <noscript> HTML for crawlers
│   ├── generate-itemlist.js      ✅ Schema.org ItemList JSON-LD
│   ├── generate-sitemap.js       ✅ XML sitemap
│   ├── fetch-from-newsfeeds.cjs  ✅ Pull links from newsfeeds.net
│   ├── merge-newsfeeds.cjs       ✅ Merge remote and local links
│   ├── sync-from-browser.cjs     ✅ Manual localStorage sync
│   └── setup.js                  ✅ Initial project setup
├── routes/
│   └── activitypub.cjs           ✅ ActivityPub endpoints
├── services/
│   ├── activitypub.cjs           ✅ ActivityPub protocol
│   ├── crypto.cjs                ✅ Crypto signing
│   └── delivery.cjs              ✅ AP message delivery
├── utils/
│   ├── digest-manager.cjs        ✅ Digest utilities
│   └── rss-generator.cjs         ✅ RSS helpers
├── public/
│   ├── data/
│   │   ├── links.json            ✅ Public data store
│   │   ├── feed.json             ✅ JSON Feed (generated)
│   │   ├── digests.json          ✅ Digest metadata (generated)
│   │   └── blogroll.opml         ✅ OPML blogroll (generated)
│   ├── feed.xml                  ✅ RSS feed (generated)
│   ├── feed-digests.xml          ✅ Digest RSS feed (generated)
│   ├── sitemap.xml               ✅ XML sitemap (generated)
│   ├── robots.txt                ✅ Bot crawling rules
│   ├── _headers                  ✅ CDN cache headers
│   └── CNAME                     ✅ GitHub Pages domain
├── data/
│   ├── links.json                ✅ Primary data store (353 links)
│   ├── digests.json              ✅ Digest metadata
│   ├── digests/                  ✅ Weekly digest HTML files
│   └── archive/                  ✅ Archived links by year
├── tests/                        ✅ Vitest test suite
├── docs/                         ✅ Project documentation
├── server.cjs                    ✅ Express API
├── PICKUP.md                     ✅ Session handoff notes
├── package.json                  ✅ Dependencies & scripts
├── vite.config.js                ✅ Vite config
├── tailwind.config.js            ✅ Tailwind config
├── eslint.config.js              ✅ Linting rules
├── README.md                     ✅ Full documentation
└── CLAUDE.md                     ✅ This file
```

### 🚫 Known Limitations & Warnings

1. **Do NOT recreate existing components** - All core functionality is implemented
2. **Do NOT regenerate the README** - Comprehensive documentation exists
3. **Password is environment-based** - Check `.env` for `VITE_ADMIN_PASSWORD`
4. **API must be running for saves** - Use `npm run dev:save` for development
5. **JSON files are the source of truth** - localStorage is secondary

### 🔧 Common Tasks & Solutions

#### Adding New Features
1. Check if feature already exists in `LinkBlogClean.jsx`
2. Look for existing utilities in `src/utils/`
3. Follow existing component patterns in `src/components/ui/`

#### Debugging Save Issues
1. Verify API server is running (port 3001)
2. Check browser console for CORS errors
3. Confirm JSON file write permissions
4. Check localStorage for `linkBlogData` key

#### Modifying UI
1. Use existing Tailwind classes
2. Follow component structure in `src/components/ui/`
3. Dark mode variables are defined in CSS

#### Data Operations
1. Always use the storage utilities in `src/utils/storage.js`
2. Maintain backward compatibility with existing data structure
3. Test with both empty and populated datasets

### 📋 Environment Setup Checklist

- [ ] Node.js 16+ installed
- [ ] npm dependencies installed (`npm install`)
- [ ] `.env` file created with `VITE_ADMIN_PASSWORD`
- [ ] Port 3001 available for API server
- [ ] Port 5174 available for Vite dev server

### 🎯 Quick Commands

```bash
# Pick up work (git pull + sync + rebuild + dev servers)
npm start

# Just settle (git pull + sync + rebuild, no servers)
npm run settle

# Full development environment
npm run dev:save

# Frontend only
npm run dev

# API server only
npm run api

# Build for production
npm run build

# Deploy to GitHub Pages
npm run deploy

# Sync browser data
npm run sync

# Pull links from newsfeeds.net (full workflow)
npm run pull:newsfeeds

# Individual steps for newsfeeds.net sync
npm run fetch:newsfeeds   # Fetch from remote
npm run merge:newsfeeds   # Merge with local
npm run sitemap           # Regenerate sitemap
npm run feeds             # Regenerate feeds (RSS, JSON, OPML, Digest)
npm run prerender         # Inject <noscript> HTML for crawlers
npm run itemlist          # Inject Schema.org ItemList JSON-LD
npm run digest-feed       # Generate Digest RSS feed
```

### ⚠️ Critical Notes for Claude Code

1. **NEVER recreate files that already exist** - Always check first with Read or Glob
2. **The application is FULLY FUNCTIONAL** - Don't rebuild from scratch
3. **Admin mode**: Access with `?admin=YourPassword` in URL
4. **Data is stored in TWO places**: Always update both JSON locations
5. **Import system is privacy-focused**: Whitelist approach is intentional
6. **All UI components exist**: Check `src/components/ui/` before creating new ones
7. **Tag suggestions are intelligent**: Algorithm in `tagSuggestions.js`
8. **Keyboard shortcuts work**: J/K navigation, Cmd+K search, etc.

### 📊 Current Data Statistics

- **353 links** in `data/links.json` (primary) and `public/data/links.json` (public copy)
- **7 weekly digests** in `data/digests/`
- localStorage key: `linkBlogData`
- Production site: https://newsfeeds.net
- Default admin password fallback: `YourNewPassword`

### 🚀 Next Potential Improvements

These are suggestions only - do not implement unless specifically requested:
- TypeScript migration for type safety
- Unit tests with Vitest
- Performance monitoring
- Browser extension for quick-add
- Full-text search of linked content
- Analytics dashboard
- API authentication for external access

### 🛠️ Maintenance Notes

- Regular dependency updates recommended
- Monitor for React 19 compatibility
- Keep Vite and build tools current
- Backup `data/links.json` regularly
- Test import functionality with various bookmark formats

---

**Important**: This document represents the CURRENT STATE of the application. All listed features are ALREADY IMPLEMENTED and working. Do not recreate existing functionality. Use this as a reference to understand what exists and where to find it.

Last verified: 2026-03-21