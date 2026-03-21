# Link Blog

> A sophisticated bookmark management system with intelligent tagging, RSS/JSON feeds, and ActivityPub integration.

## Quick Start

Get up and running in under 5 minutes:

```bash
git clone https://github.com/Mediaeater/link-blog.git
cd link-blog
npm run setup      # Automated setup
npm run dev:save   # Start development
```

Open **http://localhost:5174** and add `?admin=YourPassword` for admin access.

**Admin password** is auto-generated in `.env` during setup.

---

## Features

- 📚 **Link Management** - Full CRUD with intelligent tag suggestions
- 🔍 **Search & Filter** - Real-time search, tag filtering with URL parameters
- 📡 **Syndication** - RSS, JSON Feed, OPML, Digest Feed, XML Sitemap
- 🌐 **ActivityPub** - Fediverse integration (Mastodon-compatible)
- 🎨 **Clean UI** - Trust blue branding, human-curated tagline
- ⚡ **Fast** - Vite-powered dev experience, optimized production builds
- 🔐 **Privacy-First** - Whitelist bookmark import, no tracking
- ⌨️ **Keyboard Navigation** - Full keyboard shortcuts (J/K, Cmd+K)

## Documentation

- **[Quick Start Guide](docs/setup/quickstart.md)** - 5-minute setup
- **[Full Documentation](docs/README.md)** - Complete guide
- **[Project State](CLAUDE.md)** - Current implementation status

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Core Components](#core-components)
3. [Features & Functionality](#features--functionality)
4. [Data Management](#data-management)
5. [API & Backend Services](#api--backend-services)
6. [Setup & Installation](#setup--installation)
7. [Development Workflow](#development-workflow)
8. [Deployment](#deployment)
9. [Configuration](#configuration)
10. [Security & Privacy](#security--privacy)
11. [Code Organization](#code-organization)
12. [Advanced Features](#advanced-features)

## System Architecture

### Overview

The Link Blog is a client-server application with a React frontend and an Express API backend for data persistence. The system employs a dual-storage strategy using both localStorage for immediate access and JSON files for persistence and portability.

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│                    React + Tailwind CSS                      │
├─────────────────────────────────────────────────────────────┤
│                     State Management                         │
│                  React Hooks + Local State                   │
├─────────────────────────────────────────────────────────────┤
│                      Data Layer                              │
│         localStorage ←→ JSON Files ←→ Express API            │
├─────────────────────────────────────────────────────────────┤
│                    External Services                         │
│              Microlink API (Metadata Fetching)               │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

- **Frontend Framework**: React 18.2 with Hooks
- **Build Tool**: Vite 6.x for optimal development experience
- **Styling**: Tailwind CSS 3.x with custom UI components
- **Icons**: Lucide React for comprehensive icon library
- **Backend**: Express 5.x for API services
- **Data Format**: JSON for universal compatibility
- **Package Manager**: npm with lockfile for dependency consistency

### Design Principles

1. **Privacy-First**: Whitelist approach for bookmark import, protecting private URLs
2. **Performance**: Memoized computations, debounced search, optimized rendering
3. **Accessibility**: Full keyboard navigation, ARIA labels, semantic HTML
4. **Resilience**: Graceful degradation, fallback systems, error boundaries
5. **Developer Experience**: Hot module replacement, clear code structure, comprehensive documentation

## Core Components

### LinkBlogClean.jsx (Main Component)

The central component managing the entire application state and UI. Key responsibilities:

```javascript
// State Management Structure
{
  links: [],           // Array of link objects
  newLink: {},         // Current link being added/edited
  isAdmin: false,      // Admin mode flag
  searchTerm: '',      // Global search filter
  selectedTags: [],    // Active tag filters
  sortBy: 'date-desc', // Sorting preference
  expandedLinks: Set() // Expanded link details
}
```

**Key Features:**
- Dual-mode operation (public viewing / admin editing)
- Real-time search and filtering
- Intelligent tag suggestions
- Automatic metadata fetching
- Keyboard navigation support
- Dark/light theme switching

### BookmarkImporter.jsx

A sophisticated import system with privacy-conscious filtering:

```javascript
// Import Flow
1. Parse HTML bookmark file
2. Extract folder hierarchy
3. Convert folders to tags
4. Filter private URLs
5. Detect duplicates
6. Preview before import
7. Merge with existing data
```

**Privacy Features:**
- Whitelist approach for folder selection
- Private URL pattern detection (localhost, internal networks)
- Duplicate detection and merging
- Preservation of existing data

### UI Components

Reusable components following shadcn/ui patterns:

- **Card**: Container component with consistent styling
- **Button**: Accessible button with multiple variants
- **Input**: Enhanced input with proper focus management

## Features & Functionality

### 1. Quick Link Addition

**Single URL Addition:**
```javascript
// Automatic metadata extraction
const metadata = await fetchUrlMetadata(url);
// Returns: { title, description, image, favicon }
```

**Bulk URL Import:**
- Paste multiple URLs (one per line)
- Parallel metadata fetching
- Batch processing with preview
- Auto-tag generation

### 2. Intelligent Tagging System

**Tag Suggestion Algorithm:**
```javascript
// Tag sources in priority order:
1. URL domain analysis
2. Title keyword extraction
3. Content-type detection
4. Technology stack identification
5. Common category matching
```

**Tag Features:**
- Click-to-filter functionality
- Tag frequency visualization
- Multi-tag filtering (AND operation)
- Tag autocomplete
- Related links discovery

### 3. Search & Filtering

**Search Implementation:**
```javascript
// Search across multiple fields
const searchFields = ['url', 'source', 'pullQuote', 'tags'];
// Debounced for performance
const debouncedSearch = useMemo(() => 
  debounce(searchFunction, 300), []);
```

**Sorting Options:**
- Date (newest/oldest)
- Alphabetical by title
- Tag relevance (most tagged first)
- Popularity (visit count)

### 4. Keyboard Navigation

| Shortcut | Action | Context |
|----------|--------|---------|
| `Cmd/Ctrl+V` | Focus quick paste | Admin only |
| `Cmd/Ctrl+K` | Focus search | Global |
| `J` | Navigate down | Link list |
| `K` | Navigate up | Link list |
| `Enter` | Open link | When focused |
| `Escape` | Clear filters | When filtering |

### 5. Data Persistence

**Storage Strategy:**
```javascript
// Priority order for data loading:
1. Check JSON file (with cache busting)
2. Compare with localStorage timestamp
3. Use newer data source
4. Update both storage locations
```

## Data Management

### Link Object Structure

```javascript
{
  id: 1234567890,                    // Unique timestamp-based ID
  url: "https://example.com",        // Required: Link URL
  source: "Example Title",           // Required: Display title
  pullQuote: "Optional quote",       // Optional: Highlighted text
  tags: ["tag1", "tag2"],           // Required: Tag array
  isPinned: false,                   // Optional: Pin to top
  timestamp: "2025-09-08T10:00:00Z", // Auto-generated
  visits: 0                          // Optional: Click counter
}
```

### Storage Locations

1. **JSON Files**: Source of truth for persistence
   - Primary: `/data/links.json`
   - Public copy: `/public/data/links.json`
   - Synchronized on save

2. **localStorage**: Secondary storage for immediate access
   - Key: `linkBlogData`
   - Format: JSON string
### Data Synchronization

The system maintains consistency between storage locations:

```javascript
// Save flow
1. Update in-memory state
2. Save to localStorage
3. POST to API endpoint
4. API writes to both JSON locations
5. Confirm success
```

## API & Backend Services

### Express Server (server.cjs)

**Endpoints:**

| Method | Path | Description | Request Body | Response |
|--------|------|-------------|--------------|----------|
| POST | `/api/save-links` | Save links to JSON | `{ links: [], lastUpdated }` | `{ success, message, count }` |
| GET | `/api/links` | Retrieve current links | None | Full data object |

**CORS Configuration:**
```javascript
cors({
  origin: 'http://localhost:5174',
  methods: ['GET', 'POST'],
  credentials: true
})
```

### External Services

**Microlink API** (Metadata fetching):
- Endpoint: `https://api.microlink.io/`
- Purpose: Extract title, description, images from URLs
- Fallback: Domain extraction on failure

## Setup & Installation

### Prerequisites

- Node.js 16+ and npm
- Git for version control
- Modern browser with localStorage support

### Installation Steps

```bash
# 1. Clone the repository
git clone https://github.com/Mediaeater/link-blog.git
cd link-blog

# 2. Install dependencies
npm install

# 3. Create environment file (optional for custom password)
echo "VITE_ADMIN_PASSWORD=YourSecurePassword" > .env

# 4. Start development servers
npm run dev:save  # Starts both Vite and API server
```

### Development Ports

- **Frontend**: http://localhost:5174
- **API Server**: http://localhost:3001

## Development Workflow

### Available Scripts

| Command | Description | Usage |
|---------|-------------|-------|
| `npm start` | Settle + start dev servers | Picking up work |
| `npm run settle` | Git pull + sync + rebuild | Reconcile after pull |
| `npm run dev:save` | Start Vite + API server | Daily development |
| `npm run dev` | Start Vite dev server only | Frontend only |
| `npm run api` | Start API server only | Backend testing |
| `npm run build` | Production build (auto-generates feeds) | Before deployment |
| `npm run deploy` | Build + deploy to GitHub Pages | Publish to production |
| `npm run pull:newsfeeds` | Fetch + merge from newsfeeds.net | Sync remote links |
| `npm run feeds` | Generate all feeds (RSS, JSON, OPML, Digest) | After link changes |
| `npm run sitemap` | Generate sitemap.xml | After link changes |
| `npm run prerender` | Inject crawler HTML | Build-time SEO |
| `npm run lint` | Run ESLint | Before committing |
| `npm run test` | Run Vitest | Verify functionality |

See [docs/NPM-COMMANDS.md](docs/NPM-COMMANDS.md) for the full command reference.

### Development with Auto-Save

The `dev:save` script runs both servers concurrently:

```javascript
// scripts/dev-with-save.cjs
1. Starts API server on port 3001
2. Waits 1 second for initialization
3. Starts Vite dev server on port 5174
4. Handles graceful shutdown on Ctrl+C
```

### Manual Data Synchronization

When needed, sync localStorage to JSON files:

```bash
# Run the sync script
npm run sync

# In browser console at http://localhost:5174
copy(localStorage.getItem('linkBlogData'))

# Paste when prompted by the script
```

## Deployment

### GitHub Pages Deployment

```bash
# Build and deploy
npm run build
npm run deploy

# Or use the combined command
npm run predeploy && npm run deploy
```

### Environment Variables

**Local Development (.env file):**
```env
VITE_ADMIN_PASSWORD=YourSecurePassword
```

**Production (Hosting Provider):**
- Vercel: Project Settings → Environment Variables
- Netlify: Site Settings → Environment Variables
- Add key: `VITE_ADMIN_PASSWORD`

### Build Configuration

**Vite Production Build:**
```javascript
{
  outDir: 'dist',
  sourcemap: true,
  rollupOptions: {
    output: {
      manualChunks: {
        vendor: ['react', 'react-dom']
      }
    }
  }
}
```

## Configuration

### Admin Authentication

**Password Priority:**
1. Environment variable (`VITE_ADMIN_PASSWORD`)
2. Fallback demo password (`YourNewPassword`)

**Access Admin Mode:**
```
http://your-domain.com/?admin=YourPassword
```

### Theme Configuration

**Tailwind Customization (tailwind.config.js):**
```javascript
// Modify colors, fonts, spacing
theme: {
  extend: {
    colors: {
      primary: 'your-color'
    }
  }
}
```

### Import Configuration

**Bookmark Import Settings:**
```javascript
// Suggested public folders
const SUGGESTED_PUBLIC_PATTERNS = [
  'development', 'programming', 'tech',
  'tools', 'reference', 'documentation'
];

// Private URL detection
const PRIVATE_URL_PATTERNS = [
  'localhost', '127.0.0.1', '192.168.',
  'internal.', '.local', 'file://'
];
```

## Security & Privacy

### Privacy Features

1. **Whitelist Import Approach**: Only selected folders are imported
2. **Private URL Detection**: Warns about potentially sensitive URLs
3. **No External Tracking**: All data stays local
4. **Environment-Based Passwords**: Sensitive data not in code

### Security Measures

1. **Input Sanitization**: All user inputs are sanitized
2. **CORS Protection**: Restricted to specific origins
3. **No Database**: Reduces attack surface
4. **Client-Side Validation**: Prevents malformed data

## Code Organization

### Directory Structure

```
link-blog/
├── src/
│   ├── components/
│   │   ├── LinkBlogClean.jsx    # Main application component
│   │   ├── BookmarkImporter.jsx # Import functionality
│   │   ├── DigestPanel.jsx      # Digest sidebar
│   │   ├── DigestView.jsx       # Full digest view
│   │   ├── ErrorBoundary.jsx    # Error boundary
│   │   ├── SEOHead.jsx          # SEO meta tags
│   │   └── ui/                  # Reusable UI components
│   ├── utils/
│   │   ├── storage.js           # Storage utilities
│   │   └── tagSuggestions.js    # Tag generation logic
│   ├── lib/
│   │   └── utils.js             # General utilities
│   ├── App.jsx                  # App wrapper
│   ├── main.jsx                 # Entry point
│   └── index.css                # Global styles
├── scripts/                     # ~40 automation scripts
│   ├── settle.js                # Pull + sync + rebuild
│   ├── generate-rss.js          # RSS feed generation
│   ├── generate-json-feed.js    # JSON Feed generation
│   ├── generate-opml.js         # OPML blogroll generation
│   ├── generate-digest-feed.js  # Digest RSS feed
│   ├── generate-prerender.js    # <noscript> HTML for crawlers
│   ├── generate-itemlist.js     # Schema.org ItemList JSON-LD
│   ├── generate-sitemap.js      # XML sitemap
│   ├── fetch-from-newsfeeds.cjs # Pull from newsfeeds.net
│   ├── merge-newsfeeds.cjs      # Merge remote + local
│   └── dev-with-save.cjs        # Dev server wrapper
├── routes/
│   └── activitypub.cjs          # ActivityPub endpoints
├── services/                    # ActivityPub services
├── utils/                       # Digest & RSS helpers
├── public/
│   ├── data/
│   │   ├── links.json           # Public data store
│   │   ├── feed.json            # JSON Feed (generated)
│   │   └── blogroll.opml        # OPML blogroll (generated)
│   ├── feed.xml                 # RSS feed (generated)
│   ├── feed-digests.xml         # Digest RSS (generated)
│   ├── sitemap.xml              # Sitemap (generated)
│   └── robots.txt               # Bot rules
├── data/
│   ├── links.json               # Primary data store (source of truth)
│   ├── digests.json             # Digest metadata
│   └── digests/                 # Weekly digest HTML files
├── tests/                       # Vitest test suite
├── docs/                        # Project documentation
├── server.cjs                   # Express API server
├── PICKUP.md                    # Session handoff notes
├── package.json                 # Dependencies and scripts
├── vite.config.js               # Vite configuration
├── tailwind.config.js           # Tailwind configuration
└── .env                         # Environment variables (git-ignored)
```

### Component Architecture

**Component Hierarchy:**
```
App
└── LinkBlogClean
    ├── Header (Search, Filters, Theme Toggle)
    ├── AdminPanel (Add/Edit Links)
    ├── BookmarkImporter (Import Modal)
    ├── LinkList
    │   └── LinkCard (Individual Link Display)
    └── TagCloud (Tag Visualization)
```

### State Management Pattern

**Local State with Hooks:**
```javascript
// Primary state in LinkBlogClean component
const [links, setLinks] = useState([]);

// Derived state with useMemo
const filteredLinks = useMemo(() => {
  // Complex filtering logic
}, [links, searchTerm, selectedTags]);

// Side effects with useEffect
useEffect(() => {
  loadLinks();
}, []);
```

## Advanced Features

### RSS Feed Generation

**Implementation (scripts/generate-rss.js):**
```javascript
// Generates RSS feed from links.json
const feed = new Feed({
  title: "Link Blog Feed",
  description: "Latest links and resources",
  link: "https://your-domain.com"
});

// Outputs to public/feed.xml
```

### OPML Export (Blogroll)

**Implementation (scripts/generate-opml.js):**
```javascript
// Generates OPML 2.0 blogroll from links.json
// Organizes links by tags as outline categories
// Outputs to public/data/blogroll.opml

// Usage:
npm run opml                    // Generate OPML only
npm run digest-feed             // Generate Digest RSS feed
npm run feeds                   // Generate RSS, JSON Feed, OPML, and Digest feed
npm run prerender               // Inject <noscript> HTML for crawlers
npm run itemlist                // Inject Schema.org ItemList JSON-LD
npm run build                   // Auto-generates all feeds + prerender + itemlist
```

**Features:**
- OPML 2.0 compliant format
- Links organized by tags as categories
- Multi-tagged links appear under each tag
- Includes full metadata (title, url, description, dates)
- 353 links across all categories
- Compatible with all major RSS readers and blogroll tools

**File:** `https://mediaeater.github.io/link-blog/data/blogroll.opml`

**Documentation:** See `scripts/README-OPML.md` for technical details.

### Bookmark Import System

**Multi-Stage Import Process:**

1. **File Upload**: HTML bookmark file validation
2. **Parsing**: Extract folder structure and links
3. **Privacy Filtering**: Identify private URLs
4. **Folder Selection**: Choose which folders to import
5. **Duplicate Detection**: Compare with existing links
6. **Preview**: Review before import
7. **Merge**: Combine with existing data

**Duplicate Detection Algorithm:**
```javascript
// Identifies duplicates by:
1. Exact URL match
2. Normalized URL (removing trailing slashes, www)
3. Similar titles (fuzzy matching)
```

### Performance Optimizations

1. **Memoization**: Complex computations cached with useMemo
2. **Debouncing**: Search input debounced to 300ms
3. **Lazy Loading**: Components loaded on demand
4. **Virtual Scrolling**: (Planned) For large link collections
5. **Code Splitting**: Vendor bundle separation

### Accessibility Features

1. **Keyboard Navigation**: Full keyboard control
2. **Screen Reader Support**: ARIA labels and roles
3. **Focus Management**: Logical tab order
4. **High Contrast**: Works with system preferences
5. **Responsive Design**: Mobile-first approach

## Troubleshooting

### Common Issues

**Links not saving:**
- Ensure API server is running (`npm run api`)
- Check browser console for errors
- Verify CORS settings if domains differ

**Password not working:**
- Check `.env` file exists and is properly formatted
- Restart development server after changes
- Verify exact spelling of password

**Import not working:**
- Ensure HTML file is from browser export
- Check console for parsing errors
- Verify bookmark file structure

**Data not persisting:**
- Check localStorage isn't disabled
- Verify JSON file write permissions
- Ensure API server has file access

## API Reference

### Frontend Methods

```javascript
// Load links from storage
loadLinks() → Promise<void>

// Save links to all storage locations  
saveLinks(links: Link[]) → Promise<void>

// Fetch URL metadata
fetchUrlMetadata(url: string) → Promise<Metadata>

// Process multiple URLs
processUrlsFromPaste(urls: string) → Promise<ProcessedLink[]>

// Generate tag suggestions
suggestTagsFromUrl(url: string, title: string, description: string) → string[]
```

### Import Functions

```javascript
// Parse HTML bookmark file
parseBookmarkHTML(html: string) → BookmarkStructure

// Preview bookmarks before import
previewBookmarks(html: string) → PreviewData

// Import filtered bookmarks
importFilteredBookmarks(html: string, selectedFolders: Set<string>) → ImportResult

// Analyze duplicates
analyzeDuplicates(newLinks: Link[], existingLinks: Link[]) → DuplicateAnalysis

// Merge duplicate links
mergeDuplicateLinks(duplicates: Duplicate[]) → Link[]
```

## Performance Metrics

### Current Performance

- **Initial Load**: < 500ms
- **Search Response**: < 50ms (debounced)
- **Link Addition**: < 1s including metadata
- **Build Size**: ~200KB gzipped
- **Lighthouse Score**: 95+ Performance

### Optimization Targets

- Virtual scrolling for 1000+ links
- Service worker for offline access
- WebAssembly for heavy computations
- Progressive Web App capabilities

## Future Roadmap

### Planned Features

1. **Browser Extension**: Quick-add from any webpage
2. **Categories/Collections**: Organize links into groups
3. **Collaboration**: Share collections with teams
4. **Analytics Dashboard**: Detailed usage statistics
5. **Full-Text Search**: Search within linked content
6. **Scheduled Publishing**: Queue links for future sharing
7. **Export Formats**: Markdown, CSV, Notion integration

### Technical Improvements

1. **TypeScript Migration**: Type safety and better IDE support
2. **Performance Monitoring**: Real-user metrics
3. **Error Tracking**: Sentry or similar integration

## Contributing

### Development Setup

```bash
# Fork and clone
git clone https://github.com/Mediaeater/link-blog.git

# Create feature branch
git checkout -b feature/your-feature

# Install dependencies
npm install

# Start development
npm run dev:save

# Run tests (when implemented)
npm test

# Submit pull request
```

### Code Style

- ES6+ JavaScript features
- React Hooks patterns
- Functional components
- Descriptive variable names
- JSDoc comments for complex functions

### Commit Convention

```
type(scope): description

feat: New feature
fix: Bug fix
docs: Documentation
style: Formatting
refactor: Code restructuring
test: Tests
chore: Maintenance
```

## License

MIT License - See LICENSE file for details

## Support

For issues, questions, or suggestions:
- GitHub Issues: [Create an issue](https://github.com/Mediaeater/link-blog/issues)
- Documentation: This README
- Community: Discussions tab on GitHub

---

Built with modern web technologies for a superior bookmark management experience.