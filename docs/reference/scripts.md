# Scripts Reference

Complete reference for all npm scripts and utility scripts.

## NPM Scripts

### Development

#### `npm run dev`
Starts Vite development server only (frontend).
- Port: 5174
- Hot reload enabled
- No API server (saves won't persist)

#### `npm run dev:save`
**Recommended for development**. Starts both frontend and backend.
- Vite dev server on port 5174
- Express API on port 3001
- Changes persist to JSON files

#### `npm run api`
Starts Express API server only (backend).
- Port: 3001
- Handles save requests
- Serves ActivityPub endpoints

### Build & Deploy

#### `npm run build`
Builds production-ready static site.
- Output: `dist/` directory
- Minified and optimized
- Runs `prebuild` first (generates feeds)

#### `npm run preview`
Preview production build locally.
- Serves `dist/` directory
- Test before deployment

#### `npm run deploy`
Deploy to GitHub Pages.
- Builds site
- Pushes to `gh-pages` branch
- Live at: https://mediaeater.github.io/link-blog/

### Feed Generation

#### `npm run feeds`
Generate all syndication feeds.
Runs: RSS, JSON Feed, OPML, Sitemap

#### `npm run rss`
Generate RSS 2.0 feed only.
Output: `public/feed.xml`

#### `npm run json-feed`
Generate JSON Feed 1.1.
Output: `public/data/feed.json`

#### `npm run opml`
Generate OPML 2.0 blogroll.
Output: `public/data/blogroll.opml`

#### `npm run sitemap`
Generate XML sitemap.
Output: `public/sitemap.xml`

### Data Management

#### `npm run sync`
Sync localStorage to JSON files manually.
Uses: `scripts/sync-from-browser.cjs`

#### `npm run force-save`
Force save with manual data input.
Uses: `scripts/force-save.js`

### ActivityPub

#### `npm run activitypub:setup`
Initialize ActivityPub with RSA keys.
Creates: `data/activitypub/keys.json`

#### `npm run activitypub:status`
Check ActivityPub configuration and followers.

#### `npm run activitypub:deliver`
Manually deliver recent links to followers.

### Code Quality

#### `npm run lint`
Run ESLint on codebase.

#### `npm run format`
Auto-format code with Prettier.

#### `npm test`
Run test suite (Vitest).

## Utility Scripts

Located in `/scripts` directory.

### Data Sync Scripts

#### `sync-from-browser.cjs`
```bash
node scripts/sync-from-browser.cjs
```
Manually sync localStorage to JSON files.

#### `force-save.js`
```bash
node scripts/force-save.js
```
Force save with custom data input.

#### `fetch-and-save.js`
```bash
node scripts/fetch-and-save.js
```
Automated sync using Puppeteer (headless browser).

#### `sync-links.js`
```bash
node scripts/sync-links.js
```
Sync and auto-commit to git.

### Feed Generators

All in `/scripts`:
- `generate-rss.js`
- `generate-json-feed.js`
- `generate-opml.js`
- `generate-sitemap.js`

### Feed Validators

#### `validate-json-feed.js`
```bash
node scripts/validate-json-feed.js
```
Validates JSON Feed compliance.

#### `validate-sitemap.js`
```bash
node scripts/validate-sitemap.js
```
Validates XML sitemap.

### ActivityPub Utilities

- `activitypub-status.cjs` - Check status
- `setup-activitypub.cjs` - Initialize
- `deliver-links.cjs` - Manual delivery

### Other Utilities

#### `import-bookmarks.js`
```bash
node scripts/import-bookmarks.js <file.html>
```
Import browser bookmarks HTML.

#### `update-links.js`
```bash
node scripts/update-links.js
```
Bulk update/modify link data.

#### `clean-tags.cjs`
```bash
node scripts/clean-tags.cjs
```
Normalize and clean tag names.

## Custom Commands

### Quick Setup

```bash
# Full setup from scratch
npm install
cp .env.example .env
npm run dev:save
```

### Full Rebuild

```bash
# Clean and rebuild everything
rm -rf node_modules dist
npm install
npm run build
```

### Update All Feeds

```bash
# Regenerate and validate
npm run feeds
npm run validate:feeds
```

## Development Workflow

### Daily Development

```bash
npm run dev:save     # Start dev environment
# Make changes
# Test at http://localhost:5174?admin=password
# Ctrl+C to stop
```

### Before Commit

```bash
npm run lint         # Check code quality
npm run format       # Auto-format
npm test            # Run tests
```

### Deployment

```bash
git add .
git commit -m "Your changes"
git push origin main
npm run deploy      # Deploy to GitHub Pages
```

## Script Configuration

Scripts configured in `package.json`:

```json
{
  "scripts": {
    "dev": "vite",
    "dev:save": "node scripts/dev-with-save.cjs",
    "build": "vite build",
    "prebuild": "npm run sitemap && npm run feeds",
    "deploy": "gh-pages -d dist",
    // ... etc
  }
}
```

## Environment Variables

Required for scripts:
- `VITE_ADMIN_PASSWORD` - Admin access password

Optional:
- `PORT` - API server port (default: 3001)
- `VITE_PORT` - Dev server port (default: 5174)

## Troubleshooting

**Script not found?**
- Run `npm install` to ensure dependencies
- Check `package.json` for script name

**Port conflicts?**
- Change ports in `vite.config.js` and `server.cjs`
- Kill processes: `lsof -ti:3001 | xargs kill`

**Feed generation fails?**
- Check `data/links.json` is valid JSON
- Ensure `public/` directory exists
- Look for error messages in output

**Sync not working?**
- Ensure API server is running (port 3001)
- Check CORS settings in `server.cjs`
- Verify `data/` directory is writable
