import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, describe, expect, it } from "vitest";

import { createFileSessionWorkspaceStore } from "../src/lib/companion/session-workspace-store";
import type { CompanionPipelineResult } from "../src/types/companion";

const scratchDirs: string[] = [];

const minimalResult: CompanionPipelineResult = {
  request_id: "req-session-1",
  session_id: "session-1",
  mode: "research",
  inhibitor: { blocked: false, reasons: [], raw: {} },
  evidence: [],
  draft: null,
  judgments: [],
  decision: {
    decision: "allow",
    blocking_reasons: [],
    revision_notes: [],
    verifier_summary: []
  },
  synthesis: {
    final_answer: "PatchTST looks promising, but I would avoid strong novelty claims yet.",
    citations: [],
    uncertainty_notes: []
  },
  audit_trail: [
    {
      request_id: "req-session-1",
      stage: "inhibitor",
      payload: { policy: "allow" },
      created_at: "2026-04-12T00:00:00.000Z"
    }
  ],
  process_events: [
    {
      id: "evt-1",
      participant: "pipeline",
      stage: "request_received",
      title: "Request received",
      body: "Initial pipeline event.",
      created_at: "2026-04-12T00:00:00.000Z"
    }
  ]
};

afterEach(async () => {
  await Promise.all(
    scratchDirs.splice(0).map((target) => rm(target, { recursive: true, force: true }))
  );
});

