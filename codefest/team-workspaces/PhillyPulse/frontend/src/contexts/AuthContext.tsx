"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  getAuth,
  onAuthStateChanged,
  sendEmailVerification,
  signInAnonymously,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  type User,
} from "firebase/auth";
import { doc, getFirestore, serverTimestamp, setDoc } from "firebase/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";

const ADMIN_EMAILS = ["eliyoung4now@gmail.com", "kethansany@gmail.com"];

type AuthState = {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signInWithGoogle: () => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resendVerification: () => Promise<void>;
  signOutUser: () => Promise<void>;
};

const AuthContext = createContext<AuthState | null>(null);

const noop = async () => {};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isFirebaseConfigured()) {
      setLoading(false);
      return;
    }
    const auth = getAuth(getFirebaseApp());
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured() || !user || user.isAnonymous) return;
    if (!user.email) return;
    const db = getFirestore(getFirebaseApp());
    void setDoc(
      doc(db, "users", user.uid),
      {
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    ).catch((e) => console.warn("User profile sync:", e));
  }, [user]);

  const signInWithGoogle = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }, []);

  const signInAsGuest = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    await signInAnonymously(auth);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getAuth(getFirebaseApp());
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    await sendEmailVerification(cred.user);
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const auth = getAuth(getFirebaseApp());
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const resendVerification = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    if (auth.currentUser && !auth.currentUser.emailVerified) {
      await sendEmailVerification(auth.currentUser);
    }
  }, []);

  const signOutUser = useCallback(async () => {
    const auth = getAuth(getFirebaseApp());
    await signOut(auth);
  }, []);

  const isAdmin = !!user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase());

  const value = useMemo(
    () => ({
      user,
      loading,
      isAdmin,
      signInWithGoogle,
      signInAsGuest,
      signUpWithEmail,
      signInWithEmail,
      resendVerification,
      signOutUser,
    }),
    [user, loading, isAdmin, signInWithGoogle, signInAsGuest, signUpWithEmail, signInWithEmail, resendVerification, signOutUser]
  );

  if (!isFirebaseConfigured()) {
    return (
      <AuthContext.Provider
        value={{
          user: null,
          loading: false,
          isAdmin: false,
          signInWithGoogle: noop,
          signInAsGuest: noop,
          signUpWithEmail: noop,
          signInWithEmail: noop,
          resendVerification: noop,
          signOutUser: noop,
        }}
      >
        {children}
      </AuthContext.Provider>
    );
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}
