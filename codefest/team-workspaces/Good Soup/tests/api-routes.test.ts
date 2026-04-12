import { beforeEach, describe, expect, it, vi } from "vitest";

import type { CompanionPipelineResult } from "../src/lib/companion/contracts";
import type { EvaluationHarnessResult } from "../src/lib/companion/contracts";
import type { RuntimeConfig } from "../src/lib/companion/config";

// ---------------------------------------------------------------------------
// Module-level mocks — must be declared before any imports of the modules
// ---------------------------------------------------------------------------

vi.mock("../src/lib/companion/pipeline", () => ({
  runCompanionPipeline: vi.fn()
}));

vi.mock("../src/lib/companion/eval/harness", () => ({
  runEvaluationHarness: vi.fn()
}));

vi.mock("../src/lib/companion/config", () => ({
  getRuntimeConfig: vi.fn()
}));

vi.mock("../src/lib/companion/session-workspace-store", () => ({
  fileSessionWorkspaceStore: {
    listWorkspace: vi.fn(),
    createSession: vi.fn(),
    getSessionDetail: vi.fn(),
    updateSession: vi.fn(),
    archiveSession: vi.fn(),
    appendExchange: vi.fn(),
    deleteSession: vi.fn()
  }
}));

// ---------------------------------------------------------------------------
// Lazy imports — resolved after mocks are registered
// ---------------------------------------------------------------------------

import { runCompanionPipeline } from "../src/lib/companion/pipeline";
import { runEvaluationHarness } from "../src/lib/companion/eval/harness";
import { getRuntimeConfig } from "../src/lib/companion/config";
import { fileSessionWorkspaceStore } from "../src/lib/companion/session-workspace-store";

import { POST as companionPOST } from "../src/app/api/companion/route";
import { POST as evalPOST } from "../src/app/api/eval/route";
import { GET as healthGET } from "../src/app/api/health/route";
import { GET as sessionsGET, POST as sessionsPOST } from "../src/app/api/sessions/route";
import {
  DELETE as sessionDELETE,
  GET as sessionGET,
  PATCH as sessionPATCH
} from "../src/app/api/sessions/[id]/route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeJsonRequest(body: unknown, method = "POST"): Request {
  return new Request("http://localhost/api/test", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body)
  });
}

const minimalPipelineResult: CompanionPipelineResult = {
  request_id: "req-test",
  session_id: "session-test",
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
  synthesis: { final_answer: "Test answer.", citations: [], uncertainty_notes: [] },
  audit_trail: [],
  process_events: []
};

const minimalHarnessResult: EvaluationHarnessResult = {
  variant: "full_harness",
  summary: { total_scenarios: 0, expectation_matches: 0 },
  results: []
};

const baseRuntimeConfig: RuntimeConfig = {
  openai_api_key: undefined,
  inhibitor_api_key: undefined,
  inhibitor_url: "https://iaas.appliedai.studio/check",
  primary_model: "gpt-4.1-mini",
  verifier_model: "gpt-4.1-nano",
  llm_base_url: undefined,
  opencode_server_url: undefined,
  opencode_model: undefined,
  opencode_agent: undefined,
  opencode_username: undefined,
  opencode_password: undefined
};

// ---------------------------------------------------------------------------
// /api/companion
// ---------------------------------------------------------------------------