describe("file session workspace store", () => {
  it("creates sessions, records exchanges, groups by folder, archives, and deletes", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-session-workspace-"));
    scratchDirs.push(rootDir);

    const store = createFileSessionWorkspaceStore(rootDir);

    const created = await store.createSession({
      session_id: "session-1",
      mode: "research",
      title: "New thread"
    });

    expect(created).toMatchObject({
      session_id: "session-1",
      title: "New thread",
      folder: null,
      archived_at: null
    });

    await store.appendExchange({
      session_id: "session-1",
      mode: "research",
      title: "Novelty check",
      preview: "Avoid strong novelty claims until you widen the literature review.",
      user_message: "Can I say this idea is novel already?",
      attachments: [],
      result: {
        ...minimalResult,
        session_id: "session-1"
      }
    });

    const detail = await store.getSessionDetail("session-1");
    expect(detail?.thread).toHaveLength(2);
    expect(detail?.thread[0]).toMatchObject({
      role: "user",
      content: "Can I say this idea is novel already?"
    });
    expect(detail?.thread[1]?.result?.synthesis.final_answer).toContain("PatchTST");
    expect(detail?.thread[1]?.result?.audit_trail).toEqual([]);
    expect(detail?.thread[1]?.result?.inhibitor.raw).toBeNull();
    expect(detail?.thread[1]?.diagnostics_path).toMatch(/^exchanges\/session-1\/.+\.json$/);

    const diagnosticsPath = path.join(rootDir, detail?.thread[1]?.diagnostics_path ?? "");
    const diagnosticsRaw = await readFile(diagnosticsPath, "utf8");
    const diagnosticsPayload = JSON.parse(diagnosticsRaw) as CompanionPipelineResult;
    expect(diagnosticsPayload.audit_trail).toHaveLength(1);
    expect(diagnosticsPayload.process_events).toHaveLength(1);

    const workspacePath = path.join(rootDir, "workspace.json");
    const workspaceRaw = await readFile(workspacePath, "utf8");
    const workspacePayload = JSON.parse(workspaceRaw) as {
      threads: Record<string, Array<{ role: string; result?: CompanionPipelineResult }>>;
    };
    expect(workspacePayload.threads["session-1"]?.[1]?.result?.audit_trail).toEqual([]);

    const moved = await store.updateSession("session-1", {
      title: "Novelty check",
      folder: "Research ideas"
    });

    expect(moved).toMatchObject({
      session_id: "session-1",
      folder: "Research ideas",
      title: "Novelty check"
    });

    const listed = await store.listWorkspace();
    expect(listed.sessions[0]).toMatchObject({
      session_id: "session-1",
      folder: "Research ideas"
    });
    expect(listed.folders).toEqual(["Research ideas"]);

    const archived = await store.archiveSession("session-1");
    expect(archived?.archived_at).toEqual(expect.any(String));

    const archivedList = await store.listWorkspace({ includeArchived: true });
    expect(archivedList.sessions[0]?.archived_at).toEqual(expect.any(String));

    await store.deleteSession("session-1");

    const afterDelete = await store.listWorkspace({ includeArchived: true });
    expect(afterDelete.sessions).toEqual([]);
    expect(await store.getSessionDetail("session-1")).toBeNull();
  });

  it("keeps the established session title when later turns are follow-up replies", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-session-workspace-"));
    scratchDirs.push(rootDir);

    const store = createFileSessionWorkspaceStore(rootDir);

    await store.createSession({
      session_id: "session-follow-up",
      mode: "research",
      title: "New thread"
    });

    await store.appendExchange({
      session_id: "session-follow-up",
      mode: "research",
      title: "Original research question",
      preview: "First answer preview.",
      user_message: "Original research question",
      attachments: [],
      result: {
        ...minimalResult,
        session_id: "session-follow-up",
        synthesis: {
          ...minimalResult.synthesis,
          final_answer: "First answer preview."
        }
      }
    });

    await store.appendExchange({
      session_id: "session-follow-up",
      mode: "research",
      title: "Short follow-up confirmation",
      preview: "Second answer preview.",
      user_message: "Short follow-up confirmation",
      attachments: [],
      result: {
        ...minimalResult,
        session_id: "session-follow-up",
        synthesis: {
          ...minimalResult.synthesis,
          final_answer: "Second answer preview."
        }
      }
    });

    const detail = await store.getSessionDetail("session-follow-up");
    expect(detail?.session.title).toBe("Original research question");
  });

  it("compacts legacy assistant results and writes diagnostics pointers on the next append", async () => {
    const rootDir = await mkdtemp(path.join(os.tmpdir(), "good-soup-session-workspace-"));
    scratchDirs.push(rootDir);

    const legacyState = {
      sessions: [
        {
          session_id: "session-legacy",
          mode: "research",
          title: "Legacy thread",
          preview: "Legacy preview.",
          touched_at: "2026-04-12T00:00:00.000Z",
          created_at: "2026-04-12T00:00:00.000Z",
          folder: null,
          archived_at: null
        }
      ],
      threads: {
        "session-legacy": [
          {
            id: "u-legacy",
            role: "user",
            content: "Legacy user turn",
            timestamp: "2026-04-12T00:00:00.000Z"
          },
          {
            id: "a-legacy",
            role: "assistant",
            content: "Legacy assistant turn",
            result: {
              ...minimalResult,
              session_id: "session-legacy",
              request_id: "req-legacy"
            },
            timestamp: "2026-04-12T00:00:10.000Z"
          }
        ]
      }
    };

    await writeFile(path.join(rootDir, "workspace.json"), JSON.stringify(legacyState, null, 2), "utf8");

    const store = createFileSessionWorkspaceStore(rootDir);
    await store.appendExchange({
      session_id: "session-legacy",
      mode: "research",
      title: "Legacy thread",
      preview: "Current preview.",
      user_message: "Current user turn",
      attachments: [],
      result: {
        ...minimalResult,
        session_id: "session-legacy",
        request_id: "req-current"
      }
    });

    const detail = await store.getSessionDetail("session-legacy");
    const migratedAssistant = detail?.thread.find((message) => message.id === "a-legacy");
    expect(migratedAssistant?.diagnostics_path).toMatch(/^exchanges\/session-legacy\/.+\.json$/);
    expect(migratedAssistant?.result?.audit_trail).toEqual([]);
  });
});
