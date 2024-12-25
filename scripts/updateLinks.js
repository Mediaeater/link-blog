const fs = require('fs');
const path = require('path');

const linksPath = path.join(__dirname, '../public/data/links.json');

// Function to add a new link
function addLink(url, source, tags) {
  const linksFile = fs.readFileSync(linksPath);
  const linksData = JSON.parse(linksFile);
  
  const newLink = {
    id: Date.now().toString(),
    url,
    source,
    tags
  };
  
  linksData.links.push(newLink);
  
  fs.writeFileSync(linksPath, JSON.stringify(linksData, null, 2));
  console.log('Link added successfully!');
}

// Example usage:
// node scripts/updateLinks.js "https://example.com" "Example Site" "tag1,tag2,tag3"
if (process.argv.length >= 5) {
  const url = process.argv[2];
  const source = process.argv[3];
  const tags = process.argv[4].split(',');
  addLink(url, source, tags);
} else {
  console.log('Usage: node updateLinks.js <url> <source> <tags-comma-separated>');
}