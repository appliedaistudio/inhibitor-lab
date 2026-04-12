import { randomUUID } from "node:crypto";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

import type {
  AttachmentReference,
  CompanionMode,
  CompanionPipelineResult,
  ConversationTurn,
  SessionMessageRecord,
  SessionWorkspaceDetail,
  SessionWorkspaceEntry,
  SessionWorkspaceList
} from "./contracts";
import { getSessionTranscriptPath } from "./session-store";

interface SessionWorkspaceState {
  sessions: SessionWorkspaceEntry[];
  threads: Record<string, SessionMessageRecord[]>;
}

interface CreateSessionInput {
  session_id?: string;
  mode: CompanionMode;
  title?: string;
  folder?: string | null;
}

interface UpdateSessionInput {
  title?: string;
  folder?: string | null;
  archived?: boolean;
}

interface AppendExchangeInput {
  session_id: string;
  mode: CompanionMode;
  title: string;
  preview: string;
  user_message: string;
  attachments: AttachmentReference[];
  result: CompanionPipelineResult;
}

export interface SessionWorkspaceStore {
  listWorkspace(options?: { includeArchived?: boolean }): Promise<SessionWorkspaceList>;
  createSession(input: CreateSessionInput): Promise<SessionWorkspaceEntry>;
  getSessionDetail(sessionId: string): Promise<SessionWorkspaceDetail | null>;
  updateSession(sessionId: string, input: UpdateSessionInput): Promise<SessionWorkspaceEntry | null>;
  archiveSession(sessionId: string): Promise<SessionWorkspaceEntry | null>;
  appendExchange(input: AppendExchangeInput): Promise<SessionWorkspaceDetail>;
  deleteSession(sessionId: string): Promise<boolean>;
}

function normalizeFolder(folder: string | null | undefined): string | null {
  const normalized = folder?.trim();
  return normalized ? normalized : null;
}

function buildTitle(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "New thread";
  }

  const sentence = normalized.split(/[.!?]/)[0]?.trim() || normalized;
  return sentence.length > 56 ? `${sentence.slice(0, 56).trimEnd()}…` : sentence;
}

function buildPreview(text: string): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) {
    return "";
  }

  return normalized.length > 120 ? `${normalized.slice(0, 120).trimEnd()}…` : normalized;
}

function nowIso(): string {
  return new Date().toISOString();
}

function sortSessions(sessions: SessionWorkspaceEntry[]): SessionWorkspaceEntry[] {
  return [...sessions].sort((left, right) => right.touched_at.localeCompare(left.touched_at));
}

function collectFolders(sessions: SessionWorkspaceEntry[]): string[] {
  return [...new Set(sessions.map((session) => session.folder).filter((folder): folder is string => Boolean(folder)))]
    .sort((left, right) => left.localeCompare(right));
}

function createStateFilePath(rootDir: string): string {
  return path.join(rootDir, "workspace.json");
}

function sanitizePathSegment(value: string): string {
  const normalized = value.trim();
  if (!normalized) {
    return "unknown";
  }

  return normalized.replace(/[^a-zA-Z0-9._-]/g, "_");
}

function createSessionExchangeDirectory(rootDir: string, sessionId: string): string {
  return path.join(rootDir, "exchanges", sanitizePathSegment(sessionId));
}

function toRelativeWorkspacePath(rootDir: string, filePath: string): string {
  return path.relative(rootDir, filePath).split(path.sep).join("/");
}

function truncateText(value: string, maxLength: number): string {
  return value.length > maxLength ? `${value.slice(0, maxLength).trimEnd()}…` : value;
}

function createCompactResultSnapshot(result: CompanionPipelineResult): CompanionPipelineResult {
  return {
    request_id: result.request_id,
    session_id: result.session_id,
    mode: result.mode,
    inhibitor: {
      blocked: result.inhibitor.blocked,
      reasons: [...result.inhibitor.reasons],
      raw: null
    },
    evidence: result.evidence.slice(0, 12).map((item) => ({
      ...item,
      snippet: truncateText(item.snippet, 320)
    })),
    draft: null,
    runtime: result.runtime,
    judgments: result.judgments,
    decision: result.decision,
    synthesis: result.synthesis,
    audit_trail: [],
    process_events: result.process_events.slice(-24).map((event) => ({
      ...event,
      body: truncateText(event.body, 240)
    })),
    revision_brief: result.revision_brief
  };
}

