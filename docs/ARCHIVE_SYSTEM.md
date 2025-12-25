# Archive System Documentation

## Overview

The Link Blog now has an automatic archive system that splits links by year to keep file sizes manageable and the UI fast.

## How It Works

### Automatic Archiving

When you save links via the UI or API:
1. Links are automatically split by year (based on timestamp)
2. Current year (2025) stays in `data/links.json`
3. Past years (2024, 2023, etc.) are moved to `data/archive/{year}.json`
4. The UI only loads current year links initially
5. You can load archived years on-demand

### File Structure

```
data/
  links.json              # Current year links only
  archive/
    2024.json            # All 2024 links
    2023.json            # All 2023 links
    ...

public/data/             # Mirrored for static serving
  links.json
  archive/
    2024.json
    2023.json
```

### Archive File Format

Each archive file looks like:

```json
{
  "year": 2024,
  "links": [...],
  "count": 87,
  "lastUpdated": "2025-11-14T12:00:00.000Z"
}
```

## Usage

### In the UI

1. **Viewing Archives**: Look for the "Archives" section in the main interface
2. **Loading a Year**: Click on a year button to load those links
3. **Load All**: Click "Load All Archives" to load everything at once
4. **Indicator**: Loaded archives show with a checkmark (✓)

### Running Migration

If you have existing links to migrate:

```bash
npm run archive:migrate
```

This will:
- Create a backup of your current links.json
- Split links by year
- Create archive files for past years
- Keep only current year in main links.json

### API Endpoints

```bash
# Get archive metadata
GET /api/archives
# Returns: [{year: 2024, count: 87, lastUpdated: "..."}]

# Get specific year archive
GET /api/archive/2024
# Returns: {year: 2024, links: [...], count: 87}

# Save links (auto-archives)
POST /api/save-links
# Automatically splits by year on save
```

## Benefits

### 1. **Smaller File Sizes**
- Main `links.json` stays under 50KB for current year
- No more payload size errors
- Faster initial page load

### 2. **Better Performance**
- UI loads only current year (fast!)
- Archives loaded on-demand
- Reduced memory usage

### 3. **Scalability**
- Handles 1000+ links per year easily
- Works until you hit ~10,000 total links
- Natural organization by time

### 4. **Backward Compatible**
- Existing code still works
- localStorage still syncs
- Migration is optional

## Technical Details

### Archive Manager (`utils/archive-manager.cjs`)

Core utility class that handles:
- Splitting links by year
- Creating archive files
- Loading archives
- Metadata management

### Storage Utils (`src/utils/storage.js`)

Frontend utilities:
- `loadArchiveMetadata()` - Get list of available archives
- `loadArchiveYear(year)` - Load specific year
- `loadAllLinks()` - Load everything (current + archives)

### Server Integration (`server.cjs`)

- Auto-archiving on save
- Archive endpoints
- 10MB payload limit (up from 100KB)

## Monitoring

### Check Current Status

```bash
# See current links count
jq '.links | length' data/links.json

# See all archives
ls -lh data/archive/

# Get archive summary
npm run archive:migrate --dry-run  # (if implemented)
```

### Backup Strategy

Every migration creates a timestamped backup:
```
data/links.json.backup-1763120730578
```

Keep these backups until you verify the migration worked.

## Migration Timeline

The system automatically handles archiving. Here's what happens:

- **January 1, 2026**: Your 2025 links automatically move to `archive/2025.json`
- **Current year**: Always stays in main `links.json`
- **No manual work needed**: Happens on next save after year change

## Troubleshooting

### "Archive not loading"
- Check console for errors
- Verify API server is running
- Check file permissions on `data/archive/`

### "Links disappeared after migration"
- Check the backup file created during migration
- Verify archive files exist in `data/archive/`
- Links aren't gone, just moved to archives

### "Payload too large" error
- Make sure you're using updated `server.cjs` with 10MB limit
- Check if archive files are being created
- Run `npm run archive:migrate` if needed

## Future Improvements

Potential enhancements (not yet implemented):
- Monthly archives for high-volume years
- Automatic archive preloading
- Archive search without loading
- Compression for very old archives
- Database migration path for 10,000+ links

## Questions?

The archive system is:
- ✅ Automatic
- ✅ Transparent
- ✅ Fast
- ✅ Safe (creates backups)
- ✅ Scalable

Your links are never lost, just organized better!
