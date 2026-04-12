import { mkdtemp, readFile, rm, symlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";

import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrimaryAgentInput } from "../src/lib/companion/contracts";
import { getRuntimeConfig } from "../src/lib/companion/config";
import { resetOpenCodeAdapterState, runPrimaryAgentViaOpenCode } from "../src/lib/companion/opencode/adapter";
import { canonicalizeWorkspacePath, createWorkspaceMap } from "../src/lib/companion/opencode/workspace-map";

const baseInput: PrimaryAgentInput = {
  request_id: "req-opencode",
  session_id: "session-opencode",
  mode: "research",
  user_message: "Compare the overlap between these two research ideas and stay cautious about novelty.",
  conversation: [
    {
      role: "user",
      content: "Compare the overlap between these two research ideas and stay cautious about novelty."
    }
  ],
  evidence: [
    {
      id: "LC-001",
      title: "Retrieved Evidence Helps Reduce Hallucination",
      source_type: "local_corpus",
      snippet: "Grounded answers are more reliable when they cite retrieved sources.",
      url: "local://corpus/retrieved-evidence",
      score: 0.9
    }
  ]
};

function workspaceOptions(
  fetchImpl: typeof fetch,
  workspaceMapRoot: string,
  serverUrl = "http://127.0.0.1:4096",
  sessionMapRoot?: string
): Parameters<typeof runPrimaryAgentViaOpenCode>[1] {
  return {
    serverUrl,
    model: "opencode/gpt-5.2",
    fetchImpl,
    workspaceMapRoot,
    sessionMapRoot: sessionMapRoot ?? workspaceMapRoot
  };
}

