const { Feed } = require('feed');
const fs = require('fs').promises;
const path = require('path');

const SITE_URL = process.env.SITE_URL || 'https://newsfeeds.net';

async function generateFeeds() {
  try {
    // Read the links data
    const dataPath = path.join(__dirname, '..', 'data', 'links.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(content);

    // Create feed instance
    const feed = new Feed({
      title: 'mediaeater - dispute the text',
      description: 'A curated collection of interesting links and resources',
      id: `${SITE_URL}/`,
      link: `${SITE_URL}/`,
      language: 'en',
      image: `${SITE_URL}/favicon.png`,
      favicon: `${SITE_URL}/favicon.ico`,
      copyright: `All rights reserved ${new Date().getFullYear()}, mediaeater`,
      updated: new Date(data.lastUpdated || new Date()),
      generator: 'Feed for Node.js',
      feedLinks: {
        atom: `${SITE_URL}/feed.atom`,
        json: `${SITE_URL}/data/feed.json`
      },
      author: {
        name: 'mediaeater',
        link: `${SITE_URL}/`
      }
    });

    // Sort links by timestamp (newest first)
    const sortedLinks = [...(data.links || [])]
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      .slice(0, 50); // Limit to 50 most recent items

    // Add each link as a feed item
    sortedLinks.forEach(link => {
      const itemDate = new Date(link.timestamp);

      // Build description from available fields
      let description = '';
      if (link.pullQuote) {
        description += `<blockquote>${link.pullQuote}</blockquote>`;
      }
      if (link.tags && link.tags.length > 0) {
        description += `<p>Tags: ${link.tags.join(', ')}</p>`;
      }
      if (!description) {
        description = `<p>Link to: ${link.source || link.url}</p>`;
      }

      feed.addItem({
        title: link.source || `Link: ${link.url}`,
        id: link.id ? String(link.id) : link.url,
        link: link.url,
        description: description,
        content: description,
        date: itemDate,
        published: itemDate,
        author: [{
          name: 'mediaeater'
        }]
      });
    });

    return {
      atom: feed.atom1(),
      json: feed.json1()
    };
  } catch (error) {
    console.error('Error generating feeds:', error);
    throw error;
  }
}

module.exports = { generateFeeds };