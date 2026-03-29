#!/usr/bin/env node

/**
 * Link Blog - Settlement Script
 *
 * Single command to get fully current:
 * 1. Git pull latest
 * 2. Fetch + merge from newsfeeds.net (skipped gracefully if unreachable)
 * 3. Sync the two JSON copies
 * 4. Regenerate build artifacts (feeds, sitemap, prerender, itemlist)
 * 5. Clean up old backups
 * 6. Print status report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

const NEWSFEEDS_URL = 'https://newsfeeds.net/data/links.json';
const MAX_BACKUPS = 3;

const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  dim: '\x1b[2m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function fileSize(filePath) {
  try {
    const stats = fs.statSync(filePath);
    const kb = (stats.size / 1024).toFixed(1);
    return `${kb} KB`;
  } catch {
    return 'missing';
  }
}

// Step 1: Git pull
function gitPull() {
  log('\n1. Pulling latest from remote...', 'blue');
  try {
    const output = execSync('git pull', {
      cwd: projectRoot,
      encoding: 'utf-8',
    }).trim();
    log(`   ${output}`, output === 'Already up to date.' ? 'dim' : 'green');
  } catch (error) {
    log('   Failed to git pull — continuing anyway', 'yellow');
    log(`   ${error.message.split('\n')[0]}`, 'dim');
  }
}

// Step 2: Fetch + merge from newsfeeds.net
async function syncNewsfeeds() {
  log('\n2. Syncing from newsfeeds.net...', 'blue');

  const primaryPath = path.join(projectRoot, 'data', 'links.json');

  // Fetch remote data
  let remoteData;
  try {
    const response = await fetch(NEWSFEEDS_URL, { signal: AbortSignal.timeout(10000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    remoteData = await response.json();
  } catch (error) {
    log(`   Unreachable — skipping (${error.message})`, 'yellow');
    return { synced: false, skipped: true };
  }

  const remoteLinks = remoteData.links || [];
  if (remoteLinks.length === 0) {
    log('   Remote returned 0 links — skipping', 'yellow');
    return { synced: false, skipped: true };
  }

  // Load local data
  let localData;
  try {
    localData = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
  } catch {
    log('   Local data/links.json missing — skipping merge', 'yellow');
    return { synced: false, skipped: true };
  }

  const localLinks = localData.links || [];

  // Build local URL set
  const localUrls = new Set(localLinks.map(l => l.url.toLowerCase().replace(/\/$/, '').trim()));

  // Find new links from remote
  const newLinks = remoteLinks.filter(link => {
    const normalized = link.url.toLowerCase().replace(/\/$/, '').trim();
    return !localUrls.has(normalized);
  });

  // Update visit counts where remote is higher
  let updatedVisits = 0;
  const localByUrl = new Map(localLinks.map(l => [l.url.toLowerCase().replace(/\/$/, '').trim(), l]));
  for (const remoteLink of remoteLinks) {
    const normalized = remoteLink.url.toLowerCase().replace(/\/$/, '').trim();
    const localLink = localByUrl.get(normalized);
    if (localLink && remoteLink.visits > localLink.visits) {
      localLink.visits = remoteLink.visits;
      updatedVisits++;
    }
  }

  if (newLinks.length === 0 && updatedVisits === 0) {
    log(`   Already current (${remoteLinks.length} remote, ${localLinks.length} local)`, 'green');
    return { synced: true, added: 0, updated: 0 };
  }

  // Backup before modifying
  backupFile(primaryPath);

  // Merge: append new links, re-sort by timestamp
  const merged = [...localLinks, ...newLinks].sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );

  const output = { links: merged, lastUpdated: new Date().toISOString() };
  fs.writeFileSync(primaryPath, JSON.stringify(output, null, 2));

  if (newLinks.length > 0) log(`   Added ${newLinks.length} new links from remote`, 'green');
  if (updatedVisits > 0) log(`   Updated ${updatedVisits} visit counts`, 'green');

  return { synced: true, added: newLinks.length, updated: updatedVisits };
}

function backupFile(filePath) {
  const dir = path.dirname(filePath);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const backupPath = path.join(dir, `links.json.backup-${timestamp}`);
  fs.copyFileSync(filePath, backupPath);
  log(`   Backup: ${path.basename(backupPath)}`, 'dim');
  cleanupBackups(dir);
}

function cleanupBackups(dir) {
  const backups = fs.readdirSync(dir)
    .filter(f => f.startsWith('links.json.backup-'))
    .sort()
    .reverse();

  const toDelete = backups.slice(MAX_BACKUPS);
  for (const file of toDelete) {
    fs.unlinkSync(path.join(dir, file));
    log(`   Removed old backup: ${file}`, 'dim');
  }
}

// Step 3: Sync JSON files
function syncJson() {
  log('\n3. Syncing JSON copies...', 'blue');

  const primaryPath = path.join(projectRoot, 'data', 'links.json');
  const publicPath = path.join(projectRoot, 'public', 'data', 'links.json');

  let primaryData, publicData;

  try {
    primaryData = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
  } catch {
    log('   data/links.json missing or invalid', 'red');
    return { synced: false, error: true };
  }

  try {
    publicData = JSON.parse(fs.readFileSync(publicPath, 'utf-8'));
  } catch {
    log('   public/data/links.json missing — copying from primary', 'yellow');
    fs.mkdirSync(path.dirname(publicPath), { recursive: true });
    fs.copyFileSync(primaryPath, publicPath);
    return { synced: true, action: 'copied primary to public', linkCount: primaryData.links.length };
  }

  const primaryCount = primaryData.links.length;
  const publicCount = publicData.links.length;

  if (primaryCount === publicCount) {
    const primaryStr = JSON.stringify(primaryData);
    const publicStr = JSON.stringify(publicData);
    if (primaryStr === publicStr) {
      log(`   Already in sync (${primaryCount} links)`, 'green');
      return { synced: true, action: 'already in sync', linkCount: primaryCount };
    }
  }

  // Pick the one with more links; if equal, use the one with a newer timestamp
  let winner;
  if (primaryCount > publicCount) {
    winner = 'primary';
  } else if (publicCount > primaryCount) {
    winner = 'public';
  } else {
    const primaryTime = new Date(primaryData.lastUpdated || 0).getTime();
    const publicTime = new Date(publicData.lastUpdated || 0).getTime();
    winner = primaryTime >= publicTime ? 'primary' : 'public';
  }

  if (winner === 'primary') {
    fs.writeFileSync(publicPath, JSON.stringify(primaryData, null, 2));
    log(`   Copied data/links.json -> public/data/links.json (${primaryCount} links, was ${publicCount})`, 'yellow');
    return { synced: true, action: `primary won (${primaryCount} vs ${publicCount})`, linkCount: primaryCount };
  } else {
    fs.writeFileSync(primaryPath, JSON.stringify(publicData, null, 2));
    log(`   Copied public/data/links.json -> data/links.json (${publicCount} links, was ${primaryCount})`, 'yellow');
    return { synced: true, action: `public won (${publicCount} vs ${primaryCount})`, linkCount: publicCount };
  }
}

// Step 4: Run prebuild
function runPrebuild() {
  log('\n4. Regenerating build artifacts...', 'blue');
  try {
    execSync('npm run prebuild', {
      cwd: projectRoot,
      stdio: 'pipe',
      encoding: 'utf-8',
    });
    log('   Sitemap, feeds, prerender, itemlist regenerated', 'green');
  } catch (error) {
    log('   Prebuild failed', 'red');
    log(`   ${error.stderr?.split('\n')[0] || error.message}`, 'dim');
  }
}

// Step 5: Status report
function printReport(newsfeedsResult, syncResult) {
  log('\n' + '='.repeat(50), 'bright');
  log(' Status Report', 'bright');
  log('='.repeat(50), 'bright');

  // Link count and last updated
  const primaryPath = path.join(projectRoot, 'data', 'links.json');
  try {
    const data = JSON.parse(fs.readFileSync(primaryPath, 'utf-8'));
    log(`\n  Links:        ${data.links.length}`, 'bright');
    if (data.lastUpdated) {
      const d = new Date(data.lastUpdated);
      log(`  Last updated: ${d.toLocaleDateString()} ${d.toLocaleTimeString()}`, 'dim');
    }
  } catch {
    log('\n  Links: unable to read', 'red');
  }

  // Digest count
  const digestsPath = path.join(projectRoot, 'data', 'digests.json');
  try {
    const digests = JSON.parse(fs.readFileSync(digestsPath, 'utf-8'));
    const count = Array.isArray(digests) ? digests.length : (digests.digests?.length || 0);
    log(`  Digests:      ${count}`, 'bright');
  } catch {
    log('  Digests:      0', 'dim');
  }

  // Git info
  try {
    const branch = execSync('git branch --show-current', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    const lastCommit = execSync('git log -1 --format="%h %s"', { cwd: projectRoot, encoding: 'utf-8' }).trim();
    log(`  Branch:       ${branch}`, 'dim');
    log(`  Last commit:  ${lastCommit}`, 'dim');
  } catch {
    // git not available
  }

  // Newsfeeds sync status
  if (newsfeedsResult) {
    if (newsfeedsResult.skipped) {
      log('  Newsfeeds:    skipped (unreachable)', 'yellow');
    } else if (newsfeedsResult.added > 0 || newsfeedsResult.updated > 0) {
      log(`  Newsfeeds:    +${newsfeedsResult.added} new, ${newsfeedsResult.updated} updated`, 'green');
    } else {
      log('  Newsfeeds:    current', 'green');
    }
  }

  // JSON sync status
  if (syncResult) {
    const color = syncResult.action === 'already in sync' ? 'green' : 'yellow';
    log(`  JSON sync:    ${syncResult.action}`, color);
  }

  // Generated files
  const artifacts = [
    'public/sitemap.xml',
    'public/feed.xml',
    'public/data/feed.json',
    'public/data/blogroll.opml',
    'public/feed-digests.xml',
    'index.html',
  ];

  log('\n  Generated files:', 'blue');
  for (const file of artifacts) {
    const fullPath = path.join(projectRoot, file);
    const size = fileSize(fullPath);
    log(`    ${file.padEnd(30)} ${size}`, 'dim');
  }

  log('\n' + '='.repeat(50) + '\n', 'bright');
}

async function main() {
  log('\n Settling link-blog...', 'bright');

  gitPull();
  const newsfeedsResult = await syncNewsfeeds();
  const syncResult = syncJson();
  runPrebuild();
  printReport(newsfeedsResult, syncResult);
}

main();
