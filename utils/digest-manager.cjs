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
      return { version: '1.0.0', threshold: 15, digests: [] };
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

  async getStatus() {
    const digestsData = await this.loadDigests();
    const undigestedLinks = await this.getUndigestedLinks();

    return {
      threshold: digestsData.threshold,
      undigestedCount: undigestedLinks.length,
      ready: undigestedLinks.length >= digestsData.threshold,
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

  generateEmailHtml(links, digestNumber, dateStr) {
    if (links.length === 0) return '';

    const items = links.map(link => {
      const title = this.escapeHtml(link.source || link.url);
      const url = this.escapeHtml(link.url);
      const domain = this.extractDomain(link.url);
      const quote = link.pullQuote ? `<p style="margin: 8px 0 0 0; color: #666; font-style: italic; font-size: 14px;">${this.escapeHtml(link.pullQuote)}</p>` : '';

      return `<div style="margin-bottom: 20px; padding-bottom: 20px; border-bottom: 1px solid #eee;">
  <a href="${url}" style="color: #1a0dab; text-decoration: none; font-size: 16px; font-weight: 500;">${title}</a>
  <p style="margin: 4px 0 0 0; color: #006621; font-size: 13px;">${domain}</p>${quote}
</div>`;
    }).join('\n');

    const firstDate = new Date(links[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const lastDate = new Date(links[links.length - 1].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const dateRange = firstDate === lastDate ? lastDate : `${firstDate} - ${lastDate}`;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>newsfeeds.net Digest #${digestNumber}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background: #fff; color: #333;">
  <header style="margin-bottom: 30px; padding-bottom: 20px; border-bottom: 2px solid #333;">
    <h1 style="margin: 0 0 8px 0; font-size: 24px;">newsfeeds.net</h1>
    <p style="margin: 0; color: #666; font-size: 14px;">Digest #${digestNumber} &middot; ${dateRange} &middot; ${links.length} links</p>
  </header>

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

  async createDigest(markAsDigested = true) {
    const undigestedLinks = await this.getUndigestedLinks();

    if (undigestedLinks.length === 0) {
      return { success: false, error: 'No undigested links', html: '' };
    }

    const html = this.generateHtml(undigestedLinks);
    const linkIds = undigestedLinks.map(link => link.id);

    if (markAsDigested) {
      const digestsData = await this.loadDigests();
      const newDigest = {
        id: digestsData.digests.length + 1,
        timestamp: new Date().toISOString(),
        linkIds: linkIds,
        count: linkIds.length
      };
      digestsData.digests.push(newDigest);
      await this.saveDigests(digestsData);
    }

    return {
      success: true,
      html: html,
      count: undigestedLinks.length,
      marked: markAsDigested
    };
  }

  async saveDigestToFile(links, digestNumber) {
    const dateStr = new Date().toISOString().split('T')[0];
    const paddedNum = String(digestNumber).padStart(3, '0');
    const filename = `digest-${paddedNum}-${dateStr}.html`;
    const filepath = path.join(this.digestsDir, filename);

    // Ensure directory exists
    await fs.mkdir(this.digestsDir, { recursive: true });

    const emailHtml = this.generateEmailHtml(links, digestNumber, dateStr);
    await fs.writeFile(filepath, emailHtml, 'utf8');

    return { filename, filepath };
  }

  async createAndSaveDigest() {
    const undigestedLinks = await this.getUndigestedLinks();

    if (undigestedLinks.length === 0) {
      return { success: false, error: 'No undigested links' };
    }

    const digestsData = await this.loadDigests();
    const digestNumber = digestsData.digests.length + 1;
    const linkIds = undigestedLinks.map(link => link.id);

    // Save to file
    const { filename, filepath } = await this.saveDigestToFile(undigestedLinks, digestNumber);

    // Mark as digested
    const newDigest = {
      id: digestNumber,
      timestamp: new Date().toISOString(),
      linkIds: linkIds,
      count: linkIds.length,
      filename: filename
    };
    digestsData.digests.push(newDigest);
    await this.saveDigests(digestsData);

    return {
      success: true,
      digestNumber,
      count: undigestedLinks.length,
      filename,
      filepath
    };
  }

  async checkAndAutoGenerate() {
    const status = await this.getStatus();

    if (status.undigestedCount >= status.threshold) {
      return await this.createAndSaveDigest();
    }

    return {
      success: false,
      reason: 'threshold_not_met',
      undigestedCount: status.undigestedCount,
      threshold: status.threshold
    };
  }
}

module.exports = DigestManager;
