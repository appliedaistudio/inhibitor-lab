import type { OrchestratorDecision, VerifierJudgment } from "./contracts";

function reasonText(judgment: VerifierJudgment): string {
  return `${judgment.verifier_name}: ${judgment.issue_type} - ${judgment.rationale}`;
}

export function orchestrateJudgments(judgments: VerifierJudgment[]): OrchestratorDecision {
  const blockingReasons: string[] = [];
  const revisionNotes: string[] = [];
  const verifierSummary = judgments.map(reasonText);

  const privacyBlock = judgments.find(
    (item) => item.verifier_name === "privacy_policy" && item.verdict === "fail" && item.risk_score >= 0.8
  );
  if (privacyBlock) {
    blockingReasons.push(reasonText(privacyBlock));
    return {
      decision: "block_action",
      blocking_reasons: blockingReasons,
      revision_notes: [],
      verifier_summary: verifierSummary
    };
  }

  const hardAction = judgments.find(
    (item) => item.verifier_name === "action" && item.verdict === "fail" && item.risk_score >= 0.8
  );
  if (hardAction) {
    blockingReasons.push(reasonText(hardAction));
    return {
      decision:
        hardAction.recommended_action === "ask_clarifying_question" ? "ask_clarifying_question" : "block_action",
      blocking_reasons: blockingReasons,
      revision_notes: [],
      verifier_summary: verifierSummary
    };
  }

  const hardGrounding = judgments.find(
    (item) => item.verifier_name === "grounding" && item.verdict === "fail" && item.risk_score >= 0.8
  );
  if (hardGrounding) {
    revisionNotes.push(reasonText(hardGrounding));
    return {
      decision: "revise",
      blocking_reasons: [],
      revision_notes: revisionNotes,
      verifier_summary: verifierSummary
    };
  }

  const mediumIssues = judgments.filter((item) => item.verdict !== "pass" && item.risk_score >= 0.5);
  if (mediumIssues.length >= 2) {
    return {
      decision: "revise",
      blocking_reasons: [],
      revision_notes: mediumIssues.map(reasonText),
      verifier_summary: verifierSummary
    };
  }

  const singleIssue = judgments.find((item) => item.verdict !== "pass");
  if (singleIssue) {
    return {
      decision: singleIssue.recommended_action === "allow" ? "revise" : singleIssue.recommended_action,
      blocking_reasons:
        singleIssue.recommended_action === "block_action" ||
        singleIssue.recommended_action === "ask_clarifying_question"
          ? [reasonText(singleIssue)]
          : [],
      revision_notes:
        singleIssue.recommended_action === "revise" || singleIssue.recommended_action === "allow"
          ? [reasonText(singleIssue)]
          : [],
      verifier_summary: verifierSummary
    };
  }

  return {
    decision: "allow",
    blocking_reasons: [],
    revision_notes: [],
    verifier_summary: verifierSummary
  };
}
