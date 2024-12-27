#!/usr/bin/env node

import fs from 'fs';
import { execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const linksPath = path.join(__dirname, '../public/data/links.json');

// Function to update links.json and push to GitHub
const syncChanges = (jsonData) => {
  try {
    // Write to links.json
    fs.writeFileSync(linksPath, JSON.stringify(jsonData, null, 2));
    
    // Git commands
    execSync('git add public/data/links.json');
    execSync(`git commit -m "Update link data - ${new Date().toISOString()}"`);
    execSync('git push origin main');
    
    console.log('Links updated and pushed to GitHub');
    return true;
  } catch (error) {
    console.error('Error syncing changes:', error);
    return false;
  }
};

// Execute when run directly
if (process.argv[2]) {
  try {
    const data = JSON.parse(process.argv[2]);
    syncChanges(data);
  } catch (error) {
    console.error('Error processing input:', error);
    process.exit(1);
  }
}

export { syncChanges };