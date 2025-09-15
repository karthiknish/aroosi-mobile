#!/usr/bin/env node
/**
 * Post-submit helper to tag the repo and optionally push.
 * Reads version from package.json and creates a git tag like vX.Y.Z with platform build info.
 * Usage: node scripts/post-submit-version.js [--push]
 */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');

function sh(cmd) {
  return cp.execSync(cmd, { stdio: 'inherit' });
}

function get(cmd) {
  return cp.execSync(cmd).toString().trim();
}

function main() {
  const shouldPush = process.argv.includes('--push');
  const root = path.resolve(__dirname, '..');
  const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
  const build = JSON.parse(fs.readFileSync(path.join(root, 'versioning', 'build-version.json'), 'utf8'));

  const tag = `v${pkg.version}`;
  const msg = `Release ${tag} (iOS build ${build.ios.buildNumber}, Android vc ${build.android.versionCode})`;

  const currentBranch = get('git rev-parse --abbrev-ref HEAD');
  console.log(`Tagging ${tag} on ${currentBranch}`);
  try { sh(`git tag -a ${tag} -m "${msg}"`); } catch {}

  if (shouldPush) {
    console.log('Pushing tags...');
    sh('git push --tags');
  } else {
    console.log('Tag created locally. Use --push to push tags.');
  }
}

main();
