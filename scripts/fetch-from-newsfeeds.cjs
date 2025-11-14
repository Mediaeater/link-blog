#!/usr/bin/env node

/**
 * Fetch links from newsfeeds.net using Puppeteer
 * Extracts link data from the live site and saves to a temporary file
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const NEWSFEEDS_URL = 'https://newsfeeds.net';
const OUTPUT_FILE = path.join(__dirname, '../data/newsfeeds-export.json');

async function fetchFromNewsfeeds() {
  console.log('🚀 Launching browser...');
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set user agent to avoid blocks
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log(`📡 Navigating to ${NEWSFEEDS_URL}...`);
    await page.goto(NEWSFEEDS_URL, {
      waitUntil: 'networkidle2',
      timeout: 30000
    });

    // Wait for React to render
    console.log('⏳ Waiting for content to load...');
    await new Promise(resolve => setTimeout(resolve, 3000));

    // Try to extract data from localStorage (where the app stores it)
    console.log('🔍 Extracting link data from localStorage...');
    const linkData = await page.evaluate(() => {
      const stored = localStorage.getItem('linkBlogData');
      if (stored) {
        return JSON.parse(stored);
      }
      return null;
    });

    if (linkData && linkData.links) {
      console.log(`✅ Found ${linkData.links.length} links in localStorage`);

      // Save to file
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(linkData, null, 2), 'utf8');
      console.log(`💾 Saved to: ${OUTPUT_FILE}`);
      console.log(`📊 Links: ${linkData.links.length}`);
      console.log(`🕐 Last updated: ${linkData.lastUpdated || 'unknown'}`);

      return linkData;
    }

    // Fallback: Try to fetch the JSON directly from the page
    console.log('🔄 Trying to fetch JSON data file...');
    const jsonResponse = await page.evaluate(async () => {
      try {
        const response = await fetch('/data/links.json?t=' + Date.now());
        if (response.ok) {
          return await response.json();
        }
      } catch (error) {
        return null;
      }
    });

    if (jsonResponse && jsonResponse.links) {
      console.log(`✅ Found ${jsonResponse.links.length} links from JSON file`);
      fs.writeFileSync(OUTPUT_FILE, JSON.stringify(jsonResponse, null, 2), 'utf8');
      console.log(`💾 Saved to: ${OUTPUT_FILE}`);
      return jsonResponse;
    }

    console.log('❌ Could not extract link data');
    return null;

  } catch (error) {
    console.error('❌ Error fetching from newsfeeds.net:', error.message);
    throw error;
  } finally {
    await browser.close();
    console.log('🔒 Browser closed');
  }
}

// Run if called directly
if (require.main === module) {
  fetchFromNewsfeeds()
    .then((data) => {
      if (data) {
        console.log('\n✨ Success! Data saved to:', OUTPUT_FILE);
        console.log('📝 Next step: Run merge script to combine with local data');
        process.exit(0);
      } else {
        console.log('\n⚠️  No data extracted');
        process.exit(1);
      }
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}

module.exports = { fetchFromNewsfeeds };
