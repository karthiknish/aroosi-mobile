#!/usr/bin/env node
/**
 * Ensure an upload keystore exists for release builds.
 *
 * If ANDROID_UPLOAD_KEYSTORE_BASE64 is set, decode it into android/app/upload.keystore.
 * Otherwise, if my-release-key.keystore exists at repo root (Expo EAS default), copy it.
 * If neither is present, print a helpful message and exit gracefully.
 */

const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const androidAppDir = path.join(root, 'android', 'app');
const uploadKeystorePath = path.join(androidAppDir, 'upload.keystore');
const legacyKeystorePath = path.join(root, 'my-release-key.keystore');

function log(msg) {
  process.stdout.write(`[prepare-android-keystore] ${msg}\n`);
}

function warn(msg) {
  process.stderr.write(`[prepare-android-keystore] ${msg}\n`);
}

try {
  if (fs.existsSync(uploadKeystorePath)) {
    log(`Found existing upload keystore at ${path.relative(root, uploadKeystorePath)}`);
    process.exit(0);
  }

  const b64 = process.env.ANDROID_UPLOAD_KEYSTORE_BASE64;
  if (b64 && b64.trim().length > 0) {
    const buf = Buffer.from(b64, 'base64');
    fs.writeFileSync(uploadKeystorePath, buf);
    log(`Wrote upload.keystore from ANDROID_UPLOAD_KEYSTORE_BASE64 -> ${path.relative(root, uploadKeystorePath)}`);
    process.exit(0);
  }

  if (fs.existsSync(legacyKeystorePath)) {
    fs.copyFileSync(legacyKeystorePath, uploadKeystorePath);
    log(`Copied ${path.basename(legacyKeystorePath)} to ${path.relative(root, uploadKeystorePath)}`);
    process.exit(0);
  }

  warn('No keystore found. For release builds you must provide signing creds.');
  warn('Options:');
  warn('  1) Set ANDROID_UPLOAD_KEYSTORE_BASE64 env var with base64 of your upload.keystore');
  warn('  2) Place my-release-key.keystore at repo root (will copy to android/app/upload.keystore)');
  warn('  3) Place upload.keystore directly at android/app/upload.keystore');
  // Do not exit non-zero; allow Gradle to provide the hard error when release task runs.
  process.exit(0);
} catch (e) {
  warn(`Error preparing keystore: ${e.message}`);
  process.exit(0);
}
