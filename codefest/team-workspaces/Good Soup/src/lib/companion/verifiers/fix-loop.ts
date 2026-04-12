import type {
  FixAttempt,
  FixLoopResult,
  PrimaryAgentDraft,
  PrimaryAgentFn,
  PrimaryAgentInput,
  VerifierInput,
  VerifierJudgment,
  VerifierName
} from "../contracts";
import { formatDraftOnlyClarification, normalizeClarificationAnswer } from "../clarification";
import { buildRevisionBrief } from "../revision-brief";
import { runActionVerifier } from "./action";
import { runAntiSycophancyVerifier } from "./anti-sycophancy";
import { runEmotionalCalibrationVerifier } from "./emotional-calibration";
import { runGroundingVerifier } from "./grounding";
import { runLearningVerifier } from "./learning";
import { runPrivacyPolicyVerifier } from "./privacy-policy";

const MAX_FIX_ATTEMPTS = 4;

function looksLikeClarifyingQuestion(answer: string): boolean {
  const lowered = answer.toLowerCase();
  if (lowered.includes("ask the user")) {
    return false;
  }
  return (lowered.includes("?") || lowered.includes("i need one detail to answer well")) && (
    lowered.includes("confirm") ||
    lowered.includes("before i continue") ||
    lowered.includes("before i draft") ||
    lowered.includes("i need one detail to answer well") ||
    lowered.includes("should i") ||
    lowered.includes("did you attach")
  );
}

function applyActionClarificationFallback(
  draft: PrimaryAgentDraft,
  judgment: VerifierJudgment,
  userMessage: string
): PrimaryAgentDraft {
  if (judgment.verifier_name !== "action" || judgment.recommended_action !== "ask_clarifying_question") {
    return draft;
  }

  if (looksLikeClarifyingQuestion(draft.answer)) {
    return draft;
  }

  const loweredUserMessage = userMessage.toLowerCase();
  const mentionsProfessor = loweredUserMessage.includes("professor");
  const mentionsAttachment = loweredUserMessage.includes("attach");
  const recipientPhrase = mentionsProfessor ? "your professor's email address" : "the recipient";
  const attachmentPhrase = mentionsAttachment
    ? "whether the attachment is actually present"
    : "whether there is any missing attachment or prerequisite";
  const rewrittenAnswer = normalizeClarificationAnswer(
    `Before I draft that email, can you confirm ${recipientPhrase}, ${attachmentPhrase}, ` +
    "and whether you want a draft only or wording that assumes it is ready to send?"
  );

  return {
    ...draft,
    answer: mentionsProfessor || mentionsAttachment
      ? rewrittenAnswer
      : formatDraftOnlyClarification(userMessage)
  };
}

export async function runVerifierByName(
  verifierName: VerifierName,
  verifierInput: VerifierInput
): Promise<VerifierJudgment> {
  switch (verifierName) {
    case "grounding":
      return runGroundingVerifier(verifierInput);
    case "anti_sycophancy":
      return runAntiSycophancyVerifier(verifierInput);
    case "learning":
      return runLearningVerifier(verifierInput);
    case "action":
      return runActionVerifier(verifierInput);
    case "emotional_calibration":
      return runEmotionalCalibrationVerifier(verifierInput);
    case "privacy_policy":
      return runPrivacyPolicyVerifier(verifierInput);
    default: {
      const exhaustive: never = verifierName;
      throw new Error(`Unknown verifier name: ${exhaustive}`);
    }
  }
}

export async function runFixLoop(
  initialDraft: PrimaryAgentDraft,
  initialJudgments: VerifierJudgment[],
  input: VerifierInput,
  primaryAgent: PrimaryAgentFn,
  runSingleVerifier: (verifierName: VerifierName, verifierInput: VerifierInput) => Promise<VerifierJudgment>
): Promise<FixLoopResult> {
  const failures = initialJudgments
    .filter((j) => j.verdict !== "pass")
    .sort((a, b) => b.risk_score - a.risk_score)
    .slice(0, MAX_FIX_ATTEMPTS);

  if (failures.length === 0) {
    return {
      final_draft: initialDraft,
      fix_attempts: [],
      judgments_after_fix: initialJudgments
    };
  }

  let currentDraft = initialDraft;
  let currentJudgments = [...initialJudgments];
  const fixAttempts: FixAttempt[] = [];

  for (const failure of failures) {
    const fixInput: PrimaryAgentInput = {
      request_id: input.request_id,
      session_id: input.session_id,
      mode: input.mode,
      evidence: input.evidence,
      conversation: input.conversation,
      user_message: input.user_message,
      revision_brief: buildRevisionBrief({
        original_user_message: input.user_message,
        current_answer: currentDraft.answer,
        pass_index: fixAttempts.length + 1,
        findings: [failure]
      })
    };

    const revisedResult = await primaryAgent(fixInput);
    const revisedDraft = applyActionClarificationFallback(revisedResult.draft, failure, input.user_message);

    const recheckJudgment = await runSingleVerifier(failure.verifier_name, {
      ...input,
      draft: revisedDraft
    });

    fixAttempts.push({
      verifier_name: failure.verifier_name,
      original_judgment: failure,
      fix_applied: true,
      revised_draft: revisedDraft,
      recheck_judgment: recheckJudgment
    });

    currentDraft = revisedDraft;

    currentJudgments = currentJudgments.map((j) =>
      j.verifier_name === failure.verifier_name ? recheckJudgment : j
    );
  }

  return {
    final_draft: currentDraft,
    fix_attempts: fixAttempts,
    judgments_after_fix: currentJudgments
  };
}
