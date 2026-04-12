import { describe, it, expect, vi, beforeEach } from "vitest";

import type { CompanionPipelineResult } from "../src/lib/companion/contracts";
import { computeScoreReport } from "../src/lib/companion/harness/score";
import { validateRunArtifact, type RunArtifact } from "../src/lib/companion/harness/artifacts";

// ── helpers ──────────────────────────────────────────────────────────────────

function makePipelineResult(
  overrides: Partial<CompanionPipelineResult> = {}
): CompanionPipelineResult {
  return {
    request_id: "req-001",
    session_id: "sess-001",
    mode: "research",
    inhibitor: { blocked: false, reasons: [], raw: {} },
    evidence: [],
    draft: null,
    runtime: { backend: "test", agent: "test-agent", session_id: "sess-001", degraded: false },
    judgments: [],
    decision: {
      decision: "allow",
      blocking_reasons: [],
      revision_notes: [],
      verifier_summary: [],
    },
    synthesis: { final_answer: "ok", citations: [], uncertainty_notes: [] },
    audit_trail: [],
    process_events: [],
    ...overrides,
  };
}

function makeValidArtifact(overrides: Partial<RunArtifact> = {}): RunArtifact {
  return {
    run_id: "run-001",
    session_id: "sess-001",
    candidate_id: "cand-abc",
    created_at: new Date().toISOString(),
    mode: "research",
    score: {
      correctness: 1,
      retrieval: 0.5,
      cost: 1,
      human_collaboration: 1,
      composite: 0.9,
    },
    verifier_scores: {},
    decision: "allow",
    inhibitor_blocked: false,
    evidence_count: 2,
    degraded: false,
    ...overrides,
  };
}

// ── computeScoreReport tests ──────────────────────────────────────────────────

describe("computeScoreReport", () => {
  it("returns composite near 1.0 when all verifiers pass", () => {
    const result = makePipelineResult({
      evidence: [
        { id: "e1", title: "E1", source_type: "local_corpus", snippet: "", url: "", score: 0.9 },
        { id: "e2", title: "E2", source_type: "local_corpus", snippet: "", url: "", score: 0.8 },
        { id: "e3", title: "E3", source_type: "openalex", snippet: "", url: "", score: 0.7 },
        { id: "e4", title: "E4", source_type: "openalex", snippet: "", url: "", score: 0.6 },
      ],
      judgments: [
        {
          verifier_name: "grounding",
          verdict: "pass",
          risk_score: 0.0,
          issue_type: "none",
          rationale: "",
          evidence_refs: [],
          recommended_action: "allow",
        },
        {
          verifier_name: "privacy_policy",
          verdict: "pass",
          risk_score: 0.0,
          issue_type: "none",
          rationale: "",
          evidence_refs: [],
          recommended_action: "allow",
        },
      ],
    });

    const report = computeScoreReport(result);

    // No failing verifiers → correctness = 1.0
    expect(report.correctness).toBe(1.0);
    // 4 evidence items → retrieval = min(4/4, 1) = 1.0
    expect(report.retrieval).toBe(1.0);
    expect(report.cost).toBe(1.0);
    // No blocking, no revision → human_collaboration = 1.0
    expect(report.human_collaboration).toBe(1.0);
    // composite = 1*0.5 + 1*0.2 + 1*0.3 = 1.0
    expect(report.composite).toBeCloseTo(1.0, 5);
  });

  it("lowers correctness when privacy_policy fails with risk 0.9", () => {
    const result = makePipelineResult({
      judgments: [
        {
          verifier_name: "privacy_policy",
          verdict: "fail",
          risk_score: 0.9,
          issue_type: "privacy",
          rationale: "",
          evidence_refs: [],
          recommended_action: "block_action",
        },
        {
          verifier_name: "grounding",
          verdict: "pass",
          risk_score: 0.1,
          issue_type: "none",
          rationale: "",
          evidence_refs: [],
          recommended_action: "allow",
        },
      ],
    });

    const report = computeScoreReport(result);

    // Only privacy_policy failed with risk 0.9 → correctness = 1 - 0.9 = 0.1
    expect(report.correctness).toBeCloseTo(0.1, 5);
    expect(report.composite).toBeLessThan(0.5);
  });

  it("sets human_collaboration to 0 when decision is block_action", () => {
    const result = makePipelineResult({
      decision: {
        decision: "block_action",
        blocking_reasons: ["unsafe content"],
        revision_notes: [],
        verifier_summary: [],
      },
    });

    const report = computeScoreReport(result);
    expect(report.human_collaboration).toBe(0);
  });

  it("sets human_collaboration to 0.5 when revision_notes present and decision is revise", () => {
    const result = makePipelineResult({
      decision: {
        decision: "revise",
        blocking_reasons: [],
        revision_notes: ["please rewrite"],
        verifier_summary: [],
      },
    });

    const report = computeScoreReport(result);
    expect(report.human_collaboration).toBe(0.5);
  });

  it("sets retrieval to 0 when evidence is empty", () => {
    const result = makePipelineResult({ evidence: [] });
    const report = computeScoreReport(result);
    expect(report.retrieval).toBe(0);
  });

  it("caps retrieval at 1.0 for large evidence counts", () => {
    const evidence = Array.from({ length: 8 }, (_, i) => ({
      id: `e${i}`,
      title: `E${i}`,
      source_type: "local_corpus" as const,
      snippet: "",
      url: "",
      score: 0.5,
    }));
    const result = makePipelineResult({ evidence });
    const report = computeScoreReport(result);
    expect(report.retrieval).toBe(1.0);
  });
});

