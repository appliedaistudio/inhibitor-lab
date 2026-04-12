import type { InterventionEvent } from './types';

function parseLines(text: string): InterventionEvent[] {
  const lines = text.trim().split('\n').filter(Boolean);
  return lines.map(line => JSON.parse(line) as InterventionEvent);
}

/** Parse JSONL from a remote URL */
export async function parseJsonlFile(url: string): Promise<InterventionEvent[]> {
  const response = await fetch(url);
  const text = await response.text();
  return parseLines(text);
}

/** Parse JSONL from a local File object (drag-and-drop / file input) */
export async function parseJsonlFromFile(file: File): Promise<InterventionEvent[]> {
  const text = await file.text();
  return parseLines(text);
}

/** Parse JSONL from a raw text string (for loading saved sessions from IndexedDB) */
export function parseJsonlFromText(jsonlText: string): InterventionEvent[] {
  return parseLines(jsonlText);
}

/** Validate that a JSONL file contains parseable JSON lines */
export async function validateJsonlFile(file: File): Promise<{ valid: boolean; error?: string; count?: number }> {
  try {
    const text = await file.text();
    const lines = text.trim().split('\n').filter(Boolean);
    if (lines.length === 0) {
      return { valid: false, error: 'File is empty' };
    }
    for (let i = 0; i < lines.length; i++) {
      try {
        JSON.parse(lines[i]);
      } catch {
        return { valid: false, error: `Invalid JSON on line ${i + 1}` };
      }
    }
    return { valid: true, count: lines.length };
  } catch {
    return { valid: false, error: 'Could not read file' };
  }
}
