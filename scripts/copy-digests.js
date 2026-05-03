#!/usr/bin/env node

/**
 * Copy data/digests/*.html to public/digests/ so individual digests
 * are deep-linkable at https://newsfeeds.net/digests/digest-XXX-YYYY-MM-DD.html
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SRC = path.join(__dirname, '..', 'data', 'digests');
const DEST = path.join(__dirname, '..', 'public', 'digests');

if (!fs.existsSync(SRC)) {
  console.error(`Error: ${SRC} not found`);
  process.exit(1);
}

fs.mkdirSync(DEST, { recursive: true });

const htmlFiles = fs.readdirSync(SRC).filter(f => f.endsWith('.html'));
for (const file of htmlFiles) {
  fs.copyFileSync(path.join(SRC, file), path.join(DEST, file));
}

console.log(`✓ Copied ${htmlFiles.length} digest HTML files to public/digests/`);
