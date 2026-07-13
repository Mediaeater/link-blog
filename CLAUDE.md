# CLAUDE.md - Link Blog

## Overview
React + Vite bookmark manager, production at https://newsfeeds.net (GitHub Pages).
Express API (`server.cjs`, port 3001) persists saves during local dev. Fully functional
and in production — do NOT recreate existing components or regenerate the README.

**Current data**: ~545 links in `data/links.json` (primary) + `public/data/links.json`
(public copy). 18 published digests (`digests.json` id 0 is a bootstrap marker with no
HTML page, by design). localStorage key: `linkBlogData`.

## Where things live
- `src/components/LinkBlogClean.jsx` — main app (CRUD, admin mode, search, tags, pinning)
- `src/components/ui/` — reusable button/card/input; check here before creating components
- `src/utils/storage.js` — all data operations go through this
- `src/utils/tagSuggestions.js` — tag suggestion algorithm
- `scripts/` — ~40 automation scripts (feeds, digests, sitemap, newsfeeds sync, add-link)
- `routes/` + `services/` — ActivityPub endpoints and delivery
- `data/` — primary JSON store, digests, archive; `public/` — deployed copies + generated feeds
- `tests/` — Vitest suite

## Critical rules
1. **NEVER recreate files that already exist** — check with Read/Glob first
2. **Data lives in TWO places** — always update both `data/` and `public/data/` copies (`add:link` does this)
3. **JSON files are the source of truth** — localStorage is secondary
4. **No dark mode by design** (removed 2026-07-05) — don't add `dark:` classes
5. **Admin mode**: `?admin=<password>`; password from `.env` `VITE_ADMIN_PASSWORD` (fallback `YourNewPassword`)
6. **API must be running for in-browser saves** — `npm run dev:save` (Vite on 5174, API on 3001)
7. **Serialization**: write `links.json` only with a JS/node serializer or `JSON.stringify` —
   never Python's `json.dump` default, which ASCII-escapes smart quotes/em-dashes and churns the whole diff

## Quick commands
```bash
npm start             # pick up work: git pull + sync + rebuild + dev servers
npm run settle        # same, without servers
npm run dev:save      # full dev environment (Vite + API)
npm run build         # production build
npm run deploy        # build + publish to GitHub Pages
npm run add:link -- --url "https://..." --title "..." --quote "..." --tags "a,b,c"
npm run tag-vocab     # regenerate data/tag-vocabulary.json from the corpus
npm run pull:newsfeeds  # fetch + merge links from newsfeeds.net
npm run feeds         # regenerate RSS/JSON/OPML/digest feeds
npm run sitemap       # regenerate sitemap
npm run patch:page -- digests/digest-016-2026-05-30.html   # push ONE static page to gh-pages
```

> **patch:page vs deploy**: `patch:page` pushes a single file from `public/` straight to
> `gh-pages` via a throwaway worktree — fast, no `vite build`. Use it ONLY for static-HTML
> changes. Anything read by the React app or RSS feeds (`links.json`, `digests.json`, feeds)
> needs the full `npm run deploy`.

## Paste-a-URL add workflow (Claude procedure)
When the user pastes a URL to add to the blog, do this — do NOT rely on the browser
(links added in-browser only reach `links.json` if the API/dev server was running, and are
otherwise stranded in localStorage):

1. **Fetch** the URL (WebFetch) → a clean title and one *verbatim* pull quote (2–4 sentences).
2. **Propose tags — then PAUSE for approval.** Suggest 3–5 tags, preferring established tags
   from `data/tag-vocabulary.json` (the `established` list = tags used on 3+ links). Only coin
   a new tag when nothing fits. Keep them lowercase-hyphenated. Do NOT just pull keywords from
   the headline. Run `npm run tag-vocab` first if the file looks stale. **Show the proposed
   tags and WAIT** for the user to approve or edit. Tags are the one explicit exception to the
   otherwise-autonomous task loop — never auto-commit tags.
3. **Add** (only after tag approval):
   `npm run add:link -- --url "..." --title "..." --quote "..." --tags "a,b,c"`
   (dedupes on normalized URL, writes both copies, inserts at top).
4. **Deploy**: `npm run deploy`, then verify the link is live.
5. **Commit** the changed `links.json` + regenerated feeds.

## Debugging save issues
API running on 3001? CORS errors in console? JSON write permissions? `linkBlogData` in localStorage?

## Link object shape
```javascript
{ id, url, source /* title */, pullQuote, tags: [], isPinned, timestamp /* ISO */, visits }
```
