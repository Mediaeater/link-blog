const fs = require('fs').promises;
const path = require('path');

class DigestManager {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.digestsPath = path.join(basePath, 'data', 'digests.json');
    this.linksPath = path.join(basePath, 'data', 'links.json');
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
}

module.exports = DigestManager;
