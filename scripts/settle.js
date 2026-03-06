#!/usr/bin/env node

/**
 * Link Blog - Settlement Script
 *
 * Single command to reconcile everything after a git pull or
 * when picking up work on a new machine:
 * 1. Git pull latest
 * 2. Sync the two JSON copies
 * 3. Regenerate build artifacts (feeds, sitemap, prerender, itemlist)
 * 4. Print status report
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

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

// Step 2: Sync JSON files
function syncJson() {
  log('\n2. Syncing JSON files...', 'blue');

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
    // Quick content check
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
    // Same count but different content — use newer timestamp
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

// Step 3: Run prebuild
function runPrebuild() {
  log('\n3. Regenerating build artifacts...', 'blue');
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

// Step 4: Status report
function printReport(syncResult) {
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

  // Sync status
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
  const syncResult = syncJson();
  runPrebuild();
  printReport(syncResult);
}

main();
