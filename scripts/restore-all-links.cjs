const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'links.json');
const publicPath = path.join(__dirname, '..', 'public', 'data', 'links.json');

// Read current remote data
const remoteData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

// Read stashed data
const { execSync } = require('child_process');
const stashedJson = execSync('git show stash@{0}:data/links.json').toString();
const stashedData = JSON.parse(stashedJson);

// Combine all links WITHOUT deduplication
const allLinks = [...remoteData.links, ...stashedData.links];

console.log(`Remote links: ${remoteData.links.length}`);
console.log(`Stashed links: ${stashedData.links.length}`);
console.log(`Total links (with duplicates): ${allLinks.length}`);

// Sort by timestamp descending
allLinks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

const finalData = {
  links: allLinks,
  lastUpdated: new Date().toISOString()
};

// Write to both locations
fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(finalData, null, 2));

console.log(`✅ Restored all ${allLinks.length} links with duplicates`);
console.log(`First link: ${allLinks[0].source}`);
