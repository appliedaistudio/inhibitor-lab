import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { ConversationTurn, SessionStore } from "./contracts";

export function getSessionTranscriptPath(sessionId: string): string {
  const safeId = sessionId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(process.cwd(), "data", "sessions", `${safeId}.json`);
}

export const fileSessionStore: SessionStore = {
  async readSession(sessionId: string): Promise<ConversationTurn[]> {
    const target = getSessionTranscriptPath(sessionId);
    try {
      const raw = await readFile(target, "utf8");
      const parsed = JSON.parse(raw) as ConversationTurn[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  },
  async appendTurns(sessionId: string, turns: ConversationTurn[]): Promise<void> {
    const target = getSessionTranscriptPath(sessionId);
    const existing = await fileSessionStore.readSession(sessionId);
    const nextTurns = [...existing, ...turns].slice(-20);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, JSON.stringify(nextTurns, null, 2), "utf8");
  }
};

export function createMemorySessionStore(): SessionStore {
  const store = new Map<string, ConversationTurn[]>();

  return {
    async readSession(sessionId: string): Promise<ConversationTurn[]> {
      return store.get(sessionId) ?? [];
    },
    async appendTurns(sessionId: string, turns: ConversationTurn[]): Promise<void> {
      const existing = store.get(sessionId) ?? [];
      store.set(sessionId, [...existing, ...turns]);
    }
  };
}
