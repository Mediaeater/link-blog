import { describe, test, expect, vi, beforeEach, afterEach } from 'vitest';

// --- Unit tests for validation functions ---

// Import validation functions directly from server.cjs
const { validateLink, fixLink, validateLinksPayload } = require('../server.cjs');

describe('validateLink', () => {
  test.each([
    [{ url: 'https://example.com' }, true],
    [{ url: 'https://example.com', source: 'Example', tags: ['test'] }, true],
    [{ url: 'http://localhost:3000' }, true],
  ])('accepts valid link %j', (link, expected) => {
    expect(validateLink(link)).toBe(expected);
  });

  test.each([
    [null, false],
    [undefined, false],
    ['string', false],
    [42, false],
    [{}, false],
    [{ source: 'no url' }, false],
    [{ url: '' }, false],
  ])('rejects invalid link %j -> %s', (link, expected) => {
    expect(validateLink(link)).toBe(expected);
  });
});

describe('fixLink', () => {
  test('sets source to url when source is missing', () => {
    const link = { url: 'https://example.com' };
    const fixed = fixLink(link);
    expect(fixed.source).toBe('https://example.com');
  });

  test('preserves existing source', () => {
    const link = { url: 'https://example.com', source: 'Example' };
    const fixed = fixLink(link);
    expect(fixed.source).toBe('Example');
  });

  test('initializes missing tags as empty array', () => {
    const link = { url: 'https://example.com' };
    const fixed = fixLink(link);
    expect(fixed.tags).toEqual([]);
  });

  test('converts non-array tags to empty array', () => {
    const link = { url: 'https://example.com', tags: 'not-an-array' };
    const fixed = fixLink(link);
    expect(fixed.tags).toEqual([]);
  });

  test('filters non-string values from tags', () => {
    const link = { url: 'https://example.com', tags: ['valid', 123, null, 'also-valid'] };
    const fixed = fixLink(link);
    expect(fixed.tags).toEqual(['valid', 'also-valid']);
  });

  test('preserves valid tags', () => {
    const link = { url: 'https://example.com', tags: ['react', 'javascript'] };
    const fixed = fixLink(link);
    expect(fixed.tags).toEqual(['react', 'javascript']);
  });
});

describe('validateLinksPayload', () => {
  test('accepts valid payload', () => {
    const payload = { links: [{ url: 'https://example.com' }] };
    expect(validateLinksPayload(payload)).toEqual({ valid: true });
  });

  test('accepts empty links array', () => {
    expect(validateLinksPayload({ links: [] })).toEqual({ valid: true });
  });

  test.each([
    [null, 'Invalid data format'],
    [undefined, 'Invalid data format'],
    ['string', 'Invalid data format'],
    [{}, 'Links must be an array'],
    [{ links: 'not-array' }, 'Links must be an array'],
  ])('rejects %j with error %s', (payload, expectedError) => {
    const result = validateLinksPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.error).toBe(expectedError);
  });

  test('rejects payload with too many links', () => {
    const links = Array.from({ length: 50001 }, (_, i) => ({ url: `https://example.com/${i}` }));
    const result = validateLinksPayload({ links });
    expect(result.valid).toBe(false);
    expect(result.error).toBe('Too many links (max 50000)');
  });

  test('rejects payload with invalid links', () => {
    const payload = { links: [{ url: 'https://ok.com' }, { noUrl: true }, { noUrl: true }] };
    const result = validateLinksPayload(payload);
    expect(result.valid).toBe(false);
    expect(result.error).toBe('2 invalid links found');
  });
});

// --- HTTP endpoint tests ---

import request from 'supertest';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

