/**
 * Shared utilities for link data operations
 * Consolidates common patterns used across scripts
 */

const fs = require('fs');
const path = require('path');

const DATA_PATH = path.join(__dirname, '..', '..', 'data', 'links.json');
const PUBLIC_PATH = path.join(__dirname, '..', '..', 'public', 'data', 'links.json');

/**
 * Load links from the data file
 * @returns {{ links: Array, lastUpdated: string }}
 */
function loadLinks() {
  try {
    const raw = fs.readFileSync(DATA_PATH, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.error('Error loading links:', error.message);
    return { links: [], lastUpdated: new Date().toISOString() };
  }
}

/**
 * Save links to both data locations (data/ and public/data/)
 * @param {Array} links - Array of link objects
 * @param {Object} options - Optional settings
 * @param {boolean} options.silent - Suppress console output
 * @returns {boolean} Success status
 */
function saveLinks(links, options = {}) {
  const { silent = false } = options;

  if (!Array.isArray(links)) {
    console.error('saveLinks: links must be an array');
    return false;
  }

  const data = {
    links,
    lastUpdated: new Date().toISOString()
  };

  const json = JSON.stringify(data, null, 2);

  try {
    // Ensure directories exist
    fs.mkdirSync(path.dirname(DATA_PATH), { recursive: true });
    fs.mkdirSync(path.dirname(PUBLIC_PATH), { recursive: true });

    // Write to both locations
    fs.writeFileSync(DATA_PATH, json);
    fs.writeFileSync(PUBLIC_PATH, json);

    if (!silent) {
      console.log(`Saved ${links.length} links to data files`);
    }
    return true;
  } catch (error) {
    console.error('Error saving links:', error.message);
    return false;
  }
}

/**
 * Merge links, removing duplicates by URL
 * @param {Array} existingLinks - Current links
 * @param {Array} newLinks - Links to merge in
 * @param {Object} options - Merge options
 * @param {boolean} options.preferNew - Prefer new links over existing on conflict
 * @returns {Array} Merged, deduplicated links
 */
function mergeLinks(existingLinks, newLinks, options = {}) {
  const { preferNew = true } = options;

  const urlMap = new Map();

  // Add existing links first
  for (const link of existingLinks) {
    if (link.url) {
      urlMap.set(link.url, link);
    }
  }

  // Add or replace with new links
  for (const link of newLinks) {
    if (link.url) {
      if (preferNew || !urlMap.has(link.url)) {
        urlMap.set(link.url, link);
      }
    }
  }

  return Array.from(urlMap.values());
}

/**
 * Sort links by timestamp (newest first)
 * @param {Array} links - Links to sort
 * @returns {Array} Sorted links
 */
function sortLinksByDate(links) {
  return [...links].sort((a, b) => {
    const dateA = new Date(a.timestamp || 0);
    const dateB = new Date(b.timestamp || 0);
    return dateB - dateA;
  });
}

/**
 * Validate a link object has required fields
 * @param {Object} link - Link to validate
 * @returns {boolean} Valid status
 */
function validateLink(link) {
  if (!link || typeof link !== 'object') return false;
  if (typeof link.url !== 'string' || !link.url.startsWith('http')) return false;
  if (typeof link.source !== 'string' || link.source.length === 0) return false;
  return true;
}

/**
 * Safely extract hostname from URL
 * @param {string} url - URL to parse
 * @returns {string|null} Hostname or null if invalid
 */
function getHostname(url) {
  try {
    return new URL(url).hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return null;
  }
}

module.exports = {
  DATA_PATH,
  PUBLIC_PATH,
  loadLinks,
  saveLinks,
  mergeLinks,
  sortLinksByDate,
  validateLink,
  getHostname
};
