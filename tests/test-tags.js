// Test script to verify tag input functionality

console.log('Testing tag input logic...\n');

// Simulated state
let currentTag = '';
let newLink = { tags: [] };

// Simulate the onChange handler
function handleChange(value) {
  console.log(`Input value: "${value}"`);

  // Process comma-separated tags immediately when typed
  if (value.includes(',')) {
    const parts = value.split(',');
    // If we have at least one complete tag (something before the comma)
    if (parts.length > 1 && parts[0].trim()) {
      const completedTags = parts.slice(0, -1).map(t => t.trim()).filter(t => t);
      const remainingText = parts[parts.length - 1];

      // Add all completed tags (those before commas)
      const newTags = completedTags.filter(t => !newLink.tags.includes(t));
      const tagsToAdd = newTags.slice(0, 10 - newLink.tags.length);

      if (tagsToAdd.length > 0) {
        newLink.tags = [...newLink.tags, ...tagsToAdd];
        console.log(`  Added tags: ${tagsToAdd.join(', ')}`);
      }

      // Keep only the text after the last comma
      currentTag = remainingText;
      console.log(`  Remaining in input: "${remainingText}"`);
    } else {
      // Just update the input normally if no complete tags yet
      currentTag = value;
      console.log(`  Input updated to: "${value}"`);
    }
  } else {
    // No comma, just update normally
    currentTag = value;
    console.log(`  Input updated to: "${value}"`);
  }

  console.log(`  Current tags: [${newLink.tags.join(', ')}]`);
  console.log(`  Current input: "${currentTag}"\n`);
}

// Test cases
console.log('Test 1: Single tag without comma');
handleChange('javascript');

console.log('Test 2: Single tag with comma');
handleChange('javascript,');

console.log('Test 3: Continuing to type after comma');
handleChange(' react');

console.log('Test 4: Multiple tags at once');
currentTag = '';
newLink.tags = [];
handleChange('javascript, react, nodejs');

console.log('Test 5: Adding another tag with comma');
handleChange(', express');

console.log('Test 6: Typing individual characters to form "test,"');
currentTag = '';
newLink.tags = [];
handleChange('t');
handleChange('te');
handleChange('tes');
handleChange('test');
handleChange('test,');

console.log('Test 7: Pasting multiple tags');
currentTag = '';
newLink.tags = [];
handleChange('frontend, backend, database, api');

console.log('\nFinal state:');
console.log('Tags:', newLink.tags);
console.log('Current input:', currentTag);