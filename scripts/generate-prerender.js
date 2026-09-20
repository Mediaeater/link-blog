#!/usr/bin/env node

/**
 * Build-time prerender injection
 * Generates semantic HTML from links.json, wraps in <noscript> inside <div id="root">
 * so crawlers can index content while React hydration is unaffected.
 * Uses marker comments for idempotent re-runs.
 *
 * Also emits a digest nav AFTER </div id="root"> — outside React's root, because
 * hydration clears the root's children, so anything inside it is gone from the
 * rendered DOM a crawler sees. The digest pages are otherwise orphaned: they are
 * linked only from DigestView, which renders behind a click.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const CONFIG = {
  linksPath: path.join(__dirname, '../data/links.json'),
  digestsPath: path.join(__dirname, '../data/digests.json'),
  indexPath: path.join(__dirname, '../index.html'),
  maxLinks: 100,
  maxDigests: 10,
  startMarker: '<!-- PRERENDER_START -->',
  endMarker: '<!-- PRERENDER_END -->',
  digestNavStart: '<!-- DIGEST_NAV_START -->',
  digestNavEnd: '<!-- DIGEST_NAV_END -->',
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

// "Owns the Glass · Sep 2026 | newsfeeds.net" -> "Owns the Glass · Sep 2026"
function digestLabel(digest) {
  const seo = String(digest.seoTitle || '').split('|')[0].trim();
  return seo || digest.title || digest.filename;
}

function generateDigestNav() {
  if (!fs.existsSync(CONFIG.digestsPath)) return '';

  const data = JSON.parse(fs.readFileSync(CONFIG.digestsPath, 'utf8'));
  // id 0 is a bootstrap marker with no HTML page, by design.
  const digests = (data.digests || [])
    .filter(d => d.id !== 0 && d.filename)
    .sort((a, b) => b.id - a.id);

  if (digests.length === 0) return '';

  const items = digests
    .slice(0, CONFIG.maxDigests)
    .map(d => {
      const label = escapeHtml(digestLabel(d));
      const date = formatDate(d.timestamp);
      const linkStyle = 'color:#404040;text-decoration:none;border-bottom:1px solid #d4d4d4;';
      const timeStyle = 'color:#a3a3a3;font-size:12px;margin-left:8px;';
      const time = date
        ? ` <time datetime="${date}" style="${timeStyle}">${escapeHtml(d.title)}</time>`
        : '';
      return `<li><a href="/digests/${escapeHtml(d.filename)}" style="${linkStyle}">${label}</a>${time}</li>`;
    })
    .join('\n');

  // Inline styles, not Tailwind classes: this markup is injected after Tailwind
  // has already scanned index.html, so utility classes could be purged away.
  const S = {
    nav: 'max-width:768px;margin:0 auto;padding:32px 16px 48px;font-family:ui-sans-serif,system-ui,-apple-system,sans-serif;color:#525252;font-size:14px;',
    h2: 'font-size:13px;font-weight:600;text-transform:uppercase;letter-spacing:0.05em;color:#737373;margin:0 0 12px;',
    ul: 'list-style:none;margin:0;padding:0;display:grid;gap:8px;',
    a: 'color:#404040;text-decoration:none;border-bottom:1px solid #d4d4d4;',
    time: 'color:#a3a3a3;font-size:12px;margin-left:8px;',
    all: 'margin:16px 0 0;',
  };

  return [
    CONFIG.digestNavStart,
    `<nav class="digest-nav" aria-label="Digest archive" style="${S.nav}">`,
    `<h2 style="${S.h2}">Digests</h2>`,
    `<ul style="${S.ul}">\n${items}\n</ul>`,
    `<p style="${S.all}"><a href="/digests/" style="${S.a}">All ${digests.length} digests</a></p>`,
    '</nav>',
    CONFIG.digestNavEnd,
  ].join('\n');
}

// Exact inverse of the insertions below, which each write '\n' + block. Taking
// the leading newline back with the block is what keeps re-runs byte-stable:
// dropping a trailing newline instead left the leading one behind, so every
// build added one more blank line (221 of them had piled up by 2026-09-20).
function stripBlock(html, startMarker, endMarker) {
  const startIdx = html.indexOf(startMarker);
  const endIdx = html.indexOf(endMarker);
  if (startIdx === -1 || endIdx === -1 || endIdx < startIdx) return html;

  // Walk back over any indentation an older build left in front of the marker,
  // then take the newline too, so no whitespace-only line is stranded.
  let from = startIdx;
  while (from > 0 && (html[from - 1] === ' ' || html[from - 1] === '\t')) from--;
  if (from > 0 && html[from - 1] === '\n') from--;

  return html.slice(0, from) + html.slice(endIdx + endMarker.length);
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

  const digestNav = generateDigestNav();

  let indexHtml = fs.readFileSync(CONFIG.indexPath, 'utf8');

  // Remove previous blocks if present
  indexHtml = stripBlock(indexHtml, CONFIG.startMarker, CONFIG.endMarker);
  indexHtml = stripBlock(indexHtml, CONFIG.digestNavStart, CONFIG.digestNavEnd);

  // One-time cleanup of the blank lines the old asymmetric strip left behind.
  // A no-op once the tree is clean, since nothing writes blank lines here now.
  indexHtml = indexHtml.replace(/(<div id="root">)\n{2,}/, '$1\n');

  // Insert after <div id="root">
  const rootTag = '<div id="root">';
  const rootIdx = indexHtml.indexOf(rootTag);
  if (rootIdx === -1) {
    console.error('Error: <div id="root"> not found in index.html');
    process.exit(1);
  }

  const insertPos = rootIdx + rootTag.length;
  indexHtml = indexHtml.slice(0, insertPos) + '\n' + noscriptBlock + indexHtml.slice(insertPos);

  // Insert the digest nav outside #root, before the module script, so React
  // hydration leaves it alone and it survives into the rendered DOM.
  if (digestNav) {
    const scriptTag = '<script type="module"';
    const scriptIdx = indexHtml.indexOf(scriptTag);
    if (scriptIdx === -1) {
      console.error('Error: module <script> not found in index.html');
      process.exit(1);
    }
    // Insert at the start of the script's own line and hand the line's
    // indentation back to it, rather than emitting a fixed indent that
    // compounded with the old one on every run.
    const lineStart = indexHtml.lastIndexOf('\n', scriptIdx) + 1;
    indexHtml = indexHtml.slice(0, lineStart) + digestNav + '\n' + indexHtml.slice(lineStart);
  }

  const digestCount = digestNav ? (digestNav.match(/<li>/g) || []).length : 0;
  console.log(`\u2713 Prerender injected: ${links.length} links in <noscript> block`);
  console.log(`\u2713 Digest nav injected: ${digestCount} digest links outside #root`);

  fs.writeFileSync(CONFIG.indexPath, indexHtml, 'utf8');
}

generate();
