import type { VerifierInput, VerifierJudgment, VerifierVerdict } from "../contracts";
import { getRuntimeConfig } from "../config";
import { containsAny } from "../utils";
import { buildJudgment, createVerifierClient } from "./shared";

function groundingNotRequiredForLearning(input: VerifierInput): boolean {
  if (input.mode !== "learning") {
    return false;
  }

  if (input.evidence.length > 0 || input.draft.citations_used.length > 0) {
    return false;
  }

  const loweredAnswer = input.draft.answer.toLowerCase();
  if (containsAny(loweredAnswer, ["study", "paper", "source", "citation", "according to"])) {
    return false;
  }

  return true;
}

async function runGroundingVerifierLLM(
  input: VerifierInput,
  config: ReturnType<typeof getRuntimeConfig>
): Promise<VerifierJudgment> {
  const client = createVerifierClient(config);

  const evidenceSnippet = input.evidence
    .slice(0, 3)
    .map((e) => `[${e.id}] ${e.snippet}`)
    .join("\n");

  const systemPrompt =
    "You are a grounding verifier. Given a draft answer and retrieved evidence, decide if the draft makes claims that go beyond what the evidence supports.\n" +
    'Return JSON: { "verdict": "pass"|"warn"|"fail", "risk_score": 0.0-1.0, "issue_type": string, "rationale": string }\n' +
    "fail = strong unsupported claim (risk 0.8+), warn = limited evidence (risk 0.4-0.7), pass = well grounded (risk < 0.3)";

  const userPrompt =
    `Mode: ${input.mode}\n` +
    `User message: ${input.user_message}\n` +
    `Draft answer: ${input.draft.answer}\n` +
    `Evidence:\n${evidenceSnippet || "(none)"}`;

  const completion = await client.chat.completions.create({
    model: config.verifier_model,
    temperature: 0,
    response_format: { type: "json_object" },
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ]
  });

  const raw = JSON.parse(completion.choices[0]?.message?.content ?? "{}") as Record<string, unknown>;
  const verdict = raw.verdict as VerifierVerdict;
  const riskScore = typeof raw.risk_score === "number" ? raw.risk_score : undefined;
  if (!["pass", "warn", "fail"].includes(verdict) || riskScore === undefined) {
    throw new Error("invalid LLM response shape");
  }

  const recommendedAction =
    verdict === "fail" ? "revise" : verdict === "warn" ? "revise" : "allow";

  return buildJudgment({
    verifier_name: "grounding",
    verdict,
    risk_score: riskScore,
    issue_type: typeof raw.issue_type === "string" ? raw.issue_type : "llm_grounding_check",
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    evidence_refs: input.evidence.map((e) => e.id),
    recommended_action: recommendedAction
  });
}

function runGroundingVerifierRuleBased(input: VerifierInput): VerifierJudgment {
  const unsupportedHighCertainty = input.draft.claims.some(
    (claim) => claim.certainty === "high" && claim.evidence_ref_ids.length === 0
  );
  const noveltyLanguage = containsAny(input.draft.answer, ["novel", "first ever", "completely new"]);
  const certaintyLanguage = containsAny(input.draft.answer, ["definitely", "certainly", "proves", "guarantees"]);

  if (unsupportedHighCertainty || (noveltyLanguage && input.evidence.length < 2) || (certaintyLanguage && input.evidence.length === 0)) {
    return buildJudgment({
      verifier_name: "grounding",
      verdict: "fail",
      risk_score: 0.91,
      issue_type: "unsupported_claim_fake_certainty",
      rationale:
        "The draft makes a strong claim without enough retrieved evidence and should be softened or revised.",
      evidence_refs: input.evidence.map((item) => item.id),
      recommended_action: "revise",
      optional_rewritten_guidance:
        "Do not claim novelty or certainty. Say the evidence is limited, compare overlap, and cite only retrieved sources."
    });
  }

  if (input.evidence.length === 0) {
    return buildJudgment({
      verifier_name: "grounding",
      verdict: "warn",
      risk_score: 0.58,
      issue_type: "limited_evidence",
      rationale: "No supporting evidence was retrieved, so the answer should stay tentative.",
      recommended_action: "revise",
      optional_rewritten_guidance: "Add uncertainty language and ask for more context or sources."
    });
  }

  return buildJudgment({
    verifier_name: "grounding",
    verdict: "pass",
    risk_score: 0.08,
    issue_type: "supported",
    rationale: "The draft stays within the retrieved evidence."
  });
}

export async function runGroundingVerifier(input: VerifierInput): Promise<VerifierJudgment> {
  if (groundingNotRequiredForLearning(input)) {
    return buildJudgment({
      verifier_name: "grounding",
      verdict: "pass",
      risk_score: 0.04,
      issue_type: "learning_self_contained",
      rationale: "This is a self-contained learning explanation, so external retrieval grounding is not required."
    });
  }

  const config = getRuntimeConfig();

  if (config.openai_api_key) {
    try {
      return await runGroundingVerifierLLM(input, config);
    } catch {
      // fall through to rule-based
    }
  }

  return runGroundingVerifierRuleBased(input);
}
