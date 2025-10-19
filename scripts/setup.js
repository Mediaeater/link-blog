#!/usr/bin/env node

/**
 * Link Blog - Automated Setup Script
 *
 * Handles initial project setup:
 * - Installs dependencies
 * - Creates .env file with random password
 * - Initializes data files if missing
 * - Verifies Node.js version
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generatePassword() {
  return Math.random().toString(36).slice(-12) + Math.random().toString(36).slice(-12);
}

async function checkNodeVersion() {
  log('\n📋 Checking Node.js version...', 'blue');
  const version = process.versions.node;
  const majorVersion = parseInt(version.split('.')[0]);

  if (majorVersion < 16) {
    log(`❌ Node.js ${version} detected. Version 16+ required.`, 'red');
    log('   Please upgrade Node.js: https://nodejs.org/', 'yellow');
    process.exit(1);
  }

  log(`✅ Node.js ${version} (OK)`, 'green');
}

async function installDependencies() {
  log('\n📦 Installing dependencies...', 'blue');
  log('   This may take a few minutes...', 'yellow');

  try {
    execSync('npm install', {
      cwd: projectRoot,
      stdio: 'inherit'
    });
    log('✅ Dependencies installed', 'green');
  } catch (error) {
    log('❌ Failed to install dependencies', 'red');
    throw error;
  }
}

async function setupEnvFile() {
  const envPath = path.join(projectRoot, '.env');
  const envExamplePath = path.join(projectRoot, '.env.example');

  log('\n🔐 Setting up environment file...', 'blue');

  if (fs.existsSync(envPath)) {
    log('   .env file already exists', 'yellow');
    return;
  }

  const password = generatePassword();

  let envContent = `# Link Blog Environment Variables\n\n`;
  envContent += `# Admin password for ?admin=password in URL\n`;
  envContent += `VITE_ADMIN_PASSWORD=${password}\n\n`;
  envContent += `# API Server Port (default: 3001)\n`;
  envContent += `PORT=3001\n`;

  fs.writeFileSync(envPath, envContent);

  log('✅ Created .env file', 'green');
  log(`   Admin password: ${password}`, 'bright');
  log('   (You can change this in .env)', 'yellow');
}

async function setupDataFiles() {
  const dataDir = path.join(projectRoot, 'data');
  const linksPath = path.join(dataDir, 'links.json');
  const activityPubDir = path.join(dataDir, 'activitypub');

  log('\n📄 Setting up data files...', 'blue');

  // Create data directory if missing
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
    log('   Created data/ directory', 'yellow');
  }

  // Create links.json if missing
  if (!fs.existsSync(linksPath)) {
    const initialData = {
      links: [],
      lastUpdated: new Date().toISOString()
    };
    fs.writeFileSync(linksPath, JSON.stringify(initialData, null, 2));
    log('   Created data/links.json', 'yellow');
  }

  // Create ActivityPub directory if missing
  if (!fs.existsSync(activityPubDir)) {
    fs.mkdirSync(activityPubDir, { recursive: true });
    log('   Created data/activitypub/ directory', 'yellow');
  }

  // Ensure public/data exists
  const publicDataDir = path.join(projectRoot, 'public', 'data');
  if (!fs.existsSync(publicDataDir)) {
    fs.mkdirSync(publicDataDir, { recursive: true });
    log('   Created public/data/ directory', 'yellow');
  }

  // Copy links.json to public if missing
  const publicLinksPath = path.join(publicDataDir, 'links.json');
  if (!fs.existsSync(publicLinksPath) && fs.existsSync(linksPath)) {
    fs.copyFileSync(linksPath, publicLinksPath);
    log('   Synced to public/data/links.json', 'yellow');
  }

  log('✅ Data files initialized', 'green');
}

async function checkPorts() {
  log('\n🔌 Checking port availability...', 'blue');

  const ports = [3001, 5174];

  for (const port of ports) {
    try {
      const output = execSync(`lsof -ti:${port} 2>/dev/null || echo ""`, {
        encoding: 'utf-8'
      }).trim();

      if (output) {
        log(`   ⚠️  Port ${port} is in use`, 'yellow');
        log(`      You may need to stop existing processes`, 'yellow');
      }
    } catch (error) {
      // Port check command failed, but that's OK (might not have lsof)
    }
  }

  log('   Ports checked', 'green');
}

async function printNextSteps() {
  log('\n' + '='.repeat(60), 'bright');
  log('✅ Setup Complete!', 'green');
  log('='.repeat(60), 'bright');

  log('\n📚 Next Steps:\n', 'blue');
  log('1. Start development server:', 'bright');
  log('   npm run dev:save\n');

  log('2. Open in browser:', 'bright');
  log('   http://localhost:5174\n');

  log('3. Access admin mode:', 'bright');
  log('   Add ?admin=YourPassword to the URL');
  log('   (Password is in .env file)\n');

  log('📖 Documentation:', 'blue');
  log('   - Quick Start: docs/setup/quickstart.md');
  log('   - Full Docs: docs/README.md');
  log('   - Project State: CLAUDE.md\n');

  log('💡 Useful Commands:', 'blue');
  log('   npm run dev:save   # Development with save enabled');
  log('   npm run build      # Build for production');
  log('   npm run deploy     # Deploy to GitHub Pages');
  log('   npm run feeds      # Generate RSS/JSON feeds\n');
}

async function main() {
  try {
    log('\n🚀 Link Blog - Automated Setup', 'bright');
    log('=' .repeat(60), 'bright');

    await checkNodeVersion();
    await installDependencies();
    await setupEnvFile();
    await setupDataFiles();
    await checkPorts();
    await printNextSteps();

  } catch (error) {
    log('\n❌ Setup failed:', 'red');
    console.error(error);
    process.exit(1);
  }
}

main();
