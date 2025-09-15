#!/usr/bin/env node
/**
 * Bump version and build numbers in a consistent way.
 * - package.json version is bumped (semver)
 * - versioning/build-version.json build numbers are incremented per platform
 * Usage:
 *   node scripts/bump-version.js patch|minor|major [--no-ios] [--no-android]
 */
const fs = require('fs');
const path = require('path');

const inc = (v, type) => {
  const [major, minor, patch] = v.split('.').map(Number);
  if (type === 'major') return `${major + 1}.0.0`;
  if (type === 'minor') return `${major}.${minor + 1}.0`;
  return `${major}.${minor}.${(patch || 0) + 1}`;
};

function main() {
  const type = (process.argv[2] || 'patch').toLowerCase();
  const enableIOS = !process.argv.includes('--no-ios');
  const enableAndroid = !process.argv.includes('--no-android');

  const pkgFile = path.resolve(__dirname, '..', 'package.json');
  const buildFile = path.resolve(__dirname, '..', 'versioning', 'build-version.json');

  const pkg = JSON.parse(fs.readFileSync(pkgFile, 'utf8'));
  const build = fs.existsSync(buildFile)
    ? JSON.parse(fs.readFileSync(buildFile, 'utf8'))
    : { ios: { buildNumber: 1 }, android: { versionCode: 1 } };

  const oldVersion = pkg.version || '1.0.0';
  const newVersion = inc(oldVersion, type);
  pkg.version = newVersion;
  fs.writeFileSync(pkgFile, JSON.stringify(pkg, null, 2) + '\n');

  if (enableIOS) build.ios.buildNumber = Number(build.ios.buildNumber || 0) + 1;
  if (enableAndroid) build.android.versionCode = Number(build.android.versionCode || 0) + 1;
  fs.mkdirSync(path.dirname(buildFile), { recursive: true });
  fs.writeFileSync(buildFile, JSON.stringify(build, null, 2) + '\n');

  console.log(`Bumped version: ${oldVersion} -> ${newVersion}`);
  console.log(`iOS buildNumber: ${build.ios.buildNumber}`);
  console.log(`Android versionCode: ${build.android.versionCode}`);
}

main();
