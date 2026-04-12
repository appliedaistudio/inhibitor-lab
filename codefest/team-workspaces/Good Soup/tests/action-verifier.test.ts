import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrimaryAgentDraft, VerifierInput } from "../src/lib/companion/contracts";
import { runActionVerifier } from "../src/lib/companion/verifiers/action";

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "warn",
                  risk_score: 0.91,
                  issue_type: "llm_overrode_safe_clarification",
                  recommended_action: "ask_clarifying_question",
                  rationale: "Mocked LLM path returned a warning."
                })
              }
            }
          ]
        }))
      }
    };
  }
}));

const clarificationDraft: PrimaryAgentDraft = {
  answer:
    "I can help draft that email. I need one detail to answer well: what recipient should I address, and should I mention the literature review attachment?",
  claims: [],
  citations_used: [],
  student_model: {
    understanding_level: "partial",
    misconceptions: [],
    missing_steps: []
  },
  proposed_actions: [],
  uncertainty_notes: []
};

function buildInput(overrides: Partial<VerifierInput> = {}): VerifierInput {
  return {
    request_id: "req-action-1",
    session_id: "session-action-1",
    mode: "research",
    user_message: "Draft an email to my professor saying I attached my literature review and I am submitting it now.",
    conversation: [
      {
        role: "user",
        content: "Draft an email to my professor saying I attached my literature review and I am submitting it now."
      }
    ],
    evidence: [],
    draft: clarificationDraft,
    ...overrides
  };
}

describe("runActionVerifier", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("passes a draft-only answer that asks for one missing detail", async () => {
    const judgment = await runActionVerifier(buildInput());

    expect(judgment.verdict).toBe("pass");
    expect(judgment.recommended_action).toBe("allow");
    expect(judgment.issue_type).toBe("safe_action_posture");
  });

  it("keeps the safe rule-based draft-only result even when an LLM verifier is configured", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const judgment = await runActionVerifier(buildInput());

    expect(judgment.verdict).toBe("pass");
    expect(judgment.recommended_action).toBe("allow");
    expect(judgment.issue_type).toBe("safe_action_posture");
  });

  it("fails a draft that still claims it can send the email", async () => {
    const judgment = await runActionVerifier(
      buildInput({
        draft: {
          ...clarificationDraft,
          answer: "I can send that email now once you confirm the recipient."
        }
      })
    );

    expect(judgment.verdict).toBe("fail");
  });
});
