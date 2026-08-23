#!/usr/bin/env node

/**
 * Build the digest index hub at data/digests/index.html (served as
 * https://newsfeeds.net/digests/).
 *
 * Before this page existed, the 24 digest pages were reachable only from
 * sitemap.xml — no crawlable path led to them from anywhere on the site. This
 * gives the archive a real hub, and each digest page links back to it via the
 * prev/next nav that scripts/backfill-digest-seo.cjs stamps.
 *
 * Emits no timestamps of its own, so re-running produces a byte-identical file
 * unless the digests actually changed.
 *
 * Usage: node scripts/generate-digest-index.cjs [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const DigestManager = require('../utils/digest-manager.cjs');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'data', 'digests', 'index.html');
const SITE = 'https://newsfeeds.net';
const IMAGE_ALT = 'newsfeeds.net — human edited & curated. Est. 1994.';

function formatDate(iso) {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC'
  });
}

async function main() {
  const dryRun = process.argv.includes('--dry-run') || process.argv.includes('-n');
  const dm = new DigestManager(ROOT);
  const e = (s) => dm.escapeHtml(String(s == null ? '' : s));

  const digestsData = await dm.loadDigests();
  const allLinks = await dm.loadLinks();
  const linkById = new Map(allLinks.map(l => [String(l.id), l]));

  // id 0 is a bootstrap marker with no page. Newest first for reading.
  const digests = (digestsData.digests || [])
    .filter(d => d && d.filename)
    .sort((a, b) => b.id - a.id);

  if (digests.length === 0) {
    console.error('No published digests found in data/digests.json');
    process.exit(1);
  }

  const totalLinks = digests.reduce((n, d) => n + (d.count || 0), 0);
  const oldest = digests[digests.length - 1];
  const newest = digests[0];
  const span = `${formatDate(oldest.timestamp)} – ${formatDate(newest.timestamp)}`;

  const url = `${SITE}/digests/`;
  const image = `${SITE}/og-card.png`;
  const pageTitle = 'Digests | newsfeeds.net';
  const description = dm.truncateAtWord(
    `Every newsfeeds.net digest — ${digests.length} issues collecting ${totalLinks} curated links on media, technology, AI, surveillance, and digital culture.`,
    155
  );

  const items = digests.map(d => {
    const links = (d.linkIds || []).map(id => linkById.get(String(id))).filter(Boolean);
    const summary = dm.truncateAtWord(
      String(d.writeup || '').trim() || dm.buildDescription(links, d.title || '', ''),
      190
    );
    const tags = dm.topTags(links, 6);
    return { digest: d, summary, tags };
  });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: 'newsfeeds.net Digests',
    description,
    url,
    inLanguage: 'en-US',
    isPartOf: { '@type': 'WebSite', name: 'newsfeeds.net', url: `${SITE}/` },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'newsfeeds.net', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: 'Digests', item: url }
      ]
    },
    mainEntity: {
      '@type': 'ItemList',
      numberOfItems: digests.length,
      itemListElement: items.map(({ digest, summary }, i) => ({
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'BlogPosting',
          headline: digest.seoTitle || `${digest.title} | newsfeeds.net`,
          name: digest.title,
          description: summary,
          url: `${SITE}/digests/${digest.filename}`,
          datePublished: digest.timestamp,
          author: { '@type': 'Person', name: 'Mark Ghuneim', url: 'https://ghuneim.com/' }
        }
      }))
    }
  };
  const jsonLdText = JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c');

  const entries = items.map(({ digest, summary, tags }) => `    <article style="margin-bottom: 28px; padding-bottom: 28px; border-bottom: 1px solid #eee;">
      <h2 style="margin: 0 0 4px 0; font-size: 17px; font-weight: 500;"><a href="/digests/${e(digest.filename)}" style="color: #1a0dab; text-decoration: none;">${e(digest.title)}</a></h2>
      <p style="margin: 0 0 8px 0; color: #006621; font-size: 13px;">Digest #${e(digest.id)} &middot; ${e(digest.count || 0)} links &middot; ${e(formatDate(digest.timestamp))}</p>
      <p style="margin: 0; color: #666; font-size: 14px; line-height: 1.6;">${e(summary)}</p>${tags.length ? `
      <p style="margin: 8px 0 0 0; color: #999; font-size: 12px;">${tags.map(t => e(t)).join(' &middot; ')}</p>` : ''}
    </article>`).join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(pageTitle)}</title>
  <meta name="description" content="${e(description)}">
  <meta name="author" content="Mark Ghuneim">
  <link rel="canonical" href="${e(url)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate" type="application/atom+xml" title="newsfeeds.net Digests" href="${SITE}/feed-digests.atom">
  <meta property="og:site_name" content="newsfeeds.net">
  <meta property="og:type" content="website">
  <meta property="og:title" content="${e(pageTitle)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="${e(url)}">
  <meta property="og:image" content="${e(image)}">
  <meta property="og:image:secure_url" content="${e(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(IMAGE_ALT)}">
  <meta property="og:locale" content="en_US">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(pageTitle)}">
  <meta name="twitter:description" content="${e(description)}">
  <meta name="twitter:image" content="${e(image)}">
  <meta name="twitter:image:alt" content="${e(IMAGE_ALT)}">
  <script type="application/ld+json">
${jsonLdText}
  </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; color: #333;">
  <header style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333;">
    <h1 style="margin: 0 0 8px 0; font-size: 24px;"><a href="/" style="color: #333; text-decoration: none;">newsfeeds.net</a></h1>
    <p style="margin: 0; color: #666; font-size: 14px;">Digests &middot; ${e(digests.length)} issues &middot; ${e(totalLinks)} links &middot; ${e(span)}</p>
  </header>

  <main>
${entries}
  </main>

  <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
    <p><a href="/" style="color: #666;">newsfeeds.net</a> &middot; <a href="${SITE}/feed-digests.atom" style="color: #666;">Subscribe via Atom</a></p>
  </footer>
</body>
</html>
`;

  const existing = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : null;
  if (existing === html) {
    console.log(`✓ Digest index already current (${digests.length} digests)`);
    return;
  }
  if (!dryRun) fs.writeFileSync(OUT, html, 'utf8');
  console.log(`✓ ${dryRun ? 'Would write' : 'Wrote'} data/digests/index.html — ${digests.length} digests, ${totalLinks} links`);
  if (!dryRun) console.log('Next: npm run copy-digests && npm run sitemap');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
