import type { CompanionMode, DecisionType } from "../contracts";

export interface ScoreReport {
  correctness: number;
  retrieval: number;
  cost: number;
  human_collaboration: number;
  composite: number;
}

export interface RunArtifact {
  run_id: string;
  session_id: string;
  candidate_id: string;
  created_at: string;
  mode: CompanionMode;
  score: ScoreReport;
  verifier_scores: Record<string, number>;
  decision: DecisionType;
  inhibitor_blocked: boolean;
  evidence_count: number;
  degraded: boolean;
}

const REQUIRED_FIELDS: (keyof RunArtifact)[] = [
  "run_id",
  "session_id",
  "candidate_id",
  "created_at",
  "mode",
  "score",
  "verifier_scores",
  "decision",
  "inhibitor_blocked",
  "evidence_count",
  "degraded",
];

export function validateRunArtifact(artifact: unknown): RunArtifact | null {
  if (typeof artifact !== "object" || artifact === null) {
    return null;
  }

  const obj = artifact as Record<string, unknown>;

  for (const field of REQUIRED_FIELDS) {
    if (!(field in obj) || obj[field] === undefined || obj[field] === null) {
      return null;
    }
  }

  if (typeof obj["run_id"] !== "string") return null;
  if (typeof obj["session_id"] !== "string") return null;
  if (typeof obj["candidate_id"] !== "string") return null;
  if (typeof obj["created_at"] !== "string") return null;
  if (typeof obj["mode"] !== "string") return null;
  if (typeof obj["score"] !== "object") return null;
  if (typeof obj["verifier_scores"] !== "object") return null;
  if (typeof obj["decision"] !== "string") return null;
  if (typeof obj["inhibitor_blocked"] !== "boolean") return null;
  if (typeof obj["evidence_count"] !== "number") return null;
  if (typeof obj["degraded"] !== "boolean") return null;

  return artifact as RunArtifact;
}
