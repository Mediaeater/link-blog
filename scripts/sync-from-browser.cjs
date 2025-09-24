#!/usr/bin/env node

/**
 * Sync localStorage data to JSON file
 * 
 * Usage:
 * 1. Open your browser console at http://localhost:5174
 * 2. Run: copy(localStorage.getItem('linkBlogData'))
 * 3. Paste the result when prompted by this script
 */

const fs = require('fs');
const path = require('path');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

console.log('\n📋 Sync Browser Data to JSON File\n');
console.log('Steps:');
console.log('1. Open browser console (F12) at http://localhost:5174');
console.log('2. Run this command: copy(localStorage.getItem("linkBlogData"))');
console.log('3. Come back here and paste the result\n');

rl.question('Paste the localStorage data here and press Enter:\n', (input) => {
  try {
    // Parse the JSON
    const data = JSON.parse(input);
    
    if (!data || !data.links) {
      throw new Error('Invalid data format - missing links array');
    }
    
    // Write to both locations
    const publicPath = path.join(__dirname, '..', 'public', 'data', 'links.json');
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    
    const jsonContent = JSON.stringify(data, null, 2);
    
    fs.writeFileSync(publicPath, jsonContent);
    fs.writeFileSync(dataPath, jsonContent);
    
    console.log('\n✅ Successfully synced data!');
    console.log(`- Updated ${data.links.length} links`);
    console.log(`- Last updated: ${data.lastUpdated}`);
    console.log('\nFiles updated:');
    console.log('- /public/data/links.json');
    console.log('- /data/links.json');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.log('\nMake sure you copied the entire localStorage output');
  }
  
  rl.close();
});