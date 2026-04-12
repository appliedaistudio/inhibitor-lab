import { describe, expect, it, vi } from "vitest";

import type {
  PrimaryAgentDraft,
  PrimaryAgentFn,
  PrimaryAgentInput,
  RevisionBrief,
  VerifierInput,
  VerifierJudgment,
  VerifierName
} from "../src/lib/companion/contracts";
import { buildPrompt } from "../src/lib/companion/primary-agent";
import { runFixLoop } from "../src/lib/companion/verifiers/fix-loop";

// ─── Shared fixtures ──────────────────────────────────────────────────────────

const initialDraft: PrimaryAgentDraft = {
  answer: "Original answer.",
  claims: [],
  citations_used: [],
  student_model: { understanding_level: "partial", misconceptions: [], missing_steps: [] },
  proposed_actions: [],
  uncertainty_notes: []
};

const baseInput: VerifierInput = {
  request_id: "req-fix-test",
  session_id: "session-fix-test",
  mode: "research",
  user_message: "Is this claim novel?",
  conversation: [],
  evidence: [],
  draft: initialDraft
};

function makeJudgment(
  verifier_name: VerifierName,
  verdict: VerifierJudgment["verdict"],
  risk_score: number
): VerifierJudgment {
  return {
    verifier_name,
    verdict,
    risk_score,
    issue_type: "test_issue",
    rationale: "Test rationale.",
    evidence_refs: [],
    recommended_action: "revise"
  };
}

function makePassJudgments(): VerifierJudgment[] {
  const names: VerifierName[] = [
    "grounding",
    "anti_sycophancy",
    "learning",
    "action",
    "emotional_calibration",
    "privacy_policy"
  ];
  return names.map((name) => makeJudgment(name, "pass", 0.0));
}

