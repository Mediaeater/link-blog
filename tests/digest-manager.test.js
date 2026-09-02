import { describe, test, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs';
import os from 'os';
import path from 'path';

const DigestManager = require('../utils/digest-manager.cjs');

let tmpDir;

beforeEach(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'digest-manager-'));
  fs.mkdirSync(path.join(tmpDir, 'data'));
});

afterEach(() => {
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

function writeDigests(digests) {
  fs.writeFileSync(
    path.join(tmpDir, 'data', 'digests.json'),
    JSON.stringify({ version: '2.0.0', cadence: 'weekly', digests })
  );
}

function writeLinks(links) {
  fs.writeFileSync(path.join(tmpDir, 'data', 'links.json'), JSON.stringify({ links }));
}

describe('loadDigests', () => {
  test('returns default structure when file missing', async () => {
    const manager = new DigestManager(tmpDir);
    const result = await manager.loadDigests();
    expect(result).toEqual({ version: '2.0.0', cadence: 'weekly', digests: [] });
  });

  test('throws on corrupt JSON', async () => {
    fs.writeFileSync(path.join(tmpDir, 'data', 'digests.json'), '{not valid json');
    const manager = new DigestManager(tmpDir);
    await expect(manager.loadDigests()).rejects.toThrow();
  });
});

describe('createDigest numbering', () => {
  test('assigns id 4 when existing ids are [0, 2, 3]', async () => {
    writeDigests([
      { id: 0, timestamp: '2026-01-01T00:00:00.000Z', linkIds: [], count: 0, filename: null, weekStart: null, weekEnd: null, title: '', writeup: '' },
      { id: 2, timestamp: '2026-02-01T00:00:00.000Z', linkIds: ['a'], count: 1, filename: 'digest-002.html', weekStart: '2026-02-01', weekEnd: '2026-02-01', title: 'Feb', writeup: '' },
      { id: 3, timestamp: '2026-03-01T00:00:00.000Z', linkIds: ['b'], count: 1, filename: 'digest-003.html', weekStart: '2026-03-01', weekEnd: '2026-03-01', title: 'Mar', writeup: '' },
    ]);
    writeLinks([
      { id: 'c', url: 'https://example.com', source: 'Example', pullQuote: '', tags: [], timestamp: '2026-04-01T00:00:00.000Z' },
    ]);

    const manager = new DigestManager(tmpDir);
    const result = await manager.createDigest('writeup text', true);

    expect(result.success).toBe(true);
    expect(result.digestNumber).toBe(4);

    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'data', 'digests.json'), 'utf8'));
    expect(saved.digests[saved.digests.length - 1].id).toBe(4);
  });
});

describe('createDigest linkIds subset', () => {
  test('digests only the selected ids and leaves the rest undigested', async () => {
    writeDigests([]);
    writeLinks([
      { id: 'infosec1', url: 'https://example.com/1', source: 'One', pullQuote: '', tags: [], timestamp: '2026-01-01T00:00:00.000Z' },
      { id: 'arts1', url: 'https://example.com/2', source: 'Two', pullQuote: '', tags: [], timestamp: '2026-01-02T00:00:00.000Z' },
      { id: 'infosec2', url: 'https://example.com/3', source: 'Three', pullQuote: '', tags: [], timestamp: '2026-01-03T00:00:00.000Z' },
    ]);

    const manager = new DigestManager(tmpDir);
    const result = await manager.createDigest('writeup', true, { linkIds: ['infosec1', 'infosec2'] });

    expect(result.success).toBe(true);
    expect(result.count).toBe(2);

    const remaining = await manager.getUndigestedLinks();
    expect(remaining.map(l => l.id)).toEqual(['arts1']);
  });

  test('errors when a requested id is unknown or already digested', async () => {
    writeDigests([
      { id: 1, timestamp: '2026-01-05T00:00:00.000Z', linkIds: ['done'], count: 1, filename: 'digest-001.html', weekStart: '2026-01-01', weekEnd: '2026-01-01', title: 'Jan', writeup: '' },
    ]);
    writeLinks([
      { id: 'done', url: 'https://example.com/done', source: 'Done', pullQuote: '', tags: [], timestamp: '2026-01-01T00:00:00.000Z' },
      { id: 'fresh', url: 'https://example.com/fresh', source: 'Fresh', pullQuote: '', tags: [], timestamp: '2026-01-02T00:00:00.000Z' },
    ]);

    const manager = new DigestManager(tmpDir);
    const result = await manager.createDigest('writeup', true, { linkIds: ['fresh', 'done', 'ghost'] });

    expect(result.success).toBe(false);
    expect(result.error).toContain('done');
    expect(result.error).toContain('ghost');

    const remaining = await manager.getUndigestedLinks();
    expect(remaining.map(l => l.id)).toEqual(['fresh']);
  });
});

describe('createDigest seoTitle', () => {
  test('persists seoTitle and stamps it into the page head', async () => {
    writeDigests([]);
    writeLinks([
      { id: 'a', url: 'https://example.com', source: 'Example', pullQuote: '', tags: [], timestamp: '2026-01-01T00:00:00.000Z' },
    ]);

    const manager = new DigestManager(tmpDir);
    const seoTitle = 'Custody of the Record · Jan 2026 | newsfeeds.net';
    const result = await manager.createDigest('writeup', true, { seoTitle });

    expect(result.success).toBe(true);

    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'data', 'digests.json'), 'utf8'));
    expect(saved.digests[0].seoTitle).toBe(seoTitle);

    const html = fs.readFileSync(path.join(tmpDir, 'data', 'digests', result.filename), 'utf8');
    expect(html).toContain(`<title>${seoTitle}</title>`);
  });

  test('omits the key entirely when no seoTitle is given', async () => {
    writeDigests([]);
    writeLinks([
      { id: 'a', url: 'https://example.com', source: 'Example', pullQuote: '', tags: [], timestamp: '2026-01-01T00:00:00.000Z' },
    ]);

    const manager = new DigestManager(tmpDir);
    await manager.createDigest('writeup', true);

    const saved = JSON.parse(fs.readFileSync(path.join(tmpDir, 'data', 'digests.json'), 'utf8'));
    expect('seoTitle' in saved.digests[0]).toBe(false);
  });
});

describe('getUndigestedLinks cutoff', () => {
  test('excludes links with timestamp after cutoff', async () => {
    writeDigests([]);
    writeLinks([
      { id: 'before', url: 'https://example.com/before', source: 'Before', pullQuote: '', tags: [], timestamp: '2026-01-01T00:00:00.000Z' },
      { id: 'after', url: 'https://example.com/after', source: 'After', pullQuote: '', tags: [], timestamp: '2026-06-01T00:00:00.000Z' },
    ]);

    const manager = new DigestManager(tmpDir);
    const links = await manager.getUndigestedLinks('2026-03-01T00:00:00.000Z');

    expect(links.map(l => l.id)).toEqual(['before']);
  });
});

describe('generateEmailHtml footer', () => {
  test('has no {{ placeholder and no unsubscribe text', () => {
    const manager = new DigestManager(tmpDir);
    const links = [
      { id: '1', url: 'https://example.com', source: 'Example', pullQuote: 'A quote.', tags: ['tag1'], timestamp: '2026-01-01T00:00:00.000Z' },
    ];
    const html = manager.generateEmailHtml(links, 1, 'Jan 1, 2026', 'A writeup.');

    expect(html).not.toContain('{{');
    expect(html.toLowerCase()).not.toContain('unsubscribe');
  });
});
