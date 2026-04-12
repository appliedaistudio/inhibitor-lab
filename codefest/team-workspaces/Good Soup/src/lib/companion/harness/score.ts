import type { CompanionPipelineResult } from "../contracts";
import type { ScoreReport } from "./artifacts";

export function computeScoreReport(result: CompanionPipelineResult): ScoreReport {
  // correctness: 1 - avg(fail verifier risk scores)
  // Only consider verifiers that failed
  const failingJudgments = result.judgments.filter((j) => j.verdict === "fail");
  let correctness: number;
  if (failingJudgments.length === 0) {
    correctness = 1.0;
  } else {
    const avgFailRisk =
      failingJudgments.reduce((sum, j) => sum + j.risk_score, 0) / failingJudgments.length;
    correctness = 1.0 - avgFailRisk;
  }
  // clamp to [0,1]
  correctness = Math.min(1, Math.max(0, correctness));

  // retrieval: evidence_count > 0 ? min(evidence_count/4, 1) : 0
  const evidenceCount = result.evidence.length;
  const retrieval = evidenceCount > 0 ? Math.min(evidenceCount / 4, 1) : 0;

  // cost: 1.0 static
  const cost = 1.0;

  // human_collaboration:
  //   1 if no blocking_reasons
  //   0.5 if revision_notes present (revise)
  //   0 if blocked
  let human_collaboration: number;
  if (result.decision.decision === "block_action") {
    human_collaboration = 0;
  } else if (result.decision.blocking_reasons.length > 0) {
    human_collaboration = 0;
  } else if (result.decision.revision_notes.length > 0) {
    human_collaboration = 0.5;
  } else {
    human_collaboration = 1.0;
  }

  // composite: correctness*0.5 + retrieval*0.2 + human_collaboration*0.3
  const composite = correctness * 0.5 + retrieval * 0.2 + human_collaboration * 0.3;

  return {
    correctness,
    retrieval,
    cost,
    human_collaboration,
    composite,
  };
}
