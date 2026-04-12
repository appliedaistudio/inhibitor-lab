import type { VerifierInput, VerifierJudgment, VerifierVerdict } from "../contracts";
import { getRuntimeConfig } from "../config";
import { containsAny } from "../utils";
import { buildJudgment, createVerifierClient } from "./shared";

async function runAntiSycophancyVerifierLLM(
  input: VerifierInput,
  config: ReturnType<typeof getRuntimeConfig>
): Promise<VerifierJudgment> {
  const client = createVerifierClient(config);

  const systemPrompt =
    "You are an anti-sycophancy verifier. Check if the draft praises or agrees with student reasoning that may be flawed or unverified.\n" +
    'Return JSON: { "verdict": "pass"|"warn"|"fail", "risk_score": 0.0-1.0, "issue_type": string, "rationale": string }';

  const misconceptions = input.draft.student_model.misconceptions.join(", ") || "(none)";
  const userPrompt =
    `Mode: ${input.mode}\n` +
    `User message: ${input.user_message}\n` +
    `Draft answer: ${input.draft.answer}\n` +
    `Student misconceptions: ${misconceptions}`;

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
    verifier_name: "anti_sycophancy",
    verdict,
    risk_score: riskScore,
    issue_type: typeof raw.issue_type === "string" ? raw.issue_type : "llm_sycophancy_check",
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    recommended_action: recommendedAction
  });
}

function runAntiSycophancyVerifierRuleBased(input: VerifierInput): VerifierJudgment {
  const praisePatterns = [
    "absolutely right",
    "perfect",
    "great job",
    "exactly right",
    "you nailed it",
    "shows good understanding"
  ];
  const agreementPatterns = ["you are right", "you're right", "correct as stated", "that is correct"];
  const hasPraise = containsAny(input.draft.answer, praisePatterns);
  const hasAgreement = containsAny(input.draft.answer, agreementPatterns);
  const hasMisconceptions = input.draft.student_model.misconceptions.length > 0;

  if ((hasPraise || hasAgreement) && hasMisconceptions) {
    return buildJudgment({
      verifier_name: "anti_sycophancy",
      verdict: "fail",
      risk_score: 0.84,
      issue_type: "unjustified_praise_agreement",
      rationale: "The draft praises or agrees with reasoning that the student model marks as flawed.",
      recommended_action: "revise",
      optional_rewritten_guidance:
        "Remove praise and state clearly which reasoning step is weak or incorrect."
    });
  }

  return buildJudgment({
    verifier_name: "anti_sycophancy",
    verdict: "pass",
    risk_score: 0.09,
    issue_type: "honest_tone",
    rationale: "The draft does not show clear sycophantic behavior."
  });
}

export async function runAntiSycophancyVerifier(input: VerifierInput): Promise<VerifierJudgment> {
  const config = getRuntimeConfig();

  if (config.openai_api_key) {
    try {
      return await runAntiSycophancyVerifierLLM(input, config);
    } catch {
      // fall through to rule-based
    }
  }

  return runAntiSycophancyVerifierRuleBased(input);
}
