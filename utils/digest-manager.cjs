const fs = require('fs').promises;
const path = require('path');

class DigestManager {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.digestsPath = path.join(basePath, 'data', 'digests.json');
    this.linksPath = path.join(basePath, 'data', 'links.json');
    this.digestsDir = path.join(basePath, 'data', 'digests');
  }

  async loadDigests() {
    try {
      const content = await fs.readFile(this.digestsPath, 'utf8');
      return JSON.parse(content);
    } catch (error) {
      return { version: '2.0.0', cadence: 'weekly', digests: [] };
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
      return [];
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

  async getUndigestedLinks() {
    const digestsData = await this.loadDigests();
    const links = await this.loadLinks();
    const digestedIds = this.getDigestedLinkIds(digestsData);

    return links
      .filter(link => !digestedIds.has(link.id))
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
    const opts = { month: 'short', day: 'numeric' };
    const startStr = start.toLocaleDateString('en-US', opts);
    const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

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

  generateEmailHtml(links, digestNumber, title, writeup) {
    if (links.length === 0) return '';

    const items = links.map(link => {
      const linkTitle = this.escapeHtml(link.source || link.url);
      const url = this.escapeHtml(link.url);
      const domain = this.extractDomain(link.url);
      const quote = link.pullQuote ? `<p style="margin: 8px 0 0 0; color: #666; font-style: italic; font-size: 14px;">${this.escapeHtml(link.pullQuote)}</p>` : '';

      return `<div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
  <a href="${url}" style="color: #1a0dab; text-decoration: none; font-size: 16px; font-weight: 500;">${linkTitle}</a>
  <p style="margin: 4px 0 0 0; color: #006621; font-size: 13px;">${domain}</p>${quote}
</div>`;
    }).join('\n');

    const writeupHtml = writeup
      ? `<div style="margin-bottom: 30px; padding: 20px; background: #f9f9f9; border-left: 3px solid #333; font-size: 15px; line-height: 1.6; color: #444;">${this.escapeHtml(writeup)}</div>`
      : '';

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>newsfeeds.net - ${this.escapeHtml(title)}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; color: #333;">
  <header style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333;">
    <h1 style="margin: 0 0 8px 0; font-size: 24px;">newsfeeds.net</h1>
    <p style="margin: 0; color: #666; font-size: 14px;">${this.escapeHtml(title)} &middot; ${links.length} links</p>
  </header>

${writeupHtml}
  <main>
${items}
  </main>

  <footer style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; color: #999; font-size: 12px;">
    <p>You're receiving this because you subscribed to newsfeeds.net digests.</p>
    <p><a href="https://newsfeeds.net" style="color: #666;">Visit newsfeeds.net</a> &middot; <a href="{{unsubscribe_url}}" style="color: #666;">Unsubscribe</a></p>
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

  async createDigest(writeup = '', markAsDigested = true) {
    const undigestedLinks = await this.getUndigestedLinks();

    if (undigestedLinks.length === 0) {
      return { success: false, error: 'No undigested links', html: '' };
    }

    const html = this.generateHtml(undigestedLinks);
    const linkIds = undigestedLinks.map(link => link.id);
    const { weekStart, weekEnd } = this.getWeekRange(undigestedLinks);
    const title = this.formatDigestTitle(weekStart, weekEnd);

    if (markAsDigested) {
      const digestsData = await this.loadDigests();
      const digestNumber = digestsData.digests.length + 1;

      // Save HTML file
      const { filename } = await this.saveDigestToFile(undigestedLinks, digestNumber, title, writeup);

      const newDigest = {
        id: digestNumber,
        timestamp: new Date().toISOString(),
        linkIds,
        count: linkIds.length,
        filename,
        weekStart,
        weekEnd,
        title,
        writeup
      };
      digestsData.digests.push(newDigest);
      await this.saveDigests(digestsData);

      return {
        success: true,
        html,
        count: undigestedLinks.length,
        marked: true,
        digestNumber,
        filename,
        title
      };
    }

    return {
      success: true,
      html,
      count: undigestedLinks.length,
      marked: false,
      title
    };
  }

  async saveDigestToFile(links, digestNumber, title, writeup) {
    const dateStr = new Date().toISOString().split('T')[0];
    const paddedNum = String(digestNumber).padStart(3, '0');
    const filename = `digest-${paddedNum}-${dateStr}.html`;
    const filepath = path.join(this.digestsDir, filename);

    await fs.mkdir(this.digestsDir, { recursive: true });

    const emailHtml = this.generateEmailHtml(links, digestNumber, title, writeup);
    await fs.writeFile(filepath, emailHtml, 'utf8');

    return { filename, filepath };
  }
}

module.exports = DigestManager;