async function writeExchangeDiagnostics(rootDir: string, sessionId: string, result: CompanionPipelineResult): Promise<string> {
  const exchangeDir = createSessionExchangeDirectory(rootDir, sessionId);
  await mkdir(exchangeDir, { recursive: true });

  const timestamp = new Date().toISOString().replace(/[.:]/g, "-");
  const requestPart = sanitizePathSegment(result.request_id || randomUUID());
  const exchangePath = path.join(exchangeDir, `${timestamp}-${requestPart}.json`);
  await writeFile(exchangePath, JSON.stringify(result, null, 2), "utf8");

  return toRelativeWorkspacePath(rootDir, exchangePath);
}

async function compactExistingThreadHistory(rootDir: string, state: SessionWorkspaceState): Promise<void> {
  for (const [sessionId, thread] of Object.entries(state.threads)) {
    for (const message of thread) {
      if (message.role !== "assistant" || !message.result || message.diagnostics_path) {
        continue;
      }

      const diagnosticsPath = await writeExchangeDiagnostics(rootDir, sessionId, message.result);
      message.result = createCompactResultSnapshot(message.result);
      message.diagnostics_path = diagnosticsPath;
    }
  }
}

async function readState(rootDir: string): Promise<SessionWorkspaceState> {
  try {
    const raw = await readFile(createStateFilePath(rootDir), "utf8");
    const parsed = JSON.parse(raw) as Partial<SessionWorkspaceState>;

    return {
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions as SessionWorkspaceEntry[] : [],
      threads:
        parsed.threads && typeof parsed.threads === "object" && !Array.isArray(parsed.threads)
          ? parsed.threads as Record<string, SessionMessageRecord[]>
          : {}
    };
  } catch {
    return {
      sessions: [],
      threads: {}
    };
  }
}

async function writeState(rootDir: string, state: SessionWorkspaceState): Promise<void> {
  await mkdir(rootDir, { recursive: true });
  await writeFile(createStateFilePath(rootDir), JSON.stringify(state, null, 2), "utf8");
}

function toLegacyThread(sessionId: string, turns: ConversationTurn[], session?: SessionWorkspaceEntry): SessionMessageRecord[] {
  const baseTimestamp = session?.touched_at ?? nowIso();
  return turns
    .filter(
      (turn): turn is ConversationTurn & { role: "user" | "assistant" } =>
        turn.role === "user" || turn.role === "assistant"
    )
    .map((turn, index) => ({
      id: `${sessionId}-legacy-${index}`,
      role: turn.role,
      content: turn.content,
      timestamp: baseTimestamp
    }));
}