function makeRevisedDraft(answer: string): PrimaryAgentDraft {
  return { ...initialDraft, answer };
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe("runFixLoop", () => {
  it("no failures → passes through immediately without calling primaryAgent", async () => {
    const primaryAgent = vi.fn() as unknown as PrimaryAgentFn;
    const runSingleVerifier = vi.fn();

    const result = await runFixLoop(
      initialDraft,
      makePassJudgments(),
      baseInput,
      primaryAgent,
      runSingleVerifier
    );

    expect(result.fix_attempts).toHaveLength(0);
    expect(result.final_draft).toEqual(initialDraft);
    expect(primaryAgent).not.toHaveBeenCalled();
  });

  it("one failure → primaryAgent called once and recheck runs", async () => {
    const fixedDraft = makeRevisedDraft("Fixed answer.");

    const primaryAgent = vi.fn().mockResolvedValue({
      draft: fixedDraft,
      runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
    });

    const runSingleVerifier = vi.fn().mockResolvedValue(
      makeJudgment("grounding", "pass", 0.0)
    );

    const failJudgment = makeJudgment("grounding", "fail", 0.9);
    const judgments = [failJudgment, ...makePassJudgments().filter((j) => j.verifier_name !== "grounding")];

    const result = await runFixLoop(
      initialDraft,
      judgments,
      baseInput,
      primaryAgent,
      runSingleVerifier
    );

    expect(result.fix_attempts).toHaveLength(1);
    expect(result.fix_attempts[0].fix_applied).toBe(true);
    expect(result.fix_attempts[0].recheck_judgment.verdict).toBe("pass");
    expect(result.final_draft.answer).toBe("Fixed answer.");
  });

  it("failures processed in risk order (highest risk first)", async () => {
    const callOrder: string[] = [];

    const primaryAgent = vi.fn().mockImplementation(async (input) => {
      const verifierName = input.revision_brief?.requirements[0]?.verifier_name;
      if (verifierName) {
        callOrder.push(verifierName);
      }
      return {
        draft: makeRevisedDraft("Fixed."),
        runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
      };
    });

    const runSingleVerifier = vi.fn().mockResolvedValue(
      makeJudgment("grounding", "pass", 0.0)
    );

    const lowRisk = makeJudgment("anti_sycophancy", "fail", 0.6);
    const highRisk = makeJudgment("grounding", "fail", 0.9);

    await runFixLoop(
      initialDraft,
      [lowRisk, highRisk],
      baseInput,
      primaryAgent,
      runSingleVerifier
    );

    expect(callOrder[0]).toBe("grounding");
    expect(callOrder[1]).toBe("anti_sycophancy");
  });

  it("capped at MAX_FIX_ATTEMPTS (4) even when more than 4 failures are given", async () => {
    const primaryAgent = vi.fn().mockResolvedValue({
      draft: makeRevisedDraft("Fixed."),
      runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
    });

    const runSingleVerifier = vi.fn().mockResolvedValue(
      makeJudgment("grounding", "pass", 0.0)
    );

    const names: VerifierName[] = [
      "grounding",
      "anti_sycophancy",
      "learning",
      "action",
      "emotional_calibration",
      "privacy_policy"
    ];
    const sixFailures = names.map((name) => makeJudgment(name, "fail", 0.5));

    await runFixLoop(
      initialDraft,
      sixFailures,
      baseInput,
      primaryAgent,
      runSingleVerifier
    );

    expect(primaryAgent).toHaveBeenCalledTimes(4);
  });

  it("fix loop keeps the original user message and attaches a structured revision brief", async () => {
    let capturedInput: PrimaryAgentInput | undefined;

    const primaryAgent = vi.fn().mockImplementation(async (input) => {
      capturedInput = input;
      return {
        draft: makeRevisedDraft("Fixed."),
        runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
      };
    });

    const runSingleVerifier = vi.fn().mockResolvedValue(
      makeJudgment("grounding", "pass", 0.0)
    );

    const failJudgment = makeJudgment("grounding", "fail", 0.8);
    const inputWithQuestion: VerifierInput = {
      ...baseInput,
      user_message: "Is this claim novel?"
    };

    await runFixLoop(
      initialDraft,
      [failJudgment],
      inputWithQuestion,
      primaryAgent,
      runSingleVerifier
    );

    expect(capturedInput).toBeDefined();
    expect(capturedInput!.user_message).toBe("Is this claim novel?");
    expect(capturedInput!.revision_brief).toEqual<RevisionBrief>({
      original_user_message: "Is this claim novel?",
      current_answer: "Original answer.",
      pass_index: 1,
      requirements: [
        {
          verifier_name: "grounding",
          issue_type: "test_issue",
          rationale: "Test rationale.",
          risk_score: 0.8,
          recommended_action: "revise"
        }
      ]
    });
    expect(JSON.stringify(capturedInput!.revision_brief)).not.toContain("[FIX REQUEST]");
    expect(primaryAgent).toHaveBeenCalledTimes(1);
    expect(runSingleVerifier).toHaveBeenCalledTimes(1);
    expect(runSingleVerifier).toHaveBeenCalledWith(
      "grounding",
      expect.objectContaining({ draft: expect.objectContaining({ answer: "Fixed." }) })
    );
  });

  it("buildPrompt includes revision_brief as structured internal context", () => {
    const revisionBrief: RevisionBrief = {
      original_user_message: "Is this claim novel?",
      current_answer: "Original answer.",
      pass_index: 2,
      requirements: [
        {
          verifier_name: "grounding",
          issue_type: "test_issue",
          rationale: "Test rationale.",
          recommended_action: "revise",
          optional_rewritten_guidance: "Stay grounded in the cited evidence."
        }
      ]
    };

    const prompt = JSON.parse(
      buildPrompt({
        ...baseInput,
        revision_brief: revisionBrief
      })
    ) as {
      task: { mode: string; user_message: string };
      revision_brief?: RevisionBrief;
    };

    expect(prompt.task.user_message).toBe("Is this claim novel?");
    expect(prompt.revision_brief).toEqual(revisionBrief);
    expect(JSON.stringify(prompt)).not.toContain("[FIX REQUEST]");
    expect(JSON.stringify(prompt)).toContain("revision pass");
    expect(JSON.stringify(prompt)).toContain("amend the current answer");
  });

  it("recheck judgment replaces original failure in judgments_after_fix", async () => {
    const originalFailure = makeJudgment("grounding", "fail", 0.85);
    const recheckJudgment: VerifierJudgment = {
      ...makeJudgment("grounding", "warn", 0.4),
      rationale: "Partially improved."
    };

    const primaryAgent = vi.fn().mockResolvedValue({
      draft: makeRevisedDraft("Somewhat fixed."),
      runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
    });

    const runSingleVerifier = vi.fn().mockResolvedValue(recheckJudgment);

    const judgments = [
      originalFailure,
      ...makePassJudgments().filter((j) => j.verifier_name !== "grounding")
    ];

    const result = await runFixLoop(
      initialDraft,
      judgments,
      baseInput,
      primaryAgent,
      runSingleVerifier
    );

    const groundingJudgment = result.judgments_after_fix.find(
      (j) => j.verifier_name === "grounding"
    );

    expect(groundingJudgment).toBeDefined();
    expect(groundingJudgment!.verdict).toBe("warn");
    expect(groundingJudgment!.rationale).toBe("Partially improved.");
    // Original fail verdict should no longer be present
    expect(groundingJudgment!.verdict).not.toBe("fail");
  });

  it("falls back to a deterministic clarification rewrite when the model ignores an action fix request", async () => {
    const actionDraft: PrimaryAgentDraft = {
      ...initialDraft,
      answer: "I can send that email now.",
      proposed_actions: [
        {
          type: "send_email",
          target: "professor@example.edu",
          details: "Draft or send an email on the student's behalf.",
          requires_confirmation: true
        }
      ]
    };

    const unchangedPrimaryAgent = vi.fn().mockResolvedValue({
      draft: actionDraft,
      runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
    });

    const actionFailure: VerifierJudgment = {
      verifier_name: "action",
      verdict: "warn",
      risk_score: 0.62,
      issue_type: "action_requires_confirmation",
      rationale: "The action should not proceed without confirmation of recipient and intent.",
      evidence_refs: [],
      recommended_action: "ask_clarifying_question",
      optional_rewritten_guidance:
        "Ask the user to confirm the recipient, whether the attachment is present, and whether they want a draft or a send-ready message."
    };

    const runSingleVerifier = vi.fn().mockImplementation(async (_name, verifierInput: VerifierInput) => {
      const revisedAnswer = verifierInput.draft.answer.toLowerCase();
      if (revisedAnswer.includes("i need one detail to answer well") && revisedAnswer.includes("?")) {
        return {
          ...actionFailure,
          verdict: "pass",
          risk_score: 0.08,
          issue_type: "awaiting_confirmation",
          recommended_action: "allow",
          rationale: "The draft safely asks for confirmation before proceeding."
        };
      }

      return actionFailure;
    });

    const result = await runFixLoop(
      actionDraft,
      [actionFailure],
      {
        ...baseInput,
        user_message: "Draft an email to my professor saying I attached my literature review and I am submitting it now.",
        draft: actionDraft
      },
      unchangedPrimaryAgent,
      runSingleVerifier
    );

    expect(result.final_draft.answer).toContain("I can help draft that.");
    expect(result.final_draft.answer).toContain("I need one detail to answer well");
    expect(result.judgments_after_fix[0]?.verdict).toBe("pass");
  });

  it("rewrites meta-guidance into a user-facing clarification question before recheck", async () => {
    const actionDraft: PrimaryAgentDraft = {
      ...initialDraft,
      answer: "Original answer.",
      proposed_actions: [
        {
          type: "send_email",
          target: "professor@example.edu",
          details: "Draft or send an email on the student's behalf.",
          requires_confirmation: true
        }
      ]
    };

    const metaGuidanceDraft: PrimaryAgentDraft = {
      ...actionDraft,
      answer:
        "Do not assume the email is ready to send. Ask the user to confirm the recipient, whether the attachment is present, and whether they want a draft or a send-ready message?"
    };

    const primaryAgent = vi.fn().mockResolvedValue({
      draft: metaGuidanceDraft,
      runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
    });

    const actionFailure: VerifierJudgment = {
      verifier_name: "action",
      verdict: "warn",
      risk_score: 0.62,
      issue_type: "action_requires_confirmation",
      rationale: "The action should not proceed without confirmation of recipient and intent.",
      evidence_refs: [],
      recommended_action: "ask_clarifying_question",
      optional_rewritten_guidance:
        "Ask the user to confirm the recipient, whether the attachment is present, and whether they want a draft or a send-ready message."
    };

    const runSingleVerifier = vi.fn().mockResolvedValue({
      ...actionFailure,
      verdict: "pass",
      risk_score: 0.08,
      issue_type: "awaiting_confirmation",
      recommended_action: "allow",
      rationale: "The draft safely asks for confirmation before proceeding."
    });

    const result = await runFixLoop(
      actionDraft,
      [actionFailure],
      {
        ...baseInput,
        user_message: "Draft an email to my professor saying I attached my literature review and I am submitting it now.",
        draft: actionDraft
      },
      primaryAgent,
      runSingleVerifier
    );

    expect(result.final_draft.answer).toContain("I can help draft that.");
    expect(result.final_draft.answer).not.toContain("Ask the user");
  });

  it("does not hardcode a literature review when the attachment subject is unrelated", async () => {
    const actionDraft: PrimaryAgentDraft = {
      ...initialDraft,
      answer: "Original answer.",
      proposed_actions: [
        {
          type: "send_email",
          target: "support@example.edu",
          details: "Draft or send an email on the student's behalf.",
          requires_confirmation: true
        }
      ]
    };

    const primaryAgent = vi.fn().mockResolvedValue({
      draft: actionDraft,
      runtime: { backend: "mock", agent: "primary", session_id: "s", degraded: false }
    });

    const actionFailure: VerifierJudgment = {
      verifier_name: "action",
      verdict: "warn",
      risk_score: 0.62,
      issue_type: "action_requires_confirmation",
      rationale: "The action should not proceed without confirmation of recipient and intent.",
      evidence_refs: [],
      recommended_action: "ask_clarifying_question",
      optional_rewritten_guidance:
        "Ask the user to confirm the recipient, whether the attachment is present, and whether they want a draft or a send-ready message."
    };

    const runSingleVerifier = vi.fn().mockResolvedValue({
      ...actionFailure,
      verdict: "pass",
      risk_score: 0.08,
      issue_type: "awaiting_confirmation",
      recommended_action: "allow",
      rationale: "The draft safely asks for confirmation before proceeding."
    });

    const result = await runFixLoop(
      actionDraft,
      [actionFailure],
      {
        ...baseInput,
        user_message: "Email support and tell them I attached the budget spreadsheet.",
        draft: actionDraft
      },
      primaryAgent,
      runSingleVerifier
    );

    expect(result.final_draft.answer).not.toContain("literature review");
    expect(result.final_draft.answer).toContain("attachment");
  });
});
