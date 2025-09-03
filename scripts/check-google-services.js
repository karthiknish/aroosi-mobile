#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const iosPlist = process.env.GOOGLE_SERVICE_INFO_PLIST || './ios/Aroosi/GoogleService-Info.plist';
const androidJson = process.env.GOOGLE_SERVICES_JSON || './android/app/google-services.json';

function check(p) {
  const abs = path.resolve(root, p);
  const exists = fs.existsSync(abs);
  return { rel: p, abs, exists };
}

const results = [check(iosPlist), check(androidJson)];
let ok = true;
for (const r of results) {
  if (!r.exists) {
    ok = false;
    console.error(`Missing: ${r.rel} (expected at ${r.abs})`);
  } else {
    console.log(`Found: ${r.rel}`);
  }
}

if (!ok) {
  console.error('\nAction required:');
  console.error('- Add GoogleService-Info.plist to ios, and google-services.json to android.');
  console.error('- Or set GOOGLE_SERVICE_INFO_PLIST / GOOGLE_SERVICES_JSON to their paths.');
  process.exit(1);
}

console.log('\nGoogle services files are present.');
