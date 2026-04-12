import { defaultAuditWriter } from "./audit";
import { formatDraftOnlyClarification } from "./clarification";
import type {
  CompanionPipelineResult,
  ConversationTurn,
  EvidenceRecord,
  FixLoopResult,
  FixAttempt,
  ProcessEvent,
  OrchestratorDecision,
  PipelineDependencies,
  PrimaryAgentDraft,
  RunCompanionRequest,
  VerifierInput,
  VerifierJudgment
} from "./contracts";
import { runInhibitorCheck } from "./inhibitor/adapter";
import { retrieveOpenAlexEvidence } from "./openalex/adapter";
import { orchestrateJudgments } from "./orchestrator";
import {
  appendFixLoopResultProcessEvent,
  appendInhibitorProcessEvent,
  appendOrchestratorProcessEvent,
  appendPipelineResultProcessEvent,
  appendPipelineProcessEvent,
  appendVerifierProcessEvents
} from "./process-events";
import { runPrimaryAgent } from "./primary-agent";
import { retrieveLocalEvidence } from "./retrieval/local-corpus";
import { fileSessionStore } from "./session-store";
import { synthesizeResponse } from "./synthesis";
import { makeRequestId, unique } from "./utils";
import { runAllVerifiers } from "./verifiers";
import { runFixLoop, runVerifierByName } from "./verifiers/fix-loop";

