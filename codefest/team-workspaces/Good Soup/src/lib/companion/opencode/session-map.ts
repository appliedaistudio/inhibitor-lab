import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

export interface SessionRecord {
  frontend_session_id: string;
  session_id: string;
  updated_at?: string;
}

export interface SessionMap {
  get(frontendSessionId: string): Promise<SessionRecord | undefined>;
  set(record: SessionRecord): Promise<void>;
}

function defaultRootDir(rootDir?: string): string {
  return rootDir ?? path.join(process.cwd(), "data", "opencode-sessions");
}

export function createSessionMap(rootDir?: string): SessionMap {
  const dir = defaultRootDir(rootDir);
  const filePath = path.join(dir, "sessions.json");
  let cache: SessionRecord[] | null = null;

  async function load(): Promise<SessionRecord[]> {
    if (cache) {
      return cache;
    }

    try {
      const raw = await readFile(filePath, "utf8");
      const parsed = JSON.parse(raw) as unknown;
      cache = Array.isArray(parsed)
        ? parsed.filter((item): item is SessionRecord => {
            if (!item || typeof item !== "object") {
              return false;
            }

            const record = item as Partial<SessionRecord>;
            return typeof record.frontend_session_id === "string" && typeof record.session_id === "string";
          })
        : [];
    } catch {
      cache = [];
    }

    return cache;
  }

  async function save(records: SessionRecord[]): Promise<void> {
    cache = records;
    await mkdir(dir, { recursive: true });
    await writeFile(filePath, JSON.stringify(records, null, 2), "utf8");
  }

  return {
    async get(frontendSessionId: string): Promise<SessionRecord | undefined> {
      const records = await load();
      return records.find((record) => record.frontend_session_id === frontendSessionId);
    },
    async set(record: SessionRecord): Promise<void> {
      const records = await load();
      const next = records.filter(
        (item) =>
          item.frontend_session_id !== record.frontend_session_id &&
          item.session_id !== record.session_id
      );
      next.push({
        frontend_session_id: record.frontend_session_id,
        session_id: record.session_id,
        updated_at: record.updated_at ?? new Date().toISOString()
      });
      await save(next);
    }
  };
}
