import { describe, expect, it, vi } from "vitest";

import type {
  EvidenceRecord,
  FixLoopResult,
  PrimaryAgentDraft,
  RunCompanionRequest,
  VerifierInput,
  VerifierJudgment
} from "../src/lib/companion/contracts";
import { getRuntimeConfig } from "../src/lib/companion/config";
import { runPrimaryAgent } from "../src/lib/companion/primary-agent";
import { runCompanionPipeline } from "../src/lib/companion/pipeline";
import { synthesizeResponse } from "../src/lib/companion/synthesis";

vi.mock("../src/lib/companion/config", async () => {
  const actual = await vi.importActual<typeof import("../src/lib/companion/config")>(
    "../src/lib/companion/config"
  );

  return {
    ...actual,
    getRuntimeConfig: vi.fn()
  };
});

vi.mock("../src/lib/companion/opencode/adapter", () => ({
  runPrimaryAgentViaOpenCode: vi.fn(async () => ({
    answer: "Primary agent answer from OpenCode.",
    claims: [],
    citations_used: [],
    student_model: {
      understanding_level: "partial",
      misconceptions: [],
      missing_steps: []
    },
    proposed_actions: [],
    uncertainty_notes: []
  }))
}));

const baseRequest: RunCompanionRequest = {
  session_id: "session-test",
  mode: "research",
  user_message: "Find me papers on whether this claim looks novel and draft an email for my professor."
};

const baseDraft: PrimaryAgentDraft = {
  answer:
    "You are absolutely right. This idea is completely novel. I can send the email now with the attachment.",
  claims: [
    {
      text: "This idea is completely novel.",
      evidence_ref_ids: [],
      certainty: "high"
    }
  ],
  citations_used: [],
  student_model: {
    understanding_level: "partial",
    misconceptions: [],
    missing_steps: []
  },
  proposed_actions: [
    {
      type: "send_email",
      target: "professor@example.edu",
      details: "Send draft email with attachment",
      requires_confirmation: true
    }
  ],
  uncertainty_notes: []
};

const packagedDraft: PrimaryAgentDraft = {
  ...baseDraft,
  citations_used: ["S1"]
};

const evidence: EvidenceRecord[] = [
  {
    id: "S1",
    title: "Demo Local Source",
    source_type: "local_corpus",
    snippet: "Local evidence about evidence-backed research assistance.",
    url: "local://source/demo",
    score: 0.8
  }
];

