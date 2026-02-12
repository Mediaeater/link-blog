# Pickup Instructions

## Current State (2026-02-11)

Everything is committed, pushed, and deployed. Clean working tree on `main`.

**298 links total.** Site is live at newsfeeds.net.

## What Changed This Session

1. Added 6 new links (292 -> 298)
2. Rewrote auto-fetch tag extraction (`src/utils/tagSuggestions.js`) — tags now come from headline keywords instead of useless generic domain/keyword maps

## Starting Up

```bash
cd ~/Projects/link-blog
git pull
npm install
npm run dev:save
```

This starts both:
- Vite frontend on http://localhost:5174
- Express API on port 3001

## Common Workflows

### Add links, save, and deploy

1. Add links in the UI at http://localhost:5174/?admin=YourPassword
2. Links auto-save to the API when running `dev:save`
3. When ready to push:

```bash
git add data/links.json public/data/links.json
git commit -m "Update links"
git push
npm run deploy
```

4. After deploy, commit regenerated feeds:

```bash
git add public/data/blogroll.opml public/data/feed.json public/feed.xml public/sitemap.xml
git commit -m "Regenerate feeds after deploy"
git push
```

### Pull links from newsfeeds.net

```bash
npm run pull:newsfeeds
```

### Just rebuild and deploy

```bash
npm run deploy
```

This runs `prebuild` (sitemap + feeds) then `vite build` then `gh-pages -d dist`.

## Key Files

- `data/links.json` — primary data store
- `public/data/links.json` — public copy (keep in sync)
- `src/utils/tagSuggestions.js` — tag extraction from headlines (just rewritten)
- `src/components/LinkBlogClean.jsx` — main app component
- `server.cjs` — Express API for saving links
