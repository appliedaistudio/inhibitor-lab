import { randomUUID } from "node:crypto";

import { runCompanionPipeline } from "../pipeline";
import type { PrimaryAgentDraft, PrimaryAgentResult } from "../contracts";
import { createMemorySessionStore } from "../session-store";
import type { MaterializedBenchmarkExecution } from "./case-runner";
import type { MaterializedBenchmarkCase } from "./materialized";
import type { HarnessVariantId } from "./baseline";
import { runBenchmarkPlainAgent } from "./plain-agent";

const BENCHMARK_RUN_INSTANCE_ID = randomUUID();

function buildBenchmarkDraft(
  answer: string,
  benchmarkCase: MaterializedBenchmarkCase
): PrimaryAgentDraft {
  return {
    answer,
    claims: [
      {
        text: answer.split(".")[0]?.trim() || answer,
        evidence_ref_ids: benchmarkCase.evidence.slice(0, 3).map((item) => item.id),
        certainty: benchmarkCase.evidence.length > 0 ? "medium" : "low"
      }
    ],
    citations_used: benchmarkCase.evidence.slice(0, 3).map((item) => item.id),
    student_model: {
      understanding_level: benchmarkCase.mode === "learning" ? "partial" : "strong",
      misconceptions: [],
      missing_steps: []
    },
    proposed_actions: [],
    uncertainty_notes:
      benchmarkCase.evidence.length > 0
        ? []
        : ["No benchmark evidence was provided for this case, so the answer should remain tentative."]
  };
}

async function runBenchmarkPrimaryAgent(
  input: {
    session_id: string;
    revision_brief?: import("../contracts").RevisionBrief;
  },
  benchmarkCase: MaterializedBenchmarkCase,
  plainBenchmarkAgent: typeof runBenchmarkPlainAgent
): Promise<PrimaryAgentResult> {
  const result = await plainBenchmarkAgent({
    session_id: input.session_id,
    variant_id: "no_harness",
    benchmark_case: benchmarkCase,
    evidence: benchmarkCase.evidence,
    revision_brief: input.revision_brief
  });

  return {
    draft: buildBenchmarkDraft(result.answer, benchmarkCase),
    runtime: {
      backend: result.backend,
      agent: "benchmark_plain_agent",
      session_id: input.session_id,
      degraded: false
    }
  };
}

export interface ExecuteMaterializedBenchmarkCaseOptions {
  variantId: HarnessVariantId;
  benchmarkCase: MaterializedBenchmarkCase;
}

export interface MaterializedExecutorDependencies {
  runCompanionPipeline?: typeof runCompanionPipeline;
  runBenchmarkPlainAgent?: typeof runBenchmarkPlainAgent;
}

export async function executeMaterializedBenchmarkCase(
  options: ExecuteMaterializedBenchmarkCaseOptions,
  dependencies: MaterializedExecutorDependencies = {}
): Promise<MaterializedBenchmarkExecution> {
  const startedAt = Date.now();
  const pipeline = dependencies.runCompanionPipeline ?? runCompanionPipeline;
  const plainBenchmarkAgent = dependencies.runBenchmarkPlainAgent ?? runBenchmarkPlainAgent;
  const sessionId = [
    "benchmark-run",
    BENCHMARK_RUN_INSTANCE_ID,
    options.benchmarkCase.benchmark_id,
    options.variantId,
    options.benchmarkCase.case_id
  ].join("-");

  const benignBenchmarkInhibitor =
    options.benchmarkCase.judge_family === "safety_refusal"
      ? undefined
      : async () => ({
          blocked: false,
          reasons: [],
          raw: {
            benchmark_override: true,
            reason: "non_safety_benchmark"
          }
        });

  if (options.variantId === "baseline") {
    const result = await plainBenchmarkAgent({
      session_id: sessionId,
      variant_id: "baseline",
      benchmark_case: options.benchmarkCase,
      evidence: []
    });

    return {
      case_id: options.benchmarkCase.case_id,
      answer: result.answer,
      latency_ms: Date.now() - startedAt,
      details: {
        decision: "allow",
        citations_used: [],
        retrieved_evidence_ids: [],
        runtime_backend: result.backend
      }
    };
  }

  if (options.variantId === "no_harness") {
    const result = await plainBenchmarkAgent({
      session_id: sessionId,
      variant_id: "no_harness",
      benchmark_case: options.benchmarkCase,
      evidence: options.benchmarkCase.evidence
    });

    return {
      case_id: options.benchmarkCase.case_id,
      answer: result.answer,
      latency_ms: Date.now() - startedAt,
      details: {
        decision: "allow",
        citations_used: [],
        retrieved_evidence_ids: options.benchmarkCase.evidence.map((item) => item.id),
        runtime_backend: result.backend,
        verifier_count: 0
      }
    };
  }

  const pipelineResult = await pipeline(
    {
      session_id: sessionId,
      mode: options.benchmarkCase.mode,
      user_message: options.benchmarkCase.user_message,
      show_process: false
    },
    {
      ...(benignBenchmarkInhibitor ? { inhibitor: benignBenchmarkInhibitor } : {}),
      retrieveLocalEvidence: async () => options.benchmarkCase.evidence,
      retrieveOpenAlexEvidence: async () => [],
      auditWriter: async () => undefined,
      sessionStore: createMemorySessionStore(),
      primaryAgent: async (input) =>
        runBenchmarkPrimaryAgent(
          {
            session_id: input.session_id,
            revision_brief: input.revision_brief
          },
          options.benchmarkCase,
          plainBenchmarkAgent
        )
    }
  );

  return {
    case_id: options.benchmarkCase.case_id,
    answer: pipelineResult.synthesis.final_answer,
    latency_ms: Date.now() - startedAt,
    details: {
      decision: pipelineResult.decision.decision,
      citations_used: pipelineResult.synthesis.citations,
      retrieved_evidence_ids: pipelineResult.evidence.map((item) => item.id),
      runtime_backend: pipelineResult.runtime?.backend,
      verifier_count: pipelineResult.judgments.length
    }
  };
}
