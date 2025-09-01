#!/usr/bin/env node
/**
 * Publish helper for Android using Gradle Play Publisher.
 *
 * - Loads ANDROID_PUBLISHER_CREDENTIALS from env or from ../aroosi/.env.local
 *   (expects base64-encoded JSON in the latter, decodes to raw JSON for GPP).
 * - Supports Internal App Sharing upload (default) or Internal track publish.
 * - Adds optional dry-run and debug-signing flags.
 */
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const androidDir = path.join(root, 'android');

function log(msg) {
  process.stdout.write(msg + '\n');
}

function fail(msg, code = 1) {
  console.error(msg);
  process.exit(code);
}

function parseArgs() {
  const args = process.argv.slice(2);
  return {
    share: args.includes('--share'), // Internal App Sharing
    dryRun: args.includes('--dry-run'),
    debugSigning: args.includes('--debug-signing'),
    track: (() => {
      const i = args.indexOf('--track');
      return i !== -1 ? args[i + 1] : undefined;
    })(),
  };
}

function loadAndroidPublisherCreds() {
  const existing = process.env.ANDROID_PUBLISHER_CREDENTIALS;
  if (existing && existing.trim()) {
    try {
      // Accept raw JSON or base64 JSON
      const raw = existing.trim();
      const maybeJson = raw.startsWith('{') ? raw : Buffer.from(raw, 'base64').toString('utf8');
      JSON.parse(maybeJson); // validate
      process.env.ANDROID_PUBLISHER_CREDENTIALS = maybeJson;
      log('[gpp] ANDROID_PUBLISHER_CREDENTIALS loaded from environment');
      return true;
    } catch (e) {
      fail(`[gpp] Invalid ANDROID_PUBLISHER_CREDENTIALS in env: ${e.message || e}`);
    }
  }

  // Try reading from backend env file
  const webEnvPath = path.resolve(root, '../aroosi/.env.local');
  if (!fs.existsSync(webEnvPath)) {
    fail('[gpp] Missing ../aroosi/.env.local and no ANDROID_PUBLISHER_CREDENTIALS in env');
  }
  const contents = fs.readFileSync(webEnvPath, 'utf8');
  const m = contents.match(/^ANDROID_PUBLISHER_CREDENTIALS=(.+)$/m);
  if (!m) fail('[gpp] ANDROID_PUBLISHER_CREDENTIALS not found in ../aroosi/.env.local');
  const enc = m[1].trim();
  try {
    const decoded = Buffer.from(enc, 'base64').toString('utf8');
    JSON.parse(decoded); // validate
    process.env.ANDROID_PUBLISHER_CREDENTIALS = decoded;
    log('[gpp] ANDROID_PUBLISHER_CREDENTIALS loaded from ../aroosi/.env.local (base64 decoded)');
    return true;
  } catch (e) {
    fail('[gpp] Failed to decode/parse service account from ../aroosi/.env.local: ' + (e.message || e));
  }
}

function runGradle(task, extraArgs = []) {
  if (!fs.existsSync(path.join(androidDir, 'gradlew'))) {
    fail('[gradle] gradlew not found in android/');
  }
  const args = [task, '--no-daemon', '--stacktrace', ...extraArgs];
  log(`[gradle] ./gradlew ${args.join(' ')}`);
  const res = spawnSync(path.join(androidDir, 'gradlew'), args, {
    cwd: androidDir,
    stdio: 'inherit',
    env: process.env,
  });
  if (typeof res.status === 'number' && res.status !== 0) {
    fail(`[gradle] Task failed with exit code ${res.status}`);
  }
}

function showInternalSharingUrl() {
  const outDir = path.join(androidDir, 'app/build/outputs/internal-sharing/bundle/release');
  if (!fs.existsSync(outDir)) {
    log('[gpp] Internal Sharing output directory not found: ' + outDir);
    return;
  }
  const files = fs.readdirSync(outDir).filter(f => f.endsWith('.json'));
  if (!files.length) {
    log('[gpp] No Internal Sharing JSON output found in ' + outDir);
    return;
  }
  const jsonPath = path.join(outDir, files.sort().pop());
  try {
    const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
    if (data.downloadUrl) {
      log(`\n[gpp] Internal Sharing downloadUrl:\n${data.downloadUrl}\n`);
    } else {
      log('[gpp] Internal Sharing JSON (no downloadUrl): ' + jsonPath);
    }
  } catch {
    log('[gpp] Unable to parse Internal Sharing JSON: ' + jsonPath);
  }
}

(function main() {
  const { share, dryRun, debugSigning, track } = parseArgs();
  loadAndroidPublisherCreds();

  // For Internal Sharing, default to debug signing to avoid keystore requirements
  if (share || debugSigning) {
    process.env.ALLOW_DEBUG_SIGNING_FOR_LOCAL = 'true';
  }

  const extraArgs = [];
  if (dryRun) extraArgs.push('-PdryRun');
  if (track) extraArgs.push(`--track`, track);

  // Always create the release bundle first
  runGradle(':app:bundleRelease', ['-x', 'test']);

  if (share) {
    runGradle(':app:uploadReleasePrivateBundle', extraArgs);
    showInternalSharingUrl();
  } else {
    // This publishes to the configured track (default internal) via GPP
    runGradle(':app:publishReleaseBundle', extraArgs);
  }
})();
