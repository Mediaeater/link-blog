#!/usr/bin/env node

/**
 * Build-time prerender injection
 * Generates semantic HTML from links.json, wraps in <noscript> inside <div id="root">
 * so crawlers can index content while React hydration is unaffected.
 * Uses marker comments for idempotent re-runs.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  linksPath: path.join(__dirname, '../data/links.json'),
  indexPath: path.join(__dirname, '../index.html'),
  maxLinks: 100,
  startMarker: '<!-- PRERENDER_START -->',
  endMarker: '<!-- PRERENDER_END -->',
};

function escapeHtml(str) {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(timestamp) {
  try {
    const d = new Date(timestamp);
    return d.toISOString().split('T')[0];
  } catch {
    return '';
  }
}

function generateArticleHtml(link) {
  const date = formatDate(link.timestamp);
  const tagsHtml = (link.tags || [])
    .map(t => `<span>${escapeHtml(t)}</span>`)
    .join(' ');

  let html = `<article>`;
  html += `<h3><a href="${escapeHtml(link.url)}">${escapeHtml(link.source)}</a></h3>`;
  if (link.pullQuote) {
    html += `<blockquote>${escapeHtml(link.pullQuote)}</blockquote>`;
  }
  if (date) {
    html += `<time datetime="${date}">${date}</time>`;
  }
  if (tagsHtml) {
    html += ` ${tagsHtml}`;
  }
  html += `</article>`;
  return html;
}

function generate() {
  if (!fs.existsSync(CONFIG.linksPath)) {
    console.error(`Error: ${CONFIG.linksPath} not found`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(CONFIG.linksPath, 'utf8'));
  const links = (data.links || [])
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, CONFIG.maxLinks);

  const articles = links.map(generateArticleHtml).join('\n');
  const noscriptBlock = [
    CONFIG.startMarker,
    '<noscript>',
    `<h1>newsfeeds.net - dispute the text</h1>`,
    `<p>A curated collection of ${data.links.length} links on media, technology, AI, copyright, and digital culture.</p>`,
    articles,
    '</noscript>',
    CONFIG.endMarker,
  ].join('\n');

  let indexHtml = fs.readFileSync(CONFIG.indexPath, 'utf8');

  // Remove previous prerender block if present
  const startIdx = indexHtml.indexOf(CONFIG.startMarker);
  const endIdx = indexHtml.indexOf(CONFIG.endMarker);
  if (startIdx !== -1 && endIdx !== -1) {
    indexHtml = indexHtml.slice(0, startIdx) + indexHtml.slice(endIdx + CONFIG.endMarker.length + 1);
  }

  // Insert after <div id="root">
  const rootTag = '<div id="root">';
  const rootIdx = indexHtml.indexOf(rootTag);
  if (rootIdx === -1) {
    console.error('Error: <div id="root"> not found in index.html');
    process.exit(1);
  }

  const insertPos = rootIdx + rootTag.length;
  indexHtml = indexHtml.slice(0, insertPos) + '\n' + noscriptBlock + '\n' + indexHtml.slice(insertPos);

  fs.writeFileSync(CONFIG.indexPath, indexHtml, 'utf8');

  console.log(`\u2713 Prerender injected: ${links.length} links in <noscript> block`);
}

generate();
