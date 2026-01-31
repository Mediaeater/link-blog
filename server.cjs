const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const { generateRSS } = require('./utils/rss-generator.cjs');
const activityPubRoutes = require('./routes/activitypub.cjs');
const ArchiveManager = require('./utils/archive-manager.cjs');
const DigestManager = require('./utils/digest-manager.cjs');

const app = express();
const digestManager = new DigestManager();
const PORT = 3001;
const archiveManager = new ArchiveManager();

// Rate limiting - prevent abuse
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per window
  message: { error: 'Too many requests, please try again later' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Stricter limit for write operations
const writeLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // limit writes to 10 per minute
  message: { error: 'Too many save requests, please slow down' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Input validation helper
function validateLink(link) {
  if (!link || typeof link !== 'object') return false;
  // Be lenient - just require url exists
  if (!link.url) return false;
  return true;
}

function fixLink(link) {
  // Auto-fix common issues
  if (!link.source) link.source = link.url;
  if (!link.tags) link.tags = [];
  if (!Array.isArray(link.tags)) link.tags = [];
  link.tags = link.tags.filter(t => typeof t === 'string');
  return link;
}

function validateLinksPayload(data) {
  if (!data || typeof data !== 'object') {
    return { valid: false, error: 'Invalid data format' };
  }
  if (!Array.isArray(data.links)) {
    return { valid: false, error: 'Links must be an array' };
  }
  if (data.links.length > 50000) {
    return { valid: false, error: 'Too many links (max 50000)' };
  }
  const invalidLinks = data.links.filter(link => !validateLink(link));
  if (invalidLinks.length > 0) {
    return { valid: false, error: `${invalidLinks.length} invalid links found` };
  }
  return { valid: true };
}

// CORS configuration - environment-aware
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  'http://localhost:5175',
  'http://localhost:5176',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:5174',
  'http://127.0.0.1:5175',
  'http://127.0.0.1:5176',
  'http://newsfeeds.net:5174',
  'http://newsfeeds.net:5173',
  'https://newsfeeds.net',
  process.env.SITE_URL
].filter(Boolean);

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
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET', 'POST'],
    credentials: false // Disabled unless needed
  })(req, res, next);
});

// Apply rate limiting to API routes
app.use('/api/', apiLimiter);

// Reduce JSON payload limit (2MB is plenty for links)
app.use(express.json({ limit: '2mb' }));

// ActivityPub routes
app.use(activityPubRoutes);

