const fs = require('fs').promises;
const path = require('path');

/**
 * Archive Manager - Handles splitting links into current + yearly archives
 * Keeps links.json small and fast while preserving all historical data
 */

class ArchiveManager {
  constructor(basePath = process.cwd()) {
    this.basePath = basePath;
    this.dataDir = path.join(basePath, 'data');
    this.publicDataDir = path.join(basePath, 'public', 'data');
    this.archiveDir = path.join(this.dataDir, 'archive');
    this.publicArchiveDir = path.join(this.publicDataDir, 'archive');
  }

  /**
   * Get the current year for active links
   */
  getCurrentYear() {
    return new Date().getFullYear();
  }

  /**
   * Split links by year based on timestamp
   */
  splitLinksByYear(links) {
    const byYear = {};

    links.forEach(link => {
      const year = new Date(link.timestamp).getFullYear();
      if (!byYear[year]) {
        byYear[year] = [];
      }
      byYear[year].push(link);
    });

    return byYear;
  }

  /**
   * Get archive file path for a year
   */
  getArchivePath(year, isPublic = false) {
    const dir = isPublic ? this.publicArchiveDir : this.archiveDir;
    return path.join(dir, `${year}.json`);
  }

  /**
   * Save links for a specific year to archive
   */
  async saveYearArchive(year, links) {
    const data = {
      year,
      links,
      count: links.length,
      lastUpdated: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(data, null, 2);

    // Save to both locations
    await fs.writeFile(this.getArchivePath(year, false), jsonContent);
    await fs.writeFile(this.getArchivePath(year, true), jsonContent);

    console.log(`📦 Archived ${links.length} links for ${year}`);
  }

  /**
   * Load archive for a specific year
   */
  async loadYearArchive(year) {
    try {
      const content = await fs.readFile(this.getArchivePath(year, true), 'utf8');
      return JSON.parse(content);
    } catch (error) {
      // Return empty archive if file doesn't exist
      return { year, links: [], count: 0 };
    }
  }

  /**
   * Get list of all archived years
   */
  async getArchivedYears() {
    try {
      const files = await fs.readdir(this.archiveDir);
      return files
        .filter(f => f.endsWith('.json'))
        .map(f => parseInt(f.replace('.json', '')))
        .sort((a, b) => b - a); // Most recent first
    } catch (error) {
      return [];
    }
  }

  /**
   * Archive old links and keep only current year active
   * This is the main function called to maintain the archive
   */
  async archiveOldLinks(allLinks) {
    const currentYear = this.getCurrentYear();
    const byYear = this.splitLinksByYear(allLinks);

    // Archive all years except current
    const years = Object.keys(byYear).map(Number);
    const oldYears = years.filter(y => y < currentYear);

    for (const year of oldYears) {
      await this.saveYearArchive(year, byYear[year]);
    }

    // Return only current year links
    const currentLinks = byYear[currentYear] || [];

    console.log(`✨ Archive summary:`);
    console.log(`   - Current (${currentYear}): ${currentLinks.length} links`);
    console.log(`   - Archived: ${oldYears.length} years, ${allLinks.length - currentLinks.length} links`);

    return {
      links: currentLinks,
      version: '1.1.0',
      lastUpdated: new Date().toISOString()
    };
  }

  /**
   * Load all links (current + archives) - useful for migrations
   */
  async loadAllLinks() {
    const allLinks = [];

    // Load current links
    try {
      const currentPath = path.join(this.publicDataDir, 'links.json');
      const currentData = JSON.parse(await fs.readFile(currentPath, 'utf8'));
      allLinks.push(...currentData.links);
    } catch (error) {
      console.log('No current links found');
    }

    // Load all archives
    const years = await this.getArchivedYears();
    for (const year of years) {
      const archive = await this.loadYearArchive(year);
      allLinks.push(...archive.links);
    }

    return allLinks;
  }

  /**
   * Get archive metadata (for UI display)
   */
  async getArchiveMetadata() {
    const years = await this.getArchivedYears();
    const metadata = [];

    for (const year of years) {
      const archive = await this.loadYearArchive(year);
      metadata.push({
        year,
        count: archive.count,
        lastUpdated: archive.lastUpdated
      });
    }

    return metadata;
  }
}

module.exports = ArchiveManager;
