#!/usr/bin/env node

/**
 * Shutdown script for link-blog
 * Cleanly stops all running processes (Vite dev server and API server)
 * Prevents orphan processes by finding and killing all related Node processes
 */

const { execSync } = require('child_process');

console.log('🛑 Shutting down link-blog systems...\n');

try {
  // Find all node processes related to link-blog
  const commands = [
    'server.cjs',
    'vite',
    'dev-with-save.cjs'
  ];

  commands.forEach(cmd => {
    try {
      // Find PIDs for this command
      const pids = execSync(`lsof -ti:3001,5174 2>/dev/null || pgrep -f "${cmd}" 2>/dev/null || echo ""`, { encoding: 'utf8' })
        .trim()
        .split('\n')
        .filter(pid => pid && pid.length > 0);

      if (pids.length > 0) {
        console.log(`  → Found ${pids.length} process(es) for ${cmd}`);
        pids.forEach(pid => {
          try {
            process.kill(parseInt(pid), 'SIGTERM');
            console.log(`    ✓ Killed PID ${pid}`);
          } catch (e) {
            // Process might already be dead
          }
        });
      }
    } catch (e) {
      // No processes found or command failed - this is ok
    }
  });

  // Double-check ports are free
  try {
    const portProcesses = execSync('lsof -ti:3001,5174 2>/dev/null || echo ""', { encoding: 'utf8' }).trim();
    if (portProcesses) {
      console.log('\n  → Cleaning up remaining port listeners...');
      portProcesses.split('\n').forEach(pid => {
        if (pid) {
          try {
            process.kill(parseInt(pid), 'SIGKILL');
            console.log(`    ✓ Force killed PID ${pid}`);
          } catch (e) {
            // Already dead
          }
        }
      });
    }
  } catch (e) {
    // Ports already free
  }

  console.log('\n✅ Shutdown complete. All systems stopped.');
  process.exit(0);

} catch (error) {
  console.error('\n❌ Error during shutdown:', error.message);
  process.exit(1);
}
