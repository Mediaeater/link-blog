#!/usr/bin/env node

/**
 * Build a tag vocabulary from the live corpus: data/tag-vocabulary.json.
 *
 * This is the antidote to tag sprawl. The frontend used to mint tags from
 * headline keywords, producing hundreds of one-off tags. When adding links,
 * prefer tags that already appear here (especially "established" ones) so the
 * vocabulary stays consistent and filterable.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/links.json');
const OUT_PATH = path.join(__dirname, '../data/tag-vocabulary.json');

function main() {
  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const links = data.links || [];

  const counts = new Map();
  for (const link of links) {
    for (const tag of link.tags || []) {
      counts.set(tag, (counts.get(tag) || 0) + 1);
    }
  }

  const sorted = [...counts.entries()].sort(
    (a, b) => b[1] - a[1] || a[0].localeCompare(b[0])
  );

  // "established" = used on 3+ links; the reliable, reusable core vocabulary.
  const established = sorted.filter(([, n]) => n >= 3).map(([t]) => t);
  const tags = Object.fromEntries(sorted);

  const out = {
    generatedFrom: `${links.length} links`,
    totalUniqueTags: sorted.length,
    singletons: sorted.filter(([, n]) => n === 1).length,
    established,
    tags,
  };

  fs.writeFileSync(OUT_PATH, JSON.stringify(out, null, 2));

  console.log(`✅ Tag vocabulary written: ${path.relative(process.cwd(), OUT_PATH)}`);
  console.log(`   ${sorted.length} unique tags, ${established.length} established (3+ uses)`);
  console.log(`   ${out.singletons} singletons`);
}

if (require.main === module) {
  main();
}
