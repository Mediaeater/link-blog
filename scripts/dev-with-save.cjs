#!/usr/bin/env node

const { spawn } = require('child_process');

console.log(`
╔════════════════════════════════════════════════╗
║       Link Blog - Development with Saving       ║
╚════════════════════════════════════════════════╝
`);

// Start the API server
console.log('🚀 Starting API server on port 3001...');
const apiServer = spawn('node', ['server.cjs'], {
  stdio: 'inherit',
  shell: true
});

// Give the API server a moment to start
setTimeout(() => {
  console.log('\n📦 Starting Vite dev server on port 5174...\n');
  const viteServer = spawn('npm', ['run', 'dev'], {
    stdio: 'inherit',
    shell: true
  });

  // Handle process termination
  process.on('SIGINT', () => {
    console.log('\n\n👋 Shutting down servers...');
    apiServer.kill();
    viteServer.kill();
    process.exit();
  });

  process.on('SIGTERM', () => {
    apiServer.kill();
    viteServer.kill();
    process.exit();
  });

  viteServer.on('close', (code) => {
    apiServer.kill();
    process.exit(code);
  });

  apiServer.on('close', (code) => {
    viteServer.kill();
    process.exit(code);
  });
}, 1000);

console.log(`
✨ Your links will now automatically save to JSON files!
   
   - Frontend: http://localhost:5174
   - API:      http://localhost:3001
   
   Press Ctrl+C to stop both servers
`);