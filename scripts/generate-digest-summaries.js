#!/usr/bin/env node

// Generate AI summaries for digests using Claude API
// Usage: ANTHROPIC_API_KEY=sk-... node scripts/generate-digest-summaries.js
// Add --force to regenerate existing summaries

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..');
const DIGESTS_PATH = path.join(ROOT, 'data', 'digests.json');
const LINKS_PATH = path.join(ROOT, 'data', 'links.json');
const PUBLIC_DIGESTS_PATH = path.join(ROOT, 'public', 'data', 'digests.json');

const API_KEY = process.env.ANTHROPIC_API_KEY;
const FORCE = process.argv.includes('--force');

if (!API_KEY) {
  console.error('Set ANTHROPIC_API_KEY environment variable');
  process.exit(1);
}

async function summarize(titles, tags) {
  const topTags = Object.entries(
    tags.reduce((acc, t) => { acc[t] = (acc[t] || 0) + 1; return acc; }, {})
  ).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([t]) => t);

  const prompt = `Here are ${titles.length} link titles from a curated link digest:\n\n${titles.map(t => `- ${t}`).join('\n')}\n\nTop tags: ${topTags.join(', ')}\n\nWrite a single sentence (under 120 characters) summarizing the themes. Be specific, not generic. No quotes. No period at the end.`;

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 100,
      messages: [{ role: 'user', content: prompt }]
    })
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  return data.content[0].text.trim().replace(/\.$/, '');
}

async function main() {
  const digestsData = JSON.parse(await fs.readFile(DIGESTS_PATH, 'utf8'));
  const linksData = JSON.parse(await fs.readFile(LINKS_PATH, 'utf8'));
  const linkMap = new Map(linksData.links.map(l => [l.id, l]));

  const toProcess = digestsData.digests.filter(d =>
    d.id !== 0 && (FORCE || !d.summary)
  );

  if (toProcess.length === 0) {
    console.log('All digests already have summaries. Use --force to regenerate.');
    return;
  }

  console.log(`Generating summaries for ${toProcess.length} digests...`);

  for (const digest of toProcess) {
    const links = digest.linkIds.map(id => linkMap.get(id)).filter(Boolean);
    const titles = links.map(l => l.source || l.url);
    const tags = links.flatMap(l => l.tags || []);

    try {
      const summary = await summarize(titles, tags);
      digest.summary = summary;
      console.log(`  #${digest.id} ${digest.title}: ${summary}`);
    } catch (err) {
      console.error(`  #${digest.id} failed: ${err.message}`);
    }
  }

  await fs.writeFile(DIGESTS_PATH, JSON.stringify(digestsData, null, 2));
  await fs.writeFile(PUBLIC_DIGESTS_PATH, JSON.stringify(digestsData, null, 2));
  console.log('Saved.');
}

main().catch(err => { console.error(err); process.exit(1); });
