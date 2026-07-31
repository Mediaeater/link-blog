#!/usr/bin/env node

const DigestManager = require('../utils/digest-manager.cjs');

async function main() {
  const digestManager = new DigestManager();

  try {
    const status = await digestManager.getStatus();

    console.log('\nDigest Status');
    console.log('=============');
    console.log(`Undigested links: ${status.undigestedCount}`);

    if (status.weekStart && status.weekEnd) {
      console.log(`Date range:       ${status.weekStart} to ${status.weekEnd}`);
    }

    console.log(`Total digests:    ${status.totalDigests}`);

    if (status.lastDigest) {
      console.log(`Last digest:      ${new Date(status.lastDigest.timestamp).toLocaleDateString()} (${status.lastDigest.count} links)`);
    }

    console.log('');

    if (status.undigestedCount > 0) {
      console.log('Run: npm run digest:generate -- --dry-run to preview');
    }

    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
