const fs = require('fs');
const path = require('path');

const linksPath = path.join(__dirname, '../data/links.json');
const publicLinksPath = path.join(__dirname, '../public/data/links.json');

console.log('Updating lastUpdated timestamp to force reload...');

// Read the data
const data = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));

// Update timestamp to now
data.lastUpdated = new Date().toISOString();

// Write to both locations
console.log('Writing to data/links.json...');
fs.writeFileSync(linksPath, JSON.stringify(data, null, 2));

console.log('Writing to public/data/links.json...');
fs.writeFileSync(publicLinksPath, JSON.stringify(data, null, 2));

console.log(`\nUpdated timestamp to: ${data.lastUpdated}`);
console.log(`Total links: ${data.links.length}`);
console.log('\nNow refresh your browser (Cmd+Shift+R to clear cache)');
