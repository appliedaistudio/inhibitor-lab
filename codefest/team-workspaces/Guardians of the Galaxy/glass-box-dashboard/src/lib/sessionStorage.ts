// ---- Session summary records (localStorage) ----

export interface SessionRecord {
  id: string;
  name: string;
  createdAt: string;
  totalEvents: number;
  totalRequests: number;
  totalInterventions: number;
  totalAuthFailures: number;
  timeStart: string;
  timeEnd: string;
  passRate: number;
  topRisks: string[];
}

const STORAGE_KEY = 'glassbox_sessions';

export function getSavedSessions(): SessionRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveSession(record: SessionRecord): void {
  const sessions = getSavedSessions();
  const idx = sessions.findIndex(s => s.id === record.id);
  if (idx >= 0) {
    sessions[idx] = record;
  } else {
    sessions.unshift(record);
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.slice(0, 50)));
}

export function deleteSession(id: string): void {
  const sessions = getSavedSessions().filter(s => s.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions));
  deleteSessionBlobs(id).catch(() => {});
}

export function clearAllSessions(): void {
  localStorage.removeItem(STORAGE_KEY);
  clearAllSessionBlobs().catch(() => {});
}

// ---- Raw data blobs (IndexedDB) ----

const DB_NAME = 'glassbox_rawdata';
const STORE_NAME = 'session_blobs';
const DB_VERSION = 1;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveSessionBlobs(id: string, csvText: string, jsonlText: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).put({ id, csvText, jsonlText });
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

export async function getSessionBlobs(id: string): Promise<{ csvText: string; jsonlText: string } | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly');
    const req = tx.objectStore(STORE_NAME).get(id);
    req.onsuccess = () => { db.close(); resolve(req.result || null); };
    req.onerror = () => { db.close(); reject(req.error); };
  });
}

async function deleteSessionBlobs(id: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).delete(id);
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}

async function clearAllSessionBlobs(): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
    tx.oncomplete = () => { db.close(); resolve(); };
    tx.onerror = () => { db.close(); reject(tx.error); };
  });
}
