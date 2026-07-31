#!/usr/bin/env node

const DigestManager = require('../utils/digest-manager.cjs');

function getArgValue(args, flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const writeup = getArgValue(args, '--writeup');
  const cutoff = getArgValue(args, '--cutoff');

  const digestManager = new DigestManager();

  try {
    const status = await digestManager.getStatus();

    if (status.undigestedCount === 0) {
      console.error('No undigested links available.');
      process.exit(1);
    }

    if (!dryRun && !writeup) {
      console.error('Error: --writeup "text" is required to generate a digest.');
      console.error('A digest needs an approved writeup before it can be published.');
      console.error('Run with --dry-run to preview without a writeup.\n');
      process.exit(1);
    }

    if (dryRun) {
      console.error(`\nPreview (${status.undigestedCount} links):\n`);
    } else {
      console.error(`\nGenerating digest #${status.totalDigests + 1} with ${status.undigestedCount} links...\n`);
    }

    const result = dryRun
      ? await digestManager.createDigest('', false, { cutoff })
      : await digestManager.createDigest(writeup, true, { cutoff });

    if (!result.success) {
      console.error('Error:', result.error);
      process.exit(1);
    }

    // Output HTML to stdout (can be piped)
    console.log(result.html);

    if (dryRun) {
      console.error('\n(Dry run - links not marked as digested)');
      console.error('Run without --dry-run to mark as digested.\n');
    } else {
      console.error(`\n✓ ${result.count} links marked as digested.\n`);
    }

  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