// ── validateRunArtifact tests ─────────────────────────────────────────────────

describe("validateRunArtifact", () => {
  it("returns null for missing run_id", () => {
    const artifact = makeValidArtifact();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { run_id, ...rest } = artifact as any;
    void run_id;
    expect(validateRunArtifact(rest)).toBeNull();
  });

  it("returns null for null input", () => {
    expect(validateRunArtifact(null)).toBeNull();
  });

  it("returns null for non-object input", () => {
    expect(validateRunArtifact("string")).toBeNull();
    expect(validateRunArtifact(42)).toBeNull();
  });

  it("returns null when run_id is not a string", () => {
    const artifact = makeValidArtifact({ run_id: 123 as unknown as string });
    expect(validateRunArtifact(artifact)).toBeNull();
  });

  it("returns the artifact for a valid input", () => {
    const artifact = makeValidArtifact();
    const result = validateRunArtifact(artifact);
    expect(result).not.toBeNull();
    expect(result?.run_id).toBe("run-001");
    expect(result?.session_id).toBe("sess-001");
    expect(result?.mode).toBe("research");
  });

  it("returns null when a required field is null", () => {
    const artifact = makeValidArtifact({ evidence_count: null as unknown as number });
    expect(validateRunArtifact(artifact)).toBeNull();
  });
});

// ── runSessionBenchmark tests ─────────────────────────────────────────────────

describe("runSessionBenchmark", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("calls runEvaluationHarness and returns a BenchmarkResult with pass_rate between 0 and 1", async () => {
    vi.mock("../src/lib/companion/eval/harness", () => ({
      runEvaluationHarness: vi.fn().mockResolvedValue({
        summary: { total_scenarios: 12, expectation_matches: 9 },
        results: [],
      }),
    }));

    vi.mock("node:fs/promises", () => ({
      mkdir: vi.fn().mockResolvedValue(undefined),
      appendFile: vi.fn().mockResolvedValue(undefined),
      readFile: vi.fn().mockResolvedValue(""),
    }));

    const { runSessionBenchmark } = await import(
      "../src/lib/companion/harness/benchmark"
    );

    const pipelineResult = makePipelineResult();
    const result = await runSessionBenchmark(pipelineResult);

    expect(result.pass_rate).toBeGreaterThanOrEqual(0);
    expect(result.pass_rate).toBeLessThanOrEqual(1);
    expect(result.pass_rate).toBeCloseTo(9 / 12, 5);
    expect(result.total_scenarios).toBe(12);
    expect(result.scenario_matches).toBe(9);
    expect(result.session_id).toBe("sess-001");
    expect(result.run_id).toBe("req-001");
    expect(result.run_artifact).toBeDefined();
    expect(result.run_artifact.mode).toBe("research");
  });
});
