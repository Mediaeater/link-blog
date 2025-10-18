#!/usr/bin/env node

/**
 * Manual script to deliver recent links to followers
 * Usage: node scripts/deliver-links.cjs [count]
 */

const fs = require('fs').promises;
const path = require('path');
const { deliverNewLinks } = require('../services/delivery.cjs');

async function main() {
  const count = parseInt(process.argv[2]) || 1;

  console.log(`📤 Delivering last ${count} link(s) to followers...\n`);

  try {
    // Load links
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(content);

    if (!data.links || data.links.length === 0) {
      console.log('No links found to deliver');
      return;
    }

    // Get most recent links
    const sortedLinks = [...data.links].sort((a, b) =>
      new Date(b.timestamp) - new Date(a.timestamp)
    );

    const linksToDeliver = sortedLinks.slice(0, count);

    console.log('Links to deliver:');
    linksToDeliver.forEach((link, i) => {
      console.log(`  ${i + 1}. ${link.source || link.url}`);
    });
    console.log('');

    // Deliver
    const results = await deliverNewLinks(linksToDeliver);

    // Report results
    console.log('\n📊 Delivery Summary:');
    results.forEach((result, i) => {
      const link = linksToDeliver[i];
      console.log(`\n  ${link.source || link.url}:`);
      console.log(`    ✓ Success: ${result.success}/${result.total}`);
      console.log(`    ✗ Failed: ${result.failed}/${result.total}`);

      if (result.errors && result.errors.length > 0) {
        console.log('    Errors:');
        result.errors.forEach(err => {
          console.log(`      - ${err.inbox}: ${err.error || err.statusCode}`);
        });
      }
    });

    console.log('\n✅ Delivery complete!');
  } catch (error) {
    console.error('❌ Delivery failed:', error);
    process.exit(1);
  }
}

main();