async function readLegacyTurns(sessionId: string): Promise<ConversationTurn[]> {
  try {
    const raw = await readFile(getSessionTranscriptPath(sessionId), "utf8");
    const parsed = JSON.parse(raw) as ConversationTurn[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function createSessionRecord(input: CreateSessionInput): SessionWorkspaceEntry {
  const timestamp = nowIso();
  return {
    session_id: input.session_id ?? randomUUID(),
    mode: input.mode,
    title: input.title?.trim() || "New thread",
    preview: "",
    touched_at: timestamp,
    created_at: timestamp,
    folder: normalizeFolder(input.folder),
    archived_at: null
  };
}

export function createFileSessionWorkspaceStore(rootDir?: string): SessionWorkspaceStore {
  const targetRoot = rootDir ?? path.join(process.cwd(), "data", "session-workspace");

  return {
    async listWorkspace(options) {
      const state = await readState(targetRoot);
      const includeArchived = options?.includeArchived ?? false;
      const sessions = includeArchived
        ? sortSessions(state.sessions)
        : sortSessions(state.sessions.filter((session) => session.archived_at === null));

      return {
        folders: collectFolders(sessions),
        sessions
      };
    },

    async createSession(input) {
      const state = await readState(targetRoot);
      const existing = state.sessions.find((session) => session.session_id === input.session_id);
      if (existing) {
        return existing;
      }

      const created = createSessionRecord(input);
      state.sessions = sortSessions([created, ...state.sessions]);
      state.threads[created.session_id] = state.threads[created.session_id] ?? [];
      await writeState(targetRoot, state);
      return created;
    },

    async getSessionDetail(sessionId) {
      const state = await readState(targetRoot);
      let session = state.sessions.find((entry) => entry.session_id === sessionId) ?? null;
      let thread = state.threads[sessionId] ?? [];

      if (thread.length === 0) {
        const legacyTurns = await readLegacyTurns(sessionId);
        if (legacyTurns.length > 0) {
          if (!session) {
            const firstUserTurn = legacyTurns.find((turn) => turn.role === "user")?.content ?? "New thread";
            const lastAssistantTurn =
              [...legacyTurns].reverse().find((turn) => turn.role === "assistant")?.content ?? "";

            session = {
              session_id: sessionId,
              mode: "research",
              title: buildTitle(firstUserTurn),
              preview: buildPreview(lastAssistantTurn),
              touched_at: nowIso(),
              created_at: nowIso(),
              folder: null,
              archived_at: null
            };
          }

          thread = toLegacyThread(sessionId, legacyTurns, session);
        }
      }

      if (!session) {
        return null;
      }

      return {
        session,
        thread
      };
    },

    async updateSession(sessionId, input) {
      const state = await readState(targetRoot);
      const existing = state.sessions.find((entry) => entry.session_id === sessionId);
      if (!existing) {
        return null;
      }

      const updated: SessionWorkspaceEntry = {
        ...existing,
        title: typeof input.title === "string" ? input.title.trim() || existing.title : existing.title,
        folder: typeof input.folder !== "undefined" ? normalizeFolder(input.folder) : existing.folder,
        touched_at: nowIso(),
        archived_at:
          typeof input.archived === "boolean"
            ? (input.archived ? nowIso() : null)
            : existing.archived_at
      };

      state.sessions = sortSessions(
        state.sessions.map((entry) => (entry.session_id === sessionId ? updated : entry))
      );
      await writeState(targetRoot, state);
      return updated;
    },

    async archiveSession(sessionId) {
      return this.updateSession(sessionId, { archived: true });
    },

    async appendExchange(input) {
      const state = await readState(targetRoot);
      await compactExistingThreadHistory(targetRoot, state);
      const timestamp = nowIso();
      const diagnosticsPath = await writeExchangeDiagnostics(targetRoot, input.session_id, input.result);
      const existing = state.sessions.find((entry) => entry.session_id === input.session_id);
      const nextTitle =
        existing && existing.preview.trim().length > 0 && existing.title.trim() !== "New thread"
          ? existing.title
          : input.title.trim() || existing?.title || "New thread";
      const session: SessionWorkspaceEntry = {
        ...(existing ?? createSessionRecord({
          session_id: input.session_id,
          mode: input.mode,
          title: input.title
        })),
        mode: input.mode,
        title: nextTitle,
        preview: input.preview.trim(),
        touched_at: timestamp,
        archived_at: null
      };

      const thread = state.threads[input.session_id] ?? [];
      thread.push({
        id: `u-${randomUUID()}`,
        role: "user",
        content: input.user_message,
        attachments: input.attachments,
        timestamp
      });
      thread.push({
        id: `a-${randomUUID()}`,
        role: "assistant",
        content: input.result.synthesis.final_answer,
        result: createCompactResultSnapshot(input.result),
        diagnostics_path: diagnosticsPath,
        timestamp
      });

      state.threads[input.session_id] = thread;
      state.sessions = sortSessions([
        session,
        ...state.sessions.filter((entry) => entry.session_id !== input.session_id)
      ]);
      await writeState(targetRoot, state);

      return {
        session,
        thread
      };
    },

    async deleteSession(sessionId) {
      const state = await readState(targetRoot);
      const beforeCount = state.sessions.length;
      state.sessions = state.sessions.filter((entry) => entry.session_id !== sessionId);
      delete state.threads[sessionId];
      await writeState(targetRoot, state);
      await rm(getSessionTranscriptPath(sessionId), { force: true });
      await rm(createSessionExchangeDirectory(targetRoot, sessionId), { recursive: true, force: true });
      return state.sessions.length < beforeCount;
    }
  };
}

export const fileSessionWorkspaceStore = createFileSessionWorkspaceStore();
