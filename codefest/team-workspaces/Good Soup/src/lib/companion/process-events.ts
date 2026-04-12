import type {
  InternalProcessParticipant,
  ProcessEvent,
  VerifierJudgment
} from "./contracts";

function makeProcessEventId(): string {
  return crypto.randomUUID();
}

export function createProcessEvent(input: {
  participant: InternalProcessParticipant;
  stage: string;
  title: string;
  body: string;
  created_at?: string;
}): ProcessEvent {
  return {
    id: makeProcessEventId(),
    participant: input.participant,
    stage: input.stage,
    title: input.title,
    body: input.body,
    created_at: input.created_at ?? new Date().toISOString()
  };
}

export function appendProcessEvent(
  events: ProcessEvent[],
  input: Parameters<typeof createProcessEvent>[0]
): ProcessEvent {
  const event = createProcessEvent(input);
  events.push(event);
  return event;
}

export function appendInhibitorProcessEvent(
  events: ProcessEvent[],
  input: {
    stage: string;
    blocked: boolean;
    reasons: string[];
    created_at?: string;
  }
): ProcessEvent {
  return appendProcessEvent(events, {
    participant: "inhibitor",
    stage: input.stage,
    title: input.blocked ? "Inhibitor blocked the request" : "Inhibitor allowed the request",
    body: input.blocked
      ? `The inhibitor blocked the request because ${input.reasons.join(", ")}.`
      : "The inhibitor allowed the request to continue.",
    created_at: input.created_at
  });
}

export function appendPipelineProcessEvent(
  events: ProcessEvent[],
  input: {
    stage: string;
    title: string;
    body: string;
    created_at?: string;
  }
): ProcessEvent {
  return appendProcessEvent(events, {
    participant: "pipeline",
    stage: input.stage,
    title: input.title,
    body: input.body,
    created_at: input.created_at
  });
}

function verifierParticipant(verifierName: VerifierJudgment["verifier_name"]): InternalProcessParticipant {
  switch (verifierName) {
    case "grounding":
      return "grounding_verifier";
    case "anti_sycophancy":
      return "anti_sycophancy_verifier";
    case "learning":
      return "learning_verifier";
    case "action":
      return "action_verifier";
    case "emotional_calibration":
      return "emotional_calibration_verifier";
    case "privacy_policy":
      return "privacy_policy_verifier";
    default: {
      const exhaustive: never = verifierName;
      return exhaustive;
    }
  }
}

export function appendVerifierProcessEvents(
  events: ProcessEvent[],
  judgments: VerifierJudgment[],
  input?: { stage?: string; created_at?: string }
): ProcessEvent[] {
  return judgments.map((judgment) =>
    appendProcessEvent(events, {
      participant: verifierParticipant(judgment.verifier_name),
      stage: input?.stage ?? "verifier_output",
      title: `${judgment.verifier_name} verifier ${judgment.verdict}`,
      body: `${judgment.verifier_name} reported ${judgment.issue_type} with risk score ${judgment.risk_score}. ` +
        `Rationale: ${judgment.rationale}. Recommended action: ${judgment.recommended_action}.`,
      created_at: input?.created_at
    })
  );
}

export function appendFixLoopResultProcessEvent(
  events: ProcessEvent[],
  input: {
    stage: string;
    fix_attempts: number;
    fixes_applied: number;
    revised_answer?: string;
    created_at?: string;
  }
): ProcessEvent {
  return appendProcessEvent(events, {
    participant: "pipeline",
    stage: input.stage,
    title: "Fix loop completed",
    body:
      `The fix loop completed after ${input.fix_attempts} attempt${input.fix_attempts === 1 ? "" : "s"}. ` +
      `${input.fixes_applied} fix${input.fixes_applied === 1 ? "" : "es"} were applied. ` +
      `The answer was ${input.revised_answer ?? "unchanged"}.`,
    created_at: input.created_at
  });
}

export function appendOrchestratorProcessEvent(
  events: ProcessEvent[],
  input: {
    stage: string;
    title: string;
    body: string;
    created_at?: string;
  }
): ProcessEvent {
  return appendProcessEvent(events, {
    participant: "orchestrator",
    stage: input.stage,
    title: input.title,
    body: input.body,
    created_at: input.created_at
  });
}

export function appendPipelineResultProcessEvent(
  events: ProcessEvent[],
  input: {
    stage: string;
    title: string;
    body: string;
    created_at?: string;
  }
): ProcessEvent {
  return appendProcessEvent(events, {
    participant: "pipeline",
    stage: input.stage,
    title: input.title,
    body: input.body,
    created_at: input.created_at
  });
}
