const fs = require('fs');
const path = require('path');

// Read the newsfeeds JSON
const newsfeedsPath = '/tmp/newsfeeds.json';
const linksPath = path.join(__dirname, '../data/links.json');
const publicLinksPath = path.join(__dirname, '../public/data/links.json');

console.log('Reading newsfeeds data...');
const newsfeedsData = JSON.parse(fs.readFileSync(newsfeedsPath, 'utf-8'));
const existingData = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));

console.log(`Found ${newsfeedsData.items.length} items in newsfeeds`);
console.log(`Found ${existingData.links.length} existing links`);

// Create a Set of existing URLs for deduplication
const existingUrls = new Set(existingData.links.map(link => link.url));
const existingIds = new Set(existingData.links.map(link => link.id));

// Convert newsfeeds items to link blog format
const newLinks = [];
let duplicates = 0;

for (const item of newsfeedsData.items) {
  // Skip if URL already exists
  if (existingUrls.has(item.url)) {
    duplicates++;
    continue;
  }

  // Skip if ID already exists
  if (existingIds.has(item.id)) {
    duplicates++;
    continue;
  }

  const newLink = {
    id: typeof item.id === 'string' ? parseFloat(item.id) : item.id,
    url: item.url,
    source: item.title || item.url,
    pullQuote: item.content_text || item.summary || '',
    tags: item.tags || [],
    timestamp: item.date_published,
    visits: item._link_blog?.visits || 0
  };

  // Add isPinned if it exists
  if (item._link_blog?.is_pinned) {
    newLink.isPinned = true;
  }

  newLinks.push(newLink);
}

console.log(`Found ${duplicates} duplicates (skipped)`);
console.log(`Importing ${newLinks.length} new links`);

// Merge with existing links (new links first)
const mergedLinks = [...newLinks, ...existingData.links];

// Sort by timestamp (newest first)
mergedLinks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// Create updated data object
const updatedData = {
  links: mergedLinks,
  lastUpdated: new Date().toISOString()
};

// Write to both locations
console.log('Writing to data/links.json...');
fs.writeFileSync(linksPath, JSON.stringify(updatedData, null, 2));

console.log('Writing to public/data/links.json...');
fs.writeFileSync(publicLinksPath, JSON.stringify(updatedData, null, 2));

console.log(`\nImport complete!`);
console.log(`Total links: ${mergedLinks.length}`);
console.log(`New links added: ${newLinks.length}`);
console.log(`Duplicates skipped: ${duplicates}`);