describe("opencode adapter", () => {
  afterEach(() => {
    delete process.env.OPENCODE_BASE_URL;
    delete process.env.OPENCODE_SERVER_URL;
    delete process.env.OPENCODE_MODEL;
    delete process.env.PRIMARY_MODEL;
    resetOpenCodeAdapterState();
    vi.restoreAllMocks();
  });

  it("reads OpenCode alias configuration from env", () => {
    delete process.env.PRIMARY_MODEL;
    process.env.OPENCODE_BASE_URL = "http://127.0.0.1:4096";
    process.env.OPENCODE_MODEL = "opencode/gpt-5.2";

    const config = getRuntimeConfig();

    expect(config.llm_base_url).toBe("http://127.0.0.1:4096");
    expect(config.primary_model).toBe("opencode/gpt-5.2");
  });

  it("falls back to the current session-only OpenCode API when workspace bootstrap endpoints are unavailable", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return {
          ok: true,
          text: async () => "<!doctype html><html></html>",
          json: async () => {
            throw new Error("unexpected html");
          }
        };
      }

      if (url === "http://127.0.0.1:4096/session" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ id: "open-session-modern" })
        };
      }

      if (url === "http://127.0.0.1:4096/session/open-session-modern/message" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            info: {
              structured: {
                answer: "Modern OpenCode response.",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              }
            }
          })
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      const draft = await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot));

      expect(draft.answer).toBe("Modern OpenCode response.");
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:4096/v1/workspaces",
        expect.objectContaining({
          method: "GET"
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:4096/session",
        expect.objectContaining({
          method: "POST"
        })
      );
      expect(fetchMock).toHaveBeenCalledWith(
        "http://127.0.0.1:4096/session/open-session-modern/message",
        expect.objectContaining({
          method: "POST"
        })
      );
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("creates an OpenCode session, sends a structured prompt, and normalizes the response", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "workspace-1",
          path: process.cwd()
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "open-session-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          info: {
            structured_output: {
              answer: "Here is a cautious comparison grounded in the retrieved evidence.",
              claims: [
                {
                  text: "There is likely overlap with existing work.",
                  evidence_ref_ids: ["LC-001"],
                  certainty: "medium"
                }
              ],
              citations_used: ["LC-001"],
              student_model: {
                understanding_level: "partial",
                misconceptions: [],
                missing_steps: []
              },
              proposed_actions: [],
              uncertainty_notes: ["OpenCode generated a structured answer."]
            }
          },
          parts: []
        })
      });

    try {
      const draft = await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot));

      expect(fetchMock).toHaveBeenNthCalledWith(
        1,
        "http://127.0.0.1:4096/v1/workspaces",
        expect.objectContaining({
          method: "GET"
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        2,
        "http://127.0.0.1:4096/v1/workspaces",
        expect.objectContaining({
          method: "POST"
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        3,
        "http://127.0.0.1:4096/session",
        expect.objectContaining({
          method: "POST"
        })
      );
      expect(fetchMock).toHaveBeenNthCalledWith(
        4,
        "http://127.0.0.1:4096/session/open-session-1/message",
        expect.objectContaining({
          method: "POST",
          body: expect.stringContaining("\"format\"")
        })
      );
      expect(draft.answer).toContain("cautious comparison");
      expect(draft.citations_used).toEqual(["LC-001"]);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("salvages completed StructuredOutput tool payloads when info.structured is missing", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => []
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: "workspace-1",
          path: process.cwd()
        })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "open-session-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          info: {},
          parts: [
            {
              type: "tool",
              tool: "StructuredOutput",
              state: {
                status: "completed",
                input: {
                  answer: "Recovered from StructuredOutput tool input.",
                  claims: [],
                  citations_used: ["LC-001"],
                  student_model: {
                    understanding_level: "partial",
                    misconceptions: [],
                    missing_steps: []
                  },
                  proposed_actions: [],
                  uncertainty_notes: []
                }
              }
            }
          ]
        })
      });

    try {
      const draft = await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot));

      expect(draft.answer).toBe("Recovered from StructuredOutput tool input.");
      expect(draft.citations_used).toEqual(["LC-001"]);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("canonicalizes symlinked workspace paths to the real path", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const realWorkspaceDir = await mkdtemp(path.join(tmpdir(), "opencode-real-workspace-"));
    const symlinkedPath = path.join(workspaceRoot, "linked-workspace");
    await symlink(realWorkspaceDir, symlinkedPath);

    try {
      const map = createWorkspaceMap(workspaceRoot);
      await map.set({
        id: "workspace-1",
        path: symlinkedPath
      });

      const persisted = JSON.parse(await readFile(path.join(workspaceRoot, "workspaces.json"), "utf8")) as Array<{
        id: string;
        path: string;
      }>;

      expect(persisted).toEqual([
        expect.objectContaining({
          id: "workspace-1",
          path: canonicalizeWorkspacePath(realWorkspaceDir)
        })
      ]);
      expect(await map.get(realWorkspaceDir)).toEqual(
        expect.objectContaining({
          id: "workspace-1",
          path: canonicalizeWorkspacePath(realWorkspaceDir)
        })
      );
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
      await rm(realWorkspaceDir, { recursive: true, force: true });
    }
  });

  it("revalidates a stale cached workspace before using it", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    await writeFile(
      path.join(workspaceRoot, "workspaces.json"),
      JSON.stringify(
        [
          {
            id: "stale-workspace",
            path: process.cwd()
          }
        ],
        null,
        2
      ),
      "utf8"
    );
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces/stale-workspace" && init?.method === "GET") {
        return {
          ok: true,
          json: async () => ({
            id: "fresh-workspace",
            path: process.cwd()
          })
        };
      }

      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return {
          ok: false,
          status: 500,
          json: async () => ({})
        };
      }

      if (url === "http://127.0.0.1:4096/session" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ id: "open-session-1" })
        };
      }

      if (url === "http://127.0.0.1:4096/session/open-session-1/message" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            info: {
              structured_output: {
                answer: "First answer",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              }
            }
          })
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot));
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces/stale-workspace",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("reuses a cached workspace when the backend list fails but the workspace still exists", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces/cached-workspace" && init?.method === "GET") {
        return {
          ok: true,
          json: async () => ({
            id: "cached-workspace",
            path: process.cwd()
          })
        };
      }

      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return {
          ok: false,
          status: 500,
          json: async () => ({})
        };
      }

      if (url === "http://127.0.0.1:4096/session" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({ id: "open-session-1" })
        };
      }

      if (url === "http://127.0.0.1:4096/session/open-session-1/message" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            info: {
              structured_output: {
                answer: "Recovered from a cached workspace.",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              }
            }
          })
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      await writeFile(
        path.join(workspaceRoot, "workspaces.json"),
        JSON.stringify(
          [
            {
              id: "cached-workspace",
              path: process.cwd()
            }
          ],
          null,
          2
        ),
        "utf8"
      );

      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot));
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces/cached-workspace",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("does not reuse an unvalidated cached workspace when recovery cannot confirm it", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    await writeFile(
      path.join(workspaceRoot, "workspaces.json"),
      JSON.stringify(
        [
          {
            id: "stale-workspace",
            path: process.cwd()
          }
        ],
        null,
        2
      ),
      "utf8"
    );

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces/stale-workspace" && init?.method === "GET") {
        return {
          ok: false,
          status: 404,
          json: async () => ({})
        };
      }

      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return {
          ok: false,
          status: 500,
          json: async () => ({})
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      await expect(
        runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot))
      ).rejects.toThrow("Unexpected request: http://127.0.0.1:4096/session");
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }

    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces/stale-workspace",
      expect.objectContaining({
        method: "GET"
      })
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces",
      expect.objectContaining({
        method: "POST"
      })
    );
  });

  it("persists a recovered backend workspace into workspaces.json", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [
          {
            id: "backend-workspace",
            path: process.cwd()
          }
        ]
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: "open-session-1" })
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          info: {
            structured_output: {
              answer: "Recovered from the backend workspace.",
              claims: [],
              citations_used: [],
              student_model: {
                understanding_level: "partial",
                misconceptions: [],
                missing_steps: []
              },
              proposed_actions: [],
              uncertainty_notes: []
            }
          }
        })
      });

    try {
      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot));
      const persisted = JSON.parse(await readFile(path.join(workspaceRoot, "workspaces.json"), "utf8")) as Array<{
        id: string;
        path: string;
      }>;
      expect(persisted).toEqual([
        expect.objectContaining({
          id: "backend-workspace",
          path: process.cwd()
        })
      ]);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }
  });

  it("does not cross-share bootstrap promises between different backend servers", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const serverOneFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return { ok: true, json: async () => [] };
      }
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "workspace-a", path: process.cwd() }) };
      }
      if (url === "http://127.0.0.1:4096/session" && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "session-a" }) };
      }
      if (url.startsWith("http://127.0.0.1:4096/session/") && url.endsWith("/message") && init?.method === "POST") {
        return { ok: true, json: async () => ({ info: { structured_output: { answer: "A", claims: [], citations_used: [], student_model: { understanding_level: "partial", misconceptions: [], missing_steps: [] }, proposed_actions: [], uncertainty_notes: [] } } }) };
      }
      throw new Error(`Unexpected request for server one: ${url}`);
    });

    const serverTwoFetch = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4097/v1/workspaces" && init?.method === "GET") {
        return { ok: true, json: async () => [] };
      }
      if (url === "http://127.0.0.1:4097/v1/workspaces" && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "workspace-b", path: process.cwd() }) };
      }
      if (url === "http://127.0.0.1:4097/session" && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "session-b" }) };
      }
      if (url.startsWith("http://127.0.0.1:4097/session/") && url.endsWith("/message") && init?.method === "POST") {
        return { ok: true, json: async () => ({ info: { structured_output: { answer: "B", claims: [], citations_used: [], student_model: { understanding_level: "partial", misconceptions: [], missing_steps: [] }, proposed_actions: [], uncertainty_notes: [] } } }) };
      }
      throw new Error(`Unexpected request for server two: ${url}`);
    });

    try {
      await Promise.all([
        runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(serverOneFetch, workspaceRoot, "http://127.0.0.1:4096")),
        runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(serverTwoFetch, workspaceRoot, "http://127.0.0.1:4097"))
      ]);
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
    }

    expect(serverOneFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/v1/workspaces",
      expect.objectContaining({ method: "POST" })
    );
    expect(serverTwoFetch).toHaveBeenCalledWith(
      "http://127.0.0.1:4097/v1/workspaces",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("persists and reuses the canonical OpenCode session across adapter resets", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const sessionRoot = await mkdtemp(path.join(tmpdir(), "opencode-sessions-"));
    let sessionCreateCount = 0;

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return { ok: true, json: async () => [] };
      }
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "workspace-1", path: process.cwd() }) };
      }
      if (url === "http://127.0.0.1:4096/v1/workspaces/workspace-1" && init?.method === "GET") {
        return { ok: true, json: async () => ({ id: "workspace-1", path: process.cwd() }) };
      }
      if (url === "http://127.0.0.1:4096/session" && init?.method === "POST") {
        sessionCreateCount += 1;
        return { ok: true, json: async () => ({ id: "visible-session-1" }) };
      }
      if (url === "http://127.0.0.1:4096/session/visible-session-1" && init?.method === "GET") {
        return { ok: true, json: async () => ({ id: "visible-session-1" }) };
      }
      if (url === "http://127.0.0.1:4096/session/visible-session-1/message" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            info: {
              structured_output: {
                answer: "Visible session answer.",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              }
            }
          })
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot, "http://127.0.0.1:4096", sessionRoot));
      resetOpenCodeAdapterState();
      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot, "http://127.0.0.1:4096", sessionRoot));
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
      await rm(sessionRoot, { recursive: true, force: true });
    }

    expect(sessionCreateCount).toBe(1);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/visible-session-1",
      expect.objectContaining({ method: "GET" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/visible-session-1/message",
      expect.objectContaining({ method: "POST" })
    );
  });

  it("keeps revision passes in ephemeral sessions without replacing the canonical session mapping", async () => {
    const workspaceRoot = await mkdtemp(path.join(tmpdir(), "opencode-workspaces-"));
    const sessionRoot = await mkdtemp(path.join(tmpdir(), "opencode-sessions-"));
    let sessionCreateCount = 0;

    const revisionInput: PrimaryAgentInput = {
      ...baseInput,
      revision_brief: {
        original_user_message: baseInput.user_message,
        current_answer: "Original answer.",
        pass_index: 1,
        requirements: [
          {
            verifier_name: "action",
            issue_type: "action_requires_confirmation",
            rationale: "Need confirmation before sending.",
            risk_score: 0.62,
            recommended_action: "ask_clarifying_question"
          }
        ]
      }
    };

    const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "GET") {
        return { ok: true, json: async () => [] };
      }
      if (url === "http://127.0.0.1:4096/v1/workspaces" && init?.method === "POST") {
        return { ok: true, json: async () => ({ id: "workspace-1", path: process.cwd() }) };
      }
      if (url === "http://127.0.0.1:4096/v1/workspaces/workspace-1" && init?.method === "GET") {
        return { ok: true, json: async () => ({ id: "workspace-1", path: process.cwd() }) };
      }
      if (url === "http://127.0.0.1:4096/session" && init?.method === "POST") {
        sessionCreateCount += 1;
        return {
          ok: true,
          json: async () => ({
            id: sessionCreateCount === 1 ? "visible-session-1" : "revision-session-1"
          })
        };
      }
      if (url === "http://127.0.0.1:4096/session/visible-session-1" && init?.method === "GET") {
        return { ok: true, json: async () => ({ id: "visible-session-1" }) };
      }
      if (url === "http://127.0.0.1:4096/session/visible-session-1/message" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            info: {
              structured_output: {
                answer: "Visible session answer.",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              }
            }
          })
        };
      }
      if (url === "http://127.0.0.1:4096/session/revision-session-1/message" && init?.method === "POST") {
        return {
          ok: true,
          json: async () => ({
            info: {
              structured_output: {
                answer: "Internal revision answer.",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              }
            }
          })
        };
      }

      throw new Error(`Unexpected request: ${url}`);
    });

    try {
      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot, "http://127.0.0.1:4096", sessionRoot));
      await runPrimaryAgentViaOpenCode(revisionInput, workspaceOptions(fetchMock, workspaceRoot, "http://127.0.0.1:4096", sessionRoot));
      resetOpenCodeAdapterState();
      await runPrimaryAgentViaOpenCode(baseInput, workspaceOptions(fetchMock, workspaceRoot, "http://127.0.0.1:4096", sessionRoot));
    } finally {
      await rm(workspaceRoot, { recursive: true, force: true });
      await rm(sessionRoot, { recursive: true, force: true });
    }

    expect(sessionCreateCount).toBe(2);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/revision-session-1/message",
      expect.objectContaining({ method: "POST" })
    );
    expect(fetchMock).toHaveBeenCalledWith(
      "http://127.0.0.1:4096/session/visible-session-1/message",
      expect.objectContaining({ method: "POST" })
    );
  });
});
