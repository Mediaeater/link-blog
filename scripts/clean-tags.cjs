#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Load the current links data
const dataPath = path.join(__dirname, '..', 'data', 'links.json');
const publicDataPath = path.join(__dirname, '..', 'public', 'data', 'links.json');

console.log('Cleaning tags in links data...\n');

try {
  // Read current data
  const data = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

  let totalFixed = 0;
  let linksModified = 0;

  // Process each link
  data.links.forEach(link => {
    if (link.tags && Array.isArray(link.tags)) {
      const originalTags = [...link.tags];

      // Clean tags: trim whitespace and convert to lowercase
      link.tags = link.tags
        .map(tag => tag.trim().toLowerCase())
        .filter(tag => tag.length > 0);

      // Remove duplicates
      link.tags = [...new Set(link.tags)];

      // Check if we made changes
      if (JSON.stringify(originalTags) !== JSON.stringify(link.tags)) {
        linksModified++;
        totalFixed += originalTags.length - link.tags.length;
        console.log(`Fixed link: ${link.source}`);
        console.log(`  Before: [${originalTags.map(t => `"${t}"`).join(', ')}]`);
        console.log(`  After:  [${link.tags.map(t => `"${t}"`).join(', ')}]`);
      }
    }
  });

  if (linksModified > 0) {
    // Write cleaned data to both locations
    const jsonString = JSON.stringify(data, null, 2);

    fs.writeFileSync(dataPath, jsonString);
    console.log(`\n✅ Updated: ${dataPath}`);

    fs.writeFileSync(publicDataPath, jsonString);
    console.log(`✅ Updated: ${publicDataPath}`);

    console.log(`\nCleaning complete!`);
    console.log(`- Links modified: ${linksModified}`);
    console.log(`- Total tags fixed: ${totalFixed}`);
  } else {
    console.log('No tags needed cleaning. All tags are properly formatted.');
  }

  // Show tag statistics
  const tagCount = {};
  data.links.forEach(link => {
    if (link.tags) {
      link.tags.forEach(tag => {
        tagCount[tag] = (tagCount[tag] || 0) + 1;
      });
    }
  });

  const sortedTags = Object.entries(tagCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20);

  console.log('\nTop 20 tags after cleaning:');
  sortedTags.forEach(([tag, count]) => {
    console.log(`  ${tag}: ${count}`);
  });

} catch (error) {
  console.error('Error cleaning tags:', error);
  process.exit(1);
}