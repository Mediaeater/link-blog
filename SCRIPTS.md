# Scripts Documentation - Link Blog

## Overview
This document provides detailed documentation for all scripts in the Link Blog project. Each script serves a specific purpose in the development, maintenance, or operation of the application.

## NPM Scripts (package.json)

### Core Development Scripts

#### `npm run dev`
- **Purpose**: Starts the Vite development server only
- **Port**: 5174
- **Use Case**: Frontend-only development when API isn't needed
- **Command**: `vite`

#### `npm run dev:save`
- **Purpose**: Starts both Vite and Express API server concurrently
- **Port**: Vite on 5174, API on 3001
- **Use Case**: Full development with data persistence
- **Command**: `node scripts/dev-with-save.cjs`
- **Note**: This is the primary development command

#### `npm run api`
- **Purpose**: Starts the Express API server standalone
- **Port**: 3001
- **Use Case**: Testing API endpoints independently
- **Command**: `node server.cjs`

### Build & Deployment Scripts

#### `npm run build`
- **Purpose**: Creates production-optimized build
- **Output**: `dist/` directory
- **Command**: `vite build`
- **Includes**: Minification, tree-shaking, code splitting

#### `npm run preview`
- **Purpose**: Preview production build locally
- **Port**: 4173 (Vite preview default)
- **Command**: `vite preview`
- **Use Case**: Test production build before deployment

#### `npm run deploy`
- **Purpose**: Deploy to GitHub Pages
- **Prerequisites**: Run `npm run build` first
- **Command**: `gh-pages -d dist`
- **Target**: GitHub Pages branch

### Code Quality Scripts

#### `npm run lint`
- **Purpose**: Run ESLint on source files
- **Target**: `./src` directory
- **Command**: `eslint ./src`
- **Config**: `eslint.config.js`

#### `npm run format`
- **Purpose**: Format code with Prettier
- **Target**: All files
- **Command**: `prettier --write .`
- **Use Case**: Ensure consistent code formatting

#### `npm run test`
- **Purpose**: Run test suite
- **Framework**: Vitest
- **Command**: `vitest`
- **Note**: Test implementation pending

### Utility Scripts

#### `npm run serve`
- **Purpose**: Serve static build files
- **Command**: `serve -s dist`
- **Use Case**: Test static deployment locally

#### `npm run sync`
- **Purpose**: Sync localStorage data to JSON files
- **Command**: `node scripts/sync-from-browser.js`
- **Use Case**: Manual data synchronization

## Script Files (/scripts)

### dev-with-save.cjs
**Location**: `scripts/dev-with-save.cjs`
**Type**: CommonJS module
**Purpose**: Orchestrates concurrent development servers

**Functionality**:
1. Spawns Express API server on port 3001
2. Waits 1 second for API initialization
3. Spawns Vite dev server on port 5174
4. Handles graceful shutdown on SIGINT (Ctrl+C)
5. Ensures both processes terminate cleanly

**Usage**:
```bash
npm run dev:save
```

### sync-from-browser.js
**Location**: `scripts/sync-from-browser.js`
**Type**: ES Module
**Purpose**: Manual synchronization of browser localStorage to JSON files

**Functionality**:
1. Prompts user to copy localStorage data from browser
2. Reads pasted JSON data from stdin
3. Validates JSON structure
4. Writes to both `data/links.json` and `public/data/links.json`
5. Reports success/failure with item count

**Usage**:
```bash
npm run sync
# Then in browser console:
copy(localStorage.getItem('linkBlogData'))
# Paste when prompted
```

### import-bookmarks.js
**Location**: `scripts/import-bookmarks.js`
**Type**: ES Module
**Purpose**: Parse and process browser bookmark exports

**Functionality**:
1. Parses HTML bookmark files
2. Extracts folder structure
3. Converts folders to tags
4. Filters private URLs
5. Generates import preview
6. Returns structured data for import

**Key Features**:
- Privacy-conscious filtering
- Duplicate detection
- Folder hierarchy preservation
- Tag generation from folder names

### update-links.js
**Location**: `scripts/update-links.js`
**Type**: ES Module
**Purpose**: Batch update operations on link data

**Functionality**:
1. Load existing links from JSON
2. Apply batch transformations
3. Update metadata
4. Validate data structure
5. Save updated data

**Use Cases**:
- Bulk tag updates
- Data migration
- Format normalization
- Cleanup operations

### generate-rss.js
**Location**: `scripts/generate-rss.js`
**Type**: ES Module
**Purpose**: Generate RSS feed from link data

**Functionality**:
1. Read links from `data/links.json`
2. Sort by date (newest first)
3. Generate RSS XML with Feed library
4. Include title, description, URL for each item
5. Output to `public/feed.xml`

