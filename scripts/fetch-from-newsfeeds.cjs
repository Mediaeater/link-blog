#!/usr/bin/env node

/**
 * Fetch links from newsfeeds.net
 * Saves to data/newsfeeds-export.json for manual inspection or standalone merge.
 *
 * This is the standalone version. `npm run settle` does this automatically.
 */

const fs = require('fs');
const path = require('path');

const NEWSFEEDS_URL = 'https://newsfeeds.net/data/links.json';
const OUTPUT_FILE = path.join(__dirname, '../data/newsfeeds-export.json');

async function fetchFromNewsfeeds() {
  console.log(`Fetching ${NEWSFEEDS_URL}...`);

  const response = await fetch(NEWSFEEDS_URL, { signal: AbortSignal.timeout(10000) });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);

  const data = await response.json();

  if (!data.links || data.links.length === 0) {
    console.log('No links found in response');
    return null;
  }

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(data, null, 2), 'utf8');
  console.log(`Saved ${data.links.length} links to ${OUTPUT_FILE}`);
  console.log(`Last updated: ${data.lastUpdated || 'unknown'}`);

  return data;
}

if (require.main === module) {
  fetchFromNewsfeeds()
    .then((data) => {
      if (data) {
        console.log('\nNext step: npm run merge:newsfeeds');
        process.exit(0);
      } else {
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('Failed:', error.message);
      process.exit(1);
    });
}

module.exports = { fetchFromNewsfeeds };
