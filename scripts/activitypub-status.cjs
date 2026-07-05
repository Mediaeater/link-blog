#!/usr/bin/env node

/**
 * ActivityPub status and statistics viewer
 * Usage: node scripts/activitypub-status.cjs
 */

const fs = require('fs').promises;
const path = require('path');

async function loadJson(filepath) {
  try {
    const content = await fs.readFile(filepath, 'utf8');
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log('📊 ActivityPub Status Report\n');
  console.log('═'.repeat(60));

  // Load data
  const followersPath = path.join(__dirname, '..', 'data', 'activitypub', 'followers.json');
  const activitiesPath = path.join(__dirname, '..', 'data', 'activitypub', 'activities.json');
  const keysPath = path.join(__dirname, '..', 'data', 'activitypub', 'keys.json');

  const followersData = await loadJson(followersPath);
  const activitiesData = await loadJson(activitiesPath);
  const keysData = await loadJson(keysPath);

  // Keys Status
  console.log('\n🔑 Cryptographic Keys');
  console.log('─'.repeat(60));
  if (keysData) {
    console.log(`   Status: ✓ Initialized`);
    console.log(`   Created: ${new Date(keysData.createdAt).toLocaleString()}`);
    console.log(`   Public Key Length: ${keysData.publicKey.length} chars`);
  } else {
    console.log(`   Status: ✗ Not initialized`);
    console.log(`   Run: node scripts/setup-activitypub.cjs`);
  }

  // Followers Status
  console.log('\n👥 Followers');
  console.log('─'.repeat(60));
  if (followersData && followersData.followers) {
    const followers = followersData.followers;
    console.log(`   Total Followers: ${followers.length}`);

    if (followers.length > 0) {
      console.log(`   Last Updated: ${new Date(followersData.lastUpdated).toLocaleString()}`);
      console.log('\n   Recent Followers:');

      followers
        .sort((a, b) => new Date(b.followedAt) - new Date(a.followedAt))
        .slice(0, 10)
        .forEach((follower, i) => {
          const domain = new URL(follower.id).hostname;
          console.log(`   ${i + 1}. @${follower.preferredUsername}@${domain}`);
          console.log(`      Followed: ${new Date(follower.followedAt).toLocaleString()}`);
        });

      // Instance statistics
      const instanceCounts = {};
      followers.forEach(f => {
        const domain = new URL(f.id).hostname;
        instanceCounts[domain] = (instanceCounts[domain] || 0) + 1;
      });

      console.log('\n   Followers by Instance:');
      Object.entries(instanceCounts)
        .sort((a, b) => b[1] - a[1])
        .forEach(([domain, count]) => {
          console.log(`      ${domain}: ${count}`);
        });
    } else {
      console.log('   No followers yet');
    }
  } else {
    console.log('   Status: ✗ Not initialized');
  }

  // Activities Status
  console.log('\n📝 Activity Log');
  console.log('─'.repeat(60));
  if (activitiesData && activitiesData.activities) {
    const activities = activitiesData.activities;
    console.log(`   Total Activities: ${activities.length}`);

    // Activity type counts
    const typeCounts = {};
    activities.forEach(act => {
      typeCounts[act.type] = (typeCounts[act.type] || 0) + 1;
    });

    console.log('\n   Activity Breakdown:');
    Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`      ${type}: ${count}`);
      });

    // Recent activities
    console.log('\n   Recent Activities:');
    activities
      .slice(-10)
      .reverse()
      .forEach((act, i) => {
        const time = new Date(act.timestamp).toLocaleString();
        const actor = act.actor ? new URL(act.actor).pathname : 'N/A';
        console.log(`   ${i + 1}. [${time}] ${act.type} from ${actor}`);
        if (act.status) {
          const statusIcon = act.status >= 200 && act.status < 300 ? '✓' : '✗';
          console.log(`      ${statusIcon} HTTP ${act.status}`);
        }
      });

    // Delivery statistics
    const deliveries = activities.filter(a => a.type === 'Deliver');
    if (deliveries.length > 0) {
      const successful = deliveries.filter(d => d.status >= 200 && d.status < 300).length;
      const failed = deliveries.length - successful;
      const successRate = ((successful / deliveries.length) * 100).toFixed(1);

      console.log('\n   Delivery Statistics:');
      console.log(`      Total Deliveries: ${deliveries.length}`);
      console.log(`      Successful: ${successful} (${successRate}%)`);
      console.log(`      Failed: ${failed}`);
    }
  } else {
    console.log('   Status: ✗ Not initialized');
  }

  // System Check
  console.log('\n🔧 System Check');
  console.log('─'.repeat(60));

  const checks = [
    { name: 'Keys initialized', status: keysData !== null },
    { name: 'Followers database', status: followersData !== null },
    { name: 'Activities log', status: activitiesData !== null },
    { name: 'Has followers', status: followersData && followersData.followers.length > 0 }
  ];

  checks.forEach(check => {
    const icon = check.status ? '✓' : '✗';
    console.log(`   ${icon} ${check.name}`);
  });

  // Recommendations
  console.log('\n💡 Recommendations');
  console.log('─'.repeat(60));

  if (!keysData) {
    console.log('   • Run: node scripts/setup-activitypub.cjs');
  }

  if (!followersData || followersData.followers.length === 0) {
    console.log('   • Search for @mediaeater@newsfeeds.net from Mastodon to follow');
  }

  if (followersData && followersData.followers.length > 0) {
    console.log('   • Test delivery: node scripts/deliver-links.cjs 1');
  }

  console.log('\n═'.repeat(60));
  console.log('');
}

main().catch(error => {
  console.error('Error:', error);
  process.exit(1);
});
