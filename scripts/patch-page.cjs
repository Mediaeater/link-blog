#!/usr/bin/env node
/**
 * patch-page.cjs — push a single static file straight to the gh-pages branch
 * without a full `vite build` + `gh-pages -d dist` redeploy.
 *
 * Use ONLY for static-HTML-only changes (e.g. a digest page). Anything that
 * touches links.json / digests.json / feeds is read by the React app or the
 * RSS feeds and needs the full `npm run deploy`.
 *
 * Safety: edits happen in a throwaway git worktree checked out from
 * origin/gh-pages, copies in exactly ONE file, and pushes only that change.
 * All other deployed files are preserved untouched.
 *
 * Usage:
 *   node scripts/patch-page.cjs <path-relative-to-public/>
 *   npm run patch:page -- digests/digest-016-2026-05-30.html
 *
 * Prereq: fix the SOURCE first (public/<path> and, if tracked, its data/ copy),
 * commit + push to main. This script only mirrors public/<path> onto gh-pages.
 */

const { execFileSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const rel = process.argv[2];
if (!rel) fail('Usage: node scripts/patch-page.cjs <path-relative-to-public/>\n  e.g. digests/digest-016-2026-05-30.html');
if (rel.startsWith('/') || rel.includes('..')) fail(`Refusing unsafe path: ${rel}`);

const repoRoot = path.resolve(__dirname, '..');
const srcFile = path.join(repoRoot, 'public', rel);
if (!fs.existsSync(srcFile)) fail(`Source file not found: public/${rel}\n  Edit the source under public/ first.`);

const domain = readDomain(repoRoot);
const git = (args, cwd = repoRoot) => execFileSync('git', args, { stdio: 'inherit', cwd });
const gitOut = (args, cwd = repoRoot) => execFileSync('git', args, { cwd }).toString().trim();

const wt = fs.mkdtempSync(path.join(os.tmpdir(), 'ghpages-patch-'));
try {
  git(['fetch', 'origin', 'gh-pages']);
  git(['worktree', 'add', '--force', '--detach', wt, 'origin/gh-pages']);

  const dest = path.join(wt, rel);
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.copyFileSync(srcFile, dest);

  git(['add', '--', rel], wt);
  if (!gitOut(['status', '--porcelain'], wt)) {
    console.log(`\n• No change — gh-pages already matches public/${rel}. Nothing to push.`);
  } else {
    git(['commit', '-m', `Patch ${rel} (single-page, no rebuild)`], wt);
    git(['push', 'origin', 'HEAD:gh-pages'], wt);
    const url = domain ? `https://${domain}/${rel}` : `(check live)/${rel}`;
    console.log(`\n✓ Patched live: ${url}`);
    console.log('  (GitHub Pages purges its CDN on push; live in ~1-2 min. Hard-refresh to bust browser cache.)');
  }
} finally {
  try { git(['worktree', 'remove', '--force', wt]); } catch { /* best effort */ }
}

function readDomain(root) {
  try { return fs.readFileSync(path.join(root, 'public', 'CNAME'), 'utf8').trim().split(/\s+/)[0] || null; }
  catch { return null; }
}

function fail(msg) { console.error(`✗ ${msg}`); process.exit(1); }
