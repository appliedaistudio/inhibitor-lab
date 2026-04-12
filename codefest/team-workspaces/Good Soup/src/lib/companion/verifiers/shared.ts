import OpenAI from "openai";

import type { RuntimeConfig } from "../config";
import type { RecommendedAction, VerifierJudgment, VerifierName, VerifierVerdict } from "../contracts";
import { clampRisk } from "../utils";

const VERIFIER_TIMEOUT_MS = 4000;

export function createVerifierClient(
  config: Pick<RuntimeConfig, "openai_api_key" | "llm_base_url">
) {
  return new OpenAI({
    apiKey: config.openai_api_key,
    ...(config.llm_base_url ? { baseURL: config.llm_base_url } : {}),
    timeout: VERIFIER_TIMEOUT_MS,
    maxRetries: 0
  });
}

export function buildJudgment(input: {
  verifier_name: VerifierName;
  verdict: VerifierVerdict;
  risk_score: number;
  issue_type: string;
  rationale: string;
  evidence_refs?: string[];
  recommended_action?: RecommendedAction;
  optional_rewritten_guidance?: string;
}): VerifierJudgment {
  return {
    verifier_name: input.verifier_name,
    verdict: input.verdict,
    risk_score: clampRisk(input.risk_score),
    issue_type: input.issue_type,
    rationale: input.rationale,
    evidence_refs: input.evidence_refs ?? [],
    recommended_action: input.recommended_action ?? "allow",
    optional_rewritten_guidance: input.optional_rewritten_guidance
  };
}
