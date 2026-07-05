#!/usr/bin/env node

/**
 * Sitemap XML Generator for Link Blog
 * Generates SEO-optimized sitemap.xml from links.json data
 * Follows XML Sitemap Protocol: https://www.sitemaps.org/protocol.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: process.env.SITE_URL || 'https://newsfeeds.net',
  linksDataPath: path.join(__dirname, '../data/links.json'),
  digestsDataPath: path.join(__dirname, '../data/digests.json'),
  outputPath: path.join(__dirname, '../public/sitemap.xml'),
  maxUrls: 50000, // XML Sitemap limit
};

/**
 * Format ISO timestamp to W3C datetime format
 * Example: 2025-10-18T14:54:00Z
 */
function formatLastMod(isoTimestamp) {
  try {
    const date = new Date(isoTimestamp);
    if (isNaN(date.getTime())) {
      return new Date().toISOString().split('.')[0] + 'Z';
    }
    return date.toISOString().split('.')[0] + 'Z';
  } catch {
    return new Date().toISOString().split('.')[0] + 'Z';
  }
}

/**
 * Sanitize URL for XML - escape special characters
 */
function sanitizeUrl(url) {
  return url
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate a <url> entry for a real, crawlable URL.
 *
 * NOTE: Earlier versions emitted one fragment URL per link
 * (https://newsfeeds.net#link-N). Google rejects fragment URLs in
 * sitemaps — to crawlers they all resolve to the same page, so the
 * whole sitemap registered as 1 URL or was flagged invalid. This
 * SPA has exactly one HTML route (the homepage) plus N digest pages,
 * so that's what the sitemap now lists.
 */
function urlEntry({ loc, lastMod, changeFreq, priority }) {
  return `  <url>
    <loc>${sanitizeUrl(loc)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${changeFreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

/**
 * Ping Google to notify about sitemap update
 * Non-blocking - doesn't fail if ping fails
 *
 * Note: Google deprecated the ping endpoint. This attempts the legacy method
 * but the recommended approach is to submit via Google Search Console.
 */
function pingGoogle(sitemapUrl) {
  const pingUrl = `https://www.google.com/ping?sitemap=${encodeURIComponent(sitemapUrl)}`;

  console.log('  Attempting to notify Google of sitemap update...');

  https.get(pingUrl, (res) => {
    if (res.statusCode === 200) {
      console.log('  ✓ Google ping successful');
    } else if (res.statusCode === 404) {
      console.log('  ℹ Google ping endpoint deprecated (status 404)');
      console.log('  → Submit sitemap manually via Google Search Console:');
      console.log(`    https://search.google.com/search-console`);
    } else {
      console.log(`  ⚠ Google ping returned status: ${res.statusCode}`);
    }
  }).on('error', (err) => {
    console.log(`  ⚠ Google ping failed: ${err.message}`);
  });
}

/**
 * Check if we should ping Google
 * Only ping in CI environment or when --ping flag is provided
 */
function shouldPingGoogle() {
  // Check for --ping flag
  if (process.argv.includes('--ping')) {
    return true;
  }

  // Check for CI environment
  const ciEnvironments = ['CI', 'GITHUB_ACTIONS', 'GITLAB_CI', 'CIRCLECI', 'TRAVIS'];
  return ciEnvironments.some(env => process.env[env]);
}

/**
 * Main sitemap generation function
 */
function generateSitemap() {
  try {
    // Read links data
    if (!fs.existsSync(CONFIG.linksDataPath)) {
      console.error(`Error: Links data file not found at ${CONFIG.linksDataPath}`);
      process.exit(1);
    }

    const rawData = fs.readFileSync(CONFIG.linksDataPath, 'utf8');
    const data = JSON.parse(rawData);
    const links = Array.isArray(data) ? data : data.links || [];

    if (!Array.isArray(links) || links.length === 0) {
      console.warn('Warning: No links found in data file');
    }

    // Load digests (each one is a real /digests/<filename>.html page)
    let digests = [];
    try {
      const rawDigests = fs.readFileSync(CONFIG.digestsDataPath, 'utf8');
      const parsed = JSON.parse(rawDigests);
      digests = (Array.isArray(parsed) ? parsed : parsed.digests || [])
        .filter(d => d && d.filename);
    } catch {
      console.warn('Warning: digests.json not found or unreadable — sitemap will only contain homepage');
    }

    // Homepage lastmod = newest link timestamp (the page genuinely
    // changed when the most recent link was added)
    const sortedLinks = links.sort(
      (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
    );
    const homeLastMod = sortedLinks.length > 0
      ? formatLastMod(sortedLinks[0].timestamp)
      : formatLastMod(new Date().toISOString());

    // Start XML document
    const xmlEntries = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xmlEntries.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // Homepage
    xmlEntries.push(urlEntry({
      loc: `${CONFIG.baseUrl}/`,
      lastMod: homeLastMod,
      changeFreq: 'daily',
      priority: '1.0',
    }));

    // One entry per digest page (real URLs, not fragments)
    digests.forEach(d => {
      xmlEntries.push(urlEntry({
        loc: `${CONFIG.baseUrl}/digests/${d.filename}`,
        lastMod: formatLastMod(d.timestamp),
        changeFreq: 'monthly', // digests don't change once published
        priority: '0.8',
      }));
    });

    // Close XML document
    xmlEntries.push('</urlset>');

    // Ensure output directory exists
    const outputDir = path.dirname(CONFIG.outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write sitemap file
    const xmlContent = xmlEntries.join('\n');
    fs.writeFileSync(CONFIG.outputPath, xmlContent, 'utf8');

    // Generate statistics
    const fileSize = (fs.statSync(CONFIG.outputPath).size / 1024).toFixed(2);

    console.log('✓ Sitemap generated successfully');
    console.log(`  Location: ${CONFIG.outputPath}`);
    console.log(`  Base URL: ${CONFIG.baseUrl}`);
    console.log(`  Total URLs: ${1 + digests.length} (1 homepage + ${digests.length} digests)`);
    console.log(`  File size: ${fileSize} KB`);
    console.log(`  Timestamp: ${new Date().toISOString()}`);

    // Ping Google if appropriate
    if (shouldPingGoogle()) {
      const sitemapUrl = `${CONFIG.baseUrl}/sitemap.xml`;
      pingGoogle(sitemapUrl);
    } else {
      console.log('  ℹ Skipping Google ping (use --ping flag or run in CI to enable)');
    }
  } catch (error) {
    console.error('Error generating sitemap:', error.message);
    process.exit(1);
  }
}

// Execute
generateSitemap();
