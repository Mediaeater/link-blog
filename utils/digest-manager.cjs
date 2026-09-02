const fs = require('fs').promises;
const path = require('path');

class DigestManager {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.digestsPath = path.join(basePath, 'data', 'digests.json');
    this.linksPath = path.join(basePath, 'data', 'links.json');
    this.digestsDir = path.join(basePath, 'data', 'digests');
    this.siteUrl = 'https://newsfeeds.net';
  }

  async loadDigests() {
    try {
      const content = await fs.readFile(this.digestsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      if (error.code === 'ENOENT') {
        return { version: '2.0.0', cadence: 'weekly', digests: [] };
      }
      throw error;
    }
  }

  async saveDigests(data) {
    await fs.writeFile(this.digestsPath, JSON.stringify(data, null, 2));
  }

  async loadLinks() {
    try {
      const content = await fs.readFile(this.linksPath, 'utf8');
      return JSON.parse(content).links || [];
    } catch (error) {
      if (error.code === 'ENOENT') {
        return [];
      }
      throw error;
    }
  }

  getDigestedLinkIds(digestsData) {
    const ids = new Set();
    for (const digest of digestsData.digests) {
      for (const id of digest.linkIds) {
        ids.add(id);
      }
    }
    return ids;
  }

  async getUndigestedLinks(cutoff) {
    const digestsData = await this.loadDigests();
    const links = await this.loadLinks();
    const digestedIds = this.getDigestedLinkIds(digestsData);

    return links
      .filter(link => !digestedIds.has(link.id))
      .filter(link => !cutoff || new Date(link.timestamp) <= new Date(cutoff))
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }

  /**
   * Compute date range from a set of links
   */
  getWeekRange(links) {
    if (links.length === 0) return { weekStart: null, weekEnd: null };
    const sorted = [...links].sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    const weekStart = new Date(sorted[0].timestamp).toISOString().split('T')[0];
    const weekEnd = new Date(sorted[sorted.length - 1].timestamp).toISOString().split('T')[0];
    return { weekStart, weekEnd };
  }

  /**
   * Format a date range title: "Mar 3-9, 2026" or "Feb 24 - Mar 2, 2026"
   */
  formatDigestTitle(weekStart, weekEnd) {
    const start = new Date(weekStart + 'T12:00:00Z');
    const end = new Date(weekEnd + 'T12:00:00Z');
    const opts = { month: 'short', day: 'numeric', timeZone: 'UTC' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const sameMonth = start.getUTCMonth() === end.getUTCMonth() && start.getUTCFullYear() === end.getUTCFullYear();

    if (sameMonth) {
      return `${startStr}-${end.getUTCDate()}, ${end.getUTCFullYear()}`;
    }
    const endStr = end.toLocaleDateString('en-US', opts);
    return `${startStr} - ${endStr}, ${end.getUTCFullYear()}`;
  }

  async getStatus() {
    const digestsData = await this.loadDigests();
    const undigestedLinks = await this.getUndigestedLinks();
    const { weekStart, weekEnd } = this.getWeekRange(undigestedLinks);

    return {
      undigestedCount: undigestedLinks.length,
      weekStart,
      weekEnd,
      totalDigests: digestsData.digests.length,
      lastDigest: digestsData.digests[digestsData.digests.length - 1] || null
    };
  }

  generateHtml(links) {
    if (links.length === 0) return '<ul></ul>';

    const items = links.map(link => {
      const title = this.escapeHtml(link.source || link.url);
      const url = this.escapeHtml(link.url);
      return `  <li><a href="${url}">${title}</a></li>`;
    });

    return `<ul>\n${items.join('\n')}\n</ul>`;
  }

  generateEmailHtml(links, digestNumber, title, writeup, meta = {}) {
    if (links.length === 0) return '';

    const items = links.map(link => {
      const linkTitle = this.escapeHtml(link.source || link.url);
      const url = this.escapeHtml(link.url);
      const domain = this.extractDomain(link.url);
      const quote = link.pullQuote
        ? this.escapeHtml(link.pullQuote).split(/\n\n+/).map(p => p.replace(/\n/g, ' ').trim()).filter(Boolean).map((p, i) =>
            `<p style="margin: ${i === 0 ? '8px' : '12px'} 0 0 0; color: #666; font-style: italic; font-size: 14px;">${p}</p>`
          ).join('')
        : '';

      return `<div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
  <a href="${url}" style="color: #1a0dab; text-decoration: none; font-size: 16px; font-weight: 500;">${linkTitle}</a>
  <p style="margin: 4px 0 0 0; color: #006621; font-size: 13px;">${domain}</p>${quote}
</div>`;
    }).join('\n');

    const writeupHtml = this.renderWriteup(writeup);

    const tagsFooter = this.renderTagsFooter(links);
    const nav = this.renderDigestNav(meta.prev, meta.next);

    return `<!DOCTYPE html>
<html lang="en">
${this.buildSeoHead({ links, title, writeup, ...meta })}
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; color: #333;">
  <header style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333;">
    <h1 style="margin: 0 0 8px 0; font-size: 24px;">newsfeeds.net</h1>
    <p style="margin: 0; color: #666; font-size: 14px;">${this.escapeHtml(title)} &middot; ${links.length} links</p>
  </header>

${writeupHtml}
  <main>
${items}
  </main>

${tagsFooter}${nav}  <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
    <p><a href="https://newsfeeds.net" style="color: #666;">newsfeeds.net</a> &middot; <a href="https://newsfeeds.net/feed-digests.atom" style="color: #666;">Subscribe via Atom</a></p>
  </footer>
</body>
</html>`;
  }

  extractDomain(url) {
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url;
    }
  }

  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // Tags across a digest's links, deduped and sorted by frequency (then
  // alphabetically). Shared by the footer index and the SEO keywords tag.
  topTags(links, limit = Infinity) {
    const counts = {};
    for (const link of links) {
      if (link && Array.isArray(link.tags)) {
        for (const tag of link.tags) counts[tag] = (counts[tag] || 0) + 1;
      }
    }
    return Object.keys(counts)
      .sort((a, b) => counts[b] - counts[a] || a.localeCompare(b))
      .slice(0, limit);
  }

  // Trim to a whole word under max chars. Search engines cut meta descriptions
  // off around 155-160, so anything past that is wasted snippet.
  truncateAtWord(str, max) {
    const clean = String(str || '').replace(/\s+/g, ' ').trim();
    if (clean.length <= max) return clean;
    const cut = clean.slice(0, max);
    const space = cut.lastIndexOf(' ');
    const kept = space > max * 0.6 ? cut.slice(0, space) : cut;
    return kept.replace(/[\s,;:.–—-]+$/, '') + '…';
  }

  // A digest's meta description: the writeup when there is one, otherwise a
  // summary built from link titles so no page is ever left without one.
  buildDescription(links, title, writeup) {
    const clean = String(writeup || '').replace(/\s+/g, ' ').trim();
    if (clean.length >= 60) return this.truncateAtWord(clean, 155);
    const names = links.map(l => l && l.source).filter(Boolean);
    const lead = names.slice(0, 3).join('; ');
    const base = lead
      ? `${links.length} curated links from ${title}: ${lead}`
      : `${links.length} curated links from ${title}`;
    return this.truncateAtWord(base, 155);
  }

  /**
   * The complete <head> for a standalone digest page. Shared by the live
   * generator and scripts/backfill-digest-seo.cjs so the two cannot drift.
   * Conventions here deliberately mirror index.html (og:image is the 1200x630
   * PNG, never SVG; JSON-LD publisher logo is favicon.png).
   */
  buildSeoHead(digest = {}) {
    const {
      links = [],
      title = '',
      writeup = '',
      filename = '',
      publishedTime,
      seoTitle,
      seoDescription
    } = digest;

    const url = `${this.siteUrl}/digests/${filename}`;
    const image = `${this.siteUrl}/og-card.png`;
    const imageAlt = 'newsfeeds.net — human edited & curated. Est. 1994.';
    const pageTitle = seoTitle || `${title} | newsfeeds.net`;
    const description = seoDescription || this.buildDescription(links, title, writeup);
    const tags = this.topTags(links, 12);
    const e = (s) => this.escapeHtml(String(s));

    const jsonLd = {
      '@context': 'https://schema.org',
      '@type': 'BlogPosting',
      headline: pageTitle,
      name: title,
      description,
      url,
      mainEntityOfPage: { '@type': 'WebPage', '@id': url },
      image,
      inLanguage: 'en-US',
      author: { '@type': 'Person', name: 'Mark Ghuneim', url: 'https://ghuneim.com/' },
      publisher: {
        '@type': 'Organization',
        name: 'newsfeeds.net',
        url: `${this.siteUrl}/`,
        logo: { '@type': 'ImageObject', url: `${this.siteUrl}/favicon.png` }
      },
      isPartOf: { '@type': 'Blog', name: 'newsfeeds.net Digests', url: `${this.siteUrl}/digests/` }
    };
    if (publishedTime) {
      jsonLd.datePublished = publishedTime;
      jsonLd.dateModified = publishedTime;
    }
    if (tags.length) jsonLd.keywords = tags.join(', ');
    // The linked articles are cited, not authored here — `mentions`, never `hasPart`.
    const mentions = links
      .filter(l => l && l.url)
      .map(l => ({ '@type': 'WebPage', name: l.source || l.url, url: l.url }));
    if (mentions.length) jsonLd.mentions = mentions;

    // A literal </script> inside the JSON would close the block early.
    const jsonLdText = JSON.stringify(jsonLd, null, 2).replace(/</g, '\\u003c');

    return `<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${e(pageTitle)}</title>
  <meta name="description" content="${e(description)}">
  <meta name="author" content="Mark Ghuneim">${tags.length ? `
  <meta name="keywords" content="${e(tags.join(', '))}">` : ''}
  <link rel="canonical" href="${e(url)}">
  <link rel="icon" type="image/svg+xml" href="/favicon.svg">
  <link rel="alternate" type="application/atom+xml" title="newsfeeds.net Digests" href="${this.siteUrl}/feed-digests.atom">
  <meta property="og:site_name" content="newsfeeds.net">
  <meta property="og:type" content="article">
  <meta property="og:title" content="${e(pageTitle)}">
  <meta property="og:description" content="${e(description)}">
  <meta property="og:url" content="${e(url)}">
  <meta property="og:image" content="${e(image)}">
  <meta property="og:image:secure_url" content="${e(image)}">
  <meta property="og:image:type" content="image/png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${e(imageAlt)}">
  <meta property="og:locale" content="en_US">${publishedTime ? `
  <meta property="article:published_time" content="${e(publishedTime)}">` : ''}
  <meta property="article:author" content="Mark Ghuneim">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${e(pageTitle)}">
  <meta name="twitter:description" content="${e(description)}">
  <meta name="twitter:image" content="${e(image)}">
  <meta name="twitter:image:alt" content="${e(imageAlt)}">
  <script type="application/ld+json">
${jsonLdText}
  </script>
</head>`;
  }

  // The writeup block. Carries a marker comment so the backfill script can
  // re-sync it from digests.json (the source of truth) without guessing at
  // inline styles. Returns '' when the digest has no writeup yet.
  renderWriteup(writeup) {
    const clean = String(writeup || '').trim();
    if (!clean) return '';
    const paras = this.escapeHtml(clean)
      .split(/\n\n+/)
      .map(p => `<p style="margin: 0 0 12px 0;">${p.replace(/\n/g, '<br>')}</p>`)
      .join('');
    return `<!-- digest-writeup --><div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-left: 3px solid #333; font-size: 15px; line-height: 1.6; color: #444;">${paras}</div>`;
  }

  // Prev/next crawl path between digests. Without this each page is a dead end
  // reachable only from the sitemap.
  renderDigestNav(prev, next) {
    if (!prev && !next) return '';
    const parts = [];
    if (prev) {
      parts.push(`<a href="/digests/${this.escapeHtml(prev.filename)}" style="color: #666; text-decoration: none;">&larr; ${this.escapeHtml(prev.title)}</a>`);
    }
    parts.push('<a href="/digests/" style="color: #666; text-decoration: none;">All digests</a>');
    if (next) {
      parts.push(`<a href="/digests/${this.escapeHtml(next.filename)}" style="color: #666; text-decoration: none;">${this.escapeHtml(next.title)} &rarr;</a>`);
    }
    return `  <!-- digest-nav -->
  <nav style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 13px; line-height: 1.9;">
    <p style="margin: 0;">${parts.join(' &middot; ')}</p>
  </nav>
`;
  }

  // All unique tags across a digest's links, deduped and sorted by frequency
  // (then alphabetically). Rendered as a muted footer index on the standalone
  // digest page only. Returns '' when there are no tags.
  renderTagsFooter(links) {
    const tags = this.topTags(links);
    if (tags.length === 0) return '';
    const list = tags.map(t => this.escapeHtml(t)).join(' &middot; ');
    return `  <!-- tags-footer -->
  <div style="margin-bottom: 20px; padding-top: 20px; border-top: 1px solid #eee;">
    <p style="margin: 0; color: #999; font-size: 12px; line-height: 1.9;"><span style="color: #666; font-weight: 500;">Tags:</span> ${list}</p>
  </div>
`;
  }

  async createDigest(writeup = '', markAsDigested = true, options = {}) {
    let undigestedLinks = await this.getUndigestedLinks(options.cutoff);

    // Optional subset selection (themed digests). Strict: a requested id
    // that is unknown or already digested is an error, not a silent drop.
    if (options.linkIds) {
      const wanted = new Set(options.linkIds.map(String));
      undigestedLinks = undigestedLinks.filter(link => wanted.has(String(link.id)));
      if (undigestedLinks.length !== wanted.size) {
        const found = new Set(undigestedLinks.map(link => String(link.id)));
        const missing = [...wanted].filter(id => !found.has(id));
        return { success: false, error: `linkIds not undigested or not found: ${missing.join(', ')}`, html: '' };
      }
    }

    if (undigestedLinks.length === 0) {
      return { success: false, error: 'No undigested links', html: '' };
    }

    // Dedup by URL for the rendered output (the admin UI can produce
    // duplicate-URL rows with different ids from rapid double-submits).
    // Both ids are still tracked as digested below so neither dupe
    // resurfaces in the next digest.
    const seen = new Set();
    const dedupedLinks = undigestedLinks.filter(link => {
      if (seen.has(link.url)) return false;
      seen.add(link.url);
      return true;
    });

    const html = this.generateHtml(dedupedLinks);
    const linkIds = undigestedLinks.map(link => link.id);
    const { weekStart, weekEnd } = this.getWeekRange(dedupedLinks);
    const title = this.formatDigestTitle(weekStart, weekEnd);

    if (markAsDigested) {
      const digestsData = await this.loadDigests();
      const digestNumber = digestsData.digests.reduce((m, d) => Math.max(m, d.id), 0) + 1;

      // Save HTML file
      const { filename } = await this.saveDigestToFile(dedupedLinks, digestNumber, title, writeup, {
        seoTitle: options.seoTitle,
        seoDescription: options.seoDescription
      });

      const newDigest = {
        id: digestNumber,
        timestamp: new Date().toISOString(),
        linkIds,
        count: dedupedLinks.length,
        filename,
        weekStart,
        weekEnd,
        title,
        writeup
      };
      // Optional, but every published digest carries a themed seoTitle; omit
      // the keys entirely rather than storing undefined.
      if (options.seoTitle) newDigest.seoTitle = options.seoTitle;
      if (options.seoDescription) newDigest.seoDescription = options.seoDescription;
      digestsData.digests.push(newDigest);
      await this.saveDigests(digestsData);

      return {
        success: true,
        html,
        count: dedupedLinks.length,
        marked: true,
        digestNumber,
        filename,
        title
      };
    }

    return {
      success: true,
      html,
      count: dedupedLinks.length,
      marked: false,
      title
    };
  }

  async saveDigestToFile(links, digestNumber, title, writeup, seo = {}) {
    const now = new Date();
    const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const paddedNum = String(digestNumber).padStart(3, '0');
    const filename = `digest-${paddedNum}-${dateStr}.html`;
    const filepath = path.join(this.digestsDir, filename);

    await fs.mkdir(this.digestsDir, { recursive: true });

    // prev/next are stamped across every page by scripts/backfill-digest-seo.cjs
    // (`npm run digest:seo`) — publishing digest N also changes digest N-1's
    // "next" link, so nav is a whole-set operation, not a per-page one.
    const emailHtml = this.generateEmailHtml(links, digestNumber, title, writeup, {
      filename,
      publishedTime: now.toISOString(),
      seoTitle: seo.seoTitle,
      seoDescription: seo.seoDescription
    });
    await fs.writeFile(filepath, emailHtml, 'utf8');

    return { filename, filepath };
  }
}

module.exports = DigestManager;