function dedupeEvidence(items: EvidenceRecord[]): EvidenceRecord[] {
  const seen = new Set<string>();
  return items.filter((item) => {
    if (seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

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

function applyDegradedActionFallback(
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

  return {
    ...draft,
    answer: formatDraftOnlyClarification(userMessage)
  };
}

async function buildLocalFixLoopResult(
  draft: PrimaryAgentDraft,
  judgments: VerifierJudgment[],
  userMessage: string,
  verifierInput: VerifierInput,
  rerunVerifiers: (input: VerifierInput) => Promise<VerifierJudgment[]>
): Promise<FixLoopResult> {
  const failures = judgments
    .filter((judgment) => judgment.verdict !== "pass")
    .sort((left, right) => right.risk_score - left.risk_score);

  let currentDraft = draft;
  const fixAttempts: FixAttempt[] = [];
  let draftChanged = false;

  for (const failure of failures) {
    const revisedDraft = applyDegradedActionFallback(currentDraft, failure, userMessage);
    const fixApplied = revisedDraft.answer !== currentDraft.answer;
    fixAttempts.push({
      verifier_name: failure.verifier_name,
      original_judgment: failure,
      fix_applied: fixApplied,
      revised_draft: revisedDraft,
      recheck_judgment: failure
    });
    draftChanged = draftChanged || fixApplied;
    currentDraft = revisedDraft;
  }

  const judgmentsAfterFix = draftChanged
    ? await rerunVerifiers({
      ...verifierInput,
      draft: currentDraft
    })
    : judgments;
  const judgmentsByVerifier = new Map(
    judgmentsAfterFix.map((judgment) => [judgment.verifier_name, judgment] as const)
  );

  return {
    final_draft: currentDraft,
    fix_attempts: fixAttempts.map((attempt) => ({
      ...attempt,
      recheck_judgment: judgmentsByVerifier.get(attempt.verifier_name) ?? attempt.recheck_judgment
    })),
    judgments_after_fix: judgmentsAfterFix
  };
}

function hasFailJudgment(judgments: VerifierJudgment[]): boolean {
  return judgments.some((judgment) => judgment.verdict === "fail");
}

function containsAny(text: string, needles: string[]): boolean {
  return needles.some((needle) => text.includes(needle));
}

function hasLiteratureSearchIntent(userMessage: string): boolean {
  const lowered = userMessage.toLowerCase();
  return containsAny(lowered, [
    "book",
    "books",
    "textbook",
    "textbooks",
    "paper",
    "papers",
    "article",
    "articles",
    "study",
    "studies",
    "literature",
    "research on",
    "find me",
    "source",
    "sources",
    "citation",
    "citations",
    "reference",
    "references",
    "read"
  ]);
}

function hasUnsupportedPracticalClaimSignal(judgments: VerifierJudgment[]): boolean {
  return judgments.some((judgment) =>
    judgment.verifier_name === "grounding" &&
    judgment.verdict !== "pass" &&
    judgment.issue_type.includes("unsupported_practical_claim")
  );
}
function blockedDecision(reasons: string[]): OrchestratorDecision {
  return {
    decision: "block_action",
    blocking_reasons: reasons.map((reason) => `inhibitor: ${reason}`),
    revision_notes: [],
    verifier_summary: []
  };
}

function isBypassableInhibitorFlag(
  inhibitorResult: CompanionPipelineResult["inhibitor"]
): boolean {
  return inhibitorResult.blocked &&
    inhibitorResult.reasons.length > 0 &&
    inhibitorResult.reasons.every((reason) => reason === "invalid_output" || reason === "decision_quality_violated");
}

function rulesPassedForInitialOverride(
  inhibitorResult: CompanionPipelineResult["inhibitor"]
): boolean {
  if (!inhibitorResult.raw || typeof inhibitorResult.raw !== "object" || Array.isArray(inhibitorResult.raw)) {
    return false;
  }

  const rawRecord = inhibitorResult.raw as Record<string, unknown>;
  const result = rawRecord.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return false;
  }

  const rulesSection = (result as Record<string, unknown>).rules_inhibition;
  if (!rulesSection || typeof rulesSection !== "object" || Array.isArray(rulesSection)) {
    return true;
  }

  const passed =
    "passed" in rulesSection && typeof rulesSection.passed === "boolean"
      ? rulesSection.passed
      : true;
  const violations =
    "violations" in rulesSection && Array.isArray(rulesSection.violations)
      ? rulesSection.violations
      : [];

  return passed && violations.length === 0;
}

function shouldOverrideLearningInhibitorBlock(
  mode: RunCompanionRequest["mode"],
  inhibitorResult: CompanionPipelineResult["inhibitor"]
): boolean {
  if (mode !== "learning" || !isBypassableInhibitorFlag(inhibitorResult)) {
    return false;
  }

  if (!inhibitorResult.raw || typeof inhibitorResult.raw !== "object" || Array.isArray(inhibitorResult.raw)) {
    return false;
  }

  const rawRecord = inhibitorResult.raw as Record<string, unknown>;
  const result = rawRecord.result;
  if (!result || typeof result !== "object" || Array.isArray(result)) {
    return false;
  }

  const llmInhibition = (result as Record<string, unknown>).llm_inhibition;
  if (!llmInhibition || typeof llmInhibition !== "object" || Array.isArray(llmInhibition)) {
    return false;
  }

  const observations = (llmInhibition as Record<string, unknown>).observations;
  if (!observations || typeof observations !== "object" || Array.isArray(observations)) {
    return false;
  }

  const observationKeys = [
    "implies_known_noncredible_claim",
    "contradicts_known_credible_claim"
  ] as const;

  return observationKeys.some((key) => {
    const observation = (observations as Record<string, unknown>)[key];
    if (!observation || typeof observation !== "object" || Array.isArray(observation)) {
      return false;
    }

    return (observation as Record<string, unknown>).value === true;
  });
}

function shouldOverrideInitialInvalidOutputBlock(
  inhibitorResult: CompanionPipelineResult["inhibitor"]
): boolean {
  return isBypassableInhibitorFlag(inhibitorResult) && rulesPassedForInitialOverride(inhibitorResult);
}

function overrideLearningInhibitorResult(
  inhibitorResult: CompanionPipelineResult["inhibitor"]
): CompanionPipelineResult["inhibitor"] {
  const raw =
    inhibitorResult.raw && typeof inhibitorResult.raw === "object" && !Array.isArray(inhibitorResult.raw)
      ? {
        ...inhibitorResult.raw,
        override: {
          applied: true,
          reason: "learning_mode_student_misconception"
        }
      }
      : {
        raw: inhibitorResult.raw,
        override: {
          applied: true,
          reason: "learning_mode_student_misconception"
        }
      };

  return {
    blocked: false,
    reasons: [],
    raw
  };
}

function overrideInitialInvalidOutputResult(
  inhibitorResult: CompanionPipelineResult["inhibitor"]
): CompanionPipelineResult["inhibitor"] {
  const raw =
    inhibitorResult.raw && typeof inhibitorResult.raw === "object" && !Array.isArray(inhibitorResult.raw)
      ? {
        ...inhibitorResult.raw,
        override: {
          applied: true,
          reason: "initial_invalid_output_requires_correction"
        }
      }
      : {
        raw: inhibitorResult.raw,
        override: {
          applied: true,
          reason: "initial_invalid_output_requires_correction"
        }
      };

  return {
    blocked: false,
    reasons: [],
    raw
  };
}

function looksCorrectiveLearningAnswer(answer: string): boolean {
  const lowered = answer.toLowerCase();
  return containsAny(lowered, [
    "your reasoning is not fully correct",
    "that is the right missing step",
    "a = f / m",
    "acceleration stays the same",
    "the key mistake",
    "work from the governing relationship"
  ]);
}

function normalizeDecisionForDelivery(
  request: RunCompanionRequest,
  draftAnswer: string,
  judgments: CompanionPipelineResult["judgments"],
  decision: OrchestratorDecision
): OrchestratorDecision {
  if (decision.decision !== "revise") {
    return decision;
  }

  const nonPassJudgments = judgments.filter((judgment) => judgment.verdict !== "pass");
  if (nonPassJudgments.length === 0) {
    return { ...decision, decision: "allow" };
  }

  if (nonPassJudgments.every((judgment) => judgment.verdict === "warn")) {
    return { ...decision, decision: "allow" };
  }

  if (
    request.mode === "learning" &&
    nonPassJudgments.every((judgment) => judgment.verifier_name === "learning") &&
    looksCorrectiveLearningAnswer(draftAnswer)
  ) {
    return {
      ...decision,
      decision: "allow",
      revision_notes: []
    };
  }

  return decision;
}

export async function runCompanionPipeline(
  request: RunCompanionRequest,
  dependencies: PipelineDependencies = {}
): Promise<CompanionPipelineResult> {
  const requestId = makeRequestId();
  const auditTrail: CompanionPipelineResult["audit_trail"] = [];
  const processEvents: ProcessEvent[] = [];
  const auditWriter = dependencies.auditWriter ?? defaultAuditWriter;
  const sessionStore = dependencies.sessionStore ?? fileSessionStore;
  const inhibitor = dependencies.inhibitor ?? runInhibitorCheck;
  const localRetrieval = dependencies.retrieveLocalEvidence ?? retrieveLocalEvidence;
  const openAlexRetrieval = dependencies.retrieveOpenAlexEvidence ?? retrieveOpenAlexEvidence;
  const primaryAgent = dependencies.primaryAgent ?? runPrimaryAgent;
  const verifierRunner = dependencies.runVerifiers ?? runAllVerifiers;
  const synthesize = dependencies.synthesize ?? synthesizeResponse;
  const fixLoopFn = dependencies.runFixLoop ?? runFixLoop;

  const priorConversation = await sessionStore.readSession(request.session_id);
  const userTurn: ConversationTurn = {
    role: "user",
    content: request.user_message
  };
  const conversation = [...priorConversation, userTurn];

  async function recordAudit(stage: string, payload: unknown) {
    const event = {
      request_id: requestId,
      stage,
      payload,
      created_at: new Date().toISOString()
    };
    auditTrail.push(event);
    await auditWriter(event);
  }

  await recordAudit("request_received", request);
  appendPipelineProcessEvent(processEvents, {
    stage: "request_received",
    title: "Pipeline request received",
    body: `Received a ${request.mode} request for session ${request.session_id}. ` +
      `Process visibility is ${request.show_process ? "enabled" : "disabled"}.`
  });

  // Step 1: Initial inhibitor check
  let inhibitorResult = await inhibitor({
    mode: request.mode,
    conversation
  });

  await recordAudit("inhibitor_result", inhibitorResult);
  appendInhibitorProcessEvent(processEvents, {
    stage: "inhibitor_result",
    blocked: inhibitorResult.blocked,
    reasons: inhibitorResult.reasons
  });

  if (shouldOverrideLearningInhibitorBlock(request.mode, inhibitorResult)) {
    inhibitorResult = overrideLearningInhibitorResult(inhibitorResult);
    await recordAudit("inhibitor_override", inhibitorResult.raw);
    appendPipelineProcessEvent(processEvents, {
      stage: "inhibitor_override",
      title: "Learning-mode inhibitor override applied",
      body:
        "The initial inhibitor block was treated as a student misconception signal, so the correction pipeline continued."
    });
  } else if (shouldOverrideInitialInvalidOutputBlock(inhibitorResult)) {
    inhibitorResult = overrideInitialInvalidOutputResult(inhibitorResult);
    await recordAudit("inhibitor_override", inhibitorResult.raw);
    appendPipelineProcessEvent(processEvents, {
      stage: "inhibitor_override",
      title: "Initial invalid-output block converted to corrective flow",
      body:
        "The request was asking for evaluation or correction, so the pipeline continued instead of blocking on a lone invalid_output prediction."
    });
  }

  if (inhibitorResult.blocked) {
    const decision = blockedDecision(inhibitorResult.reasons);
    const synthesis = {
      final_answer: `I can't continue with that request because the inhibitor flagged: ${inhibitorResult.reasons.join(", ")}.`,
      citations: [],
      uncertainty_notes: []
    };

    await sessionStore.appendTurns(request.session_id, [userTurn, { role: "assistant", content: synthesis.final_answer }]);

    appendPipelineResultProcessEvent(processEvents, {
      stage: "blocked_result",
      title: "Pipeline blocked before retrieval",
      body: `decision=${decision.decision}; reasons=${decision.blocking_reasons.join(" | ")}`
    });

    return {
      request_id: requestId,
      session_id: request.session_id,
      mode: request.mode,
      inhibitor: inhibitorResult,
      evidence: [],
      draft: null,
      runtime: undefined,
      judgments: [],
      decision,
      synthesis,
      audit_trail: auditTrail,
      process_events: processEvents
    };
  }

  // Step 2: Parallel retrieval
  // Only hit OpenAlex when the user's message contains an explicit literature-search
  // signal ("papers", "sources", "references", etc.).  Firing it on every message
  // returns unrelated works and pollutes the evidence set.
  const shouldRunOpenAlexInitially =
    (request.mode === "research" || request.mode === "learning") &&
    hasLiteratureSearchIntent(request.user_message);

  const [localEvidence, openAlexEvidence] = await Promise.all([
    localRetrieval(request.user_message),
    shouldRunOpenAlexInitially ? openAlexRetrieval(request.user_message) : Promise.resolve([])
  ]);
  let evidence = dedupeEvidence([...localEvidence, ...openAlexEvidence]);

  await recordAudit("retrieval_result", evidence);
  appendPipelineProcessEvent(processEvents, {
    stage: "retrieval_result",
    title: "Evidence retrieval completed",
    body: `Retrieved ${localEvidence.length} local evidence item${localEvidence.length === 1 ? "" : "s"} and ` +
      `${openAlexEvidence.length} OpenAlex item${openAlexEvidence.length === 1 ? "" : "s"}. ` +
      `After deduplication, ${evidence.length} item${evidence.length === 1 ? "" : "s"} remained.`
  });

  // Step 3: Primary agent
  const primaryAgentResult = await primaryAgent({
    request_id: requestId,
    session_id: request.session_id,
    mode: request.mode,
    user_message: request.user_message,
    conversation,
    evidence
  });
  const { draft, runtime } = primaryAgentResult;

  await recordAudit("primary_agent_draft", draft);
  appendPipelineProcessEvent(processEvents, {
    stage: "primary_agent_draft",
    title: "Primary agent produced draft",
    body: `The primary agent produced a draft with ${draft.citations_used.length} citation(s), ` +
      `${draft.proposed_actions.length} proposed action(s), and ${draft.uncertainty_notes.length} uncertainty note(s).`
  });

  // Step 4: Parallel verification (detection pass — all verifiers at once)
  const verifierInput: VerifierInput = {
    request_id: requestId,
    session_id: request.session_id,
    mode: request.mode,
    user_message: request.user_message,
    conversation,
    evidence,
    draft
  };

  const initialJudgments = await verifierRunner(verifierInput);

  await recordAudit("verifier_outputs", initialJudgments);
  appendVerifierProcessEvents(processEvents, initialJudgments, {
    stage: "verifier_output"
  });
  appendPipelineProcessEvent(processEvents, {
    stage: "verifier_outputs",
    title: "Verifier sweep completed",
    body: `The verifier sweep completed with ${initialJudgments.length} result(s), ` +
      `${initialJudgments.filter((item) => item.verdict !== "pass").length} of which were non-pass.`
  });

  // Step 4.5: Learning-mode deferred OpenAlex retrieval
  if (
    request.mode === "learning" &&
    openAlexEvidence.length === 0 &&
    hasUnsupportedPracticalClaimSignal(initialJudgments)
  ) {
    const learningOpenAlexEvidence = await openAlexRetrieval(request.user_message);
    evidence = dedupeEvidence([...evidence, ...learningOpenAlexEvidence]);

    await recordAudit("learning_openalex_retrieval", learningOpenAlexEvidence);
    appendPipelineProcessEvent(processEvents, {
      stage: "learning_openalex_retrieval",
      title: "Learning-mode OpenAlex retrieval completed",
      body: `Retrieved ${learningOpenAlexEvidence.length} OpenAlex item${learningOpenAlexEvidence.length === 1 ? "" : "s"} ` +
        "after grounding flagged unsupported practical claims."
    });

    verifierInput.evidence = evidence;
  }

  // Step 5: Fix loop — sequential, failures only
  const fixResult =
    runtime.degraded || !hasFailJudgment(initialJudgments)
      ? await buildLocalFixLoopResult(
        draft,
        initialJudgments,
        request.user_message,
        verifierInput,
        verifierRunner
      )
      : await fixLoopFn(
        draft,
        initialJudgments,
        verifierInput,
        primaryAgent,
        runVerifierByName
      );

  const finalDraft = fixResult.final_draft;
  const finalJudgments = fixResult.judgments_after_fix;

  await recordAudit("fix_loop_result", {
    fix_attempts: fixResult.fix_attempts.length,
    fixes_applied: fixResult.fix_attempts.filter((a) => a.fix_applied).length
  });
  appendFixLoopResultProcessEvent(processEvents, {
    stage: "fix_loop_result",
    fix_attempts: fixResult.fix_attempts.length,
    fixes_applied: fixResult.fix_attempts.filter((a) => a.fix_applied).length,
    revised_answer: finalDraft.answer === draft.answer ? "unchanged" : "updated"
  });

  // Step 6: Orchestrate on final judgments
  const decision = normalizeDecisionForDelivery(
    request,
    finalDraft.answer,
    finalJudgments,
    orchestrateJudgments(finalJudgments)
  );

  // Step 7: Synthesis on final draft
  appendOrchestratorProcessEvent(processEvents, {
    stage: "orchestrator_decision",
    title: "Orchestrator produced a decision",
    body: `The orchestrator decided to ${decision.decision}. ` +
      `${decision.blocking_reasons.length} blocking reason(s) and ${decision.revision_notes.length} revision note(s) were recorded.`
  });

  const synthesis = await synthesize({
    mode: request.mode,
    user_message: request.user_message,
    draft: finalDraft,
    evidence,
    judgments: finalJudgments,
    decision
  });

  await recordAudit("orchestrator_decision", decision);
  await recordAudit("synthesis_result", synthesis);
  appendPipelineResultProcessEvent(processEvents, {
    stage: "synthesis_result",
    title: "Final response packaged",
    body: `The final response was packaged with ${synthesis.citations.length} citation(s), ` +
      `${synthesis.uncertainty_notes.length} uncertainty note(s), and ${synthesis.final_answer.length} characters.`
  });

  await sessionStore.appendTurns(request.session_id, [userTurn, { role: "assistant", content: synthesis.final_answer }]);

  return {
    request_id: requestId,
    session_id: request.session_id,
    mode: request.mode,
    inhibitor: inhibitorResult,
    evidence,
    draft: finalDraft,
    runtime,
    judgments: finalJudgments,
    decision,
    synthesis: {
      ...synthesis,
      citations: unique(synthesis.citations)
    },
    audit_trail: auditTrail,
    process_events: processEvents
  };
}
