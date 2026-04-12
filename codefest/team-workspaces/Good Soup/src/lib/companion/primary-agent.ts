import OpenAI from "openai";

import { getRuntimeConfig } from "./config";
import type { RevisionBrief } from "../../types/companion";
import type {
  CompanionMode,
  DraftClaim,
  EvidenceRecord,
  PrimaryAgentDraft,
  PrimaryAgentInput,
  PrimaryAgentResult,
  ProposedAction,
  RuntimeMetadata,
  StudentModelSummary
} from "./contracts";
import { runPrimaryAgentViaOpenCode } from "./opencode/adapter";
import { containsAny, unique } from "./utils";

export type PrimaryAgentFailureType =
  | "runtime_unavailable"
  | "invalid_response"
  | "backend_not_configured";

export function buildSystemPrompt(mode: CompanionMode): string {
  const evidenceNote = [
    "The evidence array in the prompt contains real papers and sources retrieved",
    "via semantic search (OpenAlex and local corpus) specifically for the user's query.",
    "When the user asks for papers, research, or sources, use the provided evidence as your primary answer —",
    "present those actual retrieved papers, not generic suggestions.",
    "Cite evidence IDs in citations_used whenever you reference a paper.",
    "Do not say you cannot retrieve papers; the retrieval has already been done for you."
  ].join(" ");

  if (mode === "research") {
    return [
      "You are the primary agent for a research companion.",
      evidenceNote,
      "Be skeptical of unsupported novelty claims.",
      "Ground claims in evidence.",
      "Address the user's actual question directly.",
      "Do not fall back to stock examples or canned tutoring scripts.",
      "Be concise, honest about uncertainty, and do not flatter weak ideas.",
      "Return strict JSON only."
    ].join(" ");
  }

  return [
    "You are the primary agent for a learning companion.",
    evidenceNote,
    "Assess whether the student's reasoning is actually correct.",
    "Correct misconceptions directly but respectfully.",
    "Address the student's exact reasoning rather than using stock tutoring scripts.",
    "Do not praise wrong reasoning.",
    "Return strict JSON only."
  ].join(" ");
}

function deriveActions(userMessage: string): ProposedAction[] {
  void userMessage;
  return [];
}

function buildConversationContext(input: Pick<PrimaryAgentInput, "conversation" | "user_message">): string {
  const turns = input.conversation.map((turn) => turn.content.trim()).filter(Boolean);
  if (turns.length === 0) {
    return input.user_message;
  }

  const lastTurn = turns[turns.length - 1];
  if (lastTurn === input.user_message.trim()) {
    return turns.join("\n");
  }

  return [...turns, input.user_message].join("\n");
}

function inferStudentModel(mode: CompanionMode, userMessage: string): StudentModelSummary {
  if (mode !== "learning") {
    return {
      understanding_level: "partial",
      misconceptions: [],
      missing_steps: []
    };
  }

  const misconceptions: string[] = [];
  const missingSteps: string[] = [];
  const lowered = userMessage.toLowerCase();
  const showsRatioReasoning =
    containsAny(lowered, ["a = f / m", "f / m", "force divided by mass"]) &&
    containsAny(lowered, ["stays the same", "depends", "ratio"]);
  const correctDoublingPattern =
    lowered.includes("force doubles") &&
    lowered.includes("mass doubles") &&
    lowered.includes("stays the same");

  if (showsRatioReasoning || correctDoublingPattern) {
    return {
      understanding_level: "strong",
      misconceptions: [],
      missing_steps: []
    };
  }

  if (containsAny(userMessage, ["always", "obviously", "definitely"])) {
    misconceptions.push("The student is overgeneralizing without checking conditions.");
  }

  if (containsAny(userMessage, ["newton", "force", "mass", "acceleration"])) {
    misconceptions.push("The student may be treating force and mass as independent boosts to acceleration.");
    missingSteps.push("They need to reason from a = F / m rather than a vague trend.");
  }

  return {
    understanding_level: misconceptions.length > 0 ? "partial" : "strong",
    misconceptions,
    missing_steps: missingSteps
  };
}

