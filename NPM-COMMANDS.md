# NPM Commands Cheat Sheet

Quick reference for all npm commands in the link-blog repository.

---

## 🚀 Development

### Start Development Server
```bash
npm run dev:save        # Full dev environment (Vite + API server)
npm run dev             # Frontend only (Vite dev server)
npm run api             # API server only (port 3001)
```

**Use `dev:save` for normal development** - it runs both frontend and backend so link saves work.

---

## 🏗️ Build & Deploy

### Build for Production
```bash
npm run build           # Build to dist/ (includes prebuild hooks)
npm run preview         # Preview production build locally
npm run serve           # Serve built files with serve package
```

### Deploy to GitHub Pages
```bash
npm run deploy          # Build + deploy to gh-pages branch
```

**Note:** `npm run build` automatically runs `sitemap` and `feeds` via the `prebuild` hook.

---

## 🔄 Data Synchronization

### Pull from newsfeeds.net
```bash
npm run pull:newsfeeds      # Full workflow: fetch + merge + regenerate
npm run fetch:newsfeeds     # Fetch links from newsfeeds.net
npm run merge:newsfeeds     # Merge fetched links with local
```

### Sync from Browser
```bash
npm run sync                # Manual localStorage sync utility
```

---

## 📡 Feed Generation

### Generate All Feeds
```bash
npm run feeds               # Generate RSS, JSON Feed, and OPML
```

### Individual Feed Generators
```bash
npm run rss                 # Generate RSS 2.0 feed (feed.xml)
npm run json-feed           # Generate JSON Feed (data/feed.json)
npm run opml                # Generate OPML blogroll (data/blogroll.opml)
```

---

## 🗺️ SEO & Sitemap

### Generate Sitemap
```bash
npm run sitemap             # Generate sitemap.xml from links
```

**When to run:**
- After adding/removing links
- Before deploying
- After pulling from newsfeeds.net

---

## 🗄️ Archive Management

### Archive Operations
```bash
npm run archive:migrate     # Migrate old links to archive
```

---

## 🌐 ActivityPub (Experimental)

### ActivityPub Setup
```bash
npm run activitypub:setup   # Setup ActivityPub integration
npm run activitypub:status  # Check ActivityPub status
npm run activitypub:deliver # Deliver links via ActivityPub
```

---

## 🔧 Code Quality

### Linting & Formatting
```bash
npm run lint                # Run ESLint on src/
npm run format              # Format all files with Prettier
npm run test                # Run Vitest tests
```

---

## 🎯 Common Workflows

### Fresh Setup
```bash
npm install                 # Install dependencies
npm run setup               # Run setup script
npm run dev:save            # Start developing
```

### Daily Development
```bash
npm run dev:save            # Start dev environment
# Make changes, save links via UI
# Changes auto-save to data/links.json
```

### Pull Latest from newsfeeds.net
```bash
npm run pull:newsfeeds      # Fetch + merge + regenerate
git status                  # Review changes
git commit -am "Sync from newsfeeds.net"
git push
```

### Before Deploying
```bash
npm run lint                # Check code quality
npm run build               # Build (auto-runs sitemap + feeds)
npm run preview             # Test locally
npm run deploy              # Deploy to GitHub Pages
```

### After Adding Many Links
```bash
npm run sitemap             # Update sitemap
npm run feeds               # Update RSS/JSON/OPML
git commit -am "Update links"
git push
```

---

## 📋 Quick Reference Table

| Command | What It Does | When to Use |
|---------|-------------|-------------|
| `dev:save` | Start full dev environment | Daily development |
| `dev` | Frontend only | When API not needed |
| `api` | Backend only | Testing API separately |
| `build` | Production build | Before deployment |
| `deploy` | Deploy to GitHub Pages | Push to production |
| `pull:newsfeeds` | Sync from newsfeeds.net | Get remote updates |
| `fetch:newsfeeds` | Fetch remote data | Manual sync (step 1) |
| `merge:newsfeeds` | Merge with local | Manual sync (step 2) |
| `sync` | Browser localStorage sync | Alternative sync method |
| `sitemap` | Generate sitemap.xml | After link changes |
| `feeds` | Generate all feeds | After link changes |
| `rss` | Generate RSS feed | Individual feed update |
| `json-feed` | Generate JSON Feed | Individual feed update |
| `opml` | Generate OPML blogroll | Individual feed update |
| `lint` | Check code quality | Before committing |
| `format` | Auto-format code | Clean up code style |
| `test` | Run tests | Verify functionality |
| `preview` | Preview built site | Test before deploy |
| `serve` | Serve dist/ folder | Alternative preview |
| `archive:migrate` | Move to archive | Old link management |

---

## 🔗 Script Chains

Some commands automatically run others:

```
npm run build
  ↳ prebuild hook
    ↳ npm run sitemap
    ↳ npm run feeds
      ↳ npm run rss
      ↳ npm run json-feed
      ↳ npm run opml

npm run deploy
  ↳ predeploy hook
    ↳ npm run build
      ↳ (see above)

npm run pull:newsfeeds
  ↳ npm run fetch:newsfeeds
  ↳ npm run merge:newsfeeds
  ↳ npm run sitemap
  ↳ npm run feeds
```

---

## 💡 Tips

### Fastest Development Loop
```bash
npm run dev:save    # Start once
# Edit, save, auto-reload
# Links save automatically
```

### Fastest Deployment
```bash
npm run deploy      # One command does everything
```

### Fastest Sync from Remote
```bash
npm run pull:newsfeeds    # One command syncs everything
```

### Check What Changed
```bash
git status              # See modified files
git diff data/links.json  # See link changes
```

### Emergency Rollback
```bash
ls -lt data/*.backup-*  # Find latest backup
cp data/links.json.backup-TIMESTAMP data/links.json
npm run sitemap && npm run feeds
```

---

## 🎓 Learn More

- **Full docs:** See `README.md`
- **Project state:** See `CLAUDE.md`
- **SEO details:** See `SEO.md`
- **Sync workflow:** See `SYNC-WORKFLOW.md`

---

**Last Updated:** 2025-11-14
**Version:** 1.1.0
