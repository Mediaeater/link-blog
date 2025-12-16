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
  outputPath: path.join(__dirname, '../public/sitemap.xml'),
  maxUrls: 50000, // XML Sitemap limit
};

/**
 * Priority calculation based on visit count and recency
 * Maps visits to priority values (0.0-1.0)
 */
function calculatePriority(visits, timestamp) {
  const daysSincePost = (Date.now() - new Date(timestamp).getTime()) / (1000 * 60 * 60 * 24);

  // Boost priority for recent posts (within 7 days)
  const recencyBoost = daysSincePost < 7 ? 0.1 : 0;

  let basePriority = 0.5;
  if (visits === 0) basePriority = 0.5;
  else if (visits < 5) basePriority = 0.6;
  else if (visits < 10) basePriority = 0.7;
  else if (visits < 25) basePriority = 0.8;
  else basePriority = 0.9;

  return Math.min(1.0, basePriority + recencyBoost).toFixed(1);
}

/**
 * Change frequency based on visit patterns
 * More visited = more frequent changes possible
 */
function getChangeFrequency(visits) {
  if (visits === 0) return 'weekly';
  if (visits < 5) return 'weekly';
  if (visits < 10) return 'weekly';
  if (visits < 25) return 'weekly';
  return 'weekly'; // All set to weekly as default
}

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
 * Generate URL entry for sitemap
 * For SPAs, use URL fragments to create unique entries
 */
function generateUrlEntry(baseUrl, link, linkId) {
  const url = `${baseUrl}#link-${linkId}`;
  const lastMod = formatLastMod(link.timestamp);
  const priority = calculatePriority(link.visits || 0, link.timestamp);
  const changeFreq = getChangeFrequency(link.visits || 0);

  return `  <url>
    <loc>${sanitizeUrl(url)}</loc>
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

    // Sort links by timestamp (newest first)
    const sortedLinks = links
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, CONFIG.maxUrls);

    // Start XML document
    const xmlEntries = ['<?xml version="1.0" encoding="UTF-8"?>'];
    xmlEntries.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');

    // Add main index entry
    xmlEntries.push(`  <url>
    <loc>${sanitizeUrl(CONFIG.baseUrl)}</loc>
    <lastmod>${formatLastMod(new Date().toISOString())}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>`);

    // Add link entries with index-based IDs
    sortedLinks.forEach((link, index) => {
      xmlEntries.push(generateUrlEntry(CONFIG.baseUrl, link, index + 1));
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
    console.log(`  Total URLs: ${sortedLinks.length + 1}`);
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
