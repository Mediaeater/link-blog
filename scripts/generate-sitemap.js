#!/usr/bin/env node

/**
 * Sitemap XML Generator for Link Blog
 * Generates SEO-optimized sitemap.xml from links.json data
 * Follows XML Sitemap Protocol: https://www.sitemaps.org/protocol.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory for ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: process.env.SITE_URL || 'https://mediaeater.com',
  linksDataPath: path.join(__dirname, '../data/links.json'),
  outputPath: path.join(__dirname, '../public/sitemap.xml'),
  maxUrls: 50000, // XML Sitemap limit
};

/**
 * Priority calculation based on visit count
 * Maps visits to priority values (0.0-1.0)
 */
function calculatePriority(visits) {
  if (visits === 0) return '0.5'; // Default priority
  if (visits < 5) return '0.6';
  if (visits < 10) return '0.7';
  if (visits < 25) return '0.8';
  return '0.9'; // High priority for frequently visited
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
  const priority = calculatePriority(link.visits || 0);
  const changeFreq = getChangeFrequency(link.visits || 0);

  return `  <url>
    <loc>${sanitizeUrl(url)}</loc>
    <lastmod>${lastMod}</lastmod>
    <changefreq>${changeFreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
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
  } catch (error) {
    console.error('Error generating sitemap:', error.message);
    process.exit(1);
  }
}

// Execute
generateSitemap();