function deriveClaims(answer: string, evidence: EvidenceRecord[]): DraftClaim[] {
  return [
    {
      text: answer.split(".")[0]?.trim() || answer,
      evidence_ref_ids: evidence.slice(0, 2).map((item) => item.id),
      certainty: evidence.length > 1 ? "medium" : "low"
    }
  ];
}

function mentionsNewtonTopic(text: string): boolean {
  return containsAny(text, [
    "newton",
    "force",
    "mass",
    "acceleration",
    "a = f / m",
    "f / m"
  ]);
}

function looksLikeLegacyHeuristicAnswer(answer: string, input: PrimaryAgentInput): boolean {
  const loweredAnswer = answer.toLowerCase();
  const loweredUserMessage = input.user_message.toLowerCase();
  const matchesLegacyTemplate = containsAny(loweredAnswer, [
    "that is the right missing step",
    "your reasoning is not fully correct. work from a = f / m",
    "newton's second law uses a = f / m",
    "if force doubles and mass doubles, the acceleration stays the same",
    "work from the governing relationship",
    "the key mistake"
  ]);

  if (!matchesLegacyTemplate) {
    return false;
  }

  if (input.mode !== "learning") {
    return true;
  }

  return !mentionsNewtonTopic(loweredUserMessage);
}

function buildRuntimeMetadata(
  input: PrimaryAgentInput,
  backend: string,
  agent: string,
  degraded: boolean,
  failureType?: PrimaryAgentFailureType
): RuntimeMetadata {
  return {
    backend,
    agent,
    session_id: input.session_id,
    degraded,
    ...(failureType ? { failure_type: failureType } : {})
  };
}

function buildFailureAnswer(
  type: PrimaryAgentFailureType,
  backendLabel = "primary model backend"
): string {
  switch (type) {
    case "runtime_unavailable":
      return `I couldn't generate a response because the ${backendLabel} is unavailable right now. Please retry.`;
    case "invalid_response":
      return `I couldn't generate a reliable response because the ${backendLabel} returned an invalid response. Please retry.`;
    case "backend_not_configured":
      return "I couldn't generate a response because no primary model backend is configured for this app right now.";
  }
}

export function buildFailureDraft(
  input: PrimaryAgentInput,
  type: PrimaryAgentFailureType,
  backendLabel?: string
): PrimaryAgentDraft {
  return {
    answer: buildFailureAnswer(type, backendLabel),
    claims: [],
    citations_used: [],
    student_model: {
      understanding_level: "low",
      misconceptions: [],
      missing_steps: []
    },
    proposed_actions: [],
    uncertainty_notes: [`primary_agent_failure:${type}`, `request_id:${input.request_id}`]
  };
}

function buildFailureResult(
  input: PrimaryAgentInput,
  backend: string,
  agent: string,
  failureType: PrimaryAgentFailureType
): PrimaryAgentResult {
  const backendLabel =
    backend === "opencode"
      ? "OpenCode runtime"
      : backend === "openai"
        ? "direct model backend"
        : "primary model backend";

  return {
    draft: buildFailureDraft(input, failureType, backendLabel),
    runtime: buildRuntimeMetadata(input, backend, agent, true, failureType)
  };
}

