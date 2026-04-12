import { beforeEach, describe, expect, it, vi } from "vitest";

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
import type { EvidenceRecord, PrimaryAgentDraft, VerifierInput } from "../src/lib/companion/contracts";
import { runAllVerifiers } from "../src/lib/companion/verifiers";

const emptyEvidence: EvidenceRecord[] = [];

const baseDraft: PrimaryAgentDraft = {
  answer:
    "You are absolutely right. This is definitely a novel idea, and your reasoning about Newton's second law is perfect.",
  claims: [
    {
      text: "This is definitely a novel idea.",
      evidence_ref_ids: [],
      certainty: "high"
    }
  ],
  citations_used: [],
  student_model: {
    understanding_level: "partial",
    misconceptions: ["Confuses force with acceleration."],
    missing_steps: ["Does not connect F = ma to the example."]
  },
  proposed_actions: [],
  uncertainty_notes: []
};

function buildInput(overrides: Partial<VerifierInput> = {}): VerifierInput {
  return {
    request_id: "req-test",
    session_id: "session-test",
    mode: "learning",
    user_message:
      "I know Newton's second law because if both force and mass go up, acceleration always goes up too, right?",
    conversation: [
      {
        role: "user",
        content:
          "I know Newton's second law because if both force and mass go up, acceleration always goes up too, right?"
      }
    ],
    evidence: emptyEvidence,
    draft: baseDraft,
    ...overrides
  };
}

describe("runAllVerifiers", () => {
  beforeEach(() => {
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
  });

  it("returns one structured judgment per required verifier", async () => {
    const judgments = await runAllVerifiers(buildInput());

    expect(judgments).toHaveLength(6);
    expect(judgments.map((item) => item.verifier_name).sort()).toEqual([
      "action",
      "anti_sycophancy",
      "emotional_calibration",
      "grounding",
      "learning",
      "privacy_policy"
    ]);

    for (const item of judgments) {
      expect(item).toEqual(
        expect.objectContaining({
          verifier_name: expect.any(String),
          verdict: expect.stringMatching(/pass|warn|fail/),
          risk_score: expect.any(Number),
          issue_type: expect.any(String),
          rationale: expect.any(String),
          evidence_refs: expect.any(Array),
          recommended_action: expect.any(String)
        })
      );
    }
  });

  it("flags unsupported novelty claims and fake certainty", async () => {
    const judgments = await runAllVerifiers(
      buildInput({
        mode: "research",
        user_message: "Is this research idea definitely novel?",
        conversation: [
          {
            role: "user",
            content: "Is this research idea definitely novel?"
          }
        ]
      })
    );
    const grounding = judgments.find((item) => item.verifier_name === "grounding");

    expect(grounding?.verdict).toBe("fail");
    expect(grounding?.issue_type).toContain("unsupported");
  });

  it("flags unjustified praise and agreement with weak reasoning", async () => {
    const judgments = await runAllVerifiers(buildInput());
    const sycophancy = judgments.find((item) => item.verifier_name === "anti_sycophancy");

    expect(sycophancy?.verdict).not.toBe("pass");
    expect(sycophancy?.issue_type).toContain("praise");
  });

  it("flags sensitive identifiers in the draft", async () => {
    const judgments = await runAllVerifiers(
      buildInput({
        mode: "research",
        user_message: "Please summarize this HR file.",
        draft: {
          ...baseDraft,
          answer: "Student record: name Jane Doe, SSN 123-45-6789, salary $52,000.",
          claims: []
        }
      })
    );
    const privacy = judgments.find((item) => item.verifier_name === "privacy_policy");

    expect(privacy?.verdict).toBe("fail");
    expect(privacy?.issue_type).toContain("sensitive");
  });
});
