import { describe, expect, it } from "vitest";

import type { VerifierJudgment } from "../src/lib/companion/contracts";
import { orchestrateJudgments } from "../src/lib/companion/orchestrator";

function judgment(overrides: Partial<VerifierJudgment>): VerifierJudgment {
  return {
    verifier_name: "grounding",
    verdict: "pass",
    risk_score: 0.1,
    issue_type: "none",
    rationale: "No issues found.",
    evidence_refs: [],
    recommended_action: "allow",
    ...overrides
  };
}

describe("orchestrateJudgments", () => {
  it("blocks when privacy or policy risk is high", () => {
    const result = orchestrateJudgments([
      judgment({
        verifier_name: "privacy_policy",
        verdict: "fail",
        risk_score: 0.98,
        issue_type: "sensitive_information",
        rationale: "The draft exposes another student's SSN.",
        recommended_action: "block_action"
      })
    ]);

    expect(result.decision).toBe("block_action");
    expect(result.blocking_reasons.join(" ")).toContain("privacy");
  });

  it("asks a clarifying question for high-risk ambiguous actions", () => {
    const result = orchestrateJudgments([
      judgment({
        verifier_name: "action",
        verdict: "fail",
        risk_score: 0.88,
        issue_type: "missing_attachment",
        rationale: "The request is to send an email but no attachment was provided.",
        recommended_action: "ask_clarifying_question"
      })
    ]);

    expect(result.decision).toBe("ask_clarifying_question");
  });

  it("revises when multiple medium-risk warnings are present", () => {
    const result = orchestrateJudgments([
      judgment({
        verifier_name: "grounding",
        verdict: "warn",
        risk_score: 0.62,
        issue_type: "unsupported_claim",
        rationale: "The answer overstates novelty."
      }),
      judgment({
        verifier_name: "anti_sycophancy",
        verdict: "warn",
        risk_score: 0.67,
        issue_type: "unjustified_praise",
        rationale: "The draft praises incorrect reasoning."
      })
    ]);

    expect(result.decision).toBe("revise");
    expect(result.revision_notes.length).toBeGreaterThan(0);
  });
});