**RSS Feed Structure**:
```xml
<rss version="2.0">
  <channel>
    <title>Link Blog Feed</title>
    <description>Latest links and resources</description>
    <link>https://your-domain.com</link>
    <item>...</item>
  </channel>
</rss>
```

### fetch-and-save.js
**Location**: `scripts/fetch-and-save.js`
**Type**: ES Module
**Purpose**: Fetch metadata for URLs and save enhanced data

**Functionality**:
1. Process URLs to fetch metadata
2. Use Microlink API for extraction
3. Enhance link objects with metadata
4. Save updated data to storage
5. Handle batch processing

**Metadata Retrieved**:
- Page title
- Description
- Featured image
- Favicon
- Author information

### sync-links.js
**Location**: `scripts/sync-links.js`
**Type**: ES Module
**Purpose**: Synchronize links between different storage locations

**Functionality**:
1. Compare localStorage vs JSON file timestamps
2. Detect conflicts
3. Merge changes intelligently
4. Maintain data consistency
5. Report sync status

**Sync Strategy**:
- Last-write-wins for conflicts
- Preserve unique entries from both sources
- Maintain data integrity

### force-save.js
**Location**: `scripts/force-save.js`
**Type**: ES Module
**Purpose**: Force save current state to all storage locations

**Functionality**:
1. Override timestamp checks
2. Force write to all locations
3. Bypass normal sync logic
4. Used for recovery scenarios

**Warning**: Use with caution as it overwrites without checks

### manual-save.html
**Location**: `scripts/manual-save.html`
**Type**: HTML with embedded JavaScript
**Purpose**: Standalone HTML tool for manual data management

**Features**:
1. Load data from localStorage
2. Visual editor for links
3. Export to JSON
4. Import from file
5. Direct localStorage manipulation

**Access**: Open directly in browser as file://

## Server Scripts

### server.cjs
**Location**: Root directory
**Type**: CommonJS module
**Purpose**: Express API server for data persistence

**Endpoints**:

#### POST /api/save-links
- **Purpose**: Save links to JSON files
- **Body**: `{ links: [], lastUpdated: timestamp }`
- **Response**: `{ success: boolean, message: string, count: number }`
- **Side Effects**: Writes to both `data/links.json` and `public/data/links.json`

**Configuration**:
- Port: 3001
- CORS: Enabled for localhost:5174
- Body limit: 10MB
- Logging: Console output for requests

## Utility Scripts (utils/)

### rss-generator.cjs
**Location**: `utils/rss-generator.cjs`
**Type**: CommonJS module
**Purpose**: RSS feed generation utilities

**Exports**:
- `generateFeed(links)`: Create RSS feed from links array
- `formatDate(date)`: Format dates for RSS
- `escapeXml(text)`: XML-safe text encoding

## Script Execution Flow

### Development Workflow
```
npm run dev:save
    ├── scripts/dev-with-save.cjs
    │   ├── spawn: node server.cjs (port 3001)
    │   └── spawn: vite (port 5174)
    └── Concurrent execution with cleanup handling
```

### Data Sync Workflow
```
npm run sync
    └── scripts/sync-from-browser.js
        ├── Prompt for localStorage copy
        ├── Parse JSON input
        ├── Validate structure
        └── Write to both JSON locations
```

### Build & Deploy Workflow
```
npm run build
    └── vite build
        └── Output to dist/

npm run deploy
    └── gh-pages -d dist
        └── Push to gh-pages branch
```

## Environment Variables

Scripts respect the following environment variables:

- `VITE_ADMIN_PASSWORD`: Admin access password
- `NODE_ENV`: Development/production mode
- `PORT`: Override default ports (where applicable)

## Error Handling

All scripts include error handling for:
- File system operations
- Network requests
- JSON parsing
- Process management
- Data validation

## Best Practices

1. **Always use `npm run dev:save` for development** - Ensures data persistence
2. **Run `npm run lint` before commits** - Maintains code quality
3. **Test with `npm run preview` before deployment** - Verify production build
4. **Backup data before running update scripts** - Prevent data loss
5. **Use sync scripts for data recovery** - Restore from localStorage if needed

## Troubleshooting

### Common Issues

#### Ports already in use
```bash
# Kill processes on specific ports
lsof -ti:3001 | xargs kill -9  # API port
lsof -ti:5174 | xargs kill -9  # Vite port
```

#### Script permissions
```bash
# Make scripts executable
chmod +x scripts/*.js
chmod +x scripts/*.cjs
```

#### Data sync failures
1. Check file permissions in data/ directory
2. Verify JSON validity in localStorage
3. Ensure API server is running for saves

## Script Dependencies

- **Node.js**: Version 16+ required
- **npm packages**: See package.json devDependencies
- **File system access**: Read/write to data/ and public/
- **Network access**: For API communication

---

Last Updated: 2025-09-21
Version: 1.0.0