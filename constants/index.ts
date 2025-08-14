export * from './Colors';
export * from './Layout';
export * from './Platform';
export * from './Theme';
// typography.ts has been removed; do not re-export it

// Central API base URL for token-based auth
// Prefer EXPO_PUBLIC_API_URL; fallback to production default.
export const API_BASE_URL: string =
  (typeof process !== 'undefined' && process.env?.EXPO_PUBLIC_API_URL) ||
  'https://aroosi.app';