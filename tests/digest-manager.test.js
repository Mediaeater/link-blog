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
