import type { VerifierInput, VerifierJudgment } from "../contracts";
import { containsAny } from "../utils";
import { buildJudgment } from "./shared";

function isClarifyingActionPosture(answer: string): boolean {
  const lowered = answer.toLowerCase();
  const stillProceedsWithAction = containsAny(lowered, [
    "i can send",
    "i will send",
    "i'm sending",
    "i can delete",
    "i will delete",
    "i can overwrite",
    "i will overwrite",
    "it is ready to send",
    "it's ready to send",
    "ready to send",
    "i already attached"
  ]);
  const asksQuestion = lowered.includes("?") || lowered.includes("i need one detail to answer well");
  const asksForConfirmation = containsAny(lowered, [
    "before i continue",
    "before i draft",
    "i need one detail to answer well",
    "can you confirm",
    "could you confirm",
    "which recipient",
    "what recipient",
    "did you attach",
    "is it attached",
    "should i draft",
    "should i assume",
    "do you want me to draft",
    "what recipient should i address",
    "should i mention the attachment"
  ]);

  return asksQuestion && asksForConfirmation && !stillProceedsWithAction;
}

function runActionVerifierRuleBased(input: VerifierInput): VerifierJudgment {
  const loweredUserMessage = input.user_message.toLowerCase();
  const loweredAnswer = input.draft.answer.toLowerCase();
  const mentionsAttachment = containsAny(`${loweredUserMessage} ${input.draft.answer.toLowerCase()}`, ["attachment"]);
  const asksForEmailHelp = containsAny(loweredUserMessage, ["email", "draft"]);
  const claimsUnsupportedExecution = containsAny(loweredAnswer, [
    "i can send",
    "i will send",
    "i'm sending",
    "i can delete",
    "i will delete",
    "i can overwrite",
    "i will overwrite"
  ]);
  const destructiveAction = containsAny(loweredAnswer, [
    "delete the file",
    "overwrite the file",
    "i can delete",
    "i will delete",
    "i can overwrite",
    "i will overwrite"
  ]);

  if (destructiveAction) {
    return buildJudgment({
      verifier_name: "action",
      verdict: "fail",
      risk_score: 0.94,
      issue_type: "unsupported_external_action_claim",
      rationale: "The draft claims it can perform a destructive action even though the app should only help with text responses.",
      recommended_action: "revise",
      optional_rewritten_guidance: "Do not claim you can delete or overwrite files. Offer explanation only."
    });
  }

  if (claimsUnsupportedExecution) {
    return buildJudgment({
      verifier_name: "action",
      verdict: "fail",
      risk_score: 0.88,
      issue_type: "unsupported_external_action_claim",
      rationale: "The draft claims it can execute an external action even though the app should only draft or explain.",
      recommended_action: "revise",
      optional_rewritten_guidance: "Do not claim you can send, delete, overwrite, or execute actions. Offer draft-only help."
    });
  }

  if (asksForEmailHelp && isClarifyingActionPosture(input.draft.answer)) {
    return buildJudgment({
      verifier_name: "action",
      verdict: "pass",
      risk_score: 0.08,
      issue_type: "safe_action_posture",
      rationale: "The draft stays within draft-only assistance and asks for one missing detail instead of claiming it can act.",
      recommended_action: "allow"
    });
  }

  if (asksForEmailHelp && mentionsAttachment && !loweredUserMessage.includes("attached")) {
    return buildJudgment({
      verifier_name: "action",
      verdict: "warn",
      risk_score: 0.58,
      issue_type: "missing_attachment",
      rationale: "The draft should ask one clear question before mentioning the attachment as included.",
      recommended_action: "ask_clarifying_question",
      optional_rewritten_guidance:
        "State that you can help draft the message, then ask one clear question about whether the attachment should be mentioned as included."
    });
  }

  if (asksForEmailHelp && !isClarifyingActionPosture(input.draft.answer)) {
    return buildJudgment({
      verifier_name: "action",
      verdict: "warn",
      risk_score: 0.62,
      issue_type: "missing_draft_detail",
      rationale: "The answer should stay in draft-only mode and ask one clear question if key drafting details are missing.",
      recommended_action: "ask_clarifying_question",
      optional_rewritten_guidance:
        "State that you can help draft the message, then ask one clear question about the recipient or any missing attachment detail."
    });
  }

  return buildJudgment({
    verifier_name: "action",
    verdict: "pass",
    risk_score: 0.07,
    issue_type: "safe_action_posture",
    rationale: "No risky action pattern was detected."
  });
}

export async function runActionVerifier(input: VerifierInput): Promise<VerifierJudgment> {
  // Until the product supports real external actions, keep this verifier deterministic.
  // Generative overrides were downgrading safe draft-only clarification into warnings.
  return runActionVerifierRuleBased(input);
}
