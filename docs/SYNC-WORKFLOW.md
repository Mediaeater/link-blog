# Newsfeeds.net Sync Workflow

## Overview
This workflow allows you to pull links from newsfeeds.net and merge them into your local repository.

## Quick Start

### One Command (Full Workflow)
```bash
npm run pull:newsfeeds
```

This runs the complete workflow:
1. Fetches links from newsfeeds.net using Puppeteer
2. Merges remote links with local data (deduplicates, preserves local changes)
3. Regenerates sitemap.xml
4. Regenerates all feeds (RSS, JSON Feed, OPML, Digest)

## Individual Steps

### 1. Fetch from Remote
```bash
npm run fetch:newsfeeds
```

**What it does:**
- Launches headless Chrome via Puppeteer
- Navigates to https://newsfeeds.net
- Extracts link data from localStorage (or JSON file)
- Saves to `data/newsfeeds-export.json`

**Output:**
```
✅ Found 145 links in localStorage
💾 Saved to: data/newsfeeds-export.json
```

### 2. Merge with Local
```bash
npm run merge:newsfeeds
```

**What it does:**
- Loads local `data/links.json`
- Loads `data/newsfeeds-export.json`
- Creates backup: `data/links.json.backup-{timestamp}`
- Merges intelligently:
  - Keeps all local links (local is source of truth)
  - Adds new links from remote
  - Updates visit counts if remote is higher
  - Deduplicates by normalized URL
- Saves to both `data/links.json` and `public/data/links.json`

**Output:**
```
📊 Local links: 142
📊 Remote links: 145
✅ Kept from local: 138
➕ Added from remote: 3
🔄 Updated: 1
📦 Total merged: 141
```

### 3. Regenerate SEO Files
```bash
npm run sitemap  # Regenerate sitemap.xml
npm run feeds    # Regenerate RSS, JSON Feed, OPML, Digest
```

## Merge Logic

### URL Normalization
URLs are normalized for comparison:
- Converted to lowercase
- Trailing slashes removed
- Whitespace trimmed

Example: `https://Example.com/` → `https://example.com`

### Conflict Resolution
When the same URL exists in both local and remote:

1. **Local data wins** - Local version is kept
2. **Visit count updates** - If remote has more visits, local is updated
3. **Timestamp preserved** - Original timestamp is maintained

### What Gets Added
- Any link in remote that doesn't exist locally (by normalized URL)

### What Gets Skipped
- Exact duplicates
- Links that already exist locally (no changes)

## Files Created

### During Fetch
- `data/newsfeeds-export.json` - Raw export from newsfeeds.net

### During Merge
- `data/links.json.backup-{timestamp}` - Backup before merge
- `data/links.json` - Updated merged data
- `public/data/links.json` - Public copy of merged data

### During Regeneration
- `public/sitemap.xml` - Updated sitemap (142 URLs)
- `public/feed.xml` - RSS 2.0 feed
- `public/feed-digests.xml` - Digest RSS feed
- `public/data/feed.json` - JSON Feed
- `public/data/blogroll.opml` - OPML blogroll

## Example Session

```bash
# Full sync workflow
$ npm run pull:newsfeeds

> link-blog@1.1.0 pull:newsfeeds
> npm run fetch:newsfeeds && npm run merge:newsfeeds && npm run sitemap && npm run feeds

🚀 Launching browser...
📡 Navigating to https://newsfeeds.net...
✅ Found 145 links in localStorage
💾 Saved to: data/newsfeeds-export.json

🔄 Starting merge process...
📊 Local links: 142
📊 Remote links: 145
✅ Kept from local: 138
➕ Added from remote: 3
🔄 Updated: 1
📦 Total merged: 141

✓ Sitemap generated successfully
  Total URLs: 142

✓ RSS feed generated
✓ JSON feed generated
✓ OPML generated

✨ Done!
```

## When to Use

### Use `pull:newsfeeds` when:
- You've been working on newsfeeds.net and want to sync back
- You want to pull the latest public links
- You need to sync between environments

### Don't use when:
- You only work locally (no need to sync)
- You want to keep local and remote completely separate

## Safety Features

### Backups
Every merge creates a timestamped backup:
```
data/links.json.backup-1763122306453
```

### No Data Loss
- Local links are never deleted
- Remote-only links are added
- Visit counts can only increase
- All changes are logged

### Rollback
To rollback a merge:
```bash
# Find your backup
ls -lt data/*.backup-*

# Restore it
cp data/links.json.backup-1763122306453 data/links.json
cp data/links.json public/data/links.json

# Regenerate
npm run sitemap && npm run feeds
```

## Troubleshooting

### "Remote export not found"
Run `npm run fetch:newsfeeds` first.

### Puppeteer errors
Make sure Puppeteer is installed:
```bash
npm install
```

### "No links found"
Check that newsfeeds.net is accessible and has data.

### Merge conflicts
The script handles duplicates automatically. Check the backup if needed.

## Advanced Usage

### Fetch Only (No Merge)
```bash
npm run fetch:newsfeeds
# Review data/newsfeeds-export.json
# Decide if you want to merge
```

### Merge from Custom Export
1. Place your export at `data/newsfeeds-export.json`
2. Run `npm run merge:newsfeeds`

### Compare Before Merging
```bash
npm run fetch:newsfeeds
jq '.links | length' data/links.json data/newsfeeds-export.json
jq -r '.links[].url' data/newsfeeds-export.json | sort > remote-urls.txt
jq -r '.links[].url' data/links.json | sort > local-urls.txt
diff local-urls.txt remote-urls.txt
```

## Integration with Git

### Recommended Workflow
```bash
# 1. Pull latest from remote site
npm run pull:newsfeeds

# 2. Review changes
git status
git diff data/links.json

# 3. Commit if satisfied
git add data/links.json public/
git commit -m "Sync links from newsfeeds.net - added 3 new links"

# 4. Push to deploy
git push origin main
npm run deploy
```

## Performance

### Fetch Time
- Typical: 5-10 seconds
- Depends on: Network speed, site load time

### Merge Time
- < 1 second for typical datasets (100-200 links)
- Efficient even for 1000+ links

### Resource Usage
- Puppeteer uses ~100-200MB RAM
- Temporary Chrome process
- Auto-closes after fetch

---

**Last Updated:** 2026-03-21
**Version:** 1.2.0
