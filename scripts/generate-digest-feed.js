#!/usr/bin/env node

/**
 * Digest RSS feed generator
 * Reads data/digests.json + digest HTML files, generates RSS 2.0 feed
 * at public/feed-digests.xml using the `feed` package.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Feed } from 'feed';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  digestsJsonPath: path.join(__dirname, '../data/digests.json'),
  digestsDir: path.join(__dirname, '../data/digests'),
  outputPath: path.join(__dirname, '../public/feed-digests.xml'),
  siteUrl: process.env.SITE_URL || 'https://newsfeeds.net',
};

function generate() {
  if (!fs.existsSync(CONFIG.digestsJsonPath)) {
    console.error(`Error: ${CONFIG.digestsJsonPath} not found`);
    process.exit(1);
  }

  const digestsData = JSON.parse(fs.readFileSync(CONFIG.digestsJsonPath, 'utf8'));
  const digests = (digestsData.digests || [])
    .filter(d => d.id !== 0 && d.filename)
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  const feed = new Feed({
    title: 'newsfeeds.net - Digests',
    description: 'Periodic digest roundups of curated links on media, technology, AI, copyright, and digital culture.',
    id: `${CONFIG.siteUrl}/feed-digests.xml`,
    link: CONFIG.siteUrl,
    language: 'en',
    updated: digests.length > 0 ? new Date(digests[0].timestamp) : new Date(),
    feedLinks: {
      rss: `${CONFIG.siteUrl}/feed-digests.xml`,
    },
    author: {
      name: 'Mediaeater',
      link: CONFIG.siteUrl,
    },
  });

  for (const digest of digests) {
    const htmlPath = path.join(CONFIG.digestsDir, digest.filename);

    let content = '';
    if (fs.existsSync(htmlPath)) {
      content = fs.readFileSync(htmlPath, 'utf8');
    } else {
      console.warn(`  Warning: ${digest.filename} not found, skipping content`);
    }

    const dateStr = digest.filename.match(/\d{4}-\d{2}-\d{2}/)?.[0] || '';
    const title = `Digest #${digest.id}${dateStr ? ` - ${dateStr}` : ''}`;

    feed.addItem({
      title,
      id: `${CONFIG.siteUrl}/digest/${digest.id}`,
      link: CONFIG.siteUrl,
      description: `${digest.count} curated links`,
      content,
      date: new Date(digest.timestamp),
    });
  }

  const outputDir = path.dirname(CONFIG.outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG.outputPath, feed.rss2(), 'utf8');

  console.log(`\u2713 Digest feed generated: ${digests.length} digests → ${CONFIG.outputPath}`);
}

generate();
