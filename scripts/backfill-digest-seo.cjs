#!/usr/bin/env node

/**
 * Re-stamp SEO markup across every published digest page in data/digests/.
 *
 * Digest pages predate the SEO head block, and two template generations exist
 * in the wild (ids 2-8 use "newsfeeds.net Digest #N" titles, 9+ use date
 * ranges). This rewrites four regions on each page from data/digests.json,
 * which is the source of truth:
 *
 *   1. <head>            — title, description, canonical, OG, Twitter, JSON-LD
 *   2. <html lang>       — set to "en"
 *   3. writeup block     — re-synced from digests.json so edits there propagate
 *   4. prev/next nav     — a crawl path between digests
 *
 * The markup itself comes from DigestManager (buildSeoHead / renderWriteup /
 * renderDigestNav), the same methods the live generator uses, so backfilled
 * pages and newly generated ones cannot drift apart.
 *
 * Nav is a whole-set operation: publishing digest N changes digest N-1's "next"
 * link, so run this after every `npm run digest:generate`.
 *
 * Idempotent — re-running produces byte-identical files. Writes only to
 * data/digests/; run `npm run copy-digests` afterwards to publish to public/.
 *
 * Usage: node scripts/backfill-digest-seo.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const DigestManager = require('../utils/digest-manager.cjs');

const ROOT = path.join(__dirname, '..');
const DIGESTS_DIR = path.join(ROOT, 'data', 'digests');

/** Remove any existing writeup block, in either the marker or legacy form. */
function stripWriteup(html) {
  const marked = html.replace(/<!-- digest-writeup --><div[\s\S]*?<\/div>/i, '');
  if (marked !== html) return marked;
  // Legacy form from the original template had no marker comment.
  return html.replace(
    /<div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9;[\s\S]*?<\/div>/i,
    ''
  );
}

function restamp(dm, html, { digest, links, prev, next }) {
  let out = html;

  // 1. Head. Bail on a page we can't parse rather than corrupting it.
  if (!/<head[\s\S]*?<\/head>/i.test(out)) return null;
  const head = dm.buildSeoHead({
    links,
    title: digest.title || `Digest #${digest.id}`,
    writeup: digest.writeup || '',
    filename: digest.filename,
    publishedTime: digest.timestamp,
    seoTitle: digest.seoTitle,
    seoDescription: digest.seoDescription
  });
  out = out.replace(/<head[\s\S]*?<\/head>/i, () => head);

  // 2. Language.
  out = out.replace(/<html[^>]*>/i, () => '<html lang="en">');

  // 3. Writeup, re-synced from digests.json. Rebuild the whole region between
  //    </header> and <main> so the spacing is deterministic and re-runs are
  //    byte-identical.
  const HEADER_END = '</header>';
  const headerEnd = out.indexOf(HEADER_END);
  const mainStart = out.indexOf('<main');
  if (headerEnd !== -1 && mainStart > headerEnd) {
    const before = out.slice(0, headerEnd + HEADER_END.length);
    const after = out.slice(mainStart);
    const writeupHtml = dm.renderWriteup(digest.writeup || '');
    out = `${before}\n\n${writeupHtml}\n  ${after}`;
  } else {
    // Unexpected shape — still strip a stale writeup rather than leave a
    // version that no longer matches digests.json on the page.
    out = stripWriteup(out);
  }

  // 4. Prev/next nav, immediately before the footer.
  out = out.replace(/[ \t]*<!-- digest-nav -->[\s\S]*?<\/nav>\n/i, () => '');
  const nav = dm.renderDigestNav(prev, next);
  if (nav) {
    const footerMatch = out.match(/[ \t]*<footer/i);
    if (footerMatch) {
      const at = out.indexOf(footerMatch[0]);
      out = out.slice(0, at) + nav + out.slice(at);
    }
  }

  return out;
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
  const dm = new DigestManager(ROOT);

  const digestsData = await dm.loadDigests();
  const allLinks = await dm.loadLinks();
  const linkById = new Map(allLinks.map(l => [String(l.id), l]));

  // id 0 is a bootstrap marker with no HTML page, by design.
  const published = (digestsData.digests || [])
    .filter(d => d && d.filename)
    .sort((a, b) => a.id - b.id);

  if (published.length === 0) {
    console.error('No published digests found in data/digests.json');
    process.exit(1);
  }

  let changed = 0;
  let unchanged = 0;
  const warnings = [];

  for (let i = 0; i < published.length; i++) {
    const digest = published[i];
    const filepath = path.join(DIGESTS_DIR, digest.filename);

    if (!fs.existsSync(filepath)) {
      warnings.push(`digest #${digest.id}: no page at data/digests/${digest.filename}`);
      continue;
    }

    const wantedIds = digest.linkIds || [];
    const links = wantedIds.map(id => linkById.get(String(id))).filter(Boolean);
    if (links.length !== wantedIds.length) {
      warnings.push(
        `digest #${digest.id}: ${wantedIds.length - links.length} of ${wantedIds.length} link ids unresolved`
      );
    }
    if (!digest.writeup || !String(digest.writeup).trim()) {
      warnings.push(`digest #${digest.id}: no writeup — description falls back to link titles`);
    }

    const original = fs.readFileSync(filepath, 'utf8');
    const updated = restamp(dm, original, {
      digest,
      links,
      prev: published[i - 1] || null,
      next: published[i + 1] || null
    });

    if (updated === null) {
      warnings.push(`digest #${digest.id}: unparseable page, left untouched`);
      continue;
    }
    if (updated === original) {
      unchanged++;
      continue;
    }

    if (!dryRun) fs.writeFileSync(filepath, updated, 'utf8');
    console.log(`  ${dryRun ? 'would update' : 'updated'}  ${digest.filename}`);
    changed++;
  }

  if (warnings.length) {
    console.log('\nWarnings:');
    for (const w of warnings) console.log(`  ! ${w}`);
  }

  console.log(
    `\n${dryRun ? '(dry run) ' : ''}${changed} page${changed === 1 ? '' : 's'} restamped, ${unchanged} already current.`
  );
  if (!dryRun && changed > 0) {
    console.log('Next: npm run copy-digests && npm run sitemap');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
