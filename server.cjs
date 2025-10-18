const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const { generateRSS } = require('./utils/rss-generator.cjs');
const activityPubRoutes = require('./routes/activitypub.cjs');

const app = express();
const PORT = 3001;

// Enable CORS for the Vite dev server (but not for ActivityPub endpoints)
app.use((req, res, next) => {
  // Skip CORS for ActivityPub endpoints
  if (req.path.startsWith('/.well-known/') ||
      req.path.startsWith('/actor/') ||
      req.path.startsWith('/note/') ||
      req.path.startsWith('/inbox')) {
    return next();
  }

  // Apply CORS for API endpoints
  cors({
    origin: 'http://localhost:5174',
    methods: ['GET', 'POST'],
    credentials: true
  })(req, res, next);
});

app.use(express.json());

// ActivityPub routes
app.use(activityPubRoutes);

// Endpoint to save links
app.post('/api/save-links', async (req, res) => {
  try {
    const data = req.body;
    
    if (!data || !data.links) {
      return res.status(400).json({ error: 'Invalid data format' });
    }

    // Add timestamp if not present
    if (!data.lastUpdated) {
      data.lastUpdated = new Date().toISOString();
    }

    const jsonContent = JSON.stringify(data, null, 2);
    
    // Save to both locations
    const publicPath = path.join(__dirname, 'public', 'data', 'links.json');
    const dataPath = path.join(__dirname, 'data', 'links.json');
    
    await fs.writeFile(publicPath, jsonContent);
    await fs.writeFile(dataPath, jsonContent);
    
    console.log(`✅ Saved ${data.links.length} links at ${new Date().toLocaleTimeString()}`);
    
    res.json({ 
      success: true, 
      message: 'Links saved successfully',
      count: data.links.length,
      lastUpdated: data.lastUpdated
    });
  } catch (error) {
    console.error('Error saving links:', error);
    res.status(500).json({ error: 'Failed to save links' });
  }
});

// Endpoint to get links (optional, for consistency)
app.get('/api/links', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'public', 'data', 'links.json');
    const content = await fs.readFile(dataPath, 'utf8');
    res.json(JSON.parse(content));
  } catch (error) {
    console.error('Error reading links:', error);
    res.status(500).json({ error: 'Failed to read links' });
  }
});

// RSS Feed endpoints
app.get('/feed.xml', async (req, res) => {
  try {
    const feeds = await generateRSS();
    res.set('Content-Type', 'application/rss+xml; charset=utf-8');
    res.send(feeds.rss);
  } catch (error) {
    console.error('Error generating RSS feed:', error);
    res.status(500).send('Error generating RSS feed');
  }
});

app.get('/atom.xml', async (req, res) => {
  try {
    const feeds = await generateRSS();
    res.set('Content-Type', 'application/atom+xml; charset=utf-8');
    res.send(feeds.atom);
  } catch (error) {
    console.error('Error generating Atom feed:', error);
    res.status(500).send('Error generating Atom feed');
  }
});

app.get('/feed.json', async (req, res) => {
  try {
    const feeds = await generateRSS();
    res.set('Content-Type', 'application/feed+json; charset=utf-8');
    res.send(feeds.json);
  } catch (error) {
    console.error('Error generating JSON feed:', error);
    res.status(500).send('Error generating JSON feed');
  }
});

app.listen(PORT, () => {
  console.log(`
🚀 Link Blog API Server running on http://localhost:${PORT}

   This server handles saving your links to the JSON files.
   Keep this running alongside your Vite dev server.

   API Endpoints:
   - POST /api/save-links - Save links to JSON files
   - GET  /api/links      - Get current links

   RSS Feed Endpoints:
   - GET  /feed.xml       - RSS 2.0 feed
   - GET  /atom.xml       - Atom feed
   - GET  /feed.json      - JSON feed

   ActivityPub Endpoints:
   - GET  /.well-known/webfinger - WebFinger discovery
   - GET  /actor/mediaeater      - Actor profile
   - GET  /actor/mediaeater/outbox    - Published posts
   - GET  /actor/mediaeater/followers - Followers list
   - POST /actor/mediaeater/inbox     - Receive activities
   - GET  /note/:id              - Individual note

   🌐 To enable federation, ensure this server is accessible at:
      https://newsfeeds.net
  `);
});