export function normalizeDraft(raw: unknown, input: PrimaryAgentInput): PrimaryAgentDraft {
  if (!raw || typeof raw !== "object") {
    throw new Error("Primary agent response was not a valid object.");
  }

  const record = raw as Record<string, unknown>;
  const inferredStudentModel = inferStudentModel(input.mode, input.user_message);
  const answer =
    typeof record.answer === "string"
      ? record.answer
      : typeof record.draft_answer === "string"
        ? record.draft_answer
        : null;

  if (!answer || answer.trim().length === 0) {
    throw new Error("Primary agent response did not include a usable answer.");
  }

  if (looksLikeLegacyHeuristicAnswer(answer, input)) {
    throw new Error("Primary agent response matched a legacy heuristic fallback answer.");
  }

  const citationsUsed = Array.isArray(record.citations_used)
    ? record.citations_used.filter((item): item is string => typeof item === "string")
    : [];

  const claims = Array.isArray(record.claims)
    ? record.claims.flatMap((item) => {
      if (!item || typeof item !== "object") {
        return [];
      }
      const claim = item as Record<string, unknown>;
      return [
        {
          text: typeof claim.text === "string" ? claim.text : answer,
          evidence_ref_ids: Array.isArray(claim.evidence_ref_ids)
            ? claim.evidence_ref_ids.filter((value): value is string => typeof value === "string")
            : [],
          certainty:
            claim.certainty === "high" || claim.certainty === "medium" || claim.certainty === "low"
              ? claim.certainty
              : "low"
        } satisfies DraftClaim
      ];
    })
    : deriveClaims(answer, input.evidence);

  const studentModelRaw =
    record.student_model && typeof record.student_model === "object"
      ? (record.student_model as Record<string, unknown>)
      : null;

  const studentModel: StudentModelSummary = {
    understanding_level:
      studentModelRaw?.understanding_level === "low" ||
        studentModelRaw?.understanding_level === "partial" ||
        studentModelRaw?.understanding_level === "strong"
        ? studentModelRaw.understanding_level
        : inferredStudentModel.understanding_level,
    misconceptions: Array.isArray(studentModelRaw?.misconceptions)
      ? studentModelRaw?.misconceptions.filter((item): item is string => typeof item === "string")
      : inferredStudentModel.misconceptions,
    missing_steps: Array.isArray(studentModelRaw?.missing_steps)
      ? studentModelRaw?.missing_steps.filter((item): item is string => typeof item === "string")
      : inferredStudentModel.missing_steps
  };

  const proposedActions: ProposedAction[] = [];

  return {
    answer,
    claims,
    citations_used: citationsUsed.length > 0 ? citationsUsed : unique(input.evidence.slice(0, 3).map((item) => item.id)),
    student_model: studentModel,
    proposed_actions: proposedActions,
    uncertainty_notes: Array.isArray(record.uncertainty_notes)
      ? record.uncertainty_notes.filter((item): item is string => typeof item === "string")
      : []
  };
}

function classifyPrimaryAgentFailure(error: unknown): PrimaryAgentFailureType {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

  if (
    containsAny(message, [
      "invalid response",
      "not a valid object",
      "usable answer",
      "structured output",
      "unexpected token",
      "json"
    ])
  ) {
    return "invalid_response";
  }

  return "runtime_unavailable";
}

function createOpenAIClient(apiKey: string, baseURL?: string): OpenAI {
  return new OpenAI({
    apiKey,
    ...(baseURL ? { baseURL } : {}),
    timeout: 15000,
    maxRetries: 0
  });
}

async function requestOpenAIDraft(
  client: OpenAI,
  model: string,
  input: PrimaryAgentInput
): Promise<PrimaryAgentDraft> {
  const completion = await client.chat.completions.create({
    model,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: buildSystemPrompt(input.mode)
      },
      {
        role: "user",
        content: buildPrompt(input)
      }
    ]
  });

  const content = completion.choices[0]?.message?.content ?? "";
  return normalizeDraft(JSON.parse(content), input);
}

