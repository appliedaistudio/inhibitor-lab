import {
  collection,
  getFirestore,
  limit as limitFn,
  onSnapshot,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import { getFirebaseApp } from "@/lib/firebase";
import type { Incident, Extraction, PreprocessMeta, VariantResult, WhisperMeta } from "@/lib/api";
import { enrichIncidents } from "@/lib/incident-weights";

const COLLECTION = "incidents";
const MAX_DOCS = 5000;

function toISOString(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (typeof val === "string") {
    let s = val;
    // Treat timezone-naive ISO strings as UTC (server stores UTC without Z)
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(s) && !s.endsWith("Z") && !/[+-]\d{2}:?\d{2}$/.test(s)) {
      s += "Z";
    }
    const d = new Date(s);
    return Number.isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
  }
  if (typeof val === "object" && val !== null && "toDate" in val && typeof (val as { toDate: () => Date }).toDate === "function") {
    return (val as { toDate: () => Date }).toDate().toISOString();
  }
  if (typeof val === "object" && val !== null && "seconds" in val) {
    return new Date((val as { seconds: number }).seconds * 1000).toISOString();
  }
  return new Date().toISOString();
}

function mapDoc(id: string, data: Record<string, unknown>): Incident {
  return {
    id,
    reported_at: toISOString(data.reported_at),
    raw_text: String(data.raw_text ?? ""),
    severity_category: String(data.severity_category ?? ""),
    s_base: Number(data.s_base ?? 0),
    location_text:
      data.location_text === null || data.location_text === undefined
        ? null
        : String(data.location_text),
    lat:
      data.lat === null || data.lat === undefined ? null : Number(data.lat),
    lng:
      data.lng === null || data.lng === undefined ? null : Number(data.lng),
    confidence: Number(data.confidence ?? 1),
    geocode_status: String(data.geocode_status ?? "pending"),
    location_confidence: (["direct", "context", "none"].includes(String(data.location_confidence ?? "none"))
      ? String(data.location_confidence)
      : "none") as import("./api").LocationConfidence,
    inhibitor_status: String(data.inhibitor_status ?? "passed"),
    inhibitor_reason:
      data.inhibitor_reason === null || data.inhibitor_reason === undefined
        ? null
        : String(data.inhibitor_reason),
    w_eff: 0,
    audio_clip:
      data.audio_clip === null || data.audio_clip === undefined
        ? null
        : String(data.audio_clip),
    feed_id:
      data.feed_id === null || data.feed_id === undefined
        ? null
        : String(data.feed_id),
    description:
      data.description === null || data.description === undefined
        ? null
        : String(data.description),
    hidden: data.hidden === true,
  };
}

/**
 * Live incidents for the map (non-blocked only). Caller should filter by category client-side if needed.
 */
export function subscribeIncidents(
  onData: (incidents: Incident[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = getFirestore(getFirebaseApp());
  const q = query(
    collection(db, COLLECTION),
    orderBy("reported_at", "desc"),
    limitFn(MAX_DOCS)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: Incident[] = [];
      snap.forEach((doc) => {
        const row = mapDoc(doc.id, doc.data());
        if (row.inhibitor_status !== "blocked") {
          list.push(row);
        }
      });
      onData(enrichIncidents(list));
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

function mapVariant(v: Record<string, unknown>): VariantResult {
  return {
    name: String(v.name ?? "unknown"),
    audio_clip:
      v.audio_clip === null || v.audio_clip === undefined
        ? null
        : String(v.audio_clip),
    transcript: String(v.transcript ?? ""),
    preprocess_meta:
      v.preprocess_meta && typeof v.preprocess_meta === "object"
        ? (v.preprocess_meta as PreprocessMeta)
        : null,
    whisper_meta:
      v.whisper_meta && typeof v.whisper_meta === "object"
        ? (v.whisper_meta as WhisperMeta)
        : null,
  };
}

function mapExtraction(id: string, data: Record<string, unknown>): Extraction {
  const rawVariants = Array.isArray(data.variants) ? data.variants : [];

  return {
    id,
    feed_id: String(data.feed_id ?? "unknown"),
    raw_text: String(data.raw_text ?? ""),
    reported_at: toISOString(data.reported_at),
    audio_clip:
      data.audio_clip === null || data.audio_clip === undefined
        ? null
        : String(data.audio_clip),
    raw_audio_clip:
      data.raw_audio_clip === null || data.raw_audio_clip === undefined
        ? null
        : String(data.raw_audio_clip),
    preprocess_meta:
      data.preprocess_meta && typeof data.preprocess_meta === "object"
        ? (data.preprocess_meta as PreprocessMeta)
        : null,
    variants: rawVariants.map((v: Record<string, unknown>) => mapVariant(v)),
    llm_relevant: Boolean(data.llm_relevant),
    llm_category:
      data.llm_category === null || data.llm_category === undefined
        ? null
        : String(data.llm_category),
    llm_confidence: Number(data.llm_confidence ?? 0),
    llm_location_text:
      data.llm_location_text === null || data.llm_location_text === undefined
        ? null
        : String(data.llm_location_text),
    inhibitor_status:
      data.inhibitor_status === null || data.inhibitor_status === undefined
        ? null
        : String(data.inhibitor_status),
    inhibitor_reason:
      data.inhibitor_reason === null || data.inhibitor_reason === undefined
        ? null
        : String(data.inhibitor_reason),
    geocode_status:
      data.geocode_status === null || data.geocode_status === undefined
        ? null
        : String(data.geocode_status),
    incident_id:
      data.incident_id === null || data.incident_id === undefined
        ? null
        : String(data.incident_id),
  };
}

export function subscribeExtractions(
  feedId: string,
  since: Date,
  until: Date,
  onData: (extractions: Extraction[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = getFirestore(getFirebaseApp());
  const q = query(
    collection(db, "extractions"),
    where("feed_id", "==", feedId),
    where("reported_at", ">=", since.toISOString()),
    where("reported_at", "<=", until.toISOString()),
    orderBy("reported_at", "desc"),
    limitFn(2000)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: Extraction[] = [];
      snap.forEach((doc) => {
        list.push(mapExtraction(doc.id, doc.data()));
      });
      onData(list);
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}

export function subscribeAllExtractions(
  since: Date,
  until: Date,
  onData: (extractions: Extraction[]) => void,
  onError?: (e: Error) => void
): () => void {
  const db = getFirestore(getFirebaseApp());
  const q = query(
    collection(db, "extractions"),
    where("reported_at", ">=", since.toISOString()),
    where("reported_at", "<=", until.toISOString()),
    orderBy("reported_at", "desc"),
    limitFn(2000)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list: Extraction[] = [];
      snap.forEach((doc) => {
        list.push(mapExtraction(doc.id, doc.data()));
      });
      onData(list);
    },
    (err) => {
      onError?.(err instanceof Error ? err : new Error(String(err)));
    }
  );
}
