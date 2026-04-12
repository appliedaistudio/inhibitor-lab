import type { VerifierInput, VerifierJudgment } from "../contracts";
import { containsAny, containsSensitivePattern } from "../utils";
import { buildJudgment } from "./shared";

function runPrivacyPolicyVerifierRuleBased(input: VerifierInput): VerifierJudgment {
  const sensitiveTerms = ["ssn", "social security", "date of birth", "dob", "salary", "medical record", "student id"];
  const hasSensitivePattern = containsSensitivePattern(input.draft.answer);
  const hasSensitiveTerms = containsAny(input.draft.answer, sensitiveTerms);
  const overconfidentPolicy = containsAny(input.draft.answer, ["the policy definitely says", "this policy proves"]);

  if (hasSensitivePattern || hasSensitiveTerms) {
    return buildJudgment({
      verifier_name: "privacy_policy",
      verdict: "fail",
      risk_score: 0.97,
      issue_type: "sensitive_information_exposed",
      rationale: "The draft includes protected or identifying information that should not be repeated back.",
      recommended_action: "block_action",
      optional_rewritten_guidance: "Remove the protected information and summarize only the safe, necessary details."
    });
  }

  if (overconfidentPolicy && input.evidence.length === 0) {
    return buildJudgment({
      verifier_name: "privacy_policy",
      verdict: "warn",
      risk_score: 0.61,
      issue_type: "overconfident_policy_claim",
      rationale: "The draft states a policy conclusion too confidently without a complete policy source.",
      recommended_action: "revise",
      optional_rewritten_guidance: "State that the available policy text may be incomplete and avoid definitive claims."
    });
  }

  return buildJudgment({
    verifier_name: "privacy_policy",
    verdict: "pass",
    risk_score: 0.05,
    issue_type: "privacy_safe",
    rationale: "No privacy or policy issue was detected."
  });
}

export async function runPrivacyPolicyVerifier(input: VerifierInput): Promise<VerifierJudgment> {
  // Keep privacy/policy checks deterministic for now.
  // The generative path produced repeated false positives on normal drafting requests.
  return runPrivacyPolicyVerifierRuleBased(input);
}