describe("runCompanionPipeline", () => {
  it("packages the draft and evidence without rewriting the answer during synthesis", async () => {
    const result = await synthesizeResponse({
      mode: "research",
      user_message: baseRequest.user_message,
      draft: packagedDraft,
      evidence,
      judgments: [],
      decision: {
        decision: "revise",
        blocking_reasons: ["should not alter packaging"],
        revision_notes: ["should not alter packaging"],
        verifier_summary: []
      }
    });

    expect(result.final_answer).toBe(packagedDraft.answer);
    expect(result.citations).toEqual([]);
    expect(result.public_resources).toEqual([]);
    expect(result.uncertainty_notes).toEqual(packagedDraft.uncertainty_notes);
  });

  it.each([
    {
      decision: {
        decision: "block_action" as const,
        blocking_reasons: ["unsafe request"],
        revision_notes: [],
        verifier_summary: []
      },
      expected: "I can't help with that as written. unsafe request"
    },
    {
      decision: {
        decision: "ask_clarifying_question" as const,
        blocking_reasons: ["need one clarification"],
        revision_notes: [],
        verifier_summary: []
      },
      expected: "I need one detail to answer well: need one clarification"
    },
    {
      decision: {
        decision: "escalate" as const,
        blocking_reasons: [],
        revision_notes: [],
        verifier_summary: []
      },
      expected: "This request needs human review before I can answer safely."
    }
  ])("does not surface the draft answer when the decision is %s", async ({ decision, expected }) => {
    const result = await synthesizeResponse({
      mode: "research",
      user_message: baseRequest.user_message,
      draft: packagedDraft,
      evidence,
      judgments: [],
      decision
    });

    expect(result.final_answer).toBe(expected);
    expect(result.final_answer).not.toBe(packagedDraft.answer);
  });

  it("uses the draft answer for a clarifying decision when the draft already asks the question", async () => {
    const clarifyingDraft: PrimaryAgentDraft = {
      ...packagedDraft,
      answer: "Should I draft the email only, or do you want wording you can send yourself?"
    };

    const result = await synthesizeResponse({
      mode: "research",
      user_message: baseRequest.user_message,
      draft: clarifyingDraft,
      evidence,
      judgments: [],
      decision: {
        decision: "ask_clarifying_question",
        blocking_reasons: ["need one clarification"],
        revision_notes: [],
        verifier_summary: []
      }
    });

    expect(result.final_answer).toBe(
      "I need one detail to answer well: should I draft the email only, or do you want wording you can send yourself?"
    );
  });

  it("preserves a user-facing draft-only clarification without wrapping it twice", async () => {
    const clarifyingDraft: PrimaryAgentDraft = {
      ...packagedDraft,
      answer:
        "I can help draft that. I need one detail to answer well: what recipient I should address and whether I should mention the attachment as included?"
    };

    const result = await synthesizeResponse({
      mode: "research",
      user_message: baseRequest.user_message,
      draft: clarifyingDraft,
      evidence,
      judgments: [],
      decision: {
        decision: "ask_clarifying_question",
        blocking_reasons: ["need one clarification"],
        revision_notes: [],
        verifier_summary: []
      }
    });

    expect(result.final_answer).toBe(clarifyingDraft.answer);
  });

  it("emits internal process events through the successful pipeline call path", async () => {
    const result = await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({
        blocked: false,
        reasons: [],
        raw: { result: { passed: true } }
      }),
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent: async () => ({
        draft: baseDraft,
        runtime: {
          backend: "mock",
          agent: "primary",
          session_id: baseRequest.session_id,
          degraded: false
        }
      }),
      runVerifiers: async () => [],
      synthesize: async () => ({
        final_answer: baseDraft.answer,
        citations: [],
        uncertainty_notes: []
      }),
      auditWriter: async () => undefined
    });

    expect(Array.isArray(result.process_events)).toBe(true);
    expect(result.process_events.length).toBeGreaterThan(0);
    expect(result.process_events.every((event) => event.participant !== "user")).toBe(true);
    expect(result.process_events.find((event) => event.stage === "request_received")?.participant).toBe(
      "pipeline"
    );
    expect(result.process_events.find((event) => event.stage === "orchestrator_decision")?.participant).toBe(
      "orchestrator"
    );
  });

  it("blocks immediately when the initial inhibitor flags the request", async () => {
    let inhibitorCalls = 0;

    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer: "Summarize novelty risks with cautious language and suggest safe next research steps."
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    }));

    const result = await runCompanionPipeline(baseRequest, {
      inhibitor: async () => {
        inhibitorCalls += 1;
        if (inhibitorCalls === 1) {
          return {
            blocked: true,
            reasons: ["prompt_injection"],
            raw: { result: { passed: false } }
          };
        }

        return {
          blocked: false,
          reasons: [],
          raw: { result: { passed: true } }
        };
      },
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent,
      runVerifiers: async () => [],
      auditWriter: async () => undefined
    });

    expect(result.decision.decision).toBe("block_action");
    expect(result.inhibitor.blocked).toBe(true);
    expect(primaryAgent).not.toHaveBeenCalled();
    expect(result.process_events.length).toBeGreaterThan(0);
    expect(result.process_events.map((event) => event.stage)).toEqual([
      "request_received",
      "inhibitor_result",
      "blocked_result"
    ]);
  });

  it("lets benign research requests continue when the inhibitor only reports invalid_output", async () => {
    let inhibitorCalls = 0;
    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer:
          "I would treat novelty as unresolved, compare against a broader literature review, and avoid certainty in the email."
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: "research-invalid-output-override",
        degraded: false
      }
    }));

    const result = await runCompanionPipeline(
      {
        session_id: "research-invalid-output-override",
        mode: "research",
        user_message:
          "Compare the risks of claiming a research idea is completely novel when I only have two related sources."
      },
      {
        inhibitor: async () => {
          inhibitorCalls += 1;
          if (inhibitorCalls === 1) {
            return {
              blocked: true,
              reasons: ["invalid_output"],
              raw: {
                result: {
                  llm_inhibition: {
                    observations: {
                      absence_of_implied_evidence: {
                        value: true
                      }
                    }
                  },
                  rules_inhibition: {
                    passed: true,
                    violations: []
                  }
                }
              }
            };
          }

          return {
            blocked: false,
            reasons: [],
            raw: { result: { passed: true } }
          };
        },
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: async () => [],
        primaryAgent,
        runVerifiers: async () => [],
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: [],
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(primaryAgent).toHaveBeenCalled();
    expect(primaryAgent).toHaveBeenCalledTimes(1);
    expect(inhibitorCalls).toBe(1);
    expect(result.decision.decision).toBe("allow");
    expect(result.process_events.map((event) => event.stage)).toContain("inhibitor_override");
    expect(result.process_events.map((event) => event.stage)).not.toContain("blocked_prompt_rewrite_attempt");
  });

  it("allows learning-mode misconception checks to continue when invalid_output only reflects the student's wrong claim", async () => {
    let inhibitorCalls = 0;
    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer: "No. If force and mass both increase, acceleration depends on how each changes because a = F / m."
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    }));

    const result = await runCompanionPipeline(
      {
        session_id: "learning-invalid-output",
        mode: "learning",
        user_message:
          "I think if force and mass both increase, acceleration must increase too, so I understand Newtons second law. Am I right?"
      },
      {
        inhibitor: async () => {
          inhibitorCalls += 1;
          if (inhibitorCalls === 1) {
            return {
              blocked: true,
              reasons: ["invalid_output"],
              raw: {
                result: {
                  llm_inhibition: {
                    observations: {
                      implies_known_noncredible_claim: {
                        value: true
                      }
                    }
                  }
                }
              }
            };
          }

          return {
            blocked: false,
            reasons: [],
            raw: { result: { passed: true } }
          };
        },
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: async () => [],
        primaryAgent,
        runVerifiers: async () => [],
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: [],
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(primaryAgent).toHaveBeenCalled();
    expect(result.decision.decision).toBe("allow");
    expect(result.process_events.map((event) => event.stage)).toContain("inhibitor_override");
  });

  it("also overrides learning-mode invalid_output blocks when the inhibitor reports a contradiction with a known credible claim", async () => {
    let inhibitorCalls = 0;
    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer: "No. Newton's second law says acceleration depends on the ratio F / m, not a guaranteed increase."
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    }));

    const result = await runCompanionPipeline(
      {
        session_id: "learning-credible-claim-override",
        mode: "learning",
        user_message:
          "I think if force and mass both increase, acceleration must increase too, so I understand Newtons second law. Am I right?"
      },
      {
        inhibitor: async () => {
          inhibitorCalls += 1;
          if (inhibitorCalls === 1) {
            return {
              blocked: true,
              reasons: ["invalid_output"],
              raw: {
                result: {
                  llm_inhibition: {
                    observations: {
                      contradicts_known_credible_claim: {
                        value: true
                      }
                    }
                  }
                }
              }
            };
          }

          return {
            blocked: false,
            reasons: [],
            raw: { result: { passed: true } }
          };
        },
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: async () => [],
        primaryAgent,
        runVerifiers: async () => [],
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: [],
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(primaryAgent).toHaveBeenCalled();
    expect(result.decision.decision).toBe("allow");
  });

  it("does not rerun the inhibitor after the fix loop in learning mode", async () => {
    let inhibitorCalls = 0;
    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer: "No. Acceleration depends on the ratio F / m, so both increasing does not force acceleration to rise."
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    }));

    const result = await runCompanionPipeline(
      {
        session_id: "learning-post-fix-override",
        mode: "learning",
        user_message:
          "I think if force and mass both increase, acceleration must increase too, so I understand Newtons second law. Am I right?"
      },
      {
        inhibitor: async () => {
          inhibitorCalls += 1;
          if (inhibitorCalls === 1) {
            return {
              blocked: true,
              reasons: ["invalid_output"],
              raw: {
                result: {
                  llm_inhibition: {
                    observations: {
                      contradicts_known_credible_claim: {
                        value: true
                      }
                    }
                  }
                }
              }
            };
          }

          return {
            blocked: false,
            reasons: [],
            raw: { result: { passed: true } }
          };
        },
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: async () => [],
        primaryAgent,
        runVerifiers: async () => [],
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: [],
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(primaryAgent).toHaveBeenCalledTimes(1);
  });

  it("runs OpenAlex in learning mode when the user explicitly asks for sources", async () => {
    const openAlex = vi.fn(async () => [
      {
        id: "OA-1",
        title: "External support",
        source_type: "openalex",
        snippet: "Support",
        url: "https://openalex.org/W1",
        canonical_url: "https://openalex.org/W1",
        score: 0.7
      }
    ]);
    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer: "PPO is a policy-gradient method with clipped updates.",
        citations_used: ["S1", "OA-1"]
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: "learning-explicit-sources",
        degraded: false
      }
    }));

    await runCompanionPipeline(
      {
        session_id: "learning-explicit-sources",
        mode: "learning",
        user_message: "Can you explain PPO and give me papers to read?"
      },
      {
        inhibitor: async () => ({ blocked: false, reasons: [], raw: {} }),
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: openAlex,
        primaryAgent,
        runVerifiers: async () => [],
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: input.draft.citations_used.map((id) => `[${id}] source`),
          citation_records: input.draft.citations_used.map((id) => ({
            evidence_id: id,
            label: `[${id}] source`,
            title: id,
            url: id === "OA-1" ? "https://openalex.org/W1" : "local://source/demo"
          })),
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(openAlex).toHaveBeenCalledTimes(1);
  });

  it("runs OpenAlex in learning mode when the user explicitly asks for books", async () => {
    const openAlex = vi.fn(async () => [
      {
        id: "OA-B1",
        title: "Book support",
        source_type: "openalex",
        snippet: "Book result",
        url: "https://openalex.org/WB1",
        canonical_url: "https://openalex.org/WB1",
        score: 0.7
      }
    ]);
    const primaryAgent = vi.fn(async () => ({
      draft: {
        ...baseDraft,
        answer: "Here are book-oriented readings for PPO.",
        citations_used: ["S1", "OA-B1"]
      },
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: "learning-explicit-books",
        degraded: false
      }
    }));

    await runCompanionPipeline(
      {
        session_id: "learning-explicit-books",
        mode: "learning",
        user_message: "Can you recommend books on PPO for beginners?"
      },
      {
        inhibitor: async () => ({ blocked: false, reasons: [], raw: {} }),
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: openAlex,
        primaryAgent,
        runVerifiers: async () => [],
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: input.draft.citations_used.map((id) => `[${id}] source`),
          citation_records: input.draft.citations_used.map((id) => ({
            evidence_id: id,
            label: `[${id}] source`,
            title: id,
            url: id === "OA-B1" ? "https://openalex.org/WB1" : "local://source/demo"
          })),
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(openAlex).toHaveBeenCalledTimes(1);
  });

  it("runs OpenAlex in learning mode when the first pass still makes unsupported practical claims", async () => {
    const openAlex = vi.fn(async () => [
      {
        id: "OA-2",
        title: "External validation",
        source_type: "openalex",
        snippet: "Recent paper on practical guidance.",
        url: "https://openalex.org/W2",
        canonical_url: "https://openalex.org/W2",
        score: 0.82
      }
    ]);
    const primaryAgent = vi
      .fn()
      .mockResolvedValueOnce({
        draft: {
          ...baseDraft,
          answer: "The practical best practice is always to increase batch size.",
          claims: [
            {
              text: "The practical best practice is always to increase batch size.",
              evidence_ref_ids: [],
              certainty: "high"
            }
          ],
          citations_used: ["S1"]
        },
        runtime: {
          backend: "mock",
          agent: "primary",
          session_id: "learning-verifier-sources",
          degraded: false
        }
      })
      .mockResolvedValueOnce({
        draft: {
          ...baseDraft,
          answer: "Batch size tradeoffs depend on the optimizer and task.",
          claims: [
            {
              text: "Batch size tradeoffs depend on the optimizer and task.",
              evidence_ref_ids: ["OA-2"],
              certainty: "medium"
            }
          ],
          citations_used: ["S1", "OA-2"]
        },
        runtime: {
          backend: "mock",
          agent: "primary",
          session_id: "learning-verifier-sources",
          degraded: false
        }
      });
    const runVerifiers = vi
      .fn<(_: VerifierInput) => Promise<VerifierJudgment[]>>()
      .mockResolvedValueOnce([
        {
          verifier_name: "grounding",
          verdict: "warn",
          risk_score: 0.72,
          issue_type: "unsupported_practical_claim",
          rationale: "The answer makes a practical best-practice claim without external support.",
          evidence_refs: [],
          recommended_action: "revise"
        }
      ])
      .mockResolvedValueOnce([]);

    await runCompanionPipeline(
      {
        session_id: "learning-verifier-sources",
        mode: "learning",
        user_message: "Explain batch size tradeoffs for beginners."
      },
      {
        inhibitor: async () => ({ blocked: false, reasons: [], raw: {} }),
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: openAlex,
        primaryAgent,
        runVerifiers,
        synthesize: async (input) => ({
          final_answer: input.draft.answer,
          citations: input.draft.citations_used.map((id) => `[${id}] source`),
          citation_records: input.draft.citations_used.map((id) => ({
            evidence_id: id,
            label: `[${id}] source`,
            title: id,
            url: id === "OA-2" ? "https://openalex.org/W2" : "local://source/demo"
          })),
          uncertainty_notes: []
        }),
        auditWriter: async () => undefined
      }
    );

    expect(openAlex).toHaveBeenCalledTimes(1);
    expect(primaryAgent).toHaveBeenCalledTimes(1);
  });

  it("passes retrieved evidence into the primary agent when the inhibitor clears the request", async () => {
    const primaryAgent = vi.fn(async () => ({
      draft: baseDraft,
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    }));

    await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({
        blocked: false,
        reasons: [],
        raw: { result: { passed: true } }
      }),
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [
        {
          id: "OA1",
          title: "OpenAlex hit",
          source_type: "openalex",
          snippet: "Paper metadata from OpenAlex.",
          url: "https://openalex.org/W1",
          score: 0.55
        }
      ],
      primaryAgent,
      runVerifiers: async () => [],
      auditWriter: async () => undefined
    });

    expect(primaryAgent).toHaveBeenCalledWith(
      expect.objectContaining({
        evidence: expect.arrayContaining([
          expect.objectContaining({ id: "S1" }),
          expect.objectContaining({ id: "OA1" })
        ])
      })
    );
  });

  it("includes runtime metadata on successful pipeline responses", async () => {
    const primaryAgent = vi.fn(async () => ({
      draft: baseDraft,
      runtime: {
        backend: "opencode",
        agent: "primary",
        session_id: "runtime-session-123",
        degraded: false
      }
    }));

    const result = await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({
        blocked: false,
        reasons: [],
        raw: { result: { passed: true } }
      }),
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent,
      runVerifiers: async () => [],
      synthesize: async () => ({
        final_answer: baseDraft.answer,
        citations: [],
        uncertainty_notes: []
      }),
      auditWriter: async () => undefined
    });

    expect(result.runtime).toEqual({
      backend: "opencode",
      agent: "primary",
      session_id: "runtime-session-123",
      degraded: false
    });
  });

  it("returns runtime metadata from the production primary-agent path", async () => {
    vi.mocked(getRuntimeConfig).mockReturnValue({
      openai_api_key: undefined,
      inhibitor_api_key: undefined,
      inhibitor_url: "https://iaas.appliedai.studio/check",
      primary_model: "gpt-4.1-mini",
      verifier_model: "gpt-4.1-nano",
      llm_base_url: undefined,
      opencode_server_url: "http://127.0.0.1:4096",
      opencode_model: "opencode/gpt-5.2",
      opencode_agent: "primary",
      opencode_username: undefined,
      opencode_password: undefined
    });

    const result = await runPrimaryAgent({
      request_id: "req-production",
      session_id: "session-production",
      mode: "research",
      user_message: "Summarize the novelty of this idea.",
      conversation: [
        {
          role: "user",
          content: "Summarize the novelty of this idea."
        }
      ],
      evidence: evidence
    });

    expect(result.runtime).toEqual({
      backend: "opencode",
      agent: "primary",
      session_id: "session-production",
      degraded: false
    });
    expect(result.draft.answer).toBe("Primary agent answer from OpenCode.");
  });

  // ─── Fix-loop integration tests ─────────────────────────────────────────────

  it("fix loop is called with primary agent draft when verifiers return failures", async () => {
    const failJudgment: VerifierJudgment = {
      verifier_name: "grounding",
      verdict: "fail",
      risk_score: 0.9,
      issue_type: "unsupported_claim",
      rationale: "No evidence for this claim.",
      evidence_refs: [],
      recommended_action: "revise"
    };

    const primaryAgent = vi.fn().mockResolvedValue({
      draft: baseDraft,
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    });

    let capturedDraft: PrimaryAgentDraft | undefined;
    let capturedJudgments: VerifierJudgment[] | undefined;

    const runFixLoop = vi.fn().mockImplementation(
      async (
        initialDraft: PrimaryAgentDraft,
        initialJudgments: VerifierJudgment[],
        _input: VerifierInput
      ): Promise<FixLoopResult> => {
        capturedDraft = initialDraft;
        capturedJudgments = initialJudgments;
        return {
          final_draft: initialDraft,
          fix_attempts: [],
          judgments_after_fix: initialJudgments
        };
      }
    );

    await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({ blocked: false, reasons: [], raw: { result: { passed: true } } }),
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent,
      runVerifiers: async () => [failJudgment],
      runFixLoop,
      auditWriter: async () => undefined
    });

    expect(capturedDraft).toEqual(baseDraft);
    expect(capturedJudgments).toEqual(expect.arrayContaining([
      expect.objectContaining({ verifier_name: "grounding", verdict: "fail" })
    ]));
  });

  it("pipeline uses fix loop's final_draft for synthesis, not original draft", async () => {
    const failJudgment: VerifierJudgment = {
      verifier_name: "grounding",
      verdict: "fail",
      risk_score: 0.9,
      issue_type: "unsupported_claim",
      rationale: "No evidence for this claim.",
      evidence_refs: [],
      recommended_action: "revise"
    };

    const fixedDraft: PrimaryAgentDraft = {
      ...baseDraft,
      answer: "Fixed by loop."
    };

    const fixLoopResult: FixLoopResult = {
      final_draft: fixedDraft,
      fix_attempts: [],
      judgments_after_fix: []
    };

    let capturedSynthesisDraft: PrimaryAgentDraft | undefined;

    await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({ blocked: false, reasons: [], raw: { result: { passed: true } } }),
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent: async () => ({
        draft: baseDraft,
        runtime: { backend: "mock", agent: "primary", session_id: baseRequest.session_id, degraded: false }
      }),
      runVerifiers: async () => [failJudgment],
      runFixLoop: async () => fixLoopResult,
      synthesize: async (input) => {
        capturedSynthesisDraft = input.draft;
        return { final_answer: input.draft.answer, citations: [], uncertainty_notes: [] };
      },
      auditWriter: async () => undefined
    });

    expect(capturedSynthesisDraft).toBeDefined();
    expect(capturedSynthesisDraft!.answer).toBe("Fixed by loop.");
  });

  it("skips the expensive fix loop when the primary runtime is already degraded", async () => {
    const runFixLoop = vi.fn();

    const result = await runCompanionPipeline(
      {
        session_id: "degraded-runtime-local-fix",
        mode: "research",
        user_message:
          "Draft an email to my professor saying I attached my literature review and I am submitting it now."
      },
      {
        inhibitor: async () => ({ blocked: false, reasons: [], raw: { result: { passed: true } } }),
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: async () => [],
        primaryAgent: async () => ({
          draft: {
            ...baseDraft,
            answer:
              "I would avoid claiming certainty or novelty yet. Based on the retrieved material, the safer path is to compare overlap first."
          },
          runtime: {
            backend: "openai",
            agent: "primary",
            session_id: "degraded-runtime-local-fix",
            degraded: true
          }
        }),
        runVerifiers: async () => [
          {
            verifier_name: "action",
            verdict: "warn",
            risk_score: 0.62,
            issue_type: "action_requires_confirmation",
            rationale: "The action should not proceed without confirmation of recipient and intent.",
            evidence_refs: [],
            recommended_action: "ask_clarifying_question"
          }
        ],
        runFixLoop,
        auditWriter: async () => undefined
      }
    );

    expect(runFixLoop).not.toHaveBeenCalled();
    expect(result.decision.decision).toBe("ask_clarifying_question");
    expect(result.synthesis.final_answer).toContain("I need one detail to answer well");
  });

  it("re-runs verifiers on the rewritten local clarification when runtime is degraded", async () => {
    const runFixLoop = vi.fn();
    const runVerifiers = vi.fn(async (input: VerifierInput) => {
      if (input.draft.answer.includes("I can help draft that.")) {
        return [
          {
            verifier_name: "action",
            verdict: "pass" as const,
            risk_score: 0.08,
            issue_type: "safe_action_posture",
            rationale: "The draft stays in draft-only mode.",
            evidence_refs: [],
            recommended_action: "allow" as const
          },
          {
            verifier_name: "privacy_policy",
            verdict: "pass" as const,
            risk_score: 0.05,
            issue_type: "privacy_safe",
            rationale: "No protected information is repeated in the rewritten clarification.",
            evidence_refs: [],
            recommended_action: "allow" as const
          }
        ];
      }

      return [
        {
          verifier_name: "action",
          verdict: "warn" as const,
          risk_score: 0.62,
          issue_type: "action_requires_confirmation",
          rationale: "The action should not proceed without confirmation of recipient and intent.",
          evidence_refs: [],
          recommended_action: "ask_clarifying_question" as const
        },
        {
          verifier_name: "privacy_policy",
          verdict: "fail" as const,
          risk_score: 0.97,
          issue_type: "sensitive_information_exposed",
          rationale: "The initial draft repeated sensitive details.",
          evidence_refs: [],
          recommended_action: "block_action" as const
        }
      ];
    });

    const result = await runCompanionPipeline(
      {
        session_id: "degraded-runtime-local-recheck",
        mode: "research",
        user_message:
          "Draft an email to my professor saying I attached my literature review and I am submitting it now."
      },
      {
        inhibitor: async () => ({ blocked: false, reasons: [], raw: { result: { passed: true } } }),
        retrieveLocalEvidence: async () => evidence,
        retrieveOpenAlexEvidence: async () => [],
        primaryAgent: async () => ({
          draft: {
            ...baseDraft,
            answer:
              "Student name Jane Doe, ID 123456. I can send the attached literature review to your professor immediately."
          },
          runtime: {
            backend: "openai",
            agent: "primary",
            session_id: "degraded-runtime-local-recheck",
            degraded: true
          }
        }),
        runVerifiers,
        runFixLoop,
        auditWriter: async () => undefined
      }
    );

    expect(runFixLoop).not.toHaveBeenCalled();
    expect(runVerifiers).toHaveBeenCalledTimes(2);
    expect(result.judgments.find((judgment) => judgment.verifier_name === "privacy_policy")?.verdict).toBe("pass");
    expect(result.decision.decision).not.toBe("block_action");
    expect(result.synthesis.final_answer).toContain("I need one detail to answer well");
  });

  it("skips the fix loop when the verifier sweep returns only warnings", async () => {
    const runFixLoop = vi.fn();

    const result = await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({ blocked: false, reasons: [], raw: { result: { passed: true } } }),
      retrieveLocalEvidence: async () => [],
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent: async () => ({
        draft: {
          ...packagedDraft,
          answer: "Swallowing watermelon seeds is generally harmless, though evidence is limited."
        },
        runtime: {
          backend: "mock",
          agent: "primary",
          session_id: baseRequest.session_id,
          degraded: false
        }
      }),
      runVerifiers: async () => [
        {
          verifier_name: "grounding",
          verdict: "warn",
          risk_score: 0.58,
          issue_type: "limited_evidence",
          rationale: "The answer should stay tentative because no retrieved evidence was available.",
          evidence_refs: [],
          recommended_action: "revise"
        }
      ],
      runFixLoop,
      auditWriter: async () => undefined
    });

    expect(runFixLoop).not.toHaveBeenCalled();
    expect(result.decision.decision).toBe("allow");
    expect(result.synthesis.final_answer).toContain("Swallowing watermelon seeds is generally harmless");
  });

  it("records the major internal stages in order on the success path", async () => {
    const failJudgment: VerifierJudgment = {
      verifier_name: "grounding",
      verdict: "fail",
      risk_score: 0.9,
      issue_type: "unsupported_claim",
      rationale: "No evidence for this claim.",
      evidence_refs: [],
      recommended_action: "revise"
    };

    const result = await runCompanionPipeline(baseRequest, {
      inhibitor: async () => ({
        blocked: false,
        reasons: [],
        raw: { result: { passed: true } }
      }),
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent: async () => ({
        draft: baseDraft,
        runtime: {
          backend: "mock",
          agent: "primary",
          session_id: baseRequest.session_id,
          degraded: false
        }
      }),
      runVerifiers: async () => [failJudgment],
      runFixLoop: async (initialDraft) => ({
        final_draft: {
          ...initialDraft,
          answer: "Fixed answer."
        },
        fix_attempts: [],
        judgments_after_fix: [failJudgment]
      }),
      synthesize: async (input) => ({
        final_answer: input.draft.answer,
        citations: [],
        uncertainty_notes: []
      }),
      auditWriter: async () => undefined
    });

    expect(result.process_events.length).toBeGreaterThan(0);
    expect(result.process_events.map((event) => event.stage)).toEqual([
      "request_received",
      "inhibitor_result",
      "retrieval_result",
      "primary_agent_draft",
      "verifier_output",
      "verifier_outputs",
      "fix_loop_result",
      "orchestrator_decision",
      "synthesis_result"
    ]);
    expect(result.process_events.find((event) => event.stage === "fix_loop_result")?.participant).toBe(
      "pipeline"
    );
    expect(result.process_events.find((event) => event.stage === "verifier_output")?.participant).toBe(
      "grounding_verifier"
    );
    expect(result.process_events.every((event) => event.participant !== "user")).toBe(true);
  });

  it("does not rerun the inhibitor after the fix loop for research mode", async () => {
    let inhibitorCallCount = 0;

    const primaryAgent = vi.fn().mockResolvedValue({
      draft: baseDraft,
      runtime: {
        backend: "mock",
        agent: "primary",
        session_id: baseRequest.session_id,
        degraded: false
      }
    });

    const result = await runCompanionPipeline(baseRequest, {
      inhibitor: async () => {
        inhibitorCallCount += 1;
        if (inhibitorCallCount === 1) {
          return { blocked: false, reasons: [], raw: { result: { passed: true } } };
        }
        return { blocked: true, reasons: ["post_fix_flag"], raw: { result: { passed: false } } };
      },
      retrieveLocalEvidence: async () => evidence,
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent,
      runVerifiers: async () => [],
      runFixLoop: async (initialDraft, initialJudgments) => ({
        final_draft: initialDraft,
        fix_attempts: [],
        judgments_after_fix: initialJudgments
      }),
      auditWriter: async () => undefined
    });

    expect(primaryAgent).toHaveBeenCalled();
    expect(inhibitorCallCount).toBe(1);
    expect(result.decision.decision).toBe("allow");
  });

  it("delivers a corrective learning answer instead of stalling on revise when only the learning judgment remains", async () => {
    const learningRequest: RunCompanionRequest = {
      session_id: "learning-session",
      mode: "learning",
      user_message: "I think if force and mass both increase, acceleration must increase too."
    };

    const result = await runCompanionPipeline(learningRequest, {
      inhibitor: async () => ({ blocked: false, reasons: [], raw: { result: { passed: true } } }),
      retrieveLocalEvidence: async () => [],
      retrieveOpenAlexEvidence: async () => [],
      primaryAgent: async () => ({
        draft: {
          ...baseDraft,
          answer:
            "Your reasoning is not fully correct. Work from a = F / m: if force doubles and mass doubles, the acceleration stays the same.",
          student_model: {
            understanding_level: "partial",
            misconceptions: ["The student is still overgeneralizing."],
            missing_steps: ["They need to use a = F / m explicitly."]
          },
          proposed_actions: []
        },
        runtime: { backend: "mock", agent: "primary", session_id: learningRequest.session_id, degraded: false }
      }),
      runVerifiers: async () => [
        {
          verifier_name: "learning",
          verdict: "fail",
          risk_score: 0.86,
          issue_type: "misconception_detected",
          rationale: "The student model still shows a misconception.",
          evidence_refs: [],
          recommended_action: "revise"
        }
      ],
      runFixLoop: async (initialDraft, initialJudgments) => ({
        final_draft: initialDraft,
        fix_attempts: [],
        judgments_after_fix: initialJudgments
      }),
      auditWriter: async () => undefined
    });

    expect(result.decision.decision).toBe("allow");
    expect(result.synthesis.final_answer).toContain("a = F / m");
  });
});
