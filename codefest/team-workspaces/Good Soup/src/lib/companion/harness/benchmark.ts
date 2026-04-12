import { mkdir, appendFile } from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";

import type { CompanionPipelineResult } from "../contracts";
import { runEvaluationHarness } from "../eval/harness";
import type { RunArtifact } from "./artifacts";
import { validateRunArtifact } from "./artifacts";
import { computeScoreReport } from "./score";

export interface BenchmarkResult {
  run_id: string;
  session_id: string;
  candidate_id: string;
  created_at: string;
  scenario_matches: number;
  total_scenarios: number;
  pass_rate: number;
  run_artifact: RunArtifact;
}

function buildCandidateId(result: CompanionPipelineResult): string {
  const verifierNames = result.judgments.map((j) => j.verifier_name).sort().join(",");
  const payload = `${result.mode}:${verifierNames}`;
  return createHash("sha256").update(payload).digest("hex").slice(0, 16);
}

function buildRunArtifact(
  result: CompanionPipelineResult,
  candidateId: string,
  createdAt: string
): RunArtifact {
  const score = computeScoreReport(result);

  const verifierScores: Record<string, number> = {};
  for (const judgment of result.judgments) {
    verifierScores[judgment.verifier_name] = judgment.risk_score;
  }

  const artifact: unknown = {
    run_id: result.request_id,
    session_id: result.session_id,
    candidate_id: candidateId,
    created_at: createdAt,
    mode: result.mode,
    score,
    verifier_scores: verifierScores,
    decision: result.decision.decision,
    inhibitor_blocked: result.inhibitor.blocked,
    evidence_count: result.evidence.length,
    degraded: result.runtime?.degraded ?? false,
  };

  const validated = validateRunArtifact(artifact);
  if (!validated) {
    throw new Error("Failed to build valid RunArtifact from pipeline result");
  }
  return validated;
}

export async function runSessionBenchmark(
  pipelineResult: CompanionPipelineResult
): Promise<BenchmarkResult> {
  const createdAt = new Date().toISOString();
  const candidateId = buildCandidateId(pipelineResult);
  const runArtifact = buildRunArtifact(pipelineResult, candidateId, createdAt);

  const harnessResult = await runEvaluationHarness();

  const scenarioMatches = harnessResult.summary.expectation_matches;
  const totalScenarios = harnessResult.summary.total_scenarios;
  const passRate = totalScenarios > 0 ? scenarioMatches / totalScenarios : 0;

  const benchmarkResult: BenchmarkResult = {
    run_id: pipelineResult.request_id,
    session_id: pipelineResult.session_id,
    candidate_id: candidateId,
    created_at: createdAt,
    scenario_matches: scenarioMatches,
    total_scenarios: totalScenarios,
    pass_rate: passRate,
    run_artifact: runArtifact,
  };

  const sessionDir = path.join(process.cwd(), "data", "sessions", pipelineResult.session_id);
  await mkdir(sessionDir, { recursive: true });
  const benchmarkPath = path.join(sessionDir, "benchmark.jsonl");
  await appendFile(benchmarkPath, JSON.stringify(benchmarkResult) + "\n", "utf8");

  return benchmarkResult;
}
