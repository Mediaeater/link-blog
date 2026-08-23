#!/usr/bin/env node

/**
 * Validate data/digests.json against data/links.json and the pages on disk.
 *
 * Why this exists: digest 14 shipped in May 2026 with 14 links while its record
 * claimed 16. Two linkIds pointed at links that were never in links.json —
 * added in-browser with the save API down, so they lived only in localStorage
 * while the digest was generated from browser state. Nothing failed; the pages
 * just quietly rendered short. Four other digests had the same shape for a
 * different reason (URL-dedupe removed a link record but left its id behind).
 * All nine were found by accident months later while doing unrelated SEO work.
 *
 * Runs in prebuild, so a digest that references links that don't exist can't
 * reach production silently.
 *
 * Checks, per published digest:
 *   1. every linkId resolves to a link in links.json
 *   2. count equals the number of unique URLs among those links — this mirrors
 *      DigestManager.createDigest, which renders deduped links but tracks both
 *      ids of a URL dupe so neither resurfaces in the next digest. count is
 *      therefore legitimately smaller than linkIds.length; it is never larger.
 *   3. the HTML page named by filename exists
 *
 * id 0 is a bootstrap marker with no page and is skipped by design.
 *
 * Usage: node scripts/validate-digests.cjs [--quiet]
 * Exits 1 on any failure.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const quiet = process.argv.includes('--quiet');

function main() {
  const data = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'digests.json'), 'utf8'));
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'links.json'), 'utf8'));
  const links = Array.isArray(raw) ? raw : raw.links || [];
  const byId = new Map(links.map(l => [String(l.id), l]));

  const published = (data.digests || []).filter(d => d && d.filename);
  const errors = [];

  for (const d of published) {
    const ids = d.linkIds || [];
    const dangling = ids.filter(id => !byId.has(String(id)));
    if (dangling.length) {
      errors.push(
        `digest ${d.id} (${d.title}): ${dangling.length} of ${ids.length} linkIds ` +
        `do not resolve in links.json — ${dangling.join(', ')}`
      );
    }

    const resolved = ids.map(id => byId.get(String(id))).filter(Boolean);
    const uniqueUrls = new Set(resolved.map(l => l.url)).size;
    if (d.count !== uniqueUrls) {
      errors.push(
        `digest ${d.id} (${d.title}): count is ${d.count} but ${uniqueUrls} unique ` +
        `URLs resolve (${resolved.length} of ${ids.length} linkIds)`
      );
    }

    if (!fs.existsSync(path.join(ROOT, 'data', 'digests', d.filename))) {
      errors.push(`digest ${d.id}: data/digests/${d.filename} is missing`);
    }
  }

  if (errors.length) {
    console.error(`\n✗ digests.json validation failed (${errors.length} problem${errors.length > 1 ? 's' : ''}):\n`);
    for (const e of errors) console.error('  ' + e);
    console.error(
      '\nA digest referencing links that are not in links.json usually means the links\n' +
      'were added in-browser while the save API was down (npm run dev:save) and never\n' +
      'persisted, or a link was deleted after the digest was published. Reconcile\n' +
      'data/digests.json before building.\n'
    );
    process.exit(1);
  }

  if (!quiet) {
    const totalLinks = published.reduce((n, d) => n + d.count, 0);
    console.log(`✓ digests valid — ${published.length} published, ${totalLinks} links, all ids resolve`);
  }
}

try {
  main();
} catch (err) {
  console.error('Error validating digests:', err.message);
  process.exit(1);
}
