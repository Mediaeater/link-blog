const express = require('express');
const fs = require('fs').promises;
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = 3001;

// Enable CORS for the Vite dev server
app.use(cors({
  origin: 'http://localhost:5174',
  methods: ['GET', 'POST'],
  credentials: true
}));

app.use(express.json());

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

app.listen(PORT, () => {
  console.log(`
🚀 Link Blog API Server running on http://localhost:${PORT}
   
   This server handles saving your links to the JSON files.
   Keep this running alongside your Vite dev server.
   
   Endpoints:
   - POST /api/save-links - Save links to JSON files
   - GET  /api/links      - Get current links
  `);
});