describe("POST /api/companion", () => {
  beforeEach(() => {
    vi.mocked(runCompanionPipeline).mockResolvedValue(minimalPipelineResult);
    vi.mocked(fileSessionWorkspaceStore.createSession).mockReset();
    vi.mocked(fileSessionWorkspaceStore.listWorkspace).mockReset();
    vi.mocked(fileSessionWorkspaceStore.getSessionDetail).mockReset();
    vi.mocked(fileSessionWorkspaceStore.updateSession).mockReset();
    vi.mocked(fileSessionWorkspaceStore.archiveSession).mockReset();
    vi.mocked(fileSessionWorkspaceStore.appendExchange).mockReset();
    vi.mocked(fileSessionWorkspaceStore.deleteSession).mockReset();
  });

  it("returns 400 when mode is missing", async () => {
    const req = makeJsonRequest({ user_message: "Hello" });
    const res = await companionPOST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 400 when user_message is missing", async () => {
    const req = makeJsonRequest({ mode: "research" });
    const res = await companionPOST(req);

    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty("error");
  });

  it("returns 200 with pipeline result shape when both required fields are present", async () => {
    const req = makeJsonRequest({
      session_id: "sess-abc",
      mode: "research",
      user_message: "Is this claim valid?"
    });
    const res = await companionPOST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      request_id: "req-test",
      session_id: "session-test",
      mode: "research"
    });
    expect(fileSessionWorkspaceStore.appendExchange).toHaveBeenCalledWith(
      expect.objectContaining({
        session_id: "sess-abc",
        mode: "research",
        user_message: "Is this claim valid?",
        result: expect.objectContaining({
          request_id: "req-test"
        })
      })
    );
  });

  it("generates a UUID session_id when session_id is absent from the request body", async () => {
    const req = makeJsonRequest({ mode: "research", user_message: "Summarise this." });
    await companionPOST(req);

    expect(runCompanionPipeline).toHaveBeenCalledWith(
      expect.objectContaining({
        // UUID v4 pattern
        session_id: expect.stringMatching(
          /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
        )
      })
    );
  });

  it("returns 500 when runCompanionPipeline throws", async () => {
    vi.mocked(runCompanionPipeline).mockRejectedValueOnce(new Error("pipeline failure"));

    const req = makeJsonRequest({ mode: "research", user_message: "Hello." });
    const res = await companionPOST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error", "pipeline failure");
  });
});

// ---------------------------------------------------------------------------
// /api/sessions
// ---------------------------------------------------------------------------

describe("session workspace routes", () => {
  it("lists the session workspace", async () => {
    vi.mocked(fileSessionWorkspaceStore.listWorkspace).mockResolvedValue({
      folders: ["Research ideas"],
      sessions: [
        {
          session_id: "session-1",
          mode: "research",
          title: "Novelty check",
          preview: "Avoid strong novelty claims until you widen the review.",
          touched_at: "2026-04-11T21:00:00.000Z",
          created_at: "2026-04-11T20:58:00.000Z",
          folder: "Research ideas",
          archived_at: null
        }
      ]
    });

    const res = await sessionsGET(new Request("http://localhost/api/sessions"));

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      folders: ["Research ideas"]
    });
    expect(body.sessions[0]).toMatchObject({
      session_id: "session-1",
      folder: "Research ideas"
    });
  });

  it("creates a new session workspace record", async () => {
    vi.mocked(fileSessionWorkspaceStore.createSession).mockResolvedValue({
      session_id: "session-2",
      mode: "learning",
      title: "New thread",
      preview: "",
      touched_at: "2026-04-11T21:05:00.000Z",
      created_at: "2026-04-11T21:05:00.000Z",
      folder: null,
      archived_at: null
    });

    const res = await sessionsPOST(
      makeJsonRequest({ mode: "learning", title: "New thread" })
    );

    expect(res.status).toBe(200);
    expect(fileSessionWorkspaceStore.createSession).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "learning",
        title: "New thread"
      })
    );
  });

  it("returns a session detail with its thread", async () => {
    vi.mocked(fileSessionWorkspaceStore.getSessionDetail).mockResolvedValue({
      session: {
        session_id: "session-1",
        mode: "research",
        title: "Novelty check",
        preview: "Avoid strong novelty claims until you widen the review.",
        touched_at: "2026-04-11T21:00:00.000Z",
        created_at: "2026-04-11T20:58:00.000Z",
        folder: null,
        archived_at: null
      },
      thread: [
        {
          id: "u-1",
          role: "user",
          content: "Can I call this novel already?",
          timestamp: "2026-04-11T21:00:00.000Z"
        },
        {
          id: "a-1",
          role: "assistant",
          content: "I would avoid strong novelty claims yet.",
          timestamp: "2026-04-11T21:00:10.000Z",
          result: minimalPipelineResult
        }
      ]
    });

    const res = await sessionGET(new Request("http://localhost/api/sessions/session-1"), {
      params: Promise.resolve({ id: "session-1" })
    });

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.thread).toHaveLength(2);
    expect(body.thread[1]).toMatchObject({
      role: "assistant"
    });
  });

  it("patches session metadata", async () => {
    vi.mocked(fileSessionWorkspaceStore.updateSession).mockResolvedValue({
      session_id: "session-1",
      mode: "research",
      title: "Renamed thread",
      preview: "Avoid strong novelty claims until you widen the review.",
      touched_at: "2026-04-11T21:10:00.000Z",
      created_at: "2026-04-11T20:58:00.000Z",
      folder: "Research ideas",
      archived_at: null
    });

    const res = await sessionPATCH(
      makeJsonRequest({ title: "Renamed thread", folder: "Research ideas" }, "PATCH"),
      {
        params: Promise.resolve({ id: "session-1" })
      }
    );

    expect(res.status).toBe(200);
    expect(fileSessionWorkspaceStore.updateSession).toHaveBeenCalledWith("session-1", {
      title: "Renamed thread",
      folder: "Research ideas",
      archived: undefined
    });
  });

  it("archives a session on delete when archive=1 is set", async () => {
    vi.mocked(fileSessionWorkspaceStore.archiveSession).mockResolvedValue({
      session_id: "session-1",
      mode: "research",
      title: "Novelty check",
      preview: "Avoid strong novelty claims until you widen the review.",
      touched_at: "2026-04-11T21:10:00.000Z",
      created_at: "2026-04-11T20:58:00.000Z",
      folder: null,
      archived_at: "2026-04-11T21:10:00.000Z"
    });

    const res = await sessionDELETE(
      new Request("http://localhost/api/sessions/session-1?archive=1", { method: "DELETE" }),
      {
        params: Promise.resolve({ id: "session-1" })
      }
    );

    expect(res.status).toBe(200);
    expect(fileSessionWorkspaceStore.archiveSession).toHaveBeenCalledWith("session-1");
  });

  it("hard deletes a session when archive=1 is not set", async () => {
    vi.mocked(fileSessionWorkspaceStore.deleteSession).mockResolvedValue(true);

    const res = await sessionDELETE(
      new Request("http://localhost/api/sessions/session-1", { method: "DELETE" }),
      {
        params: Promise.resolve({ id: "session-1" })
      }
    );

    expect(res.status).toBe(200);
    expect(fileSessionWorkspaceStore.deleteSession).toHaveBeenCalledWith("session-1");
  });
});

