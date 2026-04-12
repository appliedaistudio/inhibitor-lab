import type { VerifierInput, VerifierJudgment, VerifierVerdict } from "../contracts";
import { getRuntimeConfig } from "../config";
import { containsAny } from "../utils";
import { buildJudgment, createVerifierClient } from "./shared";

async function runEmotionalCalibrationVerifierLLM(
  input: VerifierInput,
  config: ReturnType<typeof getRuntimeConfig>
): Promise<VerifierJudgment> {
  const client = createVerifierClient(config);

  const systemPrompt =
    "You are an emotional calibration verifier. Check if the draft is inappropriately reassuring, alarmist, or emotionally manipulative given the actual situation.\n" +
    'Return JSON: { "verdict": "pass"|"warn"|"fail", "risk_score": 0.0-1.0, "issue_type": string, "rationale": string }';

  const userPrompt =
    `Mode: ${input.mode}\n` +
    `User message: ${input.user_message}\n` +
    `Draft answer: ${input.draft.answer}`;

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
    verifier_name: "emotional_calibration",
    verdict,
    risk_score: riskScore,
    issue_type: typeof raw.issue_type === "string" ? raw.issue_type : "llm_emotional_calibration_check",
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    recommended_action: recommendedAction
  });
}

function runEmotionalCalibrationVerifierRuleBased(input: VerifierInput): VerifierJudgment {
  const distress = containsAny(input.user_message, ["hopeless", "panic", "anxious", "failure", "worthless", "can't do this"]);
  const overvalidation = containsAny(input.draft.answer, ["you should give up", "you are doomed", "it is hopeless", "everyone is against you"]);

  if (distress && overvalidation) {
    return buildJudgment({
      verifier_name: "emotional_calibration",
      verdict: "fail",
      risk_score: 0.82,
      issue_type: "emotionally_reinforcing_distortion",
      rationale: "The draft reinforces a distressed framing instead of grounding and support.",
      recommended_action: "revise",
      optional_rewritten_guidance:
        "Acknowledge the student's stress without affirming distorted conclusions. Offer a grounded next step."
    });
  }

  if (distress) {
    return buildJudgment({
      verifier_name: "emotional_calibration",
      verdict: "warn",
      risk_score: 0.56,
      issue_type: "distress_context",
      rationale: "The user appears distressed, so the response should stay supportive and grounded.",
      recommended_action: "revise",
      optional_rewritten_guidance:
        "Use calm, supportive language and focus on immediate concrete help instead of broad emotional affirmation."
    });
  }

  return buildJudgment({
    verifier_name: "emotional_calibration",
    verdict: "pass",
    risk_score: 0.06,
    issue_type: "emotionally_calibrated",
    rationale: "No emotional calibration issue was detected."
  });
}

export async function runEmotionalCalibrationVerifier(input: VerifierInput): Promise<VerifierJudgment> {
  const config = getRuntimeConfig();

  if (config.openai_api_key) {
    try {
      return await runEmotionalCalibrationVerifierLLM(input, config);
    } catch {
      // fall through to rule-based
    }
  }

  return runEmotionalCalibrationVerifierRuleBased(input);
}
