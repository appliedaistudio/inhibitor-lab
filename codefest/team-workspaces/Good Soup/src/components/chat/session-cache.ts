import type { SessionSummary } from "@/types/companion";

export interface SessionSummaryStorageLike {
  getItem(key: string): string | null | undefined;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

type SessionSummaryStorageInput = SessionSummaryStorageLike | Map<string, string>;

export const SESSION_SUMMARY_STORAGE_KEY = "good-soup.chat.session-summaries";

function isMapStorage(storage: SessionSummaryStorageInput): storage is Map<string, string> {
  return storage instanceof Map;
}

function normalizeStorage(storage: SessionSummaryStorageInput): SessionSummaryStorageLike {
  if (isMapStorage(storage)) {
    return {
      getItem(key: string) {
        return storage.get(key) ?? null;
      },
      setItem(key: string, value: string) {
        storage.set(key, value);
      },
      removeItem(key: string) {
        storage.delete(key);
      }
    };
  }

  return storage;
}

function isSessionSummary(value: unknown): value is SessionSummary {
  if (!value || typeof value !== "object") {
    return false;
  }

  const summary = value as Record<string, unknown>;
  return (
    typeof summary.session_id === "string" &&
    (summary.mode === "research" || summary.mode === "learning") &&
    typeof summary.title === "string" &&
    typeof summary.preview === "string" &&
    typeof summary.touched_at === "string"
  );
}

export function loadSessionSummaries(
  storage: SessionSummaryStorageInput,
  key: string = SESSION_SUMMARY_STORAGE_KEY
): SessionSummary[] {
  const raw = normalizeStorage(storage).getItem(key);
  if (!raw) {
    return [];
  }

  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed.filter(isSessionSummary);
  } catch {
    return [];
  }
}

export function loadSessionSummariesSafely(
  resolveStorage: () => SessionSummaryStorageInput,
  key: string = SESSION_SUMMARY_STORAGE_KEY
): SessionSummary[] {
  try {
    return loadSessionSummaries(resolveStorage(), key);
  } catch {
    return [];
  }
}

export function saveSessionSummaries(
  storage: SessionSummaryStorageInput,
  summaries: SessionSummary[],
  key: string = SESSION_SUMMARY_STORAGE_KEY
): void {
  normalizeStorage(storage).setItem(key, JSON.stringify(summaries));
}
