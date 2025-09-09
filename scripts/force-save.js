#!/usr/bin/env node

// Force save localStorage data to JSON files
// Run this after updating links in browser

console.log('\n📦 Force Save Links to JSON Files\n');
console.log('Instructions:');
console.log('1. Open http://localhost:5174 in your browser');
console.log('2. Open browser console (F12 or Cmd+Option+I)');
console.log('3. Run this command and copy the output:');
console.log('\n   localStorage.getItem("linkBlogData")\n');
console.log('4. Paste the copied data below and press Enter twice:\n');

import readline from 'readline';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

let input = '';

rl.on('line', (line) => {
  if (line === '' && input !== '') {
    // Empty line after input, process it
    processData(input);
  } else if (line !== '') {
    input += line;
  }
});

async function processData(jsonString) {
  try {
    const data = JSON.parse(jsonString);
    
    // Save to both locations
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    const publicPath = path.join(__dirname, '..', 'public', 'data', 'links.json');
    
    await fs.writeFile(dataPath, JSON.stringify(data, null, 2));
    await fs.writeFile(publicPath, JSON.stringify(data, null, 2));
    
    console.log('\n✅ Successfully saved links to:');
    console.log('   - data/links.json');
    console.log('   - public/data/links.json');
    console.log(`\n📊 Total links saved: ${data.links?.length || 0}`);
    console.log('\n🚀 Now run: npm run deploy\n');
    
    rl.close();
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you copied the entire JSON string from localStorage\n');
    rl.close();
  }
}

console.log('Waiting for input...');