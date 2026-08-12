import { describe, test, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

const ROOT = path.join(__dirname, '..');

function loadLinks(rel) {
  const raw = JSON.parse(fs.readFileSync(path.join(ROOT, rel), 'utf8'));
  return Array.isArray(raw) ? raw : raw.links;
}

// Duplicate ids corrupt anything keyed by link.id (React keys, the virtual
// list's height cache, digest linkIds). A dup shipped once via an admin-UI
// double-submit (two rows minted in the same Date.now() millisecond).
describe('links.json integrity', () => {
  const copies = ['data/links.json', 'public/data/links.json'];

  test.each(copies)('%s has unique link ids', (rel) => {
    const links = loadLinks(rel);
    const ids = links.map(l => l.id);
    const dupes = ids.filter((id, i) => ids.indexOf(id) !== i);
    expect(dupes).toEqual([]);
  });

  test('data/ and public/data/ copies are in sync', () => {
    const a = loadLinks(copies[0]);
    const b = loadLinks(copies[1]);
    expect(a.length).toBe(b.length);
    expect(a.map(l => l.id)).toEqual(b.map(l => l.id));
  });

  test.each(copies)('%s links all have required fields', (rel) => {
    for (const l of loadLinks(rel)) {
      expect(l.id, `link missing id: ${l.url}`).toBeTruthy();
      expect(l.url, `link ${l.id} missing url`).toBeTruthy();
      expect(l.source, `link ${l.id} missing source`).toBeTruthy();
      expect(Array.isArray(l.tags), `link ${l.id} tags not an array`).toBe(true);
    }
  });
});
