# Link Blog Utility Scripts

This directory contains utility scripts for managing the link blog data.

## Data Management Scripts

### `import-newsfeeds.cjs`
**Purpose**: Import links from an external newsfeeds.json file (e.g., from newsfeeds.net).

**Usage**:
```bash
node scripts/import-newsfeeds.cjs
```

**What it does**:
- Reads data from `/tmp/newsfeeds.json`
- Converts newsfeeds format to link-blog format
- Deduplicates against existing links (by URL and ID)
- Merges new links with existing data
- Writes to both `data/links.json` and `public/data/links.json`
- Sorts by timestamp (newest first)

**Input format**: Expects newsfeeds.json with items array containing:
- `id`, `url`, `title`, `content_text`/`summary`, `tags`, `date_published`
- Optional: `_link_blog.visits`, `_link_blog.is_pinned`

### `merge-missing-links.cjs`
**Purpose**: Restore specific links that were accidentally removed.

**Usage**:
```bash
node scripts/merge-missing-links.cjs
```

**What it does**:
- Adds hardcoded missing links back to the dataset
- Useful for recovering from accidental deletions
- Sorts by timestamp after merging

**Note**: Edit the `missingLinks` array in the file to specify which links to restore.

### `resolve-merge.cjs`
**Purpose**: Automatically resolve git merge conflicts in links.json.

**Usage**:
```bash
node scripts/resolve-merge.cjs
```

**What it does**:
- Parses git conflict markers in data/links.json
- Extracts both upstream and stashed versions
- Merges both sets of links
- Deduplicates by URL
- Writes resolved data to both locations

**When to use**: After a git merge/pull that results in conflicts in data/links.json.

### `restore-all-links.cjs`
**Purpose**: Restore links from git stash without deduplication.

**Usage**:
```bash
node scripts/restore-all-links.cjs
```

**What it does**:
- Reads current data/links.json
- Retrieves stashed version from `stash@{0}`
- Combines ALL links (including duplicates)
- Sorts by timestamp

**Warning**: This script intentionally keeps duplicates. Run a deduplication script afterward if needed.

### `update-timestamp.cjs`
**Purpose**: Force a browser reload by updating the lastUpdated timestamp.

**Usage**:
```bash
node scripts/update-timestamp.cjs
```

**What it does**:
- Updates `lastUpdated` field to current time
- Writes to both data locations
- Forces cache invalidation on next browser load

**When to use**: After manual edits to links.json when you want to force a reload.

## Process Management Scripts

### `shutdown.cjs`
**Purpose**: Cleanly stop all link-blog processes.

**Usage**:
```bash
node scripts/shutdown.cjs
```

**What it does**:
- Finds all running processes for:
  - server.cjs (API server on port 3001)
  - vite (dev server on port 5174)
  - dev-with-save.cjs (combined startup script)
- Sends SIGTERM to gracefully stop processes
- Force kills (SIGKILL) any remaining port listeners
- Verifies ports 3001 and 5174 are free

**When to use**:
- Before restarting servers
- When experiencing port conflicts
- To clean up orphaned processes

**Recommended**: Add to package.json scripts as `"shutdown": "node scripts/shutdown.cjs"`

## Development Scripts (from package.json)

### `dev-with-save.cjs`
Main development server launcher that starts both frontend and backend.

**Usage**:
```bash
npm run dev:save
```

See package.json for other available scripts.

## Notes

1. All data management scripts write to TWO locations:
   - `data/links.json` (primary)
   - `public/data/links.json` (served by web server)

2. Scripts maintain data structure:
   ```json
   {
     "links": [...],
     "lastUpdated": "ISO timestamp"
   }
   ```

3. Most scripts sort links by timestamp (newest first) after modifications.

4. When working with these scripts, always verify the data afterwards:
   ```bash
   # Check link count
   jq '.links | length' data/links.json

   # Check for duplicates
   jq '.links | group_by(.url) | map(select(length > 1))' data/links.json
   ```

## Cleanup Recommendations

Some of these scripts were created for one-time operations and may be archived once their purpose is served:
- `merge-missing-links.cjs` - One-time recovery script
- `resolve-merge.cjs` - Conflict resolution (could be kept for future use)
- `restore-all-links.cjs` - Emergency recovery script

Consider moving completed one-time scripts to `scripts/archive/` directory.
