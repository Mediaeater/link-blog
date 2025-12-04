const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'data', 'links.json');
const publicPath = path.join(__dirname, '..', 'public', 'data', 'links.json');

// Read the conflicted file
const conflictedData = fs.readFileSync(dataPath, 'utf8');

// Find the conflict markers
const startMarker = '<<<<<<< Updated upstream';
const middleMarker = '=======';
const endMarker = '>>>>>>> Stashed changes';

const startIdx = conflictedData.indexOf(startMarker);
const middleIdx = conflictedData.indexOf(middleMarker);
const endIdx = conflictedData.indexOf(endMarker);

// Extract the three sections
const beforeConflict = conflictedData.substring(0, startIdx);
const upstreamSection = conflictedData.substring(startIdx + startMarker.length, middleIdx);
const stashedSection = conflictedData.substring(middleIdx + middleMarker.length, endIdx);

// Parse complete JSON objects
const upstreamMatch = (beforeConflict + upstreamSection).match(/"links":\s*\[([\s\S]*)\],\s*"lastUpdated":\s*"([^"]+)"/);
const stashedMatch = (beforeConflict + stashedSection).match(/"links":\s*\[([\s\S]*)\],\s*"lastUpdated":\s*"([^"]+)"/);

if (!upstreamMatch || !stashedMatch) {
  console.error('Could not parse JSON sections');
  process.exit(1);
}

// Parse upstream data
const upstreamData = JSON.parse(`{"links":[${upstreamMatch[1]}],"lastUpdated":"${upstreamMatch[2]}"}`);
const stashedData = JSON.parse(`{"links":[${stashedMatch[1]}],"lastUpdated":"${stashedMatch[2]}"}`);

// Merge links
const allLinks = [...upstreamData.links, ...stashedData.links];
const uniqueLinks = [];
const seenUrls = new Set();

for (const link of allLinks) {
  if (!seenUrls.has(link.url)) {
    seenUrls.add(link.url);
    uniqueLinks.push(link);
  }
}

// Sort by timestamp descending
uniqueLinks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// Create final JSON
const finalData = {
  links: uniqueLinks,
  lastUpdated: new Date().toISOString()
};

// Write to both locations
fs.writeFileSync(dataPath, JSON.stringify(finalData, null, 2));
fs.writeFileSync(publicPath, JSON.stringify(finalData, null, 2));

console.log(`✅ Merged successfully: ${uniqueLinks.length} unique links`);
console.log(`   Upstream had: ${upstreamData.links.length} links`);
console.log(`   Stashed had: ${stashedData.links.length} links`);
console.log(`   Duplicates removed: ${allLinks.length - uniqueLinks.length}`);
