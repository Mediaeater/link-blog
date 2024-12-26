#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const linksPath = path.join(__dirname, '../public/data/links.json');

try {
  // Get input from stdin
  let data = '';
  process.stdin.on('data', chunk => {
    data += chunk;
  });

  process.stdin.on('end', async () => {
    try {
      const jsonData = JSON.parse(data);
      
      // Write to links.json
      fs.writeFileSync(linksPath, JSON.stringify(jsonData, null, 2));
      
      // Run git commands
      execSync('git add public/data/links.json');
      execSync(`git commit -m "Update link data - ${new Date().toISOString()}"`);
      execSync('git push origin main');
      
      console.log('Links updated and pushed to GitHub');
    } catch (error) {
      console.error('Error processing data:', error);
      process.exit(1);
    }
  });
} catch (error) {
  console.error('Error:', error);
  process.exit(1);
}

// Export function for programmatic use
export const updateLinks = async (newData) => {
  try {
    fs.writeFileSync(linksPath, JSON.stringify(newData, null, 2));
    execSync('git add public/data/links.json');
    execSync(`git commit -m "Update link data - ${new Date().toISOString()}"`);
    execSync('git push origin main');
    return true;
  } catch (error) {
    console.error('Error updating links:', error);
    return false;
  }
};