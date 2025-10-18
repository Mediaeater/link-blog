#!/usr/bin/env node

/**
 * Setup script for ActivityPub integration
 * Generates RSA keypair and initializes data directories
 */

const fs = require('fs').promises;
const path = require('path');
const { generateKeyPair } = require('../services/crypto.cjs');

async function setup() {
  console.log('🔧 Setting up ActivityPub integration...\n');

  // Create directories
  const dirs = [
    path.join(__dirname, '..', 'data', 'activitypub')
  ];

  for (const dir of dirs) {
    try {
      await fs.mkdir(dir, { recursive: true });
      console.log(`✓ Created directory: ${dir}`);
    } catch (error) {
      console.error(`✗ Failed to create directory ${dir}:`, error.message);
    }
  }

  // Generate keypair
  console.log('\n🔑 Generating RSA keypair...');
  try {
    const keys = await generateKeyPair();
    const keysPath = path.join(__dirname, '..', 'data', 'activitypub', 'keys.json');

    const keysData = {
      privateKey: keys.privateKey,
      publicKey: keys.publicKey,
      createdAt: new Date().toISOString()
    };

    await fs.writeFile(keysPath, JSON.stringify(keysData, null, 2));
    console.log(`✓ Keypair saved to: ${keysPath}`);
  } catch (error) {
    console.error('✗ Failed to generate keypair:', error.message);
    process.exit(1);
  }

  // Initialize followers.json
  console.log('\n👥 Initializing followers database...');
  try {
    const followersPath = path.join(__dirname, '..', 'data', 'activitypub', 'followers.json');
    const followersData = {
      followers: [],
      lastUpdated: new Date().toISOString()
    };

    await fs.writeFile(followersPath, JSON.stringify(followersData, null, 2));
    console.log(`✓ Followers database initialized: ${followersPath}`);
  } catch (error) {
    console.error('✗ Failed to initialize followers database:', error.message);
  }

  // Initialize activities.json
  console.log('\n📝 Initializing activities log...');
  try {
    const activitiesPath = path.join(__dirname, '..', 'data', 'activitypub', 'activities.json');
    const activitiesData = {
      activities: []
    };

    await fs.writeFile(activitiesPath, JSON.stringify(activitiesData, null, 2));
    console.log(`✓ Activities log initialized: ${activitiesPath}`);
  } catch (error) {
    console.error('✗ Failed to initialize activities log:', error.message);
  }

  console.log('\n✅ ActivityPub setup complete!\n');
  console.log('Next steps:');
  console.log('1. Deploy your server to https://newsfeeds.net');
  console.log('2. Ensure HTTPS is configured (required for ActivityPub)');
  console.log('3. Test WebFinger: curl -H "Accept: application/jrd+json" "https://newsfeeds.net/.well-known/webfinger?resource=acct:mediaeater@newsfeeds.net"');
  console.log('4. Search for @mediaeater@newsfeeds.net from Mastodon to follow!');
  console.log('');
}

// Run setup
setup().catch(error => {
  console.error('Setup failed:', error);
  process.exit(1);
});
