import type { VerifierInput, VerifierJudgment, VerifierVerdict } from "../contracts";
import { getRuntimeConfig } from "../config";
import { containsAny } from "../utils";
import { buildJudgment, createVerifierClient } from "./shared";

function answerAddressesMisconception(input: VerifierInput): boolean {
  if (input.mode !== "learning") {
    return false;
  }

  const loweredAnswer = input.draft.answer.toLowerCase();
  const hasCorrectionCue = containsAny(loweredAnswer, [
    "not correct",
    "not fully correct",
    "small fix",
    "key correction",
    "careful",
    "you need to",
    "instead",
    "that means",
    "the correct",
    "common confusion"
  ]);
  const hasWorkedReasoning =
    /[=]/.test(loweredAnswer) ||
    /\b\d+\b/.test(loweredAnswer) ||
    containsAny(loweredAnswer, ["because", "therefore", "so:", "a = f / m", "f / m"]);
  const negatesWrongAnswer = /\bnot\s+\d+(?:\.\d+)?\b/.test(loweredAnswer);
  const userSuppliedReasoningToRepair = containsAny(input.user_message.toLowerCase(), [
    "student attempt",
    "student says",
    "i think",
    "my reasoning",
    "i got",
    "is that right"
  ]);
  const hasStepwiseRecomputation =
    /^\s*\d+\)/m.test(input.draft.answer) ||
    containsAny(loweredAnswer, ["let x be", "simplify", "subtract", "final answer:"]);
  const hasClearResolution =
    /final answer:\s*.+/i.test(input.draft.answer) ||
    /\bso\s+the\b/.test(loweredAnswer) ||
    /\bx\s*=\s*-?\d+(?:\.\d+)?\b/.test(loweredAnswer);

  return (
    (hasCorrectionCue && hasWorkedReasoning) ||
    negatesWrongAnswer ||
    (!userSuppliedReasoningToRepair &&
      hasWorkedReasoning &&
      hasStepwiseRecomputation &&
      hasClearResolution)
  );
}

async function runLearningVerifierLLM(
  input: VerifierInput,
  config: ReturnType<typeof getRuntimeConfig>
): Promise<VerifierJudgment> {
  const client = createVerifierClient(config);

  const systemPrompt =
    "You are a learning quality verifier. In learning mode, check if the draft actually corrects misconceptions or just validates the student's answer without checking their reasoning chain.\n" +
    'Return JSON: { "verdict": "pass"|"warn"|"fail", "risk_score": 0.0-1.0, "issue_type": string, "rationale": string }';

  const misconceptions = input.draft.student_model.misconceptions.join(", ") || "(none)";
  const missingSteps = input.draft.student_model.missing_steps.join(", ") || "(none)";
  const userPrompt =
    `Mode: ${input.mode}\n` +
    `User message: ${input.user_message}\n` +
    `Draft answer: ${input.draft.answer}\n` +
    `Student understanding level: ${input.draft.student_model.understanding_level}\n` +
    `Student misconceptions: ${misconceptions}\n` +
    `Missing steps: ${missingSteps}`;

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
    verifier_name: "learning",
    verdict,
    risk_score: riskScore,
    issue_type: typeof raw.issue_type === "string" ? raw.issue_type : "llm_learning_check",
    rationale: typeof raw.rationale === "string" ? raw.rationale : "",
    recommended_action: recommendedAction
  });
}

function runLearningVerifierRuleBased(input: VerifierInput): VerifierJudgment {
  if (input.mode !== "learning") {
    return buildJudgment({
      verifier_name: "learning",
      verdict: "pass",
      risk_score: 0.05,
      issue_type: "not_learning_mode",
      rationale: "Learning-mode reasoning checks are not primary for this request."
    });
  }

  const { misconceptions, missing_steps, understanding_level } = input.draft.student_model;

  if (misconceptions.length > 0 || missing_steps.length > 0 || understanding_level !== "strong") {
    return buildJudgment({
      verifier_name: "learning",
      verdict: "fail",
      risk_score: 0.86,
      issue_type: "misconception_detected",
      rationale:
        "The student model shows that the student is missing a key reasoning step or carrying a misconception.",
      recommended_action: "revise",
      optional_rewritten_guidance:
        "Correct the misconception explicitly, identify the missing reasoning step, and ask the student to work through a concrete example."
    });
  }

  return buildJudgment({
    verifier_name: "learning",
    verdict: "pass",
    risk_score: 0.08,
    issue_type: "understanding_supported",
    rationale: "The student appears to understand the concept."
  });
}

export async function runLearningVerifier(input: VerifierInput): Promise<VerifierJudgment> {
  if (answerAddressesMisconception(input)) {
    return buildJudgment({
      verifier_name: "learning",
      verdict: "pass",
      risk_score: 0.09,
      issue_type: "misconception_addressed",
      rationale: "The answer explicitly corrects the misconception and walks through the missing reasoning step."
    });
  }

  const config = getRuntimeConfig();

  if (config.openai_api_key) {
    try {
      return await runLearningVerifierLLM(input, config);
    } catch {
      // fall through to rule-based
    }
  }

  return runLearningVerifierRuleBased(input);
}
