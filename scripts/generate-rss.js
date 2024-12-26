
import { Feed } from 'feed';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateRSS = async () => {
  // Read links.json
  const linksPath = path.join(__dirname, '../public/data/links.json');
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  const feed = new Feed({
    title: "Mediaeater Digest",
    description: "Latest links and resources",
    id: "https://mediaeater.github.io/link-blog/",
    link: "https://mediaeater.github.io/link-blog/",
    language: "en",
    updated: new Date(linksData.lastUpdated),
    feedLinks: {
      rss2: "https://mediaeater.github.io/link-blog/feed.xml"
    },
    author: {
      name: "Mediaeater",
      link: "https://mediaeater.github.io/link-blog/"
    }
  });

  // Add items
  linksData.links.forEach(link => {
    feed.addItem({
      title: link.source,
      id: link.id.toString(),
      link: link.url,
      description: `Tags: ${link.tags.join(', ')}`,
      date: new Date(link.timestamp || linksData.lastUpdated)
    });
  });

  // Write the RSS feed
  const rssPath = path.join(__dirname, '../public/feed.xml');
  fs.writeFileSync(rssPath, feed.rss2());
};

generateRSS().catch(console.error);