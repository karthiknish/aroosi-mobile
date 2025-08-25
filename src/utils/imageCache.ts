// Simple in-memory image metadata cache (URLs by userId)
// Not persistent across app restarts; reduces duplicate network calls within session.
export type ImageCacheEntry = {
  urls: string[];
  cachedAt: number;
};

const cache: Record<string, ImageCacheEntry> = {};
const TTL_MS = 5 * 60 * 1000; // 5 minutes

export function setProfileImages(userId: string, urls: string[]) {
  if (!userId) return;
  cache[userId] = { urls, cachedAt: Date.now() };
}

export function getProfileImages(userId: string): string[] | undefined {
  const entry = cache[userId];
  if (!entry) return undefined;
  if (Date.now() - entry.cachedAt > TTL_MS) {
    delete cache[userId];
    return undefined;
  }
  return entry.urls;
}

export function primeProfileImages(batch: Record<string, string[]>) {
  Object.entries(batch).forEach(([id, urls]) => setProfileImages(id, urls));
}

export function clearImageCache() {
  Object.keys(cache).forEach((k) => delete cache[k]);
}
