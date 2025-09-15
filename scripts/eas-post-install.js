#!/usr/bin/env node
// Copy GoogleService-Info.plist into ios/Aroosi for EAS iOS builds
// Source: GOOGLE_SERVICE_INFO_PLIST (EAS file env var) or local fallback

const fs = require('fs');
const path = require('path');

function log(msg) {
  console.log(`[eas-post-install] ${msg}`);
}

function run() {
  const platform = process.env.EAS_BUILD_PLATFORM;
  if (platform !== 'ios') {
    log('Not an iOS build; skipping plist copy.');
    return;
  }

  const root = process.cwd();
  const src = process.env.GOOGLE_SERVICE_INFO_PLIST || path.resolve(root, 'GoogleService-Info.plist');
  const destDir = path.resolve(root, 'ios', 'Aroosi');
  const dest = path.join(destDir, 'GoogleService-Info.plist');

  log(`Preparing to copy GoogleService-Info.plist to ${dest}`);

  if (!fs.existsSync(src)) {
    log(`Source plist not found at: ${src}`);
    log('Ensure GOOGLE_SERVICE_INFO_PLIST is set as a file env var on EAS or the file exists at project root.');
    process.exit(1);
  }

  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  fs.copyFileSync(src, dest);
  log('Copied GoogleService-Info.plist successfully.');
}

run();
