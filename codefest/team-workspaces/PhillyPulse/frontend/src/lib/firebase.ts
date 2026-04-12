import { getApps, initializeApp, type FirebaseApp } from "firebase/app";
import { getAnalytics, isSupported, type Analytics } from "firebase/analytics";

function firebaseConfig() {
  const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
  const authDomain = process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN;
  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
  const storageBucket = process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
  const messagingSenderId = process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID;
  const appId = process.env.NEXT_PUBLIC_FIREBASE_APP_ID;
  const measurementId = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

  if (
    !apiKey ||
    !authDomain ||
    !projectId ||
    !storageBucket ||
    !messagingSenderId ||
    !appId
  ) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
    ...(measurementId ? { measurementId } : {}),
  };
}

export function isFirebaseConfigured(): boolean {
  return firebaseConfig() !== null;
}

let app: FirebaseApp | undefined;

/** Call from client code when using Auth, Firestore, etc. Throws if env is incomplete. */
export function getFirebaseApp(): FirebaseApp {
  const config = firebaseConfig();
  if (!config) {
    throw new Error(
      "Firebase is not configured. Copy .env.example to .env.local and set NEXT_PUBLIC_FIREBASE_*."
    );
  }
  if (!app) {
    app = getApps()[0] ?? initializeApp(config);
  }
  return app;
}

let analyticsPromise: Promise<Analytics | null> | undefined;

/** Analytics only runs in the browser. Safe to call from a client component or useEffect. */
export function getFirebaseAnalytics(): Promise<Analytics | null> {
  if (typeof window === "undefined") {
    return Promise.resolve(null);
  }
  if (!process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID) {
    return Promise.resolve(null);
  }
  if (!analyticsPromise) {
    analyticsPromise = isSupported().then((supported) => {
      if (!supported) return null;
      return getAnalytics(getFirebaseApp());
    });
  }
  return analyticsPromise;
}
