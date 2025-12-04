#!/usr/bin/env node

const { loadLinks, saveLinks } = require('./lib/data-utils.cjs');

console.log('Cleaning tags in links data...\n');

try {
  // Read current data using shared utility
  const data = loadLinks();

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
    // Write cleaned data using shared utility
    saveLinks(data.links);

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