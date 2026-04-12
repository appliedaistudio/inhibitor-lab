import { beforeEach, describe, expect, it, vi } from "vitest";

const { createMock, openAIConstructor } = vi.hoisted(() => {
  const createMock = vi.fn();
  const openAIConstructor = vi.fn(function MockOpenAI() {
    return {
      chat: {
        completions: {
          create: createMock
        }
      }
    };
  });

  return {
    createMock,
    openAIConstructor
  };
});

vi.mock("openai", () => ({
  default: openAIConstructor
}));

vi.mock("../src/lib/companion/opencode/adapter", () => ({
  runPrimaryAgentViaOpenCode: vi.fn()
}));

vi.mock("../src/lib/companion/config", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/companion/config")>(
    "../src/lib/companion/config"
  );

  return {
    ...actual,
    getRuntimeConfig: vi.fn()
  };
});

import { getRuntimeConfig } from "../src/lib/companion/config";
import { runPrimaryAgentViaOpenCode } from "../src/lib/companion/opencode/adapter";
import { runPrimaryAgent } from "../src/lib/companion/primary-agent";

describe("runPrimaryAgent runtime behavior", () => {
  beforeEach(() => {
    createMock.mockReset();
    openAIConstructor.mockClear();
    vi.mocked(runPrimaryAgentViaOpenCode).mockReset();
  });

  it("configures a bounded direct-model client instead of allowing long retries", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      openai_api_key: "test-key",
      inhibitor_api_key: undefined,
      inhibitor_url: "https://iaas.appliedai.studio/check",
      primary_model: "gpt-5.4",
      verifier_model: "gpt-5.4-mini",
      llm_base_url: "http://localhost:8000/v1",
      opencode_server_url: undefined,
      opencode_model: undefined,
      opencode_agent: undefined,
      opencode_username: undefined,
      opencode_password: undefined
    });

    createMock.mockResolvedValue({
      choices: [
        {
          message: {
            content: JSON.stringify({
              answer: "Bounded runtime response.",
              claims: [],
              citations_used: [],
              student_model: {
                understanding_level: "partial",
                misconceptions: [],
                missing_steps: []
              },
              proposed_actions: [],
              uncertainty_notes: []
            })
          }
        }
      ]
    });

    await runPrimaryAgent({
      request_id: "req-runtime-1",
      session_id: "session-runtime-1",
      mode: "research",
      user_message: "Compare novelty cautiously.",
      conversation: [{ role: "user", content: "Compare novelty cautiously." }],
      evidence: []
    });

    expect(openAIConstructor).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: "test-key",
        baseURL: "http://localhost:8000/v1",
        timeout: 15000,
        maxRetries: 0
      })
    );
  });

  it("falls back cleanly when the direct model backend errors", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      openai_api_key: "test-key",
      inhibitor_api_key: undefined,
      inhibitor_url: "https://iaas.appliedai.studio/check",
      primary_model: "gpt-5.4",
      verifier_model: "gpt-5.4-mini",
      llm_base_url: "http://localhost:8000/v1",
      opencode_server_url: undefined,
      opencode_model: undefined,
      opencode_agent: undefined,
      opencode_username: undefined,
      opencode_password: undefined
    });

    createMock.mockRejectedValue(new Error("connect failed"));

    const result = await runPrimaryAgent({
      request_id: "req-runtime-2",
      session_id: "session-runtime-2",
      mode: "research",
      user_message: "Compare novelty cautiously.",
      conversation: [{ role: "user", content: "Compare novelty cautiously." }],
      evidence: []
    });

    expect(result.runtime.degraded).toBe(true);
    expect(result.runtime.backend).toBe("openai");
    expect(result.draft.answer).toContain("direct model backend is unavailable right now");
    expect(result.draft.claims).toEqual([]);
    expect(result.draft.proposed_actions).toEqual([]);
  });

  it("retries against the default OpenAI endpoint when a custom base URL is unavailable", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      openai_api_key: "test-key",
      inhibitor_api_key: undefined,
      inhibitor_url: "https://iaas.appliedai.studio/check",
      primary_model: "gpt-5.4",
      verifier_model: "gpt-5.4-mini",
      llm_base_url: "http://localhost:8000/v1",
      opencode_server_url: undefined,
      opencode_model: undefined,
      opencode_agent: undefined,
      opencode_username: undefined,
      opencode_password: undefined
    });

    createMock
      .mockRejectedValueOnce(new Error("connect ECONNREFUSED 127.0.0.1:8000"))
      .mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                answer: "Recovered with the default OpenAI endpoint.",
                claims: [],
                citations_used: [],
                student_model: {
                  understanding_level: "partial",
                  misconceptions: [],
                  missing_steps: []
                },
                proposed_actions: [],
                uncertainty_notes: []
              })
            }
          }
        ]
      });

    const result = await runPrimaryAgent({
      request_id: "req-runtime-2b",
      session_id: "session-runtime-2b",
      mode: "research",
      user_message: "Compare novelty cautiously.",
      conversation: [{ role: "user", content: "Compare novelty cautiously." }],
      evidence: []
    });

    expect(openAIConstructor).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        apiKey: "test-key",
        baseURL: "http://localhost:8000/v1",
        timeout: 15000,
        maxRetries: 0
      })
    );
    expect(openAIConstructor).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        apiKey: "test-key",
        timeout: 15000,
        maxRetries: 0
      })
    );
    expect(result.runtime.backend).toBe("openai");
    expect(result.runtime.degraded).toBe(true);
    expect(result.draft.answer).toBe("Recovered with the default OpenAI endpoint.");
  });

  it("returns a typed invalid-response message when OpenCode produces unusable output", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      openai_api_key: undefined,
      inhibitor_api_key: undefined,
      inhibitor_url: "https://iaas.appliedai.studio/check",
      primary_model: "gpt-5.4",
      verifier_model: "gpt-5.4-mini",
      llm_base_url: undefined,
      opencode_server_url: "http://127.0.0.1:4096",
      opencode_model: "opencode/gpt-5.4",
      opencode_agent: undefined,
      opencode_username: undefined,
      opencode_password: undefined
    });

    vi.mocked(runPrimaryAgentViaOpenCode).mockRejectedValue(
      new Error("Primary agent response did not include a usable answer.")
    );

    const result = await runPrimaryAgent({
      request_id: "req-runtime-3",
      session_id: "session-runtime-3",
      mode: "research",
      user_message: "Compare novelty cautiously.",
      conversation: [{ role: "user", content: "Compare novelty cautiously." }],
      evidence: []
    });

    expect(result.runtime.degraded).toBe(true);
    expect(result.runtime.backend).toBe("opencode");
    expect(result.draft.answer).toContain("returned an invalid response");
    expect(result.draft.proposed_actions).toEqual([]);
  });

  it("returns a typed failure when no primary backend is configured", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      openai_api_key: undefined,
      inhibitor_api_key: undefined,
      inhibitor_url: "https://iaas.appliedai.studio/check",
      primary_model: "gpt-5.4",
      verifier_model: "gpt-5.4-mini",
      llm_base_url: undefined,
      opencode_server_url: undefined,
      opencode_model: undefined,
      opencode_agent: undefined,
      opencode_username: undefined,
      opencode_password: undefined
    });

    const result = await runPrimaryAgent({
      request_id: "req-runtime-4",
      session_id: "session-runtime-4",
      mode: "research",
      user_message: "Compare novelty cautiously.",
      conversation: [{ role: "user", content: "Compare novelty cautiously." }],
      evidence: []
    });

    expect(result.runtime.degraded).toBe(true);
    expect(result.runtime.backend).toBe("unconfigured");
    expect(result.draft.answer).toContain("no primary model backend is configured");
    expect(result.draft.claims).toEqual([]);
  });
});
