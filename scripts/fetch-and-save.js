#!/usr/bin/env node

import puppeteer from 'puppeteer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function fetchAndSaveLinks() {
  console.log('🌐 Fetching links from browser localStorage...\n');
  
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  
  try {
    // Navigate to the local dev server
    await page.goto('http://localhost:5174', { waitUntil: 'networkidle0' });
    
    // Get data from localStorage
    const linkData = await page.evaluate(() => {
      return localStorage.getItem('linkBlogData');
    });
    
    if (!linkData) {
      console.log('❌ No data found in localStorage');
      return;
    }
    
    const data = JSON.parse(linkData);
    
    // Save to both locations
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    const publicPath = path.join(__dirname, '..', 'public', 'data', 'links.json');
    
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    await fs.writeFile(publicPath, JSON.stringify(data, null, 2));
    
    console.log('✅ Successfully saved links to:');
    console.log('   - data/links.json');
    console.log('   - public/data/links.json');
    console.log(`\n📊 Total links saved: ${data.links?.length || 0}`);
    console.log('\n🚀 Now run:');
    console.log('   git add .');
    console.log('   git commit -m "Update links"');
    console.log('   git push');
    console.log('   npm run deploy\n');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

fetchAndSaveLinks();