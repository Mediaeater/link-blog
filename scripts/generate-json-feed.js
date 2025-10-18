import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const generateJSONFeed = async () => {
  // Read links.json
  const linksPath = path.join(__dirname, '../public/data/links.json');
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  // Build JSON Feed object following v1.1 spec
  const feed = {
    version: 'https://jsonfeed.org/version/1.1',
    title: 'Mediaeater Digest',
    home_page_url: 'https://mediaeater.github.io/link-blog/',
    feed_url: 'https://mediaeater.github.io/link-blog/data/feed.json',
    description: 'Latest links and resources - mediaeater - dispute the text',
    icon: 'https://mediaeater.github.io/link-blog/favicon.ico',
    favicon: 'https://mediaeater.github.io/link-blog/favicon.ico',
    language: 'en',
    authors: [
      {
        name: 'Mediaeater',
        url: 'https://mediaeater.github.io/link-blog/'
      }
    ],
    items: []
  };

  // Add items from links
  linksData.links.forEach(link => {
    const item = {
      id: link.id.toString(),
      url: link.url,
      title: link.source,
      date_published: link.timestamp || linksData.lastUpdated,
      tags: link.tags || []
    };

    // Add content_text if pullQuote exists
    if (link.pullQuote && link.pullQuote.trim()) {
      item.content_text = link.pullQuote;
      item.summary = link.pullQuote.substring(0, 150) + (link.pullQuote.length > 150 ? '...' : '');
    }

    // Add content_html with formatted content
    const htmlParts = [];

    if (link.pullQuote && link.pullQuote.trim()) {
      htmlParts.push(`<blockquote>${escapeHtml(link.pullQuote)}</blockquote>`);
    }

    if (link.tags && link.tags.length > 0) {
      htmlParts.push(`<p><strong>Tags:</strong> ${link.tags.join(', ')}</p>`);
    }

    if (link.isPinned) {
      htmlParts.push('<p><em>Pinned</em></p>');
    }

    if (htmlParts.length > 0) {
      item.content_html = htmlParts.join('\n');
    }

    // Add optional metadata
    if (link.image) {
      item.image = link.image;
    }

    if (link.favicon) {
      item.banner_image = link.favicon;
    }

    // Add custom extensions for link blog specific data
    item._link_blog = {
      visits: link.visits || 0,
      is_pinned: link.isPinned || false
    };

    if (link.lastVisited) {
      item._link_blog.last_visited = link.lastVisited;
    }

    feed.items.push(item);
  });

  // Sort items by date, newest first
  feed.items.sort((a, b) =>
    new Date(b.date_published) - new Date(a.date_published)
  );

  // Write the JSON Feed
  const feedPath = path.join(__dirname, '../public/data/feed.json');
  fs.writeFileSync(feedPath, JSON.stringify(feed, null, 2));

  console.log(`JSON Feed generated successfully at ${feedPath}`);
  console.log(`Total items: ${feed.items.length}`);
};

// Helper function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

generateJSONFeed().catch(console.error);
