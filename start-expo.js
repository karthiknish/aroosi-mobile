#!/usr/bin/env node

// Register ts-node to handle TypeScript files
require('ts-node/register');

// Set environment variables
process.env.NODE_OPTIONS = '--experimental-require-module';

// Import and run expo start
const { spawn } = require('child_process');

const child = spawn('npx', ['expo', 'start'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_OPTIONS: '--experimental-require-module'
  }
});

child.on('exit', (code) => {
  process.exit(code);
});