// Endpoint to save links (saves all links without auto-archiving)
app.post('/api/save-links', writeLimiter, async (req, res) => {
  try {
    const data = req.body;

    // Auto-fix links before validation
    if (data && Array.isArray(data.links)) {
      data.links = data.links.map(fixLink);
    }

    // Validate payload structure and content
    const validation = validateLinksPayload(data);
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // Sort links by timestamp (newest first)
    data.links.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Prepare data with metadata
    const saveData = {
      links: data.links,
      version: data.version || '1.1.0',
      lastUpdated: new Date().toISOString()
    };

    const jsonContent = JSON.stringify(saveData, null, 2);

    // Save to both locations
    const publicPath = path.join(__dirname, 'public', 'data', 'links.json');
    const dataPath = path.join(__dirname, 'data', 'links.json');

    await fs.writeFile(publicPath, jsonContent);
    await fs.writeFile(dataPath, jsonContent);

    console.log(`✅ Saved ${data.links.length} links at ${new Date().toLocaleTimeString()}`);

    // Check if digest should be auto-generated
    let digestResult = null;
    try {
      digestResult = await digestManager.checkAndAutoGenerate();
      if (digestResult.success) {
        console.log(`📧 Auto-generated Digest #${digestResult.digestNumber} with ${digestResult.count} links → ${digestResult.filename}`);
      }
    } catch (digestError) {
      console.error('Digest auto-check error:', digestError.message);
    }

    res.json({
      success: true,
      message: 'Links saved successfully',
      count: data.links.length,
      lastUpdated: saveData.lastUpdated,
      digest: digestResult?.success ? {
        generated: true,
        number: digestResult.digestNumber,
        count: digestResult.count,
        filename: digestResult.filename
      } : null
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

// Sync status - shows current state for debugging multi-location workflow
app.get('/api/sync-status', async (req, res) => {
  try {
    const dataPath = path.join(__dirname, 'public', 'data', 'links.json');
    const content = await fs.readFile(dataPath, 'utf8');
    const data = JSON.parse(content);
    const currentYear = new Date().getFullYear();
    const thisYearLinks = data.links.filter(l =>
      l.timestamp && l.timestamp.startsWith(String(currentYear))
    );
    res.json({
      totalLinks: data.links.length,
      thisYearLinks: thisYearLinks.length,
      lastUpdated: data.lastUpdated,
      message: `${data.links.length} total links, ${thisYearLinks.length} from ${currentYear}`
    });
  } catch (error) {
    console.error('Error reading sync status:', error);
    res.status(500).json({ error: 'Failed to read sync status' });
  }
});

// Get list of archived years
app.get('/api/archives', async (req, res) => {
  try {
    const metadata = await archiveManager.getArchiveMetadata();
    res.json(metadata);
  } catch (error) {
    console.error('Error reading archive metadata:', error);
    res.status(500).json({ error: 'Failed to read archive metadata' });
  }
});

// Get archive for a specific year
app.get('/api/archive/:year', async (req, res) => {
  try {
    const year = parseInt(req.params.year);
    const currentYear = new Date().getFullYear();

    // Validate year is a reasonable range (2000 to next year)
    if (isNaN(year) || year < 2000 || year > currentYear + 1) {
      return res.status(400).json({ error: 'Invalid year (must be 2000-' + (currentYear + 1) + ')' });
    }

    const archive = await archiveManager.loadYearArchive(year);
    res.json(archive);
  } catch (error) {
    console.error(`Error reading archive for ${req.params.year}:`, error);
    res.status(500).json({ error: 'Failed to read archive' });
  }
});

// Digest endpoints
app.get('/api/digest/status', async (req, res) => {
  try {
    const status = await digestManager.getStatus();
    res.json(status);
  } catch (error) {
    console.error('Error getting digest status:', error);
    res.status(500).json({ error: 'Failed to get digest status' });
  }
});

app.post('/api/digest/generate', async (req, res) => {
  try {
    const { markAsDigested = false } = req.body || {};
    const result = await digestManager.createDigest(markAsDigested);
    res.json(result);
  } catch (error) {
    console.error('Error generating digest:', error);
    res.status(500).json({ error: 'Failed to generate digest' });
  }
});

// Digest archive endpoints
app.get('/api/digests', async (req, res) => {
  try {
    const digestsPath = path.join(__dirname, 'data', 'digests.json');
    const content = await fs.readFile(digestsPath, 'utf8');
    const data = JSON.parse(content);
    // Return digests with id > 0 (exclude the initial digest), sorted by date desc
    const digests = data.digests
      .filter(d => d.id > 0 && d.filename)
      .map(d => ({
        id: d.id,
        timestamp: d.timestamp,
        count: d.count,
        filename: d.filename
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
    res.json({ digests });
  } catch (error) {
    console.error('Error reading digests:', error);
    res.status(500).json({ error: 'Failed to read digests' });
  }
});

app.get('/api/digest/:id', async (req, res) => {
  try {
    const digestId = parseInt(req.params.id);
    const digestsPath = path.join(__dirname, 'data', 'digests.json');
    const content = await fs.readFile(digestsPath, 'utf8');
    const data = JSON.parse(content);
    const digest = data.digests.find(d => d.id === digestId);
    if (!digest || !digest.filename) {
      return res.status(404).json({ error: 'Digest not found' });
    }
    const htmlPath = path.join(__dirname, 'data', 'digests', digest.filename);
    const html = await fs.readFile(htmlPath, 'utf8');
    res.json({
      id: digest.id,
      timestamp: digest.timestamp,
      count: digest.count,
      html
    });
  } catch (error) {
    console.error('Error reading digest:', error);
    res.status(500).json({ error: 'Failed to read digest' });
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

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`
🚀 Link Blog API Server running on http://localhost:${PORT}

   This server handles saving your links to the JSON files.
   Keep this running alongside your Vite dev server.

   API Endpoints:
   - POST /api/save-links - Save links to JSON files (auto-archives old years)
   - GET  /api/links      - Get current links
   - GET  /api/archives   - Get archive metadata
   - GET  /api/archive/:year - Get links from specific year

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

   📦 Archive System: Links are automatically archived by year on save.
      Current year stays in links.json, older years move to archive/
    `);
  });
}

module.exports = app;
module.exports.validateLink = validateLink;
module.exports.fixLink = fixLink;
module.exports.validateLinksPayload = validateLinksPayload;