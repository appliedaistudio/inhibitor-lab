import { useState, useCallback } from 'react';
import type { DatasetEntry } from '@/lib/types';
import { parseCsvFile, parseCsvFromFile, parseCsvFromText } from '@/lib/parseCsv';
import { parseJsonlFile, parseJsonlFromFile, parseJsonlFromText } from '@/lib/parseJsonl';
import { groupIntoRequests } from '@/lib/groupRequests';
import { computeDashboardStats } from '@/lib/computeStats';
import { getSessionBlobs, type SessionRecord } from '@/lib/sessionStorage';

interface InhibitorData {
  datasets: Map<string, DatasetEntry>;
  activeDatasetId: string | null;
  activeDataset: DatasetEntry | null;
  loading: boolean;
  error: string | null;
  setActiveDataset: (id: string) => void;
  addDatasetFromFiles: (name: string, csvFile: File, jsonlFile: File) => Promise<string>;
  addDatasetFromUrl: (name: string, csvUrl: string, jsonlUrl: string) => Promise<string>;
  loadDatasetFromSession: (session: SessionRecord) => Promise<boolean>;
  removeDataset: (id: string) => void;
}

async function buildDatasetEntry(
  id: string,
  name: string,
  csvResult: Awaited<ReturnType<typeof parseCsvFile>>,
  interventions: Awaited<ReturnType<typeof parseJsonlFile>>,
): Promise<DatasetEntry> {
  const requests = groupIntoRequests(csvResult.events);
  const stats = computeDashboardStats(csvResult.events, requests, csvResult.authFailures.length);
  return { id, name, events: csvResult.events, requests, authFailures: csvResult.authFailures, interventions, stats };
}

let idCounter = 0;
function nextId(): string {
  return `ds_${++idCounter}_${Date.now()}`;
}

export function useInhibitorData(): InhibitorData {
  const [datasets, setDatasets] = useState<Map<string, DatasetEntry>>(new Map());
  const [activeDatasetId, setActiveDatasetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDataset = activeDatasetId ? datasets.get(activeDatasetId) || null : null;

  const setActiveDataset = useCallback((id: string) => {
    setActiveDatasetId(id);
  }, []);

  const addDatasetFromFiles = useCallback(async (name: string, csvFile: File, jsonlFile: File): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const [csvResult, interventions] = await Promise.all([
        parseCsvFromFile(csvFile),
        parseJsonlFromFile(jsonlFile),
      ]);
      const id = nextId();
      const entry = await buildDatasetEntry(id, name, csvResult, interventions);
      setDatasets(prev => { const next = new Map(prev); next.set(id, entry); return next; });
      setActiveDatasetId(id);
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to parse uploaded files');
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  const addDatasetFromUrl = useCallback(async (name: string, csvUrl: string, jsonlUrl: string): Promise<string> => {
    setLoading(true);
    setError(null);
    try {
      const [csvResult, interventions] = await Promise.all([
        parseCsvFile(csvUrl),
        parseJsonlFile(jsonlUrl),
      ]);
      const id = nextId();
      const entry = await buildDatasetEntry(id, name, csvResult, interventions);
      setDatasets(prev => { const next = new Map(prev); next.set(id, entry); return next; });
      setActiveDatasetId(id);
      return id;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load data');
      return '';
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDatasetFromSession = useCallback(async (session: SessionRecord): Promise<boolean> => {
    setLoading(true);
    setError(null);
    try {
      const blobs = await getSessionBlobs(session.id);
      if (!blobs) {
        setError('Raw data not available for this session. Please re-upload the files via "New Session".');
        return false;
      }
      const [csvResult, interventions] = await Promise.all([
        parseCsvFromText(blobs.csvText),
        Promise.resolve(parseJsonlFromText(blobs.jsonlText)),
      ]);
      const entry = await buildDatasetEntry(session.id, session.name, csvResult, interventions);
      setDatasets(prev => { const next = new Map(prev); next.set(session.id, entry); return next; });
      setActiveDatasetId(session.id);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load session data');
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  const removeDataset = useCallback((id: string) => {
    setDatasets(prev => { const next = new Map(prev); next.delete(id); return next; });
    setActiveDatasetId(prev => {
      if (prev === id) {
        const remaining = [...datasets.keys()].filter(k => k !== id);
        return remaining[0] || null;
      }
      return prev;
    });
  }, [datasets]);

  return {
    datasets, activeDatasetId, activeDataset, loading, error,
    setActiveDataset, addDatasetFromFiles, addDatasetFromUrl, loadDatasetFromSession, removeDataset,
  };
}
