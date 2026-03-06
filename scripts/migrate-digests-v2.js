#!/usr/bin/env node

/**
 * One-time migration: digests.json v1 → v2
 * Adds weekStart, weekEnd, title, writeup to each digest.
 * Drops threshold, adds cadence: "weekly", bumps version to "2.0.0".
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const digestsPath = path.join(__dirname, '../data/digests.json');
const linksPath = path.join(__dirname, '../data/links.json');

function formatDigestTitle(weekStart, weekEnd) {
  const start = new Date(weekStart);
  const end = new Date(weekEnd);
  const opts = { month: 'short', day: 'numeric' };
  const startStr = start.toLocaleDateString('en-US', opts);
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();

  if (sameMonth) {
    return `${startStr}-${end.getDate()}, ${end.getFullYear()}`;
  }
  const endStr = end.toLocaleDateString('en-US', opts);
  return `${startStr} - ${endStr}, ${end.getFullYear()}`;
}

function run() {
  const digestsData = JSON.parse(fs.readFileSync(digestsPath, 'utf8'));
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  if (digestsData.version === '2.0.0') {
    console.log('Already at v2, skipping.');
    return;
  }

  // Build a lookup of link id → timestamp
  const linkMap = new Map();
  for (const link of linksData.links) {
    linkMap.set(link.id, link.timestamp);
  }

  for (const digest of digestsData.digests) {
    // Find timestamps for this digest's links
    const timestamps = digest.linkIds
      .map(id => linkMap.get(id))
      .filter(Boolean)
      .map(ts => new Date(ts))
      .sort((a, b) => a - b);

    if (timestamps.length > 0) {
      const earliest = timestamps[0];
      const latest = timestamps[timestamps.length - 1];
      digest.weekStart = earliest.toISOString().split('T')[0];
      digest.weekEnd = latest.toISOString().split('T')[0];
      digest.title = formatDigestTitle(digest.weekStart, digest.weekEnd);
    } else {
      // Fallback: use digest timestamp
      const ts = new Date(digest.timestamp);
      const dateStr = ts.toISOString().split('T')[0];
      digest.weekStart = dateStr;
      digest.weekEnd = dateStr;
      digest.title = ts.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    digest.writeup = '';
  }

  // Drop threshold, add cadence, bump version
  delete digestsData.threshold;
  digestsData.version = '2.0.0';
  digestsData.cadence = 'weekly';

  fs.writeFileSync(digestsPath, JSON.stringify(digestsData, null, 2));
  console.log(`Migrated ${digestsData.digests.length} digests to v2`);

  // Show titles for verification
  for (const d of digestsData.digests) {
    console.log(`  #${d.id}: ${d.title} (${d.count} links)`);
  }
}

run();
