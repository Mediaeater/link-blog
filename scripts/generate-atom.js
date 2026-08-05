#!/usr/bin/env node

/**
 * Atom feed generator
 * Reads public/data/links.json, writes the Atom 1.0 links feed to
 * public/feed.atom and public/feed.xml.
 *
 * Both paths carry identical Atom documents: feed.xml is the long-standing
 * subscriber URL and must keep resolving, feed.atom is the canonical name.
 */

import { Feed } from 'feed';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const SITE_URL = process.env.SITE_URL || 'https://newsfeeds.net';

const generateAtom = async () => {
  const linksPath = path.join(__dirname, '../public/data/links.json');
  const linksData = JSON.parse(fs.readFileSync(linksPath, 'utf8'));

  const feed = new Feed({
    title: 'Mediaeater Digest',
    description: 'Latest links and resources',
    id: `${SITE_URL}/`,
    link: `${SITE_URL}/`,
    language: 'en',
    updated: new Date(linksData.lastUpdated),
    feedLinks: {
      atom: `${SITE_URL}/feed.atom`,
      json: `${SITE_URL}/data/feed.json`,
    },
    author: {
      name: 'Mediaeater',
      link: `${SITE_URL}/`,
    },
  });

  // One malformed entry must not take down the whole feed: skip links whose
  // url field isn't a valid absolute URL (e.g. a quote pasted into the URL
  // box during an in-browser add) and warn so the bad data gets fixed.
  const valid = [];
  linksData.links.forEach(link => {
    try {
      new URL(link.url);
      valid.push(link);
    } catch {
      console.warn(
        `⚠ Skipping link id ${link.id}: invalid url ${JSON.stringify(String(link.url).slice(0, 80))}`
      );
    }
  });

  valid.forEach(link => {
    feed.addItem({
      title: link.source,
      // Atom requires <id> to be an IRI, so the numeric link id is wrapped in a
      // tag: URI rather than emitted bare.
      id: `tag:newsfeeds.net,2026:link/${link.id}`,
      link: link.url,
      description: `Tags: ${link.tags.join(', ')}`,
      date: new Date(link.timestamp || linksData.lastUpdated),
    });
  });

  const atom = feed.atom1();

  fs.writeFileSync(path.join(__dirname, '../public/feed.atom'), atom);
  fs.writeFileSync(path.join(__dirname, '../public/feed.xml'), atom);

  const skipped = linksData.links.length - valid.length;
  console.log(
    `✓ Atom feed generated: ${valid.length} links${skipped ? ` (${skipped} skipped)` : ''} → public/feed.atom + public/feed.xml`
  );
};

generateAtom().catch(err => {
  // A non-zero exit makes the `npm run feeds` chain stop loudly instead of
  // publishing the other feeds around a stale Atom file.
  console.error(err);
  process.exitCode = 1;
});
