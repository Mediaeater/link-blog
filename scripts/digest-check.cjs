#!/usr/bin/env node

const DigestManager = require('../utils/digest-manager.cjs');

async function main() {
  const digestManager = new DigestManager();

  try {
    const status = await digestManager.getStatus();

    console.log('\nWordPress Digest Status');
    console.log('=======================');
    console.log(`Threshold:        ${status.threshold} links`);
    console.log(`Ready for digest: ${status.undigestedCount} links ${status.ready ? '✓' : ''}`);
    console.log(`Total digests:    ${status.totalDigests}`);

    if (status.lastDigest) {
      console.log(`Last digest:      ${new Date(status.lastDigest.timestamp).toLocaleDateString()} (${status.lastDigest.count} links)`);
    }

    console.log('');

    if (status.ready) {
      console.log('Ready to generate! Run: npm run digest:generate');
    } else {
      const remaining = status.threshold - status.undigestedCount;
      console.log(`Need ${remaining} more links to reach threshold.`);
    }

    console.log('');
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
