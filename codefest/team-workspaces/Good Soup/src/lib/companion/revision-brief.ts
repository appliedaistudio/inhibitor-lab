import type {
  RevisionBrief,
  RevisionRequirement,
  VerifierJudgment
} from "../../types/companion";

export function buildRevisionRequirement(judgment: VerifierJudgment): RevisionRequirement {
  const requirement: RevisionRequirement = {
    verifier_name: judgment.verifier_name,
    issue_type: judgment.issue_type,
    rationale: judgment.rationale,
    risk_score: judgment.risk_score,
    recommended_action: judgment.recommended_action
  };

  if (judgment.optional_rewritten_guidance) {
    requirement.optional_rewritten_guidance = judgment.optional_rewritten_guidance;
  }

  return requirement;
}

export function buildRevisionBrief(input: {
  original_user_message: string;
  current_answer: string;
  pass_index: number;
  findings: VerifierJudgment[];
}): RevisionBrief {
  return {
    original_user_message: input.original_user_message,
    current_answer: input.current_answer,
    pass_index: input.pass_index,
    requirements: input.findings.map(buildRevisionRequirement)
  };
}
