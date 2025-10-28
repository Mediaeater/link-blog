const fs = require('fs');
const path = require('path');

const linksPath = path.join(__dirname, '../data/links.json');
const publicLinksPath = path.join(__dirname, '../public/data/links.json');

// Missing links from origin/main
const missingLinks = [
  {
    "id": 1759116996981.6323,
    "url": "https://www.bloomberg.com/news/newsletters/2025-09-25/ceo-of-inception-point-ai-vows-to-keep-mass-publishing-podcasts-despite-backlash?",
    "source": "bloomberg.com",
    "pullQuote": "",
    "tags": [],
    "timestamp": "2025-09-29T03:36:36.981Z",
    "visits": 0
  },
  {
    "id": 1759107086114.2097,
    "url": "https://petition.parliament.uk/petitions/730194",
    "source": "Petition: Do not introduce Digital ID cards",
    "pullQuote": "",
    "tags": [],
    "timestamp": "2025-09-29T00:51:26.114Z",
    "visits": 0
  },
  {
    "id": 1759107086115.2908,
    "url": "https://www.bloomberg.com/news/newsletters/2025-09-25/ceo-of-inception-point-ai-vows-to-keep-mass-publishing-podcasts-despite-backlash?",
    "source": "bloomberg.com",
    "pullQuote": "",
    "tags": [],
    "timestamp": "2025-09-29T00:51:26.115Z",
    "visits": 0
  }
];

console.log('Reading existing links...');
const existingData = JSON.parse(fs.readFileSync(linksPath, 'utf-8'));

console.log(`Current link count: ${existingData.links.length}`);
console.log(`Adding ${missingLinks.length} missing links...`);

// Add missing links
const allLinks = [...existingData.links, ...missingLinks];

// Sort by timestamp (newest first)
allLinks.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

// Create updated data object
const updatedData = {
  links: allLinks,
  lastUpdated: new Date().toISOString()
};

// Write to both locations
console.log('Writing to data/links.json...');
fs.writeFileSync(linksPath, JSON.stringify(updatedData, null, 2));

console.log('Writing to public/data/links.json...');
fs.writeFileSync(publicLinksPath, JSON.stringify(updatedData, null, 2));

console.log(`\nMerge complete!`);
console.log(`Total links: ${allLinks.length}`);
console.log(`Missing links added: ${missingLinks.length}`);