describe('API endpoints', () => {
  let app;
  const projectRoot = path.resolve(import.meta.dirname, '..');
  const publicDataDir = path.join(projectRoot, 'public', 'data');
  const dataDir = path.join(projectRoot, 'data');

  // Back up original files before tests, restore after
  let originalPublicLinks;
  let originalDataLinks;

  beforeEach(async () => {
    // Save original files
    try {
      originalPublicLinks = await fs.readFile(path.join(publicDataDir, 'links.json'), 'utf8');
    } catch {
      originalPublicLinks = null;
    }
    try {
      originalDataLinks = await fs.readFile(path.join(dataDir, 'links.json'), 'utf8');
    } catch {
      originalDataLinks = null;
    }
  });

  afterEach(async () => {
    // Restore original files
    if (originalPublicLinks !== null) {
      await fs.writeFile(path.join(publicDataDir, 'links.json'), originalPublicLinks);
    }
    if (originalDataLinks !== null) {
      await fs.writeFile(path.join(dataDir, 'links.json'), originalDataLinks);
    }

    // Reset module cache so each test gets a fresh app
    vi.resetModules();
  });

  function getApp() {
    // Dynamic require to get a fresh app instance
    return require('../server.cjs');
  }

  describe('POST /api/save-links', () => {
    test('saves links to both JSON files', async () => {
      app = getApp();
      const links = [
        { url: 'https://example.com/1', source: 'Test 1', tags: ['test'], timestamp: '2025-06-01T00:00:00Z' },
        { url: 'https://example.com/2', source: 'Test 2', tags: ['test'], timestamp: '2025-06-02T00:00:00Z' },
      ];

      const res = await request(app)
        .post('/api/save-links')
        .send({ links })
        .expect(200);

      expect(res.body.success).toBe(true);
      expect(res.body.count).toBe(2);
      expect(res.body.lastUpdated).toBeDefined();

      // Verify files were written
      const publicData = JSON.parse(await fs.readFile(path.join(publicDataDir, 'links.json'), 'utf8'));
      const dataData = JSON.parse(await fs.readFile(path.join(dataDir, 'links.json'), 'utf8'));

      expect(publicData.links).toHaveLength(2);
      expect(dataData.links).toHaveLength(2);
    });

    test('sorts links by timestamp (newest first)', async () => {
      app = getApp();
      const links = [
        { url: 'https://example.com/old', timestamp: '2025-01-01T00:00:00Z' },
        { url: 'https://example.com/new', timestamp: '2025-12-01T00:00:00Z' },
        { url: 'https://example.com/mid', timestamp: '2025-06-01T00:00:00Z' },
      ];

      await request(app)
        .post('/api/save-links')
        .send({ links })
        .expect(200);

      const saved = JSON.parse(await fs.readFile(path.join(publicDataDir, 'links.json'), 'utf8'));
      expect(saved.links[0].url).toBe('https://example.com/new');
      expect(saved.links[1].url).toBe('https://example.com/mid');
      expect(saved.links[2].url).toBe('https://example.com/old');
    });

    test('returns correct response shape', async () => {
      app = getApp();
      const res = await request(app)
        .post('/api/save-links')
        .send({ links: [{ url: 'https://example.com' }] })
        .expect(200);

      expect(res.body).toMatchObject({
        success: true,
        message: 'Links saved successfully',
        count: 1,
      });
      expect(typeof res.body.lastUpdated).toBe('string');
    });

    test('rejects invalid payload with 400', async () => {
      app = getApp();
      const res = await request(app)
        .post('/api/save-links')
        .send({ links: [{ noUrl: true }] })
        .expect(400);

      expect(res.body.error).toMatch(/invalid links found/);
    });

    test('rejects missing links array with 400', async () => {
      app = getApp();
      const res = await request(app)
        .post('/api/save-links')
        .send({ notLinks: [] })
        .expect(400);

      expect(res.body.error).toBe('Links must be an array');
    });

    test('auto-fixes links before saving', async () => {
      app = getApp();
      const links = [
        { url: 'https://example.com' }, // no source, no tags
      ];

      await request(app)
        .post('/api/save-links')
        .send({ links })
        .expect(200);

      const saved = JSON.parse(await fs.readFile(path.join(publicDataDir, 'links.json'), 'utf8'));
      expect(saved.links[0].source).toBe('https://example.com');
      expect(saved.links[0].tags).toEqual([]);
    });
  });

  describe('GET /api/links', () => {
    test('returns saved links data', async () => {
      app = getApp();

      // Write known data first
      const testData = {
        links: [{ url: 'https://example.com', source: 'Test', tags: [] }],
        version: '1.1.0',
        lastUpdated: '2025-01-01T00:00:00Z',
      };
      await fs.writeFile(
        path.join(publicDataDir, 'links.json'),
        JSON.stringify(testData, null, 2),
      );

      const res = await request(app)
        .get('/api/links')
        .expect(200);

      expect(res.body.links).toHaveLength(1);
      expect(res.body.links[0].url).toBe('https://example.com');
      expect(res.body.version).toBe('1.1.0');
    });
  });

  describe('GET /api/archive/:year', () => {
    test('rejects non-numeric year with 400', async () => {
      app = getApp();
      const res = await request(app)
        .get('/api/archive/abc')
        .expect(400);

      expect(res.body.error).toMatch(/Invalid year/);
    });

    test('rejects year before 2000 with 400', async () => {
      app = getApp();
      const res = await request(app)
        .get('/api/archive/1999')
        .expect(400);

      expect(res.body.error).toMatch(/Invalid year/);
    });

    test('rejects year too far in the future with 400', async () => {
      app = getApp();
      const futureYear = new Date().getFullYear() + 2;
      const res = await request(app)
        .get(`/api/archive/${futureYear}`)
        .expect(400);

      expect(res.body.error).toMatch(/Invalid year/);
    });

    test('accepts current year', async () => {
      app = getApp();
      const currentYear = new Date().getFullYear();
      // This might 500 if archive doesn't exist, but should not 400
      const res = await request(app)
        .get(`/api/archive/${currentYear}`);

      expect(res.status).not.toBe(400);
    });
  });
});
