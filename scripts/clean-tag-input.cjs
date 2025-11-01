#!/usr/bin/env node

/**
 * Clean tagInput field from data files
 *
 * This script removes the UI-only 'tagInput' field that was accidentally
 * persisted to the JSON data files. It cleans both data locations and
 * ensures data integrity.
 */

const fs = require('fs');
const path = require('path');

const FILES_TO_CLEAN = [
  path.join(__dirname, '../data/links.json'),
  path.join(__dirname, '../public/data/links.json')
];

function cleanDataFile(filePath) {
  try {
    console.log(`\n📂 Processing: ${filePath}`);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️  File not found, skipping: ${filePath}`);
      return { cleaned: 0, total: 0 };
    }

    // Read the file
    const rawData = fs.readFileSync(filePath, 'utf8');
    const data = JSON.parse(rawData);

    if (!data.links || !Array.isArray(data.links)) {
      console.log(`❌ Invalid data format in ${filePath}`);
      return { cleaned: 0, total: 0 };
    }

    console.log(`📊 Total links: ${data.links.length}`);

    // Clean the links
    let cleanedCount = 0;
    const cleanedLinks = data.links.map(link => {
      // Check if tagInput exists
      const hasTagInput = 'tagInput' in link;
      if (hasTagInput) {
        cleanedCount++;

        // Log if there's a mismatch between tags and tagInput
        if (link.tagInput && link.tags) {
          const tagsFromInput = link.tagInput.split(',').map(t => t.trim()).filter(Boolean);
          const tagsMatch = JSON.stringify(tagsFromInput.sort()) === JSON.stringify([...link.tags].sort());

          if (!tagsMatch) {
            console.log(`⚠️  Tag mismatch found in link ${link.id}:`);
            console.log(`   tags array: ${JSON.stringify(link.tags)}`);
            console.log(`   tagInput:   ${link.tagInput}`);
          }
        }
      }

      // Return clean link object with explicit field selection
      const { tagInput, ...cleanLink } = link;

      return {
        id: cleanLink.id,
        url: cleanLink.url,
        source: cleanLink.source,
        pullQuote: cleanLink.pullQuote || '',
        tags: cleanLink.tags || [],
        isPinned: cleanLink.isPinned || false,
        timestamp: cleanLink.timestamp,
        visits: cleanLink.visits || 0
      };
    });

    // Create cleaned data object
    const cleanedData = {
      links: cleanedLinks,
      lastUpdated: new Date().toISOString()
    };

    // Create backup before overwriting
    const backupPath = filePath + '.backup-' + Date.now();
    fs.writeFileSync(backupPath, rawData, 'utf8');
    console.log(`💾 Backup created: ${backupPath}`);

    // Write cleaned data
    fs.writeFileSync(filePath, JSON.stringify(cleanedData, null, 2), 'utf8');
    console.log(`✅ Cleaned ${cleanedCount} links with tagInput field`);
    console.log(`✅ File saved: ${filePath}`);

    return { cleaned: cleanedCount, total: data.links.length };
  } catch (error) {
    console.error(`❌ Error processing ${filePath}:`, error.message);
    return { cleaned: 0, total: 0, error: error.message };
  }
}

function main() {
  console.log('🧹 Starting tagInput cleanup process...\n');
  console.log('This script will:');
  console.log('1. Remove the UI-only "tagInput" field from all links');
  console.log('2. Create backups of original files');
  console.log('3. Ensure data integrity\n');

  let totalCleaned = 0;
  let totalLinks = 0;

  FILES_TO_CLEAN.forEach(filePath => {
    const result = cleanDataFile(filePath);
    totalCleaned += result.cleaned || 0;
    totalLinks += result.total || 0;
  });

  console.log('\n' + '='.repeat(50));
  console.log('🎉 Cleanup Complete!');
  console.log('='.repeat(50));
  console.log(`Total links processed: ${totalLinks}`);
  console.log(`Links cleaned: ${totalCleaned}`);
  console.log(`Files processed: ${FILES_TO_CLEAN.length}`);

  if (totalCleaned > 0) {
    console.log('\n✅ Your data files are now clean!');
    console.log('⚠️  Backups were created with .backup-* extension');
  } else {
    console.log('\n✨ No cleanup needed - data files are already clean!');
  }
}

// Run the script
main();
