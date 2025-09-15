#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const root = process.cwd();
const iosPlist =
  process.env.GOOGLE_SERVICE_INFO_PLIST || "./GoogleService-Info.plist";
const androidJson =
  process.env.GOOGLE_SERVICES_JSON || "./android/app/google-services.json";

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

// Optional: sanity check web client id alignment (Android json vs .env)
try {
  const jsonPath = path.resolve(root, androidJson);
  if (fs.existsSync(jsonPath)) {
    const data = JSON.parse(fs.readFileSync(jsonPath, "utf8"));
    const oauthClients = data?.client?.[0]?.oauth_client || [];
    const webClient = oauthClients.find((c) => c.client_type === 3)?.client_id;
    const envWebClient = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    if (envWebClient && webClient && envWebClient !== webClient) {
      console.warn(
        `\nWARNING: EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID does not match google-services.json web client id.\n  .env: ${envWebClient}\n  json: ${webClient}\nThis can cause Google token errors. Consider aligning them.`
      );
    }
  }
} catch (e) {
  console.warn("Could not validate web client id alignment:", e?.message || e);
}

if (!ok) {
  console.error('\nAction required:');
  console.error('- Add GoogleService-Info.plist to ios, and google-services.json to android.');
  console.error('- Or set GOOGLE_SERVICE_INFO_PLIST / GOOGLE_SERVICES_JSON to their paths.');
  process.exit(1);
}

console.log('\nGoogle services files are present.');
