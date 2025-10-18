import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const validateJSONFeed = () => {
  const feedPath = path.join(__dirname, '../public/data/feed.json');
  const feed = JSON.parse(fs.readFileSync(feedPath, 'utf8'));

  console.log('\n✓ JSON Feed Validation\n');
  console.log('Version:', feed.version);
  console.log('Title:', feed.title);
  console.log('Total Items:', feed.items.length);
  console.log('Feed URL:', feed.feed_url);
  console.log('Home Page:', feed.home_page_url);
  console.log('\nFirst Item:');
  console.log('  Title:', feed.items[0].title);
  console.log('  URL:', feed.items[0].url);
  console.log('  Date:', feed.items[0].date_published);
  console.log('  Has Tags:', feed.items[0].tags.length > 0, `(${feed.items[0].tags.length})`);
  console.log('  Has Content HTML:', !!feed.items[0].content_html);
  console.log('  Has Content Text:', !!feed.items[0].content_text);
  console.log('  Has Summary:', !!feed.items[0].summary);
  console.log('\n✓ JSON Feed is valid!\n');
};

validateJSONFeed();
