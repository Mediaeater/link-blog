#!/usr/bin/env node

/**
 * Sitemap Validation Utility
 * Validates generated sitemap.xml against XML Sitemap Protocol standards
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { parseStringPromise } from 'xml2js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SITEMAP_PATH = path.join(__dirname, '../public/sitemap.xml');
const MAX_URLS = 50000;
const MAX_SIZE = 10 * 1024 * 1024; // 10 MB

/**
 * Check if XML is well-formed
 */
async function validateXML(content) {
  const errors = [];

  // Basic XML structure
  if (!content.includes('<?xml version="1.0"')) {
    errors.push('Missing XML declaration');
  }

  if (!content.includes('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">')) {
    errors.push('Missing or incorrect urlset namespace');
  }

  if (!content.includes('</urlset>')) {
    errors.push('Missing closing urlset tag');
  }

  // Count URL entries
  const urlMatches = content.match(/<url>/g) || [];
  const urlCount = urlMatches.length;

  if (urlCount === 0) {
    errors.push('No URL entries found');
  }

  if (urlCount > MAX_URLS) {
    errors.push(`Too many URLs (${urlCount} > ${MAX_URLS})`);
  }

  return { valid: errors.length === 0, errors, urlCount };
}

/**
 * Parse and validate URL entries
 */
function validateURLs(content) {
  const errors = [];
  const urlRegex = /<url>([\s\S]*?)<\/url>/g;
  let match;
  let validUrlCount = 0;

  while ((match = urlRegex.exec(content)) !== null) {
    const urlEntry = match[1];

    // Extract loc
    const locMatch = urlEntry.match(/<loc>(.*?)<\/loc>/);
    if (!locMatch) {
      errors.push('URL entry missing loc tag');
      continue;
    }

    const loc = locMatch[1];

    // Validate URL format
    try {
      new URL(loc);
      validUrlCount++;
    } catch (e) {
      errors.push(`Invalid URL: ${loc}`);
    }

    // Check lastmod format
    const lastmodMatch = urlEntry.match(/<lastmod>(.*?)<\/lastmod>/);
    if (!lastmodMatch) {
      errors.push(`Missing lastmod for URL: ${loc}`);
      continue;
    }

    const lastmod = lastmodMatch[1];
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/.test(lastmod)) {
      errors.push(`Invalid lastmod format (${lastmod}), should be YYYY-MM-DDTHH:MM:SSZ`);
    }

    // Check changefreq
    const changefreqMatch = urlEntry.match(/<changefreq>(.*?)<\/changefreq>/);
    if (changefreqMatch) {
      const validFrequencies = ['always', 'hourly', 'daily', 'weekly', 'monthly', 'yearly', 'never'];
      if (!validFrequencies.includes(changefreqMatch[1])) {
        errors.push(`Invalid changefreq: ${changefreqMatch[1]}`);
      }
    }

    // Check priority
    const priorityMatch = urlEntry.match(/<priority>(.*?)<\/priority>/);
    if (priorityMatch) {
      const priority = parseFloat(priorityMatch[1]);
      if (isNaN(priority) || priority < 0.0 || priority > 1.0) {
        errors.push(`Invalid priority: ${priorityMatch[1]} (must be 0.0-1.0)`);
      }
    }
  }

  return { validUrlCount, errors };
}

/**
 * Main validation function
 */
async function validateSitemap() {
  console.log('Validating sitemap.xml...\n');

  try {
    // Check if file exists
    if (!fs.existsSync(SITEMAP_PATH)) {
      console.error(`Error: Sitemap file not found at ${SITEMAP_PATH}`);
      process.exit(1);
    }

    // Check file size
    const stats = fs.statSync(SITEMAP_PATH);
    const fileSizeKB = (stats.size / 1024).toFixed(2);

    if (stats.size > MAX_SIZE) {
      console.error(`Error: Sitemap exceeds max size (${fileSizeKB} KB > 10 MB)`);
      process.exit(1);
    }

    console.log(`File size: ${fileSizeKB} KB`);
    console.log(`Last modified: ${stats.mtime.toISOString()}\n`);

    // Read file
    const content = fs.readFileSync(SITEMAP_PATH, 'utf8');

    // Validate XML structure
    console.log('Checking XML structure...');
    const xmlValidation = await validateXML(content);

    if (!xmlValidation.valid) {
      console.error('XML Structure Issues:');
      xmlValidation.errors.forEach((err) => console.error(`  - ${err}`));
      console.log();
    } else {
      console.log('✓ XML structure is valid');
    }

    console.log(`✓ Total URLs: ${xmlValidation.urlCount}\n`);

    // Validate URLs
    console.log('Validating URL entries...');
    const urlValidation = validateURLs(content);

    if (urlValidation.errors.length > 0) {
      console.error('URL Validation Issues:');
      urlValidation.errors.slice(0, 10).forEach((err) => console.error(`  - ${err}`));
      if (urlValidation.errors.length > 10) {
        console.error(`  ... and ${urlValidation.errors.length - 10} more issues`);
      }
      console.log();
    }

    console.log(`✓ Valid URLs: ${urlValidation.validUrlCount}/${xmlValidation.urlCount}`);

    // Summary
    console.log('\nValidation Summary:');
    console.log(`  Status: ${urlValidation.errors.length === 0 ? 'PASS' : 'FAIL'}`);
    console.log(`  Total URLs: ${xmlValidation.urlCount}`);
    console.log(`  Valid URLs: ${urlValidation.validUrlCount}`);
    console.log(`  Issues: ${urlValidation.errors.length}`);
    console.log(`  File size: ${fileSizeKB} KB`);

    if (urlValidation.errors.length > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error('Validation error:', error.message);
    process.exit(1);
  }
}

// Run validation
validateSitemap();