export function buildPrompt(input: PrimaryAgentInput): string {
  const prompt: {
    task: {
      mode: CompanionMode;
      user_message: string;
      revision_mode: boolean;
      revision_instructions: string[];
    };
    revision_brief?: RevisionBrief;
    conversation: PrimaryAgentInput["conversation"];
    evidence_context: string;
    evidence: Array<{
      id: string;
      title: string;
      snippet: string;
      url: string;
    }>;
    response_schema: {
      answer: "string";
      claims: Array<{ text: "string"; evidence_ref_ids: ["string"]; certainty: "low|medium|high" }>;
      citations_used: ["string"];
      student_model: {
        understanding_level: "low|partial|strong";
        misconceptions: ["string"];
        missing_steps: ["string"];
      };
      proposed_actions: Array<{
        type: "string";
        target: "string";
        details: "string";
        requires_confirmation: true;
      }>;
      uncertainty_notes: ["string"];
    };
  } = {
    task: {
      mode: input.mode,
      user_message: input.user_message,
      revision_mode: Boolean(input.revision_brief),
      revision_instructions: input.revision_brief
        ? [
          "This is a revision pass.",
          "Use revision_brief to amend the current answer rather than generating a fresh first-pass answer."
        ]
        : []
    },
    ...(input.revision_brief ? { revision_brief: input.revision_brief } : {}),
    conversation: input.conversation,
    evidence_context: input.evidence.length > 0
      ? `${input.evidence.length} paper(s) were retrieved via semantic search for this query. Treat them as the answer to any request for papers or sources — present and cite them directly.`
      : "No papers were retrieved for this query.",
    evidence: input.evidence.map((item) => ({
      id: item.id,
      title: item.title,
      snippet: item.snippet,
      url: item.url
    })),
    response_schema: {
      answer: "string",
      claims: [{ text: "string", evidence_ref_ids: ["string"], certainty: "low|medium|high" }],
      citations_used: ["string"],
      student_model: {
        understanding_level: "low|partial|strong",
        misconceptions: ["string"],
        missing_steps: ["string"]
      },
      proposed_actions: [
        {
          type: "string",
          target: "string",
          details: "string",
          requires_confirmation: true
        }
      ],
      uncertainty_notes: ["string"]
    }
  };

  return JSON.stringify(prompt, null, 2);
}

export async function runPrimaryAgent(input: PrimaryAgentInput): Promise<PrimaryAgentResult> {
  const config = getRuntimeConfig();
  const opencodeAttempted = Boolean(config.opencode_server_url);

  if (config.opencode_server_url) {
    try {
      const draft = await runPrimaryAgentViaOpenCode(input, {
        serverUrl: config.opencode_server_url,
        model: config.opencode_model ?? config.primary_model,
        agent: config.opencode_agent,
        username: config.opencode_username,
        password: config.opencode_password
      });
      return {
        draft,
        runtime: buildRuntimeMetadata(input, "opencode", config.opencode_agent ?? "primary", false)
      };
    } catch (error) {
      if (!config.openai_api_key) {
        return buildFailureResult(
          input,
          "opencode",
          config.opencode_agent ?? "primary",
          classifyPrimaryAgentFailure(error)
        );
      }
    }
  }

  if (!config.openai_api_key) {
    return buildFailureResult(
      input,
      "unconfigured",
      config.opencode_agent ?? "primary",
      "backend_not_configured"
    );
  }

  try {
    const client = createOpenAIClient(config.openai_api_key, config.llm_base_url);
    return {
      draft: await requestOpenAIDraft(client, config.primary_model, input),
      runtime: buildRuntimeMetadata(input, "openai", "primary", opencodeAttempted)
    };
  } catch (error) {
    if (config.llm_base_url) {
      try {
        const fallbackClient = createOpenAIClient(config.openai_api_key);
        return {
          draft: await requestOpenAIDraft(fallbackClient, config.primary_model, input),
          runtime: buildRuntimeMetadata(input, "openai", "primary", true)
        };
      } catch (fallbackError) {
        return buildFailureResult(input, "openai", "primary", classifyPrimaryAgentFailure(fallbackError));
      }
    }

    return buildFailureResult(input, "openai", "primary", classifyPrimaryAgentFailure(error));
  }
}
