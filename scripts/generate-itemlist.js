#!/usr/bin/env node

/**
 * Schema.org ItemList JSON-LD generator
 * Reads links.json, generates JSON-LD ItemList with recent links as ListItem > Article.
 * Injects into index.html via marker comments before </head>.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  linksPath: path.join(__dirname, '../data/links.json'),
  indexPath: path.join(__dirname, '../index.html'),
  maxItems: 50,
  startMarker: '<!-- ITEMLIST_START -->',
  endMarker: '<!-- ITEMLIST_END -->',
};

function truncate(str, max) {
  if (!str || str.length <= max) return str || '';
  return str.slice(0, max - 3) + '...';
}

function generate() {
  if (!fs.existsSync(CONFIG.linksPath)) {
    console.error(`Error: ${CONFIG.linksPath} not found`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(CONFIG.linksPath, 'utf8'));
  const links = (data.links || [])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, CONFIG.maxItems);

  const itemListElements = links.map((link, i) => ({
    '@type': 'ListItem',
    position: i + 1,
    item: {
      '@type': 'Article',
      name: link.source,
      url: link.url,
      ...(link.pullQuote ? { description: truncate(link.pullQuote, 200) } : {}),
      datePublished: new Date(link.timestamp).toISOString().split('T')[0],
      ...(link.tags && link.tags.length > 0 ? { keywords: link.tags.join(', ') } : {}),
    },
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Recent links on newsfeeds.net',
    numberOfItems: links.length,
    itemListElement: itemListElements,
  };

  const scriptTag = [
    CONFIG.startMarker,
    `<script type="application/ld+json">`,
    JSON.stringify(jsonLd, null, 2),
    `</script>`,
    CONFIG.endMarker,
  ].join('\n');

  let indexHtml = fs.readFileSync(CONFIG.indexPath, 'utf8');

  // Remove previous block if present
  const startIdx = indexHtml.indexOf(CONFIG.startMarker);
  const endIdx = indexHtml.indexOf(CONFIG.endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    indexHtml = indexHtml.slice(0, startIdx) + indexHtml.slice(endIdx + CONFIG.endMarker.length + 1);
  }

  // Insert before </head>
  const headClose = '</head>';
  const headIdx = indexHtml.indexOf(headClose);
  if (headIdx === -1) {
    console.error('Error: </head> not found in index.html');
    process.exit(1);
  }

  indexHtml = indexHtml.slice(0, headIdx) + scriptTag + '\n' + indexHtml.slice(headIdx);

  fs.writeFileSync(CONFIG.indexPath, indexHtml, 'utf8');

  console.log(`\u2713 ItemList JSON-LD injected: ${links.length} items`);
}

generate();
