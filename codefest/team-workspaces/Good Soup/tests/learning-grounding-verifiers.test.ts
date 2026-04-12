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
import type { VerifierInput } from "../src/lib/companion/contracts";
import { runGroundingVerifier } from "../src/lib/companion/verifiers/grounding";
import { runLearningVerifier } from "../src/lib/companion/verifiers/learning";

function buildInput(overrides: Partial<VerifierInput> = {}): VerifierInput {
  return {
    request_id: "req-verifier-learning",
    session_id: "session-verifier-learning",
    mode: "learning",
    user_message:
      "Question: Julia had 12 spoons left after using 3, and her husband bought 5. Student says the answer is 4. Is that right?",
    conversation: [],
    evidence: [],
    draft: {
      answer:
        "You're close, but the student answer is not correct. Since Julia had 12 left after using 3, you add those back to get 15, then subtract the husband's 5. So Julia bought 10 spoons, not 4.",
      claims: [],
      citations_used: [],
      student_model: {
        understanding_level: "partial",
        misconceptions: ["The student subtracted instead of restoring the used spoons."],
        missing_steps: ["They need to add the 3 used spoons back before subtracting 5."]
      },
      proposed_actions: [],
      uncertainty_notes: []
    },
    ...overrides
  };
}

describe("learning and grounding verifier heuristics", () => {
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

  it("does not warn about missing retrieval evidence for a self-contained learning explanation", async () => {
    const judgment = await runGroundingVerifier(buildInput());

    expect(judgment.verdict).toBe("pass");
    expect(judgment.issue_type).toContain("learning");
  });

  it("passes a learning answer that explicitly corrects the misconception and gives the right answer", async () => {
    const judgment = await runLearningVerifier(buildInput());

    expect(judgment.verdict).toBe("pass");
    expect(judgment.issue_type).toContain("addressed");
  });

  it("still flags a worked solution when the prompt includes a student attempt but the answer never names the misconception", async () => {
    const judgment = await runLearningVerifier(
      buildInput({
        draft: {
          answer: [
            "Let x be the number of spoons Julia bought.",
            "",
            "1) After her husband gives her 5 spoons, she has x + 5 spoons.",
            "2) While making the stew, she uses 3 spoons, so she has (x + 5) - 3 spoons left.",
            "3) When she sets the table, she has 12 spoons, so:",
            "   (x + 5) - 3 = 12",
            "4) Simplify:",
            "   x + 2 = 12",
            "5) Subtract 2 from both sides:",
            "   x = 10",
            "",
            "So the package Julia bought had 10 spoons.",
            "Final answer: 10"
          ].join("\n"),
          claims: [],
          citations_used: [],
          student_model: {
            understanding_level: "partial",
            misconceptions: ["The student solved the equation in the wrong direction."],
            missing_steps: ["They need to reconstruct the state before the 3 spoons were used."]
          },
          proposed_actions: [],
          uncertainty_notes: []
        }
      })
    );

    expect(judgment.verdict).toBe("fail");
    expect(judgment.issue_type).toContain("misconception");
  });
});
