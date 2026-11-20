import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sdkDir = path.resolve(__dirname, 'node_modules/@nexconn/server-sdk');

if (fs.existsSync(sdkDir)) {
  const distDir = path.join(sdkDir, 'dist');
  if (!fs.existsSync(path.join(distDir, 'index.js')) || !fs.existsSync(path.join(distDir, 'esm/index.js'))) {
    console.log('Building @nexconn/server-sdk...');
    execSync('npx -p typescript@5.7.3 tsc --skipLibCheck --lib es2020,dom --typeRoots ../../@types --types node', { cwd: sdkDir, stdio: 'inherit' });
    execSync('npx -p typescript@5.7.3 tsc -p tsconfig.esm.json --skipLibCheck --lib es2020,dom --typeRoots ../../@types --types node', { cwd: sdkDir, stdio: 'inherit' });
    console.log('@nexconn/server-sdk built successfully.');
  } else {
    console.log('@nexconn/server-sdk dist already built.');
  }
}