// ---------------------------------------------------------------------------
// /api/eval
// ---------------------------------------------------------------------------

describe("POST /api/eval", () => {
  beforeEach(() => {
    vi.mocked(runEvaluationHarness).mockResolvedValue(minimalHarnessResult);
  });

  it("returns 200 with harness result shape", async () => {
    const req = makeJsonRequest({});
    const res = await evalPOST(req);

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      summary: { total_scenarios: 0, expectation_matches: 0 },
      results: []
    });
  });

  it("passes scenarioIds from request body through to runEvaluationHarness", async () => {
    const req = makeJsonRequest({ scenarioIds: ["CONF-001", "PRIV-001"] });
    await evalPOST(req);

    expect(runEvaluationHarness).toHaveBeenCalledWith(
      expect.objectContaining({ scenarioIds: ["CONF-001", "PRIV-001"] })
    );
  });

  it("passes categories and variant through to runEvaluationHarness", async () => {
    const req = makeJsonRequest({
      categories: ["sycophancy"],
      variant: "baseline"
    });
    await evalPOST(req);

    expect(runEvaluationHarness).toHaveBeenCalledWith(
      expect.objectContaining({
        categories: ["sycophancy"],
        variant: "baseline"
      })
    );
  });

  it("returns 500 when runEvaluationHarness throws", async () => {
    vi.mocked(runEvaluationHarness).mockRejectedValueOnce(new Error("harness failure"));

    const req = makeJsonRequest({});
    const res = await evalPOST(req);

    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body).toHaveProperty("error", "harness failure");
  });
});

// ---------------------------------------------------------------------------
// /api/health
// ---------------------------------------------------------------------------

describe("GET /api/health", () => {
  it("returns 200 with has_openai_key: false when no API key is configured", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({ ...baseRuntimeConfig });

    const res = await healthGET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({
      ok: true,
      has_openai_key: false,
      has_inhibitor_key: false
    });
  });

  it("returns has_openai_key: true when config has openai_api_key set", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      ...baseRuntimeConfig,
      openai_api_key: "sk-test-key"
    });

    const res = await healthGET();

    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toMatchObject({ ok: true, has_openai_key: true });
  });
});
