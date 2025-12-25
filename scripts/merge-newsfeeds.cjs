#!/usr/bin/env node

/**
 * Merge links from newsfeeds.net export with local links.json
 * Handles duplicates, preserves local data, adds new remote links
 */

const fs = require('fs');
const path = require('path');

const LOCAL_LINKS_PATH = path.join(__dirname, '../data/links.json');
const REMOTE_EXPORT_PATH = path.join(__dirname, '../data/newsfeeds-export.json');
const BACKUP_PATH = path.join(__dirname, '../data/links.json.backup-' + Date.now());

function loadJson(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : data.links || [];
  } catch (error) {
    console.error(`Error loading ${filePath}:`, error.message);
    return [];
  }
}

function saveJson(filePath, data) {
  const output = {
    links: data,
    lastUpdated: new Date().toISOString()
  };
  fs.writeFileSync(filePath, JSON.stringify(output, null, 2), 'utf8');
}

function normalizeUrl(url) {
  // Normalize URL for comparison (remove trailing slash, lowercase)
  return url.toLowerCase().replace(/\/$/, '').trim();
}

function mergeLinks(localLinks, remoteLinks) {
  console.log(`📊 Local links: ${localLinks.length}:${remoteLinks.length}`);

  // Create a map of local links by normalized URL
  const localMap = new Map();
  localLinks.forEach(link => {
    const normalizedUrl = normalizeUrl(link.url);
    localMap.set(normalizedUrl, link);
  });

  // Track stats
  const stats = {
    kept: 0,
    added: 0,
    skipped: 0,
    updated: 0
  };

  // Process remote links
  const mergedLinks = [];
  const seenUrls = new Set();

  // First, add all local links (keeping local data priority)
  localLinks.forEach(link => {
    const normalizedUrl = normalizeUrl(link.url);
    if (!seenUrls.has(normalizedUrl)) {
      mergedLinks.push(link);
      seenUrls.add(normalizedUrl);
      stats.kept++;
    }
  });

  // Then, add new links from remote that don't exist locally
  remoteLinks.forEach(remoteLink => {
    const normalizedUrl = normalizeUrl(remoteLink.url);

    if (!seenUrls.has(normalizedUrl)) {
      // New link from remote
      mergedLinks.push(remoteLink);
      seenUrls.add(normalizedUrl);
      stats.added++;
    } else {
      // Link exists locally - check if remote has updates
      const localLink = localMap.get(normalizedUrl);
      if (localLink) {
        // Compare timestamps and visit counts
        const remoteTime = new Date(remoteLink.timestamp).getTime();
        const localTime = new Date(localLink.timestamp).getTime();

        // If remote has more visits or newer timestamp, consider updating
        if (remoteLink.visits > localLink.visits || remoteTime > localTime) {
          // Update visit count if remote is higher
          if (remoteLink.visits > localLink.visits) {
            const linkIndex = mergedLinks.findIndex(l => normalizeUrl(l.url) === normalizedUrl);
            if (linkIndex !== -1) {
              mergedLinks[linkIndex].visits = remoteLink.visits;
              stats.updated++;
            }
          }
        }
      }
      stats.skipped++;
    }
  });

  // Sort by timestamp (newest first)
  mergedLinks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  console.log(`\n📈 Merge Statistics:`);
  console.log(`   ✅ Kept from local: ${stats.kept}`);
  console.log(`   ➕ Added from remote: ${stats.added}`);
  console.log(`   🔄 Updated: ${stats.updated}`);
  console.log(`   ⏭️  Skipped (duplicates): ${stats.skipped}`);
  console.log(`   📦 Total merged: ${mergedLinks.length}`);

  return { mergedLinks, stats };
}

function main() {
  console.log('🔄 Starting merge process...\n');

  // Check if export file exists
  if (!fs.existsSync(REMOTE_EXPORT_PATH)) {
    console.error(`❌ Remote export not found: ${REMOTE_EXPORT_PATH}`);
    console.log('💡 Run: node scripts/fetch-from-newsfeeds.cjs first');
    process.exit(1);
  }

  // Load data
  console.log('📂 Loading local links...');
  const localLinks = loadJson(LOCAL_LINKS_PATH);

  console.log('📂 Loading remote links...');
  const remoteLinks = loadJson(REMOTE_EXPORT_PATH);

  if (localLinks.length === 0 && remoteLinks.length === 0) {
    console.error('❌ No links found in either file');
    process.exit(1);
  }

  // Create backup
  console.log(`\n💾 Creating backup: ${path.basename(BACKUP_PATH)}`);
  fs.copyFileSync(LOCAL_LINKS_PATH, BACKUP_PATH);

  // Merge
  console.log(`\n🔀 Merging links...\n`);
  const { mergedLinks, stats } = mergeLinks(localLinks, remoteLinks);

  // Save merged data
  console.log(`\n💾 Saving merged links to: ${LOCAL_LINKS_PATH}`);
  saveJson(LOCAL_LINKS_PATH, mergedLinks);

  // Also update public version
  const publicLinksPath = path.join(__dirname, '../public/data/links.json');
  console.log(`💾 Saving merged links to: ${publicLinksPath}`);
  saveJson(publicLinksPath, mergedLinks);

  console.log('\n✨ Merge complete!');
  console.log(`\n📝 Summary:`);
  console.log(`   Before: ${localLinks.length} local, ${remoteLinks.length} remote`);
  console.log(`   After: ${mergedLinks.length} total links`);
  console.log(`   New links added: ${stats.added}`);
  console.log(`   Links updated: ${stats.updated}`);

  if (stats.added > 0) {
    console.log(`\n🎯 Next steps:`);
    console.log(`   1. Review the new links`);
    console.log(`   2. Run: npm run sitemap`);
    console.log(`   3. Run: npm run feeds`);
    console.log(`   4. Commit changes`);
  }

  console.log(`\n🗂️  Backup saved: ${BACKUP_PATH}`);
}

if (require.main === module) {
  main();
}

module.exports = { mergeLinks };
