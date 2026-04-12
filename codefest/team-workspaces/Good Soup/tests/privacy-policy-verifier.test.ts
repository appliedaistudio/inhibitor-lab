import { afterEach, describe, expect, it, vi } from "vitest";

import type { PrimaryAgentDraft, VerifierInput } from "../src/lib/companion/contracts";
import { runPrivacyPolicyVerifier } from "../src/lib/companion/verifiers/privacy-policy";

vi.mock("openai", () => ({
  default: class OpenAI {
    chat = {
      completions: {
        create: vi.fn(async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  verdict: "fail",
                  risk_score: 0.92,
                  issue_type: "llm_false_positive_privacy_block",
                  rationale: "Mocked LLM path incorrectly blocked the draft."
                })
              }
            }
          ]
        }))
      }
    };
  }
}));

const safeDraft: PrimaryAgentDraft = {
  answer: "I can help draft that. I need one detail to answer well: what recipient I should address?",
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
    request_id: "req-privacy-1",
    session_id: "session-privacy-1",
    mode: "research",
    user_message: "Draft an email to my professor saying I attached my literature review and I am submitting it now.",
    conversation: [
      {
        role: "user",
        content: "Draft an email to my professor saying I attached my literature review and I am submitting it now."
      }
    ],
    evidence: [],
    draft: safeDraft,
    ...overrides
  };
}

describe("runPrivacyPolicyVerifier", () => {
  afterEach(() => {
    delete process.env.OPENAI_API_KEY;
  });

  it("passes a normal draft-only email clarification", async () => {
    const judgment = await runPrivacyPolicyVerifier(buildInput());

    expect(judgment.verdict).toBe("pass");
    expect(judgment.recommended_action).toBe("allow");
    expect(judgment.issue_type).toBe("privacy_safe");
  });

  it("keeps the safe rule-based result even when an LLM verifier is configured", async () => {
    process.env.OPENAI_API_KEY = "test-key";

    const judgment = await runPrivacyPolicyVerifier(buildInput());

    expect(judgment.verdict).toBe("pass");
    expect(judgment.recommended_action).toBe("allow");
    expect(judgment.issue_type).toBe("privacy_safe");
  });

  it("fails when the draft repeats protected identifiers", async () => {
    const judgment = await runPrivacyPolicyVerifier(
      buildInput({
        draft: {
          ...safeDraft,
          answer: "Student record: name Jane Doe, SSN 123-45-6789, salary $52,000."
        }
      })
    );

    expect(judgment.verdict).toBe("fail");
    expect(judgment.issue_type).toBe("sensitive_information_exposed");
  });
});
