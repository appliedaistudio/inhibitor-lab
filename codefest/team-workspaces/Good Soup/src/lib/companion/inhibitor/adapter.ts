import { getRuntimeConfig } from "../config";
import type { CompanionMode, ConversationTurn, InhibitorResult } from "../contracts";

function containsAny(source: string, terms: string[]): boolean {
  const lowered = source.toLowerCase();
  return terms.some((term) => lowered.includes(term));
}

function looksBenignResearchQuestion(content: string): boolean {
  const lowered = content.trim().toLowerCase();
  const dangerousOperationalPhrases = [
    "step-by-step",
    "steps to",
    "how to make",
    "instructions to",
    "make a bomb",
    "build a bomb",
    "weapon",
    "bypass",
    "hack",
    "malware",
    "steal",
    "delete all",
    "exfiltrate"
  ];

  if (containsAny(lowered, dangerousOperationalPhrases)) {
    return false;
  }

  const informationalPrefixes = [
    "what happens if",
    "what is",
    "what are",
    "why ",
    "can you explain",
    "compare",
    "summarize",
    "evaluate",
    "does ",
    "is ",
    "are "
  ];

  if (informationalPrefixes.some((prefix) => lowered.startsWith(prefix))) {
    return true;
  }

  return containsAny(lowered, [
    "paper",
    "study",
    "research",
    "novel",
    "overlap",
    "evidence",
    "source",
    "literature"
  ]);
}

function normalizeRole(role: ConversationTurn["role"]): "human" | "agent" {
  return role === "user" ? "human" : "agent";
}

function normalizeContent(mode: CompanionMode, turn: ConversationTurn): string {
  if (mode === "learning" && turn.role === "user") {
    return (
      "The student wants help checking whether the following reasoning is correct. " +
      "The assistant should evaluate it critically, correct misconceptions, and avoid affirming incorrect claims: " +
      turn.content
    );
  }

  if (mode === "research" && turn.role === "user" && looksBenignResearchQuestion(turn.content)) {
    return (
      "The student wants general educational information about the following research question. " +
      "The assistant should answer cautiously, avoid operational harm, and focus on evidence-backed explanation: " +
      turn.content
    );
  }

  return turn.content;
}

function safeJsonParse(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

async function readResponsePayload(response: Response): Promise<unknown> {
  if (typeof response.clone === "function" && typeof response.text === "function") {
    const clonedResponse = response.clone();
    const text = await clonedResponse.text().catch(() => "");
    if (text) {
      return safeJsonParse(text);
    }
  }

  try {
    return await response.json();
  } catch {
    return undefined;
  }
}

function extractTriggerLabels(payload: unknown): string[] {
  if (!payload || typeof payload !== "object") {
    console.warn("[inhibitor] extractTriggerLabels: unexpected payload shape", payload);
    return [];
  }

  const result = "result" in payload && typeof payload.result === "object" ? payload.result : {};
  const llmInhibition =
    result && typeof result === "object" && "llm_inhibition" in result && typeof result.llm_inhibition === "object"
      ? result.llm_inhibition
      : {};
  const nestedPredictions: Record<string, unknown> =
    llmInhibition &&
    typeof llmInhibition === "object" &&
    "predictions" in llmInhibition &&
    typeof llmInhibition.predictions === "object"
      ? (llmInhibition.predictions as Record<string, unknown>)
      : {};
  const rootPredictions: Record<string, unknown> =
    result && typeof result === "object" && "predictions" in result && typeof result.predictions === "object"
      ? (result.predictions as Record<string, unknown>)
      : {};
  const predictions = Object.keys(nestedPredictions).length > 0 ? nestedPredictions : rootPredictions;

  if (Object.keys(predictions).length === 0 && !("rules_inhibition" in (result as object))) {
    console.warn("[inhibitor] extractTriggerLabels: no predictions or rules_inhibition found in response", payload);
  }

  const labels = Object.entries(predictions).flatMap(([label, details]) => {
    if (details && typeof details === "object" && "value" in details && details.value) {
      return [label];
    }
    return [];
  });

  const rulesSection: Record<string, unknown> =
    result &&
    typeof result === "object" &&
    "rules_inhibition" in result &&
    typeof result.rules_inhibition === "object"
      ? (result.rules_inhibition as Record<string, unknown>)
      : {};
  const violations =
    rulesSection &&
    typeof rulesSection === "object" &&
    "violations" in rulesSection &&
    Array.isArray(rulesSection.violations)
      ? rulesSection.violations
      : [];

  const violationLabels = violations.map((item) => {
    if (item && typeof item === "object") {
      if ("name" in item && typeof item.name === "string") {
        return item.name;
      }
      if ("rule" in item && typeof item.rule === "string") {
        return item.rule;
      }
    }
    return String(item);
  });

  const passed =
    rulesSection &&
    typeof rulesSection === "object" &&
    "passed" in rulesSection &&
    typeof rulesSection.passed === "boolean"
      ? rulesSection.passed
      : true;

  if (!passed && violationLabels.length === 0) {
    violationLabels.push("rules_inhibition_failed");
  }

  return [...labels, ...violationLabels];
}

export async function runInhibitorCheck(input: {
  mode: CompanionMode;
  conversation: ConversationTurn[];
  fetchImpl?: typeof fetch;
}, options?: { fetchImpl?: typeof fetch }): Promise<InhibitorResult> {
  const config = getRuntimeConfig();
  const fetchImpl = options?.fetchImpl ?? input.fetchImpl ?? fetch;

  if (!config.inhibitor_api_key) {
    return {
      blocked: false,
      reasons: [],
      raw: { mocked: true, reason: "missing_inhibitor_key" }
    };
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetchImpl(config.inhibitor_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": config.inhibitor_api_key
      },
      signal: controller.signal,
      body: JSON.stringify({
        thought_chain: input.conversation.map((turn) => ({
          role: normalizeRole(turn.role),
          content: normalizeContent(input.mode, turn)
        })),
        mode: "insight"
      })
    });

    if (!response.ok) {
      const responsePayload = await readResponsePayload(response);
      if (response.status >= 400 && response.status < 500) {
        console.warn(`[inhibitor] 4xx response (${response.status}) — invalid request`);
        return {
          blocked: false,
          reasons: [],
          raw: {
            degraded: false,
            error_type: "invalid_request",
            status: response.status,
            response: responsePayload
          }
        };
      }
      return {
        blocked: false,
        reasons: [],
        raw: {
          degraded: true,
          status: response.status,
          response: responsePayload
        }
      };
    }

    const raw = await readResponsePayload(response);
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
      console.warn("[inhibitor] failed to parse response JSON — treating as degraded");
      return {
        blocked: false,
        reasons: [],
        raw: {
          degraded: true,
          error: "invalid_json"
        }
      };
    }
    const reasons = extractTriggerLabels(raw);

    return {
      blocked: reasons.length > 0,
      reasons,
      raw
    };
  } catch (error) {
    console.warn("[inhibitor] network error — treating as degraded:", error instanceof Error ? error.message : String(error));
    return {
      blocked: false,
      reasons: [],
      raw: {
        degraded: true,
        pipeline_mode: input.mode,
        error: error instanceof Error ? error.message : String(error)
      }
    };
  } finally {
    clearTimeout(timeoutId);
  }
}
