import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
// Ensure auth component registers side-effects before any getAuth calls
import 'firebase/auth';

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

  // Attempt enhanced RN-aware auth initialization once.
  if (!firebaseAuth && !triedEnhancedInit) {
    triedEnhancedInit = true;
    try {
      // Load initializeAuth from web entry and RN persistence from RN-specific entry
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const { initializeAuth }: any = require('firebase/auth');
      let rnPersistence: any = null;
      try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const { getReactNativePersistence }: any = require('firebase/auth/react-native');
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const AsyncStorage = require('@react-native-async-storage/async-storage').default;
        rnPersistence = getReactNativePersistence?.(AsyncStorage) || null;
      } catch {}

      if (initializeAuth) {
        firebaseAuth = rnPersistence
          ? initializeAuth(firebaseApp!, { persistence: rnPersistence })
          : initializeAuth(firebaseApp!);
      }
    } catch (e) {
      // swallow and fallback
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
