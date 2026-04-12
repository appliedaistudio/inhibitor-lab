"use client";

import { useCallback, useEffect, useState } from "react";
import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getFirestore,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
} from "firebase/firestore";
import { getFirebaseApp, isFirebaseConfigured } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";

export interface SavedDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  createdAt: string;
}

export function useSavedDestinations() {
  const { user } = useAuth();
  const [destinations, setDestinations] = useState<SavedDestination[]>([]);
  const [loading, setLoading] = useState(true);

  const canSave = isFirebaseConfigured() && !!user && !user.isAnonymous;

  useEffect(() => {
    if (!canSave) {
      setDestinations([]);
      setLoading(false);
      return;
    }

    const db = getFirestore(getFirebaseApp());
    const col = collection(db, "users", user!.uid, "savedDestinations");
    const q = query(col, orderBy("createdAt", "desc"));

    const unsub = onSnapshot(
      q,
      (snap) => {
        const list: SavedDestination[] = [];
        snap.forEach((d) => {
          const data = d.data();
          list.push({
            id: d.id,
            name: String(data.name ?? ""),
            lat: Number(data.lat ?? 0),
            lng: Number(data.lng ?? 0),
            createdAt: data.createdAt?.toDate?.()?.toISOString?.() ?? "",
          });
        });
        setDestinations(list);
        setLoading(false);
      },
      () => setLoading(false)
    );

    return () => unsub();
  }, [canSave, user]);

  const addDestination = useCallback(
    async (name: string, lat: number, lng: number) => {
      if (!canSave) return;
      const db = getFirestore(getFirebaseApp());
      const col = collection(db, "users", user!.uid, "savedDestinations");
      await addDoc(col, { name, lat, lng, createdAt: serverTimestamp() });
    },
    [canSave, user]
  );

  const removeDestination = useCallback(
    async (destId: string) => {
      if (!canSave) return;
      const db = getFirestore(getFirebaseApp());
      await deleteDoc(doc(db, "users", user!.uid, "savedDestinations", destId));
    },
    [canSave, user]
  );

  return { destinations, loading, canSave, addDestination, removeDestination };
}
