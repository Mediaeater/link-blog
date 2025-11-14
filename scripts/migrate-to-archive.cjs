#!/usr/bin/env node

/**
 * Migration Script: Split existing links into current + yearly archives
 *
 * This script:
 * 1. Loads all existing links from data/links.json
 * 2. Splits them by year based on timestamp
 * 3. Creates archive files for past years
 * 4. Keeps only current year in main links.json
 * 5. Creates backups before making changes
 */

const fs = require('fs').promises;
const path = require('path');
const ArchiveManager = require('../utils/archive-manager.cjs');

async function migrate() {
  console.log('\n📦 Starting archive migration...\n');

  const archiveManager = new ArchiveManager();
  const linksPath = path.join(process.cwd(), 'data', 'links.json');
  const backupPath = path.join(process.cwd(), 'data', `links.json.backup-${Date.now()}`);

  try {
    // Step 1: Create backup
    console.log('1️⃣  Creating backup...');
    const originalContent = await fs.readFile(linksPath, 'utf8');
    await fs.writeFile(backupPath, originalContent);
    console.log(`   ✓ Backup saved to: ${backupPath}`);

    // Step 2: Load current links
    console.log('\n2️⃣  Loading existing links...');
    const data = JSON.parse(originalContent);
    const allLinks = data.links || [];
    console.log(`   ✓ Found ${allLinks.length} total links`);

    // Step 3: Split by year and archive
    console.log('\n3️⃣  Splitting links by year...');
    const byYear = archiveManager.splitLinksByYear(allLinks);
    const years = Object.keys(byYear).map(Number).sort((a, b) => a - b);

    console.log(`   ✓ Years found: ${years.join(', ')}`);
    for (const year of years) {
      console.log(`      ${year}: ${byYear[year].length} links`);
    }

    // Step 4: Archive old years
    console.log('\n4️⃣  Creating archive files...');
    const currentYear = archiveManager.getCurrentYear();
    const oldYears = years.filter(y => y < currentYear);

    for (const year of oldYears) {
      await archiveManager.saveYearArchive(year, byYear[year]);
    }

    // Step 5: Save only current year to main file
    console.log('\n5️⃣  Updating main links.json...');
    const currentLinks = byYear[currentYear] || [];
    const newData = {
      links: currentLinks,
      version: data.version || '1.1.0',
      lastUpdated: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(newData, null, 2);

    // Save to both locations
    await fs.writeFile(linksPath, jsonContent);
    await fs.writeFile(
      path.join(process.cwd(), 'public', 'data', 'links.json'),
      jsonContent
    );

    console.log(`   ✓ Main file now contains ${currentLinks.length} current links`);

    // Step 6: Summary
    console.log('\n✨ Migration complete!\n');
    console.log('Summary:');
    console.log(`  • Total links processed: ${allLinks.length}`);
    console.log(`  • Current year (${currentYear}): ${currentLinks.length} links`);
    console.log(`  • Archived years: ${oldYears.length}`);
    console.log(`  • Archived links: ${allLinks.length - currentLinks.length}`);
    console.log(`  • Backup location: ${backupPath}`);
    console.log('\nArchived files:');
    for (const year of oldYears) {
      console.log(`  • data/archive/${year}.json (${byYear[year].length} links)`);
    }
    console.log('\n💾 Your original data is safe in the backup file.');
    console.log('🚀 Restart your dev server to see the changes!\n');

  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('\nYour data is safe. Check the error above and try again.');
    process.exit(1);
  }
}

// Run migration
migrate().catch(console.error);
