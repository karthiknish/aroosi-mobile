import { initializeApp, getApps, type FirebaseApp } from 'firebase/app';
import { getAuth, initializeAuth, type Auth } from 'firebase/auth';
import AsyncStorage from '@react-native-async-storage/async-storage';
// getReactNativePersistence is only available in RN build; require dynamically to avoid TS type resolution issues
// eslint-disable-next-line @typescript-eslint/no-var-requires
const getReactNativePersistence: ((storage: any) => any) | undefined = (() => {
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    return require('firebase/auth/react-native').getReactNativePersistence;
  } catch {
    return undefined;
  }
})();

// We dynamically require initializeAuth + getReactNativePersistence to avoid
// type export issues across firebase minor versions in RN/Expo.

let firebaseApp: FirebaseApp | null = null;
let firebaseAuth: Auth | null = null;
let triedEnhancedInit = false;

export function initFirebase() {
  if (firebaseAuth) return { app: firebaseApp!, auth: firebaseAuth };
  if (!getApps().length) {
    const config = {
      apiKey: process.env.FIREBASE_API_KEY || process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN || process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.FIREBASE_PROJECT_ID || process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET || process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.FIREBASE_APP_ID || process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
      measurementId: process.env.FIREBASE_MEASUREMENT_ID || process.env.EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID,
    } as any;
    firebaseApp = initializeApp(config);
  } else if (!firebaseApp) {
    firebaseApp = getApps()[0]!;
  }

  // Attempt enhanced RN-aware auth initialization once, using CJS requires consistently.
  if (!firebaseAuth && !triedEnhancedInit) {
    triedEnhancedInit = true;
    try {
      firebaseAuth = initializeAuth(firebaseApp!, {
        persistence: getReactNativePersistence
          ? getReactNativePersistence(AsyncStorage)
          : undefined,
      });
    } catch {
      // initializeAuth can throw if auth was already initialized; fallback to getAuth
      firebaseAuth = getAuth(firebaseApp!);
    }
  }
  if (!firebaseAuth) {
    firebaseAuth = getAuth(firebaseApp!);
  }
  return { app: firebaseApp!, auth: firebaseAuth };
}

export function getFirebaseAuth() {
  if (!firebaseAuth) initFirebase();
  return firebaseAuth!;
}
