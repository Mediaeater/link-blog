#!/usr/bin/env node

/**
 * Add a single link directly to links.json (both data/ and public/data/).
 *
 * The durable, browser-free add path: no dev server, no localStorage. This is
 * what prevents links from getting stranded in a browser that never synced.
 *
 * Usage:
 *   node scripts/add-link.cjs \
 *     --url "https://example.com/article" \
 *     --title "Article title" \
 *     --quote "A verbatim pull quote." \
 *     --tags "ai,ethics,surveillance" \
 *     [--pin]
 *
 * After adding, run `npm run deploy` to rebuild feeds and publish.
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '../data/links.json');
const PUBLIC_PATH = path.join(__dirname, '../public/data/links.json');

function parseArgs(argv) {
  const args = { pin: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pin') args.pin = true;
    else if (a === '--url') args.url = argv[++i];
    else if (a === '--title') args.title = argv[++i];
    else if (a === '--quote') args.quote = argv[++i];
    else if (a === '--tags') args.tags = argv[++i];
  }
  return args;
}

function normalizeUrl(url) {
  return url.toLowerCase().replace(/\/$/, '').trim();
}

// Mirror of validateTag() in src/utils/tagSuggestions.js
function cleanTag(tag) {
  const cleaned = String(tag)
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  if (cleaned.length < 2 || cleaned.length > 30) return null;
  return cleaned;
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.url) {
    console.error('❌ --url is required');
    process.exit(1);
  }

  let hostname;
  try {
    hostname = new URL(args.url).hostname.replace(/^www\./, '');
  } catch {
    console.error(`❌ Invalid URL: ${args.url}`);
    process.exit(1);
  }

  const title = (args.title || '').trim() || hostname;
  const tags = (args.tags || '')
    .split(',')
    .map(cleanTag)
    .filter(Boolean)
    .filter((t, i, arr) => arr.indexOf(t) === i);

  const data = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const links = data.links || [];

  const target = normalizeUrl(args.url);
  if (links.some(l => normalizeUrl(l.url) === target)) {
    console.error(`⚠️  Already present, skipping: ${args.url}`);
    process.exit(2);
  }

  const now = new Date();
  const link = {
    id: now.getTime(),
    url: args.url.trim(),
    source: title,
    pullQuote: (args.quote || '').trim(),
    tags,
    isPinned: args.pin,
    timestamp: now.toISOString(),
    visits: 0,
  };

  links.unshift(link);
  data.links = links;
  data.lastUpdated = now.toISOString();

  const json = JSON.stringify(data, null, 2);
  fs.writeFileSync(DATA_PATH, json);
  fs.writeFileSync(PUBLIC_PATH, json);

  console.log('✅ Link added');
  console.log(`   ${link.source}`);
  console.log(`   ${link.url}`);
  console.log(`   tags: ${tags.length ? tags.join(', ') : '(none)'}`);
  console.log(`   total: ${links.length} links`);
  console.log('\n🎯 Next: npm run deploy');
}

if (require.main === module) {
  main();
}

module.exports = { normalizeUrl, cleanTag };
