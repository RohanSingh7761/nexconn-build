import { spawn, spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log('\n===========================================');
console.log('   Starting DryRun Development Suite    ');
console.log('===========================================\n');

// Step 1: Ensure database schema & seed are up to date
console.log('[1/2] Initializing and verifying PostgreSQL database...');
const isWin = process.platform === 'win32';
const npmCmd = isWin ? 'npm.cmd' : 'npm';

const dbInit = spawnSync(
  npmCmd,
  ['run', 'db:init'],
  { stdio: 'inherit', cwd: __dirname, shell: isWin }
);

function spawnChild(name, args, cwd, color) {
  const child = spawn(npmCmd, args, { cwd, shell: isWin });

  child.stdout.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${color}[${name}]\x1b[0m ${line}`);
      }
    }
  });

  child.stderr.on('data', (data) => {
    const lines = data.toString().split('\n');
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${color}[${name}]\x1b[0m ${line}`);
      }
    }
  });

  child.on('close', (code) => {
    console.log(`${color}[${name}]\x1b[0m Exited with code ${code}`);
  });

  return child;
}

// Cyan for Server, Green for Client
const serverChild = spawnChild('server', ['--prefix', 'server', 'run', 'dev'], __dirname, '\x1b[36m');
const clientChild = spawnChild('client', ['--prefix', 'client', 'run', 'dev'], __dirname, '\x1b[32m');

process.on('SIGINT', () => {
  console.log('\nShutting down servers...');
  serverChild.kill();
  clientChild.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  serverChild.kill();
  clientChild.kill();
  process.exit(0);
});
