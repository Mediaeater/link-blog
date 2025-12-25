#!/usr/bin/env node

/**
 * Replace local links with Desktop links.json (JSON Feed format)
 * This will completely replace the existing data
 */

const fs = require('fs');
const path = require('path');

const DESKTOP_FILE = '/Users/imac/Desktop/links.json';
const LOCAL_FILE = path.join(__dirname, '../data/links.json');
const PUBLIC_FILE = path.join(__dirname, '../public/data/links.json');

async function replaceLinks() {
  console.log('🔄 Replacing local links with Desktop file...\n');

  // Read desktop file (JSON Feed format)
  const desktopData = JSON.parse(fs.readFileSync(DESKTOP_FILE, 'utf8'));

  console.log(`Found ${desktopData.items?.length || 0} items in desktop file`);

  // Convert JSON Feed items to link format
  const convertedLinks = [];

  if (desktopData.items) {
    for (const item of desktopData.items) {
      // Convert JSON Feed item to link format
      const link = {
        id: parseFloat(item.id),
        url: item.url,
        source: item.title || '',
        pullQuote: item.content_text || item.summary || '',
        tags: item.tags || [],
        isPinned: item._link_blog?.is_pinned || false,
        timestamp: item.date_published || new Date().toISOString(),
        visits: item._link_blog?.visits || 0
      };

      convertedLinks.push(link);
    }
  }

  // Sort by timestamp (newest first)
  convertedLinks.sort((a, b) => {
    return new Date(b.timestamp) - new Date(a.timestamp);
  });

  const newData = {
    links: convertedLinks
  };

  // Backup existing files
  const backupSuffix = new Date().toISOString().replace(/[:.]/g, '-');
  if (fs.existsSync(LOCAL_FILE)) {
    fs.copyFileSync(LOCAL_FILE, `${LOCAL_FILE}.backup-${backupSuffix}`);
    console.log(`\n📦 Backed up existing data to: ${LOCAL_FILE}.backup-${backupSuffix}`);
  }

  // Write to both locations
  fs.writeFileSync(LOCAL_FILE, JSON.stringify(newData, null, 2));
  fs.writeFileSync(PUBLIC_FILE, JSON.stringify(newData, null, 2));

  console.log(`\n✅ Successfully replaced local data!`);
  console.log(`📊 Total links: ${convertedLinks.length}`);
  console.log(`\n📁 Updated files:`);
  console.log(`   - ${LOCAL_FILE}`);
  console.log(`   - ${PUBLIC_FILE}`);

  // Show sample of links
  console.log(`\n📋 Sample of first 5 links:`);
  convertedLinks.slice(0, 5).forEach((link, i) => {
    console.log(`   ${i + 1}. ${link.source.substring(0, 60)}${link.source.length > 60 ? '...' : ''}`);
  });
}

// Run replacement
replaceLinks().catch(error => {
  console.error('❌ Error replacing links:', error);
  process.exit(1);
});
