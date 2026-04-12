import Papa from 'papaparse';
import type { ParsedLogEvent, AuthFailure } from './types';
import { categorizeEvent, humanizeEvent } from './humanize';

/**
 * Convert Python dict string to valid JSON.
 * Handles: single quotes -> double quotes, True -> true, False -> false, None -> null
 * Also handles nested strings that contain double quotes (e.g. cf-visitor JSON).
 */
export function pythonDictToJson(pyDict: string): Record<string, unknown> {
  if (!pyDict || pyDict.trim() === '') return {};

  try {
    return JSON.parse(pyDict);
  } catch {
    // noop - try Python conversion
  }

  try {
    let s = pyDict
      .replace(/\bTrue\b/g, 'true')
      .replace(/\bFalse\b/g, 'false')
      .replace(/\bNone\b/g, 'null');

    // Walk character-by-character converting single-quoted strings to double-quoted,
    // escaping any internal double quotes.
    let result = '';
    let i = 0;
    while (i < s.length) {
      if (s[i] === "'") {
        // Enter a single-quoted string - collect its contents
        i++; // skip opening quote
        let inner = '';
        while (i < s.length && s[i] !== "'") {
          // Handle escaped single quotes inside (Python uses \')
          if (s[i] === '\\' && i + 1 < s.length && s[i + 1] === "'") {
            inner += "'";
            i += 2;
          } else {
            inner += s[i];
            i++;
          }
        }
        i++; // skip closing quote
        // Escape any double quotes in the inner content
        const escaped = inner.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        result += '"' + escaped + '"';
      } else {
        result += s[i];
        i++;
      }
    }

    return JSON.parse(result);
  } catch {
    // Fall back to raw
    return { raw: pyDict };
  }
}

/**
 * Extract auth failure details from raw meta string using regex fallback.
 */
function extractAuthFailure(meta: Record<string, unknown>, rawMeta: string, timestamp: Date): AuthFailure {
  // Try structured meta first
  const headers = (meta.headers || {}) as Record<string, string>;
  let path = (meta.path as string) || '';
  let method = (meta.method as string) || '';
  let ip = headers['cf-connecting-ip'] || headers['x-real-ip'] || '';
  let country = headers['cf-ipcountry'] || '';
  let userAgent = headers['user-agent'] || '';
  let host = headers['host'] || '';

  // Regex fallback for when meta parsing fails
  if (!ip && rawMeta) {
    const pathMatch = rawMeta.match(/'path':\s*'([^']+)'/);
    const methodMatch = rawMeta.match(/'method':\s*'([^']+)'/);
    const ipMatch = rawMeta.match(/'cf-connecting-ip':\s*'([^']+)'/);
    const countryMatch = rawMeta.match(/'cf-ipcountry':\s*'([^']+)'/);
    const uaMatch = rawMeta.match(/'user-agent':\s*'([^']*(?:(?:'[^,}])[^']*)*?)'/);
    const hostMatch = rawMeta.match(/'host':\s*'([^']+)'/);
    const realIpMatch = rawMeta.match(/'x-real-ip':\s*'([^']+)'/);

    if (pathMatch) path = pathMatch[1];
    if (methodMatch) method = methodMatch[1];
    if (ipMatch) ip = ipMatch[1];
    else if (realIpMatch) ip = realIpMatch[1];
    if (countryMatch) country = countryMatch[1];
    if (uaMatch) userAgent = uaMatch[1];
    if (hostMatch) host = hostMatch[1];
  }

  return {
    timestamp,
    path: path || 'Unknown',
    method: method || 'Unknown',
    ip: ip || 'Unknown',
    country: country || 'Unknown',
    userAgent: userAgent || 'Unknown',
    host: host || 'Unknown',
  };
}

function processRows(results: Papa.ParseResult<Record<string, string>>): {
  events: ParsedLogEvent[];
  authFailures: AuthFailure[];
} {
  const events: ParsedLogEvent[] = [];
  const authFailures: AuthFailure[] = [];

  for (const row of results.data as Record<string, string>[]) {
    const event = row['event'];
    if (!event || event === 'event') continue;

    const rawMeta = row['meta'] || '{}';
    const meta = pythonDictToJson(rawMeta);
    const timestamp = new Date(row['timestamp']);
    const apiKey = row['apiKey'] || '';
    const rowIndex = parseInt(row[''] || '0', 10);

    const parsed: ParsedLogEvent = {
      rowIndex,
      timestamp,
      apiKey,
      event,
      category: categorizeEvent(event),
      meta,
      humanLabel: humanizeEvent(event),
    };

    events.push(parsed);

    if (event === 'auth_failed_invalid_key') {
      authFailures.push(extractAuthFailure(meta, rawMeta, timestamp));
    }
  }

  events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  return { events, authFailures };
}

/** Parse CSV from a remote URL */
export async function parseCsvFile(url: string): Promise<{
  events: ParsedLogEvent[];
  authFailures: AuthFailure[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      complete(results) {
        resolve(processRows(results as Papa.ParseResult<Record<string, string>>));
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

/** Parse CSV from a local File object (drag-and-drop / file input) */
export async function parseCsvFromFile(file: File): Promise<{
  events: ParsedLogEvent[];
  authFailures: AuthFailure[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        resolve(processRows(results as Papa.ParseResult<Record<string, string>>));
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

/** Parse CSV from a raw text string (for loading saved sessions from IndexedDB) */
export async function parseCsvFromText(csvText: string): Promise<{
  events: ParsedLogEvent[];
  authFailures: AuthFailure[];
}> {
  return new Promise((resolve, reject) => {
    Papa.parse(csvText, {
      header: true,
      skipEmptyLines: true,
      complete(results) {
        resolve(processRows(results as Papa.ParseResult<Record<string, string>>));
      },
      error(err: Error) {
        reject(err);
      },
    });
  });
}

/** Validate that a CSV file has the expected Inhibitor log columns */
export function validateCsvHeaders(file: File): Promise<{ valid: boolean; error?: string }> {
  return new Promise((resolve) => {
    Papa.parse(file, {
      header: true,
      preview: 2,
      complete(results) {
        const headers = results.meta.fields || [];
        const required = ['timestamp', 'event', 'meta'];
        const missing = required.filter(h => !headers.includes(h));
        if (missing.length > 0) {
          resolve({ valid: false, error: `Missing columns: ${missing.join(', ')}` });
        } else {
          resolve({ valid: true });
        }
      },
      error() {
        resolve({ valid: false, error: 'Could not parse CSV file' });
      },
    });
  });
}
