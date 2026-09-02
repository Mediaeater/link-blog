#!/usr/bin/env node

const { execFileSync } = require('child_process');
const DigestManager = require('../utils/digest-manager.cjs');

function getArgValue(args, flag) {
  const i = args.indexOf(flag);
  return i === -1 ? undefined : args[i + 1];
}

async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.includes('-n');
  const noSync = args.includes('--no-sync');
  const writeup = getArgValue(args, '--writeup');
  const seoTitle = getArgValue(args, '--seo-title');
  const seoDescription = getArgValue(args, '--seo-description');
  const cutoff = getArgValue(args, '--cutoff');
  const idsArg = getArgValue(args, '--ids');
  const linkIds = idsArg ? idsArg.split(',').map(s => s.trim()).filter(Boolean) : undefined;

  const digestManager = new DigestManager();

  try {
    // Argument guards run before the data check so a malformed invocation
    // fails the same way whether or not links are waiting.
    if (!dryRun && !writeup) {
      console.error('Error: --writeup "text" is required to generate a digest.');
      console.error('A digest needs an approved writeup before it can be published.');
      console.error('Run with --dry-run to preview without a writeup.\n');
      process.exit(1);
    }

    // Every published digest carries a themed seoTitle; it drives the page
    // <title>, og:title, JSON-LD headline and the digest index. Requiring it
    // here keeps a new digest from silently shipping with the date-range
    // fallback the way digest 026 did.
    if (!dryRun && !seoTitle) {
      console.error('Error: --seo-title "text" is required to generate a digest.');
      console.error('Format: "<Themed Noun Phrase> · <Mon YYYY> | newsfeeds.net"');
      console.error('Example: --seo-title "Custody of the Record · Aug 2026 | newsfeeds.net"\n');
      process.exit(1);
    }

    const status = await digestManager.getStatus();

    if (status.undigestedCount === 0) {
      console.error('No undigested links available.');
      process.exit(1);
    }

    const selectedCount = linkIds ? linkIds.length : status.undigestedCount;
    if (dryRun) {
      console.error(`\nPreview (${selectedCount} links):\n`);
    } else {
      console.error(`\nGenerating digest #${status.totalDigests + 1} with ${selectedCount} links...\n`);
    }

    const result = dryRun
      ? await digestManager.createDigest('', false, { cutoff, linkIds })
      : await digestManager.createDigest(writeup, true, { cutoff, linkIds, seoTitle, seoDescription });

    if (!result.success) {
      console.error('Error:', result.error);
      process.exit(1);
    }

    // Output HTML to stdout (can be piped)
    console.log(result.html);

    if (dryRun) {
      console.error('\n(Dry run - links not marked as digested)');
      console.error('Run without --dry-run to mark as digested.\n');
      return;
    }

    console.error(`\n✓ ${result.count} links marked as digested.\n`);

    if (noSync) {
      console.error('Skipped sync (--no-sync). Run `npm run digest:sync` before deploying.\n');
      return;
    }

    // Publishing digest N also rewrites digest N-1's "next" nav link and the
    // digest index, so the page set has to be restamped and republished here
    // rather than left for the next deploy.
    console.error('Syncing digest pages, index, sitemap and feed...\n');
    execFileSync('npm', ['run', 'digest:sync'], { stdio: 'inherit' });
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

main();
