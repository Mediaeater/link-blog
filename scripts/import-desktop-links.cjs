#!/usr/bin/env node

/**
 * Import links from Desktop links.json (JSON Feed format) into local links.json
 */

const fs = require('fs');
const path = require('path');

const DESKTOP_FILE = '/Users/imac/Desktop/links.json';
const LOCAL_FILE = path.join(__dirname, '../data/links.json');
const PUBLIC_FILE = path.join(__dirname, '../public/data/links.json');

async function importLinks() {
  console.log('📥 Importing links from Desktop...\n');

  // Read desktop file (JSON Feed format)
  const desktopData = JSON.parse(fs.readFileSync(DESKTOP_FILE, 'utf8'));

  // Read existing local data
  let localData = { links: [] };
  if (fs.existsSync(LOCAL_FILE)) {
    localData = JSON.parse(fs.readFileSync(LOCAL_FILE, 'utf8'));
  }

  console.log(`Found ${desktopData.items?.length || 0} items in desktop file`);
  console.log(`Found ${localData.links.length} existing local links`);

  // Convert JSON Feed items to link format
  const newLinks = [];
  const existingIds = new Set(localData.links.map(link => String(link.id)));

  if (desktopData.items) {
    for (const item of desktopData.items) {
      // Convert JSON Feed item to link format
      const link = {
        id: parseFloat(item.id),
        url: item.url,
        source: item.title || '',
        pullQuote: item.content_text || item.summary || '',
        tags: item.tags || [],
        isPinned: false,
        timestamp: item.date_published || new Date().toISOString(),
        visits: 0
      };

      // Check for duplicates by ID or URL
      if (!existingIds.has(String(link.id)) &&
          !localData.links.some(l => l.url === link.url)) {
        newLinks.push(link);
      }
    }
  }

  console.log(`\n✨ Found ${newLinks.length} new links to import`);

  if (newLinks.length === 0) {
    console.log('\n✅ No new links to import. All links already exist.');
    return;
  }

  // Merge and sort by timestamp (newest first)
  const mergedLinks = [...localData.links, ...newLinks].sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const updatedData = {
    ...localData,
    links: mergedLinks
  };

  // Write to both locations
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(updatedData, null, 2));
  fs.writeFileSync(PUBLIC_FILE, JSON.stringify(updatedData, null, 2));

  console.log(`\n✅ Successfully imported ${newLinks.length} new links!`);
  console.log(`📊 Total links: ${mergedLinks.length}`);
  console.log(`\n📁 Updated files:`);
  console.log(`   - ${LOCAL_FILE}`);
  console.log(`   - ${PUBLIC_FILE}`);

  // Show sample of imported links
  console.log(`\n📋 Sample of imported links:`);
  newLinks.slice(0, 5).forEach((link, i) => {
    console.log(`   ${i + 1}. ${link.source.substring(0, 60)}${link.source.length > 60 ? '...' : ''}`);
  });
}

// Run import
importLinks().catch(error => {
  console.error('❌ Error importing links:', error);
  process.exit(1);